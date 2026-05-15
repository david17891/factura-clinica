-- FiscoBot v0.2 — Demo seed data
-- Run AFTER applying 20260515000000_init.sql and 20260515000001_schema_hardening.sql
-- All data is fictional — no real patients, clinics, or accountants

-- 1. Demo clinic
INSERT INTO clinics (id, name, legal_name, slug, email, phone, address)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Clinica Dental Rio Colorado',
  'Dental Rio Colorado S.C.',
  'dental-rio-colorado',
  'facturacion@dentalrio.test',
  '6531234567',
  'San Luis Rio Colorado, Sonora'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Demo users (create via Supabase Auth UI or API first, then reference their IDs here)
-- NOTE: You must create these users in Supabase Auth Dashboard first.
-- After creating users, update their profile roles:
--
-- User 1 (clinic_admin): admin@dentalrio.test
-- User 2 (reception): recepcion@dentalrio.test
-- User 3 (accountant): contador@demo.test
--
-- Then run these updates:
-- UPDATE profiles SET role = 'clinic_admin', clinic_id = '00000000-0000-0000-0000-000000000001' WHERE email = 'admin@dentalrio.test';
-- UPDATE profiles SET role = 'reception', clinic_id = '00000000-0000-0000-0000-000000000001' WHERE email = 'recepcion@dentalrio.test';
-- UPDATE profiles SET role = 'accountant' WHERE email = 'contador@demo.test';

-- 3. Assign accountant to clinic (after creating the accountant user)
-- INSERT INTO clinic_accountants (clinic_id, accountant_id)
-- SELECT '00000000-0000-0000-0000-000000000001', id FROM profiles WHERE email = 'contador@demo.test'
-- ON CONFLICT DO NOTHING;

-- 4. Demo sales
INSERT INTO sales (id, clinic_id, folio, patient_name, patient_phone, patient_email, service_name, amount, payment_method, status)
VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'V-000001', 'Ana Lopez Demo', '6531112233', 'ana@demo.test', 'Limpieza dental', 800.00, 'Tarjeta', 'fiscal_data_received'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'V-000002', 'Carlos Mendez Demo', '6532223344', 'carlos@demo.test', 'Consulta dental', 500.00, 'Efectivo', 'not_requested'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'V-000003', 'Maria Ruiz Demo', '6533334455', 'maria@demo.test', 'Endodoncia', 3500.00, 'Transferencia', 'ready_to_invoice'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'V-000004', 'Roberto Salazar Demo', '6534445566', 'roberto@demo.test', 'Resina dental', 1200.00, 'Tarjeta', 'issued')
ON CONFLICT (clinic_id, folio) DO NOTHING;

-- 5. Demo invoice requests
INSERT INTO invoice_requests (id, clinic_id, sale_id, patient_name, patient_phone, email, rfc, legal_name, tax_zip_code, tax_regime, cfdi_use, status, source)
VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Ana Lopez Demo', '6531112233', 'ana@demo.test', 'LOAA900101ABC', 'ANA LOPEZ ALVAREZ', '83449', '605', 'D01', 'fiscal_data_received', 'sale_qr'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', 'Maria Ruiz Demo', '6533334455', 'maria@demo.test', 'RUMM880202DEF', 'MARIA RUIZ MORALES', '83457', '612', 'D01', 'ready_to_invoice', 'sale_qr'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', NULL, 'Public Patient Demo', NULL, 'public@demo.test', 'XAXX010101000', 'PUBLICO GENERAL', '83440', '616', 'D01', 'sent_to_accountant', 'fixed_qr'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000104', 'Roberto Salazar Demo', '6534445566', 'roberto@demo.test', 'SARJ760303GHI', 'ROBERTO SALAZAR RIOS', '83440', '605', 'D01', 'issued', 'sale_qr')
ON CONFLICT DO NOTHING;

-- 6. Update sale status for sale with issued invoice
UPDATE sales SET status = 'issued' WHERE id = '00000000-0000-0000-0000-000000000104';

-- 7. Demo invoice document for issued request
INSERT INTO invoice_documents (invoice_request_id, cfdi_uuid)
VALUES ('00000000-0000-0000-0000-000000000204', 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890')
ON CONFLICT DO NOTHING;
