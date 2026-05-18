-- Harden RBAC/RLS policies for the local demo billing workflow.
--
-- Goals:
-- - Replace broad FOR ALL policies on operational fiscal tables with
--   operation-specific policies.
-- - Disable hard deletes for normal authenticated/anonymous roles.
-- - Keep the public invoice request and CSF document flows working through
--   SECURITY DEFINER RPCs, not direct table access.

-- ---------------------------------------------------------------------------
-- Table grants
-- ---------------------------------------------------------------------------

REVOKE DELETE ON public.sales FROM anon, authenticated;
REVOKE DELETE ON public.invoice_requests FROM anon, authenticated;
REVOKE DELETE ON public.invoice_documents FROM anon, authenticated;
REVOKE DELETE ON public.invoice_request_csf_documents FROM anon, authenticated;
REVOKE DELETE ON public.clinic_accountants FROM anon, authenticated;

REVOKE SELECT ON public.sales FROM anon;
REVOKE SELECT ON public.invoice_requests FROM anon;
REVOKE SELECT ON public.invoice_request_csf_documents FROM anon;
REVOKE SELECT ON storage.objects FROM anon;

REVOKE INSERT ON public.invoice_requests FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.invoice_request_csf_documents FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Clinic members can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Superadmin full access sales" ON public.sales;
DROP POLICY IF EXISTS "Clinic members read sales" ON public.sales;
DROP POLICY IF EXISTS "Clinic admin/reception insert sales" ON public.sales;
DROP POLICY IF EXISTS "Clinic admin/reception update sales" ON public.sales;

CREATE POLICY "Sales select by allowed clinic roles"
ON public.sales
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = sales.clinic_id
      AND p.role IN ('clinic_admin', 'reception')
  )
);

CREATE POLICY "Sales insert by admin and reception"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = sales.clinic_id
      AND p.role IN ('clinic_admin', 'reception')
  )
);

CREATE POLICY "Sales update by clinic admin"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = sales.clinic_id
      AND p.role = 'clinic_admin'
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = sales.clinic_id
      AND p.role = 'clinic_admin'
  )
);

CREATE POLICY "Sales delete disabled for app roles"
ON public.sales
FOR DELETE
TO anon, authenticated
USING (false);

-- ---------------------------------------------------------------------------
-- invoice_requests
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Clinic members can manage invoice requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "Superadmin full access invoice_requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "Public can create invoice requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "Public insert invoice requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "Clinic members read invoice requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "Clinic admin update invoice requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "Accountant update invoice requests" ON public.invoice_requests;

CREATE POLICY "Invoice requests select by clinic role or assigned accountant"
ON public.invoice_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = invoice_requests.clinic_id
      AND p.role IN ('clinic_admin', 'reception')
  )
  OR EXISTS (
    SELECT 1
    FROM public.clinic_accountants ca
    WHERE ca.clinic_id = invoice_requests.clinic_id
      AND ca.accountant_id = auth.uid()
  )
);

CREATE POLICY "Invoice requests update by admin or assigned accountant"
ON public.invoice_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = invoice_requests.clinic_id
      AND p.role = 'clinic_admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.clinic_accountants ca
    WHERE ca.clinic_id = invoice_requests.clinic_id
      AND ca.accountant_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = invoice_requests.clinic_id
      AND p.role = 'clinic_admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.clinic_accountants ca
    WHERE ca.clinic_id = invoice_requests.clinic_id
      AND ca.accountant_id = auth.uid()
  )
);

CREATE POLICY "Invoice requests delete disabled for app roles"
ON public.invoice_requests
FOR DELETE
TO anon, authenticated
USING (false);

-- ---------------------------------------------------------------------------
-- invoice_request_csf_documents
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Superadmin full csf documents" ON public.invoice_request_csf_documents;
DROP POLICY IF EXISTS "Clinic members read csf documents" ON public.invoice_request_csf_documents;

CREATE POLICY "CSF documents select by clinic role or assigned accountant"
ON public.invoice_request_csf_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.invoice_requests ir
    WHERE ir.id = invoice_request_csf_documents.invoice_request_id
      AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = ir.clinic_id
            AND p.role IN ('clinic_admin', 'reception')
        )
        OR EXISTS (
          SELECT 1
          FROM public.clinic_accountants ca
          WHERE ca.clinic_id = ir.clinic_id
            AND ca.accountant_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "CSF documents insert disabled for app roles"
ON public.invoice_request_csf_documents
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "CSF documents update disabled for app roles"
ON public.invoice_request_csf_documents
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "CSF documents delete disabled for app roles"
ON public.invoice_request_csf_documents
FOR DELETE
TO anon, authenticated
USING (false);

-- ---------------------------------------------------------------------------
-- clinic_accountants
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Superadmin/clinic_admin manage clinic_accountants" ON public.clinic_accountants;
DROP POLICY IF EXISTS "Accountant read own assignments" ON public.clinic_accountants;

CREATE POLICY "Clinic accountants select by admin or accountant"
ON public.clinic_accountants
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR accountant_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = clinic_accountants.clinic_id
      AND p.role = 'clinic_admin'
  )
);

CREATE POLICY "Clinic accountants insert by admin"
ON public.clinic_accountants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = clinic_accountants.clinic_id
      AND p.role = 'clinic_admin'
  )
);

CREATE POLICY "Clinic accountants update by admin"
ON public.clinic_accountants
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = clinic_accountants.clinic_id
      AND p.role = 'clinic_admin'
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.clinic_id = clinic_accountants.clinic_id
      AND p.role = 'clinic_admin'
  )
);

CREATE POLICY "Clinic accountants delete disabled for app roles"
ON public.clinic_accountants
FOR DELETE
TO anon, authenticated
USING (false);
