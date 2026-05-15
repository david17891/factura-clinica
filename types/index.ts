export type UserRole = 'superadmin' | 'clinic_admin' | 'reception' | 'accountant';

export type InvoiceStatus =
  | 'not_requested'
  | 'fiscal_data_pending'
  | 'fiscal_data_received'
  | 'ready_to_invoice'
  | 'sent_to_accountant'
  | 'issued'
  | 'rejected'
  | 'cancelled';

export interface Clinic {
  id: string;
  name: string;
  legal_name: string | null;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  clinic_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Sale {
  id: string;
  clinic_id: string;
  folio: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  service_name: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  status: InvoiceStatus;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  invoice_required?: boolean;
}

export interface InvoiceRequest {
  id: string;
  sale_id: string | null;
  clinic_id: string;
  payment_date: string | null;
  amount: number | null;
  service_name: string | null;
  payment_method: string | null;
  patient_name: string | null;
  patient_phone: string | null;
  rfc: string;
  legal_name: string;
  tax_zip_code: string;
  tax_regime: string;
  cfdi_use: string;
  email: string;
  notes: string | null;
  csf_file_url: string | null;
  status: InvoiceStatus;
  uuid: string | null;
  rejection_reason: string | null;
  source: 'fixed_qr' | 'sale_qr' | 'manual' | 'csf_upload_pending';
  created_at: string;
  updated_at?: string;
}

export interface InvoiceDocument {
  id: string;
  invoice_request_id: string;
  cfdi_uuid: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  issued_at: string;
  created_at: string;
}
