-- FiscoBot v0.2 — Schema hardening and RLS improvements
-- Adds: updated_at timestamps, indexes, CHECK constraints, improved RLS, invoice_documents table, source field

-- 1. Add updated_at to all tables
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE invoice_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add source field to invoice_requests
ALTER TABLE invoice_requests ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('fixed_qr', 'sale_qr', 'manual', 'csf_upload_pending'));

-- 3. Add created_by to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 4. Add invoice_required to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_required BOOLEAN DEFAULT false;

-- 5. Add invoice_documents table for CFDI UUID + PDF/XML references
CREATE TABLE IF NOT EXISTS invoice_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_request_id UUID REFERENCES invoice_requests(id) ON DELETE CASCADE NOT NULL,
  cfdi_uuid TEXT,
  pdf_url TEXT,
  xml_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoice_documents ENABLE ROW LEVEL SECURITY;

-- 6. CHECK constraints
-- Amount must be positive
DO $$ BEGIN
  ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_amount_positive;
  ALTER TABLE sales ADD CONSTRAINT sales_amount_positive CHECK (amount > 0);
END $$;

DO $$ BEGIN
  ALTER TABLE invoice_requests DROP CONSTRAINT IF EXISTS invoice_requests_amount_positive;
  ALTER TABLE invoice_requests ADD CONSTRAINT invoice_requests_amount_positive CHECK (amount IS NULL OR amount > 0);
END $$;

-- Tax zip code must be 5 digits when provided
DO $$ BEGIN
  ALTER TABLE invoice_requests DROP CONSTRAINT IF EXISTS invoice_requests_tax_zip_code_format;
  ALTER TABLE invoice_requests ADD CONSTRAINT invoice_requests_tax_zip_code_format CHECK (tax_zip_code ~ '^[0-9]{5}$');
END $$;

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_clinic_id ON sales(clinic_id);
CREATE INDEX IF NOT EXISTS idx_sales_folio ON sales(folio);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_clinic_folio ON sales(clinic_id, folio);

CREATE INDEX IF NOT EXISTS idx_invoice_requests_clinic_id ON invoice_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_sale_id ON invoice_requests(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_status ON invoice_requests(status);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_created_at ON invoice_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_source ON invoice_requests(source);

CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_clinic_accountants_clinic ON clinic_accountants(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_accountants_accountant ON clinic_accountants(accountant_id);

CREATE INDEX IF NOT EXISTS idx_invoice_documents_invoice_request ON invoice_documents(invoice_request_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_clinic_id ON audit_events(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);

-- 8. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_clinics_updated_at BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_invoice_requests_updated_at BEFORE UPDATE ON invoice_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_audit_events_updated_at BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Drop overly permissive RLS policies and replace with secure ones
DROP POLICY IF EXISTS "Public can create invoice requests" ON invoice_requests;
DROP POLICY IF EXISTS "Clinic members can manage sales" ON sales;
DROP POLICY IF EXISTS "Clinic members can manage invoice requests" ON invoice_requests;
DROP POLICY IF EXISTS "Users can read own clinic" ON clinics;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- 10. RLS: Superadmin can see everything
CREATE POLICY "Superadmin full access clinics" ON clinics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Superadmin full access profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Superadmin full access sales" ON sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Superadmin full access invoice_requests" ON invoice_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Superadmin full access invoice_documents" ON invoice_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Superadmin full access clinic_accountants" ON clinic_accountants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- 11. RLS: Clinic members (clinic_admin, reception) can see their clinic data
CREATE POLICY "Clinic members read own clinic" ON clinics
  FOR SELECT USING (
    id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role IN ('clinic_admin', 'reception'))
  );

CREATE POLICY "Clinic admin update own clinic" ON clinics
  FOR UPDATE USING (
    id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role = 'clinic_admin')
  );

-- 12. RLS: Users can read their own profile
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Superadmin manage profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- 13. RLS: Sales — clinic members can read, clinic_admin/reception can insert/update
CREATE POLICY "Clinic members read sales" ON sales
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role IN ('clinic_admin', 'reception')
    )
    OR
    clinic_id IN (
      SELECT clinic_id FROM clinic_accountants WHERE accountant_id = auth.uid()
    )
  );

CREATE POLICY "Clinic admin/reception insert sales" ON sales
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role IN ('clinic_admin', 'reception')
    )
  );

CREATE POLICY "Clinic admin/reception update sales" ON sales
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role IN ('clinic_admin', 'reception')
    )
  );

-- 14. RLS: Invoice requests
-- Public can ONLY insert (for the public form), no read
CREATE POLICY "Public insert invoice requests" ON invoice_requests
  FOR INSERT WITH CHECK (true);

-- Authenticated users: clinic members + accountants can read their clinic's requests
CREATE POLICY "Clinic members read invoice requests" ON invoice_requests
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role IN ('clinic_admin', 'reception')
    )
    OR
    clinic_id IN (
      SELECT clinic_id FROM clinic_accountants WHERE accountant_id = auth.uid()
    )
  );

-- Clinic admin can update requests
CREATE POLICY "Clinic admin update invoice requests" ON invoice_requests
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role = 'clinic_admin'
    )
  );

-- Accountant can update status of assigned clinic requests
CREATE POLICY "Accountant update invoice requests" ON invoice_requests
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_accountants WHERE accountant_id = auth.uid()
    )
  );

-- 15. RLS: Invoice documents — only clinic admin and accountant can access
CREATE POLICY "Clinic members read invoice documents" ON invoice_documents
  FOR SELECT USING (
    invoice_request_id IN (
      SELECT ir.id FROM invoice_requests ir
      WHERE ir.clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role IN ('clinic_admin', 'reception')
      )
    )
  );

CREATE POLICY "Clinic admin/accountant insert invoice documents" ON invoice_documents
  FOR INSERT WITH CHECK (
    invoice_request_id IN (
      SELECT ir.id FROM invoice_requests ir
      WHERE ir.clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role = 'clinic_admin'
      )
      OR ir.clinic_id IN (
        SELECT clinic_id FROM clinic_accountants WHERE accountant_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clinic admin/accountant update invoice documents" ON invoice_documents
  FOR UPDATE USING (
    invoice_request_id IN (
      SELECT ir.id FROM invoice_requests ir
      WHERE ir.clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role = 'clinic_admin'
      )
      OR ir.clinic_id IN (
        SELECT clinic_id FROM clinic_accountants WHERE accountant_id = auth.uid()
      )
    )
  );

-- 16. RLS: Clinic accountants — only superadmin and clinic_admin can manage
CREATE POLICY "Superadmin/clinic_admin manage clinic_accountants" ON clinic_accountants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    OR
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid() AND role = 'clinic_admin'
    )
  );

CREATE POLICY "Accountant read own assignments" ON clinic_accountants
  FOR SELECT USING (accountant_id = auth.uid());

-- 17. RLS: Audit events
CREATE POLICY "Clinic members read audit events" ON audit_events
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "System insert audit events" ON audit_events
  FOR INSERT WITH CHECK (true);

-- 18. Update handle_new_user to use app_metadata for role if provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Check if role was set in raw_app_meta_data (server-side, not user-editable)
  user_role_val := COALESCE(
    (new.raw_app_meta_data->>'role')::user_role,
    'reception'::user_role
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', user_role_val);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
