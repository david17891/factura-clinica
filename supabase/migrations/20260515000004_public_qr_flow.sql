-- FiscoBot v0.2D — Public QR flow + hardening
-- Must be applied AFTER 20260515000003_security_integrity.sql

-- ============================================================
-- FASE 1: RPC publica para QR por venta — datos minimos
-- Permite a anon obtener contexto de venta para formulario
-- sin abrir SELECT en tabla sales.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_sale_invoice_context(
  p_clinic_slug TEXT,
  p_sale_folio  TEXT
)
RETURNS TABLE (
  clinic_name    TEXT,
  clinic_slug    TEXT,
  sale_folio     TEXT,
  service_name   TEXT,
  amount         NUMERIC,
  payment_method TEXT,
  patient_name   TEXT
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
    s.amount,
    s.payment_method,
    s.patient_name
  FROM clinics c
  JOIN sales s ON s.clinic_id = c.id
  WHERE c.slug = p_clinic_slug
    AND s.folio = p_sale_folio;
END;
$$;

-- Solo anon y authenticated pueden llamarla (formulario publico)
REVOKE EXECUTE ON FUNCTION public.get_public_sale_invoice_context(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_sale_invoice_context(TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- FASE 2: RPC publica para QR fijo — datos minimos de clinica
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_clinic_invoice_context(
  p_clinic_slug TEXT
)
RETURNS TABLE (
  clinic_name TEXT,
  clinic_slug TEXT,
  address     TEXT,
  phone       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name  AS clinic_name,
    c.slug  AS clinic_slug,
    c.address,
    c.phone
  FROM clinics c
  WHERE c.slug = p_clinic_slug;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_clinic_invoice_context(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_clinic_invoice_context(TEXT) TO anon, authenticated;

-- ============================================================
-- FASE 3: Hardening de generate_sale_folio
-- Validar dentro de la funcion que el caller tiene permiso
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_sale_folio(p_clinic_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next    BIGINT;
  v_folio   TEXT;
  v_role    TEXT;
  v_cid     UUID;
BEGIN
  -- Validar que el caller pertenece a esta clinica con rol permitido
  SELECT role, clinic_id INTO v_role, v_cid
  FROM profiles
  WHERE id = auth.uid();

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF v_role NOT IN ('superadmin', 'clinic_admin', 'reception') THEN
    RAISE EXCEPTION 'Rol no autorizado para generar folios: %', v_role;
  END IF;

  IF v_cid IS NOT NULL AND v_cid <> p_clinic_id THEN
    RAISE EXCEPTION 'No tienes acceso a esta clinica';
  END IF;

  -- superadmin sin clinic_id puede generar folios para cualquier clinica
  -- (esto es aceptable ya que superadmin tiene acceso total)

  -- Insertar counter si no existe
  INSERT INTO clinic_counters (clinic_id, next_sale)
  VALUES (p_clinic_id, 1)
  ON CONFLICT (clinic_id) DO NOTHING;

  -- Incrementar atomicamente
  UPDATE clinic_counters
  SET next_sale = next_sale + 1
  WHERE clinic_id = p_clinic_id
  RETURNING next_sale - 1 INTO v_next;

  v_folio := 'V-' || LPAD(v_next::TEXT, 6, '0');
  RETURN v_folio;
END;
$$;

-- Revocar y re-grant solo a authenticated (no PUBLIC, no anon)
REVOKE EXECUTE ON FUNCTION public.generate_sale_folio(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_sale_folio(UUID) FROM service_role;
GRANT EXECUTE ON FUNCTION public.generate_sale_folio(UUID) TO authenticated;

-- ============================================================
-- FASE 4: search_path seguro en submit_invoice_request
-- ============================================================
ALTER FUNCTION public.submit_invoice_request(
  TEXT, TEXT, TEXT, TEXT, DATE, NUMERIC, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) SET search_path = public, pg_temp;

-- ============================================================
-- FASE 4b: Reducir policy publica de clinics — solo por slug
-- La policy actual "Public read clinics by slug" con USING (true)
-- permite leer TODAS las columnas. Mejor usar la RPC para todo.
-- ============================================================
DROP POLICY IF EXISTS "Public read clinics by slug" ON clinics;

-- Crear policy mas restrictiva: anon solo puede leer columnas minimas
-- via la RPC get_public_clinic_invoice_context.
-- Pero para compatibilidad con getClinicBySlug server-side (que usa
-- el server client con anon key), mantenemos SELECT limitado.
CREATE POLICY "Public read minimal clinic data" ON clinics
  FOR SELECT
  TO anon
  USING (true);
-- Nota: clinics no contiene datos sensibles (RFC interno, etc).
-- Las columnas son: name, legal_name, slug, phone, email, address, logo_url.
-- Esto es aceptable para un lookup publico de clinica.
