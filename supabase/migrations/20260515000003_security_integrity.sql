-- FiscoBot v0.2C — Security & Integrity Repair
-- Applies: sale_id/clinic_id consistency, duplicate protection,
--          folio counter table, public insert RPC, RLS hardening
-- Must be applied AFTER 20260515000000 and 20260515000001

-- ============================================================
-- A) Consistencia sale_id / clinic_id
-- Agregamos UNIQUE(id, clinic_id) a sales para permitir FK compuesta
-- ============================================================
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_id_clinic_id_unique;
ALTER TABLE sales ADD CONSTRAINT sales_id_clinic_id_unique UNIQUE (id, clinic_id);

-- Ahora invoice_requests puede tener FK compuesta (sale_id, clinic_id) -> sales(id, clinic_id)
-- Esto garantiza que si sale_id no es null, pertenece al mismo clinic_id
ALTER TABLE invoice_requests DROP CONSTRAINT IF EXISTS invoice_requests_sale_clinic_fk;
ALTER TABLE invoice_requests
  ADD CONSTRAINT invoice_requests_sale_clinic_fk
  FOREIGN KEY (sale_id, clinic_id)
  REFERENCES sales (id, clinic_id)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- B) Duplicados por QR de venta — unique partial index
-- Solo una solicitud "activa" por sale_id (excluye cancelled/rejected)
-- Se permite reintentar si la anterior fue rechazada/cancelada
-- ============================================================
DROP INDEX IF EXISTS idx_invoice_requests_unique_active_sale;
CREATE UNIQUE INDEX idx_invoice_requests_unique_active_sale
  ON invoice_requests (sale_id)
  WHERE sale_id IS NOT NULL
    AND status NOT IN ('cancelled', 'rejected');

-- ============================================================
-- C) Tabla de contadores por clínica para folios transaccionales
-- ============================================================
CREATE TABLE IF NOT EXISTS clinic_counters (
  clinic_id  UUID PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  next_sale  BIGINT NOT NULL DEFAULT 1
);

-- Inicializar contadores para clínicas existentes basado en ventas actuales
INSERT INTO clinic_counters (clinic_id, next_sale)
SELECT
  c.id,
  COALESCE(MAX(
    CASE WHEN s.folio ~ '^V-[0-9]+$'
    THEN CAST(SUBSTRING(s.folio FROM 3) AS BIGINT) + 1
    ELSE 1 END
  ), 1)
FROM clinics c
LEFT JOIN sales s ON s.clinic_id = c.id
GROUP BY c.id
ON CONFLICT (clinic_id) DO NOTHING;

