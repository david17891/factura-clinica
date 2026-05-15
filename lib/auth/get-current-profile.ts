import { createClient } from '@/lib/supabase/server'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'superadmin' | 'clinic_admin' | 'reception' | 'accountant'
  clinic_id: string | null
  created_at: string
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as Profile | null
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
