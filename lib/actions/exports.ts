'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { canExport } from '@/lib/auth/permissions'

export async function exportRequestsCsvAction() {
  const profile = await getCurrentProfile()
  if (!profile || !canExport(profile.role)) {
    return { error: 'No tienes permisos para exportar' }
  }

  const supabase = await createClient()

  let query = supabase
    .from('invoice_requests')
    .select(`
      id,
      status,
      rfc,
      legal_name,
      tax_zip_code,
      tax_regime,
      cfdi_use,
      email,
      notes,
      uuid,
      patient_name,
      patient_phone,
      amount,
      service_name,
      payment_method,
      payment_date,
      source,
      created_at,
      clinics!invoice_requests_clinic_id_fkey(name),
      sales!invoice_requests_sale_id_fkey(folio, created_at),
      invoice_request_csf_documents(id)
    `)
    .order('created_at', { ascending: false })

  if (profile.role !== 'superadmin') {
    if (profile.role === 'accountant') {
      const { data: assignments } = await supabase
        .from('clinic_accountants')
        .select('clinic_id')
        .eq('accountant_id', profile.id)
      const clinicIds = assignments?.map(a => a.clinic_id) || []
      if (clinicIds.length === 0) return { error: 'Sin clinicas asignadas' }
      query = query.in('clinic_id', clinicIds)
    } else if (profile.clinic_id) {
      query = query.eq('clinic_id', profile.clinic_id)
    }
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  const rows = (data || []).map((r) => {
    const row = r as Record<string, unknown>
    const clinics = row.clinics as { name: string } | null
    const sales = row.sales as { folio: string; created_at: string } | null
    const csfDocuments = row.invoice_request_csf_documents as Array<{ id: string }> | null
    return {
      clinica: clinics?.name || '',
      folio_venta: sales?.folio || '',
      fecha_venta: sales?.created_at || '',
      paciente: (row.patient_name as string) || '',
      telefono: (row.patient_phone as string) || '',
      correo: (row.email as string) || '',
      servicio: (row.service_name as string) || '',
      monto: row.amount || '',
      metodo_pago: (row.payment_method as string) || '',
      rfc: (row.rfc as string) || '',
      nombre_fiscal: (row.legal_name as string) || '',
      cp_fiscal: (row.tax_zip_code as string) || '',
      regimen_fiscal: (row.tax_regime as string) || '',
      uso_cfdi: (row.cfdi_use as string) || '',
      estado: (row.status as string) || '',
      uuid: (row.uuid as string) || '',
      constancia_subida: csfDocuments?.length ? 'sí' : 'no',
      notas: (row.notes as string) || '',
    }
  })

  return { data: rows }
}
