ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'corrected_by_patient' AFTER 'rejected';
