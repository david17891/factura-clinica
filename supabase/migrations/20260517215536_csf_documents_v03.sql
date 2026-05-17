-- v0.3: Private Constancia de Situacion Fiscal documents.
-- Files are stored privately in Supabase Storage and linked to invoice requests
-- through metadata rows. Patient-submitted fiscal fields remain the source of truth.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'csf-documents',
  'csf-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS invoice_request_csf_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_request_id UUID NOT NULL REFERENCES invoice_requests(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  extraction_status TEXT NOT NULL DEFAULT 'not_attempted'
    CHECK (extraction_status IN ('not_attempted', 'extracted', 'failed', 'manual_review')),
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_request_csf_documents_request
  ON invoice_request_csf_documents(invoice_request_id);

CREATE INDEX IF NOT EXISTS idx_invoice_request_csf_documents_clinic
  ON invoice_request_csf_documents(clinic_id);

ALTER TABLE invoice_request_csf_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic members read csf documents" ON invoice_request_csf_documents;
DROP POLICY IF EXISTS "Superadmin full csf documents" ON invoice_request_csf_documents;

CREATE POLICY "Superadmin full csf documents" ON invoice_request_csf_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Clinic members read csf documents" ON invoice_request_csf_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.clinic_id = invoice_request_csf_documents.clinic_id
        AND profiles.role IN ('clinic_admin', 'reception')
    )
    OR EXISTS (
      SELECT 1 FROM clinic_accountants
      WHERE clinic_accountants.accountant_id = auth.uid()
        AND clinic_accountants.clinic_id = invoice_request_csf_documents.clinic_id
    )
  );

DROP POLICY IF EXISTS "Public upload csf documents" ON storage.objects;
DROP POLICY IF EXISTS "Assigned users read csf storage objects" ON storage.objects;

CREATE OR REPLACE FUNCTION public.csf_storage_request_exists(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  IF p_object_name IS NULL
    OR p_object_name !~* '^requests/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|heic|heif)$'
  THEN
    RETURN false;
  END IF;

  v_request_id := split_part(p_object_name, '/', 2)::uuid;

  RETURN EXISTS (
    SELECT 1
    FROM invoice_requests
    WHERE id = v_request_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.csf_storage_request_exists(TEXT) TO anon, authenticated;

-- Public upload is intentionally narrow: only the private bucket, only request UUID paths.
-- The metadata RPC below validates that the path belongs to the created invoice request.
CREATE POLICY "Public upload csf documents" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'csf-documents'
    AND name ~* '^requests/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|heic|heif)$'
    AND public.csf_storage_request_exists(storage.objects.name)
  );

CREATE POLICY "Assigned users read csf storage objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'csf-documents'
    AND EXISTS (
      SELECT 1
      FROM invoice_request_csf_documents doc
      WHERE doc.storage_path = storage.objects.name
        AND (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'superadmin'
          )
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.clinic_id = doc.clinic_id
              AND profiles.role IN ('clinic_admin', 'reception')
          )
          OR EXISTS (
            SELECT 1 FROM clinic_accountants
            WHERE clinic_accountants.accountant_id = auth.uid()
              AND clinic_accountants.clinic_id = doc.clinic_id
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.register_public_csf_document(
  p_invoice_request_id UUID,
  p_clinic_slug TEXT,
  p_public_invoice_token TEXT,
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
  v_request invoice_requests%ROWTYPE;
  v_clinic_id UUID;
  v_expected_prefix TEXT;
  v_status TEXT;
  v_doc_id UUID;
BEGIN
  SELECT id INTO v_clinic_id
  FROM clinics
  WHERE slug = p_clinic_slug;

  IF v_clinic_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Clinica no encontrada');
  END IF;

  SELECT * INTO v_request
  FROM invoice_requests
  WHERE id = p_invoice_request_id
    AND clinic_id = v_clinic_id;

  IF v_request.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Solicitud no encontrada');
  END IF;

  IF p_public_invoice_token IS NOT NULL AND p_public_invoice_token <> '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM sales
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
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'csf-documents'
      AND name = p_storage_path
  ) THEN
    RETURN jsonb_build_object('error', 'Archivo no encontrado en storage');
  END IF;

  INSERT INTO invoice_request_csf_documents (
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

  UPDATE invoice_requests
  SET csf_file_url = p_storage_path
  WHERE id = p_invoice_request_id;

  RETURN jsonb_build_object('id', v_doc_id, 'status', v_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_public_csf_document(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB
) TO anon, authenticated;
