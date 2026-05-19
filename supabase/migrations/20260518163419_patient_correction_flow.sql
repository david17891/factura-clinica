-- Minimal patient correction workflow for invoice requests.
--
-- The existing enum value `rejected` is presented to users as
-- "Requiere correccion". This migration adds the public correction link,
-- correction metadata, and a corrected_by_patient state.

ALTER TABLE public.invoice_requests
  ADD COLUMN IF NOT EXISTS correction_message TEXT,
  ADD COLUMN IF NOT EXISTS correction_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correction_requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS correction_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correction_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correction_token TEXT;

UPDATE public.invoice_requests
SET correction_token = gen_random_uuid()::TEXT
WHERE correction_token IS NULL;

ALTER TABLE public.invoice_requests
  ALTER COLUMN correction_token SET DEFAULT gen_random_uuid()::TEXT,
  ALTER COLUMN correction_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_requests_correction_token
  ON public.invoice_requests(correction_token);

CREATE INDEX IF NOT EXISTS idx_invoice_requests_correction_status
  ON public.invoice_requests(status, correction_requested_at DESC)
  WHERE status IN ('rejected', 'corrected_by_patient');

-- Public correction context. The correction token is non-enumerable and is the
-- authority for reopening an existing request from a patient-facing link.
CREATE OR REPLACE FUNCTION public.get_public_invoice_correction_context(
  p_clinic_slug TEXT,
  p_correction_token TEXT
)
RETURNS TABLE (
  clinic_name TEXT,
  clinic_slug TEXT,
  clinic_address TEXT,
  clinic_phone TEXT,
  sale_folio TEXT,
  service_name TEXT,
  amount NUMERIC,
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  rfc TEXT,
  legal_name TEXT,
  tax_zip_code TEXT,
  tax_regime TEXT,
  cfdi_use TEXT,
  notes TEXT,
  payment_date DATE,
  payment_method TEXT,
  correction_message TEXT,
  correction_requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name AS clinic_name,
    c.slug AS clinic_slug,
    c.address AS clinic_address,
    c.phone AS clinic_phone,
    s.folio AS sale_folio,
    COALESCE(ir.service_name, s.service_name) AS service_name,
    COALESCE(ir.amount, s.amount) AS amount,
    ir.patient_name,
    ir.patient_phone,
    ir.email AS patient_email,
    ir.rfc,
    ir.legal_name,
    ir.tax_zip_code,
    ir.tax_regime,
    ir.cfdi_use,
    ir.notes,
    ir.payment_date,
    COALESCE(ir.payment_method, s.payment_method) AS payment_method,
    ir.correction_message,
    ir.correction_requested_at
  FROM public.invoice_requests ir
  JOIN public.clinics c ON c.id = ir.clinic_id
  LEFT JOIN public.sales s ON s.id = ir.sale_id
  WHERE c.slug = p_clinic_slug
    AND ir.correction_token = p_correction_token
    AND ir.status = 'rejected';
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_invoice_correction_context(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_invoice_correction_context(TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_public_csf_document(
  p_invoice_request_id UUID,
  p_clinic_slug TEXT,
  p_public_invoice_token TEXT,
  p_correction_token TEXT,
  p_storage_path TEXT,
  p_original_filename TEXT,
  p_mime_type TEXT,
  p_file_size INTEGER,
  p_extraction_status TEXT,
  p_extracted_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_request public.invoice_requests%ROWTYPE;
  v_clinic_id UUID;
  v_expected_prefix TEXT;
  v_status TEXT;
  v_doc_id UUID;
BEGIN
  SELECT id INTO v_clinic_id
  FROM public.clinics
  WHERE slug = p_clinic_slug;

  IF v_clinic_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Clinica no encontrada');
  END IF;

  SELECT * INTO v_request
  FROM public.invoice_requests
  WHERE id = p_invoice_request_id
    AND clinic_id = v_clinic_id;

  IF v_request.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Solicitud no encontrada');
  END IF;

  IF p_correction_token IS NOT NULL AND p_correction_token <> '' THEN
    IF v_request.correction_token <> p_correction_token
      OR v_request.status NOT IN ('rejected', 'corrected_by_patient')
    THEN
      RETURN jsonb_build_object('error', 'Token de correccion invalido');
    END IF;
  ELSIF p_public_invoice_token IS NOT NULL AND p_public_invoice_token <> '' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.sales
      WHERE id = v_request.sale_id
        AND clinic_id = v_clinic_id
        AND public_invoice_token = p_public_invoice_token
    ) THEN
      RETURN jsonb_build_object('error', 'Venta no encontrada para esta solicitud');
    END IF;
  ELSIF v_request.sale_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Token requerido para solicitud ligada a venta');
  END IF;

  IF p_file_size IS NULL OR p_file_size <= 0 OR p_file_size > 10485760 THEN
    RETURN jsonb_build_object('error', 'Archivo demasiado grande');
  END IF;

  IF p_mime_type NOT IN ('application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif') THEN
    RETURN jsonb_build_object('error', 'Tipo de archivo no permitido');
  END IF;

  v_status := COALESCE(p_extraction_status, 'not_attempted');
  IF v_status NOT IN ('not_attempted', 'extracted', 'failed', 'manual_review') THEN
    v_status := 'manual_review';
  END IF;

  v_expected_prefix := 'requests/' || p_invoice_request_id::TEXT || '/';
  IF p_storage_path IS NULL OR position(v_expected_prefix in p_storage_path) <> 1 THEN
    RETURN jsonb_build_object('error', 'Ruta de archivo invalida');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id = 'csf-documents'
      AND name = p_storage_path
  ) THEN
    RETURN jsonb_build_object('error', 'Archivo no encontrado en storage');
  END IF;

  INSERT INTO public.invoice_request_csf_documents (
    invoice_request_id,
    clinic_id,
    storage_path,
    original_filename,
    mime_type,
    file_size,
    extraction_status,
    extracted_data
  ) VALUES (
    p_invoice_request_id,
    v_clinic_id,
    p_storage_path,
    LEFT(COALESCE(p_original_filename, 'constancia'), 255),
    p_mime_type,
    p_file_size,
    v_status,
    COALESCE(p_extracted_data, '{}'::jsonb)
  )
  ON CONFLICT (storage_path) DO UPDATE SET
    original_filename = EXCLUDED.original_filename,
    mime_type = EXCLUDED.mime_type,
    file_size = EXCLUDED.file_size,
    extraction_status = EXCLUDED.extraction_status,
    extracted_data = EXCLUDED.extracted_data
  RETURNING id INTO v_doc_id;

  UPDATE public.invoice_requests
  SET csf_file_url = p_storage_path
  WHERE id = p_invoice_request_id;

  RETURN jsonb_build_object('id', v_doc_id, 'status', v_status);
END;
$$;

REVOKE ALL ON FUNCTION public.register_public_csf_document(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_public_csf_document(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB
) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.submit_invoice_request(
  TEXT, TEXT, TEXT, TEXT, DATE, NUMERIC, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.submit_invoice_request(
  p_clinic_slug          TEXT,
  p_public_invoice_token TEXT,
  p_patient_name         TEXT,
  p_patient_phone        TEXT,
  p_payment_date         DATE,
  p_amount               NUMERIC,
  p_service_name         TEXT,
  p_payment_method       TEXT,
  p_email                TEXT,
  p_rfc                  TEXT,
  p_legal_name           TEXT,
  p_tax_zip_code         TEXT,
  p_tax_regime           TEXT,
  p_cfdi_use             TEXT,
  p_notes                TEXT,
  p_correction_token     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clinic_id UUID;
  v_sale_id UUID;
  v_source TEXT;
  v_request_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_clinic_id
  FROM public.clinics
  WHERE slug = p_clinic_slug;

  IF v_clinic_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Clinica no encontrada');
  END IF;

  IF p_public_invoice_token IS NOT NULL AND p_public_invoice_token <> '' THEN
    SELECT id INTO v_sale_id
    FROM public.sales
    WHERE public_invoice_token = p_public_invoice_token
      AND clinic_id = v_clinic_id;

    IF v_sale_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Venta no encontrada para esta clinica');
    END IF;

    v_source := 'sale_qr';
  ELSE
    v_sale_id := NULL;
    v_source := 'fixed_qr';
  END IF;

  IF p_correction_token IS NOT NULL AND p_correction_token <> '' THEN
    SELECT id INTO v_request_id
    FROM public.invoice_requests
    WHERE clinic_id = v_clinic_id
      AND correction_token = p_correction_token
      AND status = 'rejected';

    IF v_request_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Solicitud de correccion no encontrada');
    END IF;
  ELSIF v_sale_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.invoice_requests
      WHERE sale_id = v_sale_id
        AND status NOT IN ('cancelled', 'rejected')
    ) THEN
      RETURN jsonb_build_object('error', 'Ya existe una solicitud activa para esta venta');
    END IF;
  END IF;

  IF p_rfc !~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$' THEN
    RETURN jsonb_build_object('error', 'RFC invalido');
  END IF;

  IF p_tax_zip_code !~ '^[0-9]{5}$' THEN
    RETURN jsonb_build_object('error', 'Codigo postal invalido');
  END IF;

  IF p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('error', 'Correo invalido');
  END IF;

  IF v_request_id IS NOT NULL THEN
    UPDATE public.invoice_requests
    SET
      patient_name = p_patient_name,
      patient_phone = p_patient_phone,
      payment_date = p_payment_date,
      amount = p_amount,
      service_name = p_service_name,
      payment_method = p_payment_method,
      email = p_email,
      rfc = UPPER(p_rfc),
      legal_name = UPPER(p_legal_name),
      tax_zip_code = p_tax_zip_code,
      tax_regime = p_tax_regime,
      cfdi_use = p_cfdi_use,
      notes = p_notes,
      status = 'corrected_by_patient',
      correction_resolved_at = now()
    WHERE id = v_request_id
    RETURNING jsonb_build_object('id', id, 'status', status, 'source', source) INTO v_result;
  ELSE
    INSERT INTO public.invoice_requests (
      clinic_id,
      sale_id,
      patient_name,
      patient_phone,
      payment_date,
      amount,
      service_name,
      payment_method,
      email,
      rfc,
      legal_name,
      tax_zip_code,
      tax_regime,
      cfdi_use,
      notes,
      source,
      status
    ) VALUES (
      v_clinic_id,
      v_sale_id,
      p_patient_name,
      p_patient_phone,
      p_payment_date,
      p_amount,
      p_service_name,
      p_payment_method,
      p_email,
      UPPER(p_rfc),
      UPPER(p_legal_name),
      p_tax_zip_code,
      p_tax_regime,
      p_cfdi_use,
      p_notes,
      v_source,
      'fiscal_data_received'
    )
    RETURNING jsonb_build_object('id', id, 'status', status, 'source', source) INTO v_result;
  END IF;

  IF v_sale_id IS NOT NULL THEN
    UPDATE public.sales
    SET status = (CASE
      WHEN v_request_id IS NOT NULL THEN 'corrected_by_patient'
      ELSE 'fiscal_data_received'
    END)::public.invoice_status
    WHERE id = v_sale_id;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_invoice_request(
  TEXT, TEXT, TEXT, TEXT, DATE, NUMERIC, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_invoice_request(
  TEXT, TEXT, TEXT, TEXT, DATE, NUMERIC, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;
