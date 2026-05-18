import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/auth/get-current-profile'

export async function getInvoiceRequestsForProfile(profile: Profile | null) {
  if (!profile) return []
  const supabase = await createClient()

  let query = supabase
    .from('invoice_requests')
    .select('*, sales!invoice_requests_sale_id_fkey(folio, service_name, amount)')
    .order('created_at', { ascending: false })

  if (profile.role !== 'superadmin') {
    if (profile.role === 'accountant') {
      const { data: assignments } = await supabase
        .from('clinic_accountants')
        .select('clinic_id')
        .eq('accountant_id', profile.id)
      const clinicIds = assignments?.map(a => a.clinic_id) || []
      if (clinicIds.length === 0) return []
      query = query.in('clinic_id', clinicIds)
    } else if (profile.clinic_id) {
      query = query.eq('clinic_id', profile.clinic_id)
    } else {
      return []
    }
  }

  const { data } = await query
  return data || []
}

export async function getInvoiceRequestById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoice_requests')
    .select('*, sales!invoice_requests_sale_id_fkey(folio, service_name, amount)')
    .eq('id', id)
    .single()
  return data
}

export async function createInvoiceRequest(data: {
  clinic_id: string
  sale_id?: string | null
  patient_name?: string
  patient_phone?: string
  email: string
  rfc: string
  legal_name: string
  tax_zip_code: string
  tax_regime: string
  cfdi_use: string
  notes?: string | null
  payment_date?: string | null
  amount?: number | null
  service_name?: string | null
  payment_method?: string | null
  source?: string
}) {
  const supabase = await createClient()
  const { data: request, error } = await supabase
    .from('invoice_requests')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return request
}

export async function updateInvoiceRequestStatus(id: string, status: string, rejectionReason?: string) {
  const supabase = await createClient()
  const updateData: Record<string, unknown> = { status }
  if (rejectionReason) updateData.rejection_reason = rejectionReason

  const { error } = await supabase
    .from('invoice_requests')
    .update(updateData)
    .eq('id', id)

  if (error) throw error
}

export async function assignUuidToRequest(requestId: string, cfdiUuid: string) {
  const supabase = await createClient()

  const { error: reqError } = await supabase
    .from('invoice_requests')
    .update({ uuid: cfdiUuid, status: 'issued' })
    .eq('id', requestId)

  if (reqError) throw reqError

  const { error: docError } = await supabase
    .from('invoice_documents')
    .insert({ invoice_request_id: requestId, cfdi_uuid: cfdiUuid })

  if (docError) throw docError
}
