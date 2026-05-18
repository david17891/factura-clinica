-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('superadmin', 'clinic_admin', 'reception', 'accountant');

CREATE TYPE invoice_status AS ENUM (
  'not_requested',
  'fiscal_data_pending',
  'fiscal_data_received',
  'ready_to_invoice',
  'sent_to_accountant',
  'issued',
  'rejected',
  'cancelled'
);

-- 2. TABLES

-- Clinics
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  legal_name TEXT,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'reception',
  clinic_id UUID REFERENCES clinics(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accountants assignment (many-to-many)
CREATE TABLE clinic_accountants (
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  accountant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (clinic_id, accountant_id)
);

-- Sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  folio TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_email TEXT,
  service_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference TEXT,
  status invoice_status NOT NULL DEFAULT 'not_requested',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, folio)
);

-- Invoice Requests
CREATE TABLE invoice_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  
  -- Public flow data (if sale_id is null)
  payment_date DATE,
  amount DECIMAL(12,2),
  service_name TEXT,
  payment_method TEXT,
  patient_name TEXT,
  patient_phone TEXT,

  -- Fiscal Data
  rfc TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  tax_zip_code TEXT NOT NULL,
  tax_regime TEXT NOT NULL,
  cfdi_use TEXT NOT NULL,
  email TEXT NOT NULL,
  notes TEXT,
  
  -- Document
  csf_file_url TEXT,
  
  -- Status & Tracking
  status invoice_status NOT NULL DEFAULT 'fiscal_data_received',
  uuid TEXT, -- CFDI UUID
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Events
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS POLICIES

-- Enable RLS on all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_accountants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Clinics: Users can read their assigned clinic
CREATE POLICY "Users can read own clinic" ON clinics
  FOR SELECT USING (
    id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    OR 
    id IN (SELECT clinic_id FROM clinic_accountants WHERE accountant_id = auth.uid())
  );

-- Sales: Clinic members can manage sales
CREATE POLICY "Clinic members can manage sales" ON sales
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
  );

-- Invoice Requests: 
-- 1. Public can insert
CREATE POLICY "Public can create invoice requests" ON invoice_requests
  FOR INSERT WITH CHECK (true);

-- 2. Clinic members can manage
CREATE POLICY "Clinic members can manage invoice requests" ON invoice_requests
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    OR 
    clinic_id IN (SELECT clinic_id FROM clinic_accountants WHERE accountant_id = auth.uid())
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'reception');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
