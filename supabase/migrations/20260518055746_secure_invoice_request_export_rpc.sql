-- Secure accountant/admin export for invoice requests.
--
-- This RPC intentionally joins sales inside a SECURITY DEFINER function so an
-- assigned accountant can export the minimum sale context needed for billing
-- without receiving general SELECT access to the sales table.

CREATE OR REPLACE FUNCTION public.export_invoice_requests_csv()
RETURNS TABLE (
  invoice_request_id UUID,
  clinic_name TEXT,
  sale_folio TEXT,
  sale_date TIMESTAMPTZ,
  sale_amount NUMERIC,
  sale_payment_method TEXT,
  patient_name TEXT,
  patient_email TEXT,
  patient_phone TEXT,
  rfc TEXT,
  legal_name TEXT,
  tax_regime TEXT,
  tax_zip_code TEXT,
  cfdi_use TEXT,
  request_status TEXT,
  cfdi_uuid TEXT,
  constancia_subida BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role user_role;
  v_clinic_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado'
      USING ERRCODE = '28000';
  END IF;

  SELECT profiles.role, profiles.clinic_id
  INTO v_role, v_clinic_id
  FROM public.profiles
  WHERE profiles.id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Perfil no encontrado'
      USING ERRCODE = '28000';
  END IF;

  IF v_role NOT IN ('superadmin', 'clinic_admin', 'accountant') THEN
    RAISE EXCEPTION 'No tienes permisos para exportar solicitudes'
      USING ERRCODE = '42501';
  END IF;

  IF v_role = 'clinic_admin' AND v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'No tienes una clinica asignada'
      USING ERRCODE = '42501';
  END IF;

  IF v_role = 'accountant'
    AND NOT EXISTS (
      SELECT 1
      FROM public.clinic_accountants ca
      WHERE ca.accountant_id = v_user_id
    )
  THEN
    RAISE EXCEPTION 'Sin clinicas asignadas'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ir.id AS invoice_request_id,
    c.name AS clinic_name,
    s.folio AS sale_folio,
    s.created_at AS sale_date,
    COALESCE(s.amount, ir.amount) AS sale_amount,
    COALESCE(s.payment_method, ir.payment_method) AS sale_payment_method,
    COALESCE(ir.patient_name, s.patient_name) AS patient_name,
    COALESCE(s.patient_email, ir.email) AS patient_email,
    COALESCE(ir.patient_phone, s.patient_phone) AS patient_phone,
    ir.rfc,
    ir.legal_name,
    ir.tax_regime,
    ir.tax_zip_code,
    ir.cfdi_use,
    ir.status::TEXT AS request_status,
    ir.uuid AS cfdi_uuid,
    EXISTS (
      SELECT 1
      FROM public.invoice_request_csf_documents doc
      WHERE doc.invoice_request_id = ir.id
    ) AS constancia_subida,
    ir.created_at,
    ir.updated_at
  FROM public.invoice_requests ir
  JOIN public.clinics c ON c.id = ir.clinic_id
  LEFT JOIN public.sales s ON s.id = ir.sale_id
  WHERE
    v_role = 'superadmin'
    OR (
      v_role = 'clinic_admin'
      AND ir.clinic_id = v_clinic_id
    )
    OR (
      v_role = 'accountant'
      AND EXISTS (
        SELECT 1
        FROM public.clinic_accountants ca
        WHERE ca.accountant_id = v_user_id
          AND ca.clinic_id = ir.clinic_id
      )
    )
  ORDER BY ir.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.export_invoice_requests_csv() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_invoice_requests_csv() FROM anon;
GRANT EXECUTE ON FUNCTION public.export_invoice_requests_csv() TO authenticated;
