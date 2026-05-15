import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/auth/get-current-profile'

export async function getSalesForProfile(profile: Profile | null) {
  if (!profile) return []
  const supabase = await createClient()

  let query = supabase.from('sales').select('*').order('created_at', { ascending: false })

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

export async function getSalesByClinicId(clinicId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sales')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getSaleByFolio(clinicId: string, folio: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sales')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('folio', folio)
    .single()
  return data
}

export async function generateFolio(clinicId: string): Promise<string> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)

  const nextNum = (count || 0) + 1
  return `V-${String(nextNum).padStart(6, '0')}`
}

export async function createSale(data: {
  clinic_id: string
  folio: string
  patient_name: string
  patient_phone?: string
  patient_email?: string
  service_name: string
  amount: number
  payment_method: string
  reference?: string
  created_by?: string
}) {
  const supabase = await createClient()
  const { data: sale, error } = await supabase
    .from('sales')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return sale
}

export async function updateSaleStatus(id: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('sales')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}
