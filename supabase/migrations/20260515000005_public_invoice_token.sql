-- FiscoBot v0.2E — Public Invoice Token + Secure QR Flow
-- Must be applied AFTER 20260515000004_public_qr_flow.sql
--
-- Changes:
-- 1. Add public_invoice_token to sales (non-enumerable, UUID-based)
-- 2. Replace insecure folio-based RPC with token-based RPC
-- 3. Update submit_invoice_request to accept token instead of folio
-- 4. Remove patient_name/payment_method from public data exposure

-- ============================================================
-- FASE 2: public_invoice_token column on sales
-- ============================================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS public_invoice_token TEXT;

-- Backfill existing sales with random UUID tokens
UPDATE sales
SET public_invoice_token = gen_random_uuid()::text
WHERE public_invoice_token IS NULL;

-- Make it NOT NULL for all future rows
ALTER TABLE sales ALTER COLUMN public_invoice_token SET NOT NULL;

-- Default for new rows
ALTER TABLE sales ALTER COLUMN public_invoice_token SET DEFAULT gen_random_uuid()::text;

-- Unique index (not a constraint, so we can name it cleanly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_public_invoice_token
  ON sales (public_invoice_token);

-- ============================================================
-- FASE 4: RPC publica segura por token (reemplaza folio-based)
-- NO devuelve patient_name, payment_method, ni datos internos
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_sale_invoice_context_by_token(
  p_clinic_slug          TEXT,
  p_public_invoice_token TEXT
)
RETURNS TABLE (
  clinic_name  TEXT,
  clinic_slug  TEXT,
  sale_folio   TEXT,
  service_name TEXT,
  amount       NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name        AS clinic_name,
    c.slug        AS clinic_slug,
    s.folio       AS sale_folio,
    s.service_name,
    s.amount
  FROM clinics c
  JOIN sales s ON s.clinic_id = c.id
  WHERE c.slug = p_clinic_slug
    AND s.public_invoice_token = p_public_invoice_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_sale_invoice_context_by_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_sale_invoice_context_by_token(TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- Drop the insecure folio-based RPC (superseded by token version)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_public_sale_invoice_context(TEXT, TEXT);

-- ============================================================
-- FASE 5: submit_invoice_request con token en lugar de folio
-- p_public_invoice_token reemplaza p_sale_folio
-- ============================================================
DROP FUNCTION IF EXISTS public.submit_invoice_request(
  TEXT, TEXT, TEXT, TEXT, DATE, NUMERIC, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.submit_invoice_request(
  p_clinic_slug          TEXT,
  p_public_invoice_token TEXT,      -- NULL si es QR fijo
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
  p_notes                TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clinic_id  UUID;
  v_sale_id    UUID;
  v_source     TEXT;
  v_result     JSONB;
BEGIN
  -- 1. Validar clinica por slug
  SELECT id INTO v_clinic_id
  FROM clinics
  WHERE slug = p_clinic_slug;

  IF v_clinic_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Clinica no encontrada');
  END IF;

  -- 2. Validar token de venta si se proporciono
  IF p_public_invoice_token IS NOT NULL AND p_public_invoice_token <> '' THEN
    SELECT id INTO v_sale_id
    FROM sales
    WHERE public_invoice_token = p_public_invoice_token
      AND clinic_id = v_clinic_id;

    IF v_sale_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Venta no encontrada para esta clinica');
    END IF;

    -- Verificar que no existe solicitud activa para esta venta
    IF EXISTS (
      SELECT 1 FROM invoice_requests
      WHERE sale_id = v_sale_id
        AND status NOT IN ('cancelled', 'rejected')
    ) THEN
      RETURN jsonb_build_object('error', 'Ya existe una solicitud activa para esta venta');
    END IF;

    v_source := 'sale_qr';
  ELSE
    v_sale_id := NULL;
    v_source := 'fixed_qr';
  END IF;

  -- 3. Validaciones de campos fiscales
  IF p_rfc !~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$' THEN
    RETURN jsonb_build_object('error', 'RFC invalido');
  END IF;

  IF p_tax_zip_code !~ '^[0-9]{5}$' THEN
    RETURN jsonb_build_object('error', 'Codigo postal invalido');
  END IF;

  IF p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('error', 'Correo invalido');
  END IF;

  -- 4. Insertar solicitud con campos controlados por servidor
  INSERT INTO invoice_requests (
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

  -- 5. Actualizar status de venta si aplica
  IF v_sale_id IS NOT NULL THEN
    UPDATE sales SET status = 'fiscal_data_received'
    WHERE id = v_sale_id;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_invoice_request(
  TEXT, TEXT, TEXT, TEXT, DATE, NUMERIC, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;