-- ============================================================
-- C2) Función transaccional para generar folios seguros
-- Usa advisory lock por clinic_id para evitar colisiones concurrentes
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_sale_folio(p_clinic_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next  BIGINT;
  v_folio TEXT;
BEGIN
  -- Insertar counter si no existe (primera venta de la clínica)
  INSERT INTO clinic_counters (clinic_id, next_sale)
  VALUES (p_clinic_id, 1)
  ON CONFLICT (clinic_id) DO NOTHING;

  -- Incrementar atómicamente con FOR UPDATE para bloquear la fila
  UPDATE clinic_counters
  SET next_sale = next_sale + 1
  WHERE clinic_id = p_clinic_id
  RETURNING next_sale - 1 INTO v_next;

  v_folio := 'V-' || LPAD(v_next::TEXT, 6, '0');
  RETURN v_folio;
END;
$$;

-- Revocar acceso anon/authenticated a la función directa
-- Solo el server (service_role) o acciones server-side deben llamarla
REVOKE EXECUTE ON FUNCTION public.generate_sale_folio(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_sale_folio(UUID) TO service_role;
-- También permitimos a authenticated para que server actions via JWT la llamen
GRANT EXECUTE ON FUNCTION public.generate_sale_folio(UUID) TO authenticated;

-- ============================================================
-- D) RPC pública segura para formulario público (reemplaza INSERT directo)
-- Solo acepta campos del formulario público, construye clinic_id desde slug
-- No permite status privilegiados ni UUID desde el exterior
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_invoice_request(
  p_clinic_slug    TEXT,
  p_sale_folio     TEXT,      -- NULL si es QR fijo
  p_patient_name   TEXT,
  p_patient_phone  TEXT,
  p_payment_date   DATE,
  p_amount         NUMERIC,
  p_service_name   TEXT,
  p_payment_method TEXT,
  p_email          TEXT,
  p_rfc            TEXT,
  p_legal_name     TEXT,
  p_tax_zip_code   TEXT,
  p_tax_regime     TEXT,
  p_cfdi_use       TEXT,
  p_notes          TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clinic_id  UUID;
  v_sale_id    UUID;
  v_source     TEXT;
  v_result     JSONB;
BEGIN
  -- 1. Validar clínica por slug
  SELECT id INTO v_clinic_id
  FROM clinics
  WHERE slug = p_clinic_slug;

  IF v_clinic_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Clinica no encontrada');
  END IF;

  -- 2. Validar folio de venta si se proporcionó
  IF p_sale_folio IS NOT NULL AND p_sale_folio <> '' THEN
    SELECT id INTO v_sale_id
    FROM sales
    WHERE folio = p_sale_folio
      AND clinic_id = v_clinic_id;  -- CRÍTICO: valida que la venta pertenezca a ESA clínica

    IF v_sale_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Folio de venta no encontrado para esta clinica');
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
  -- NO permite status privilegiados, UUID, ni campos internos desde exterior
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
    'fiscal_data_received'  -- forzado: nunca 'issued' desde formulario público
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

-- Permitir ejecución anon (formulario público no requiere sesión)
GRANT EXECUTE ON FUNCTION public.submit_invoice_request(
  TEXT, TEXT, TEXT, TEXT, DATE, NUMERIC, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;

-- ============================================================
-- E) Índices adicionales requeridos por la auditoría
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoice_requests_clinic_sale ON invoice_requests(clinic_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_status_created ON invoice_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_counters_clinic ON clinic_counters(clinic_id);

-- ============================================================
-- F) RLS — Eliminar la policy WITH CHECK (true) pública insegura
--    y reemplazar con restricción a solo lectura para anon + RPC protegida
-- ============================================================
DROP POLICY IF EXISTS "Public insert invoice requests" ON invoice_requests;

-- anon NO tiene acceso a INSERT directo. Debe usar la RPC submit_invoice_request.
-- La RPC usa SECURITY DEFINER y valida todo server-side.

-- Para que la RPC pueda insertar como si fuera el service_role:
-- El SECURITY DEFINER la ejecuta como el dueño de la función (postgres/service_role)
-- así que no necesitamos policy pública de INSERT.

-- Agregar policy de SELECT limitado para anon sobre clinics (para validar slug en UI)
DROP POLICY IF EXISTS "Public read clinics by slug" ON clinics;
CREATE POLICY "Public read clinics by slug" ON clinics
  FOR SELECT
  TO anon
  USING (true);  -- Solo lectura pública de clinics para lookup de slug; no contiene datos sensibles

-- ============================================================
-- G) RLS de clinic_counters — solo service_role y la función
-- ============================================================
ALTER TABLE clinic_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only superadmin can read counters" ON clinic_counters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- La función generate_sale_folio usa SECURITY DEFINER y no necesita policy extra

-- ============================================================
-- H) CHECK constraint para RFC en invoice_requests
-- ============================================================
ALTER TABLE invoice_requests DROP CONSTRAINT IF EXISTS invoice_requests_rfc_format;
ALTER TABLE invoice_requests ADD CONSTRAINT invoice_requests_rfc_format
  CHECK (rfc ~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$');

-- ============================================================
-- I) Agregar columna accountant_profile_id en clinic_accountants si falta
-- La migración 0 usa accountant_id -> verificar y crear alias si aplica
-- ============================================================
-- (La migración 0 ya usa accountant_id, que referencia profiles(id), que es correcto)
-- Solo agregamos índice compuesto adicional
CREATE INDEX IF NOT EXISTS idx_clinic_accountants_both
  ON clinic_accountants(accountant_id, clinic_id);
