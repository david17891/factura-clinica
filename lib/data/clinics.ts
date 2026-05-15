import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/auth/get-current-profile'

export async function getClinicBySlug(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function getClinicsForProfile(profile: Profile | null) {
  if (!profile) return []
  const supabase = await createClient()

  if (profile.role === 'superadmin') {
    const { data } = await supabase.from('clinics').select('*').order('name')
    return data || []
  }

  if (profile.role === 'accountant') {
    const { data: assignments } = await supabase
      .from('clinic_accountants')
      .select('clinic_id')
      .eq('accountant_id', profile.id)
    const clinicIds = assignments?.map(a => a.clinic_id) || []
    if (clinicIds.length === 0) return []
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .in('id', clinicIds)
      .order('name')
    return data || []
  }

  if (profile.clinic_id) {
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', profile.clinic_id)
    return data || []
  }

  return []
}
