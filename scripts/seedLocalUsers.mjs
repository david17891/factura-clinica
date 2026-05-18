import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const CLINIC_SLUG = 'dental-rio-colorado'
const PASSWORD = 'Demo123456!'

const DEMO_USERS = [
  {
    email: 'admin@dentalrio.test',
    fullName: 'Admin Dental Rio',
    role: 'clinic_admin',
    assignClinic: true,
    assignAccountant: false,
  },
  {
    email: 'recepcion@dentalrio.test',
    fullName: 'Recepcion Dental Rio',
    role: 'reception',
    assignClinic: true,
    assignAccountant: false,
  },
  {
    email: 'contador@dentalrio.test',
    fullName: 'Contador Demo',
    role: 'accountant',
    assignClinic: false,
    assignAccountant: true,
  },
]

function getLocalStatus() {
  const stdout = execFileSync('supabase status -o json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })

  const jsonStart = stdout.indexOf('{')
  const jsonEnd = stdout.lastIndexOf('}')

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No se pudo leer `supabase status -o json`. Verifica que Supabase local este corriendo.')
  }

  return JSON.parse(stdout.slice(jsonStart, jsonEnd + 1))
}

async function findUserByEmail(adminClient, email) {
  let page = 1
  const perPage = 100

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())
    if (user) return user

    if (data.users.length < perPage) return null
    page += 1
  }
}

async function updateAuthUser(adminClient, userId, userConfig) {
  const payload = {
    password: PASSWORD,
    user_metadata: { full_name: userConfig.fullName },
    app_metadata: { role: userConfig.role },
    email_confirm: true,
  }

  const { data, error } = await adminClient.auth.admin.updateUserById(userId, payload)
  if (!error) return data.user

  const retryPayload = { ...payload }
  delete retryPayload.email_confirm

  const retry = await adminClient.auth.admin.updateUserById(userId, retryPayload)
  if (retry.error) throw retry.error
  return retry.data.user
}

async function upsertDemoUser(adminClient, userConfig) {
  const existing = await findUserByEmail(adminClient, userConfig.email)

  if (existing) {
    const user = await updateAuthUser(adminClient, existing.id, userConfig)
    return { user, created: false }
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: userConfig.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: userConfig.fullName },
    app_metadata: { role: userConfig.role },
  })

  if (error) throw error
  return { user: data.user, created: true }
}

async function assertLogin(status, email) {
  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY ?? status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })

  if (signInError) {
    return { email, ok: false, error: signInError.message }
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, email, role, clinic_id')
    .eq('id', signInData.user.id)
    .single()

  await client.auth.signOut()

  if (profileError) {
    return { email, ok: false, error: profileError.message }
  }

  return { email, ok: true, profile }
}

async function main() {
  const status = getLocalStatus()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY ?? status.SECRET_KEY

  if (!status.API_URL || !serviceKey) {
    throw new Error('Faltan API_URL o SERVICE_ROLE_KEY locales. Ejecuta `npm run supabase:status`.')
  }

  const adminClient = createClient(status.API_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: clinic, error: clinicError } = await adminClient
    .from('clinics')
    .select('id, name, slug')
    .eq('slug', CLINIC_SLUG)
    .single()

  if (clinicError || !clinic) {
    throw new Error(`No se encontro la clinica demo con slug ${CLINIC_SLUG}: ${clinicError?.message ?? 'sin datos'}`)
  }

  const results = []

  for (const userConfig of DEMO_USERS) {
    const { user, created } = await upsertDemoUser(adminClient, userConfig)
    const clinicId = userConfig.assignClinic ? clinic.id : null

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: userConfig.email,
          full_name: userConfig.fullName,
          role: userConfig.role,
          clinic_id: clinicId,
        },
        { onConflict: 'id' }
      )

    if (profileError) throw profileError

    if (userConfig.assignAccountant) {
      const { error: assignmentError } = await adminClient
        .from('clinic_accountants')
        .upsert(
          {
            clinic_id: clinic.id,
            accountant_id: user.id,
          },
          { onConflict: 'clinic_id,accountant_id' }
        )

      if (assignmentError) throw assignmentError
    }

    results.push({ email: userConfig.email, role: userConfig.role, id: user.id, created })
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, email, role, clinic_id')
    .in('email', DEMO_USERS.map((user) => user.email))
    .order('email')

  if (profilesError) throw profilesError

  const { data: assignments, error: assignmentsError } = await adminClient
    .from('clinic_accountants')
    .select('clinic_id, accountant_id, profiles!clinic_accountants_accountant_id_fkey(email)')
    .eq('clinic_id', clinic.id)

  if (assignmentsError) throw assignmentsError

  const loginChecks = []
  for (const userConfig of DEMO_USERS) {
    loginChecks.push(await assertLogin(status, userConfig.email))
  }

  console.log('FiscoBot local demo users seeded')
  console.table(results)
  console.log('Profiles')
  console.table(profiles)
  console.log('Clinic accountant assignments')
  console.table(assignments)
  console.log('Login checks')
  console.table(loginChecks.map((check) => ({
    email: check.email,
    ok: check.ok,
    role: check.profile?.role ?? null,
    clinic_id: check.profile?.clinic_id ?? null,
    error: check.error ?? null,
  })))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
