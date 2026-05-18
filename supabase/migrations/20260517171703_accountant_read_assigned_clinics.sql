-- Allow assigned accountants to read basic clinic rows used by dashboard export.
-- RLS still limits rows to clinics explicitly assigned in clinic_accountants.

DROP POLICY IF EXISTS "Accountants read assigned clinics" ON clinics;

CREATE POLICY "Accountants read assigned clinics" ON clinics
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ca.clinic_id
      FROM clinic_accountants ca
      WHERE ca.accountant_id = auth.uid()
    )
  );
