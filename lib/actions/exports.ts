'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { canExport } from '@/lib/auth/permissions'

type ExportInvoiceRequestRow = {
  invoice_request_id: string
  clinic_name: string | null
  sale_folio: string | null
  sale_date: string | null
  sale_amount: number | string | null
  sale_payment_method: string | null
  patient_name: string | null
  patient_email: string | null
  patient_phone: string | null
  rfc: string | null
  legal_name: string | null
  tax_regime: string | null
  tax_zip_code: string | null
  cfdi_use: string | null
  request_status: string | null
  cfdi_uuid: string | null
  constancia_subida: boolean | null
  created_at: string | null
  updated_at: string | null
}

const exportStatusLabels: Record<string, string> = {
  fiscal_data_received: 'Recibida',
  fiscal_data_pending: 'Datos pendientes',
  sent_to_accountant: 'En revisión',
  corrected_by_patient: 'Corregida por paciente',
  ready_to_invoice: 'Lista para facturar',
  issued: 'Emitida',
  rejected: 'Requiere corrección',
  cancelled: 'Cancelada / No facturable',
}

export async function exportRequestsCsvAction() {
  const profile = await getCurrentProfile()
  if (!profile || !canExport(profile.role)) {
    return { error: 'No tienes permisos para exportar' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('export_invoice_requests_csv')
  if (error) return { error: error.message }

  const rows = ((data || []) as ExportInvoiceRequestRow[]).map((row) => ({
    id_solicitud: row.invoice_request_id || '',
    clinica: row.clinic_name || '',
    folio_venta: row.sale_folio || '',
    fecha_venta: row.sale_date || '',
    paciente: row.patient_name || '',
    telefono: row.patient_phone || '',
    correo: row.patient_email || '',
    monto: row.sale_amount || '',
    metodo_pago: row.sale_payment_method || '',
    rfc: row.rfc || '',
    nombre_fiscal: row.legal_name || '',
    cp_fiscal: row.tax_zip_code || '',
    regimen_fiscal: row.tax_regime || '',
    uso_cfdi: row.cfdi_use || '',
    estado: row.request_status ? exportStatusLabels[row.request_status] || row.request_status : '',
    uuid: row.cfdi_uuid || '',
    constancia_subida: row.constancia_subida ? 'si' : 'no',
    fecha_solicitud: row.created_at || '',
    actualizado: row.updated_at || '',
  }))

  return { data: rows }
}
