# FiscoBot — Cloud Preview Deployment Guide

## Estado actual

- **Vercel project vinculado:** `david17891-9351s-projects/fiscobot`
- **Deploy inicial:** Falló (`Status: Error`) porque `NEXT_PUBLIC_SUPABASE_URL` apunta a `127.0.0.1:54321`
- **Supabase Cloud:** No configurado (requiere `supabase login`)
- **Entorno objetivo:** Preview deployment con datos ficticios, no producción

---

## Requisitos previos

- Cuenta Vercel con CLI autenticada (`vercel --version` funciona)
- Cuenta Supabase con CLI autenticada (`supabase login`)
- Node.js 20+, Docker Desktop (para seed local si es necesario)

---

## Variables necesarias en Vercel

| Variable | Alcance | Valor ejemplo | Notas |
|----------|---------|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Preview + Production | `https://<project-ref>.supabase.co` | URL del proyecto Supabase Cloud demo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview + Production | `<anon-key>` | Publishable key del proyecto Supabase Cloud demo |

**No requiere `SUPABASE_SERVICE_ROLE_KEY`** en el cliente. Todas las operaciones privilegiadas usan Server Actions o RPCs `SECURITY DEFINER`.

---

## Paso 1 — Crear proyecto Supabase Cloud demo

```bash
# Crear proyecto (región cercana a México recomendada: us-east-1)
supabase projects create factura-clinica-demo --org-id <TU_ORG_ID> --region us-east-1 --plan free

# Obtener project ref (ej: abcdefghijklmnopqrst)
supabase projects list
```

**Reglas del proyecto demo:**
- Nombre: `factura-clinica-demo`
- Región: `us-east-1` (N. Virginia, cercano a México)
- Plan: Free (suficiente para demo)
- **No mezclar con producción futura**

---

## Paso 2 — Vincular y push de migraciones

```bash
# Vincular proyecto local al cloud
supabase link --project-ref <PROJECT_REF>

# Revisar migraciones pendientes
supabase migration list

# Aplicar migraciones en cloud
supabase db push
```

**Verificar migraciones aplicadas:**
- `20260515000000_init.sql`
- `20260515000001_schema_hardening.sql`
- `20260515000002_seed_data.sql`
- `20260515000003_security_integrity.sql`
- `20260515000004_public_qr_flow.sql`
- `20260515000005_public_invoice_token.sql`
- `20260515161857_fix_profiles_rls_recursion.sql`
- `20260517171303_stabilize_demo_e2e.sql`
- `20260517171703_accountant_read_assigned_clinics.sql`
- `20260517215536_csf_documents_v03.sql`
- `20260518053019_harden_rbac_rls_policies.sql`
- `20260518055746_secure_invoice_request_export_rpc.sql`
- `20260518163418_add_corrected_by_patient_status.sql`
- `20260518163419_patient_correction_flow.sql`

**Nota importante:** La migración `20260517215536_csf_documents_v03.sql` incluye policies de Storage. Si el bucket `csf-documents` no se crea automáticamente:

1. Ir a Supabase Dashboard → Storage → New Bucket
2. Nombre: `csf-documents`
3. **Public bucket: OFF** (debe ser privado)
4. Aplicar policies manualmente si es necesario:
   - Upload público: restringido a `invoice_request` existente
   - Read: solo clinic members / accountants asignados
   - No anon list/read directo

---

## Paso 3 — Configurar Auth demo en cloud

**Opción A: Script adaptado (recomendado)**

Crear `scripts/seedCloudUsers.mjs` (no commitear secretos):

```javascript
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL // Cloud project URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Cloud service role

const supabase = createClient(url, serviceKey)

const users = [
  { email: 'admin@dentalrio.test', password: 'Demo123456!', role: 'clinic_admin' },
  { email: 'recepcion@dentalrio.test', password: 'Demo123456!', role: 'reception' },
  { email: 'contador@dentalrio.test', password: 'Demo123456!', role: 'accountant' },
]

async function seed() {
  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.email.split('@')[0] }
    })
    if (error) { console.error('Error creating', u.email, error); continue }

    // Update profile role
    await supabase.from('profiles').update({ role: u.role }).eq('id', data.user.id)
  }

  // Assign accountant to clinic
  const { data: accountant } = await supabase.from('profiles').select('id').eq('email', 'contador@dentalrio.test').single()
  const { data: clinic } = await supabase.from('clinics').select('id').eq('slug', 'dental-rio-colorado').single()
  if (accountant && clinic) {
    await supabase.from('clinic_accountants').insert({ clinic_id: clinic.id, accountant_id: accountant.id })
  }

  console.log('Cloud demo users seeded')
}

seed()
```

Ejecutar:
```bash
# No commitear este archivo ni las variables
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role> \
node scripts/seedCloudUsers.mjs
```

**Opción B: Manual vía Dashboard**
- Authentication → Users → Add User
- Database → profiles → Update role
- Database → clinic_accountants → Insert assignment

---

## Paso 4 — Verificar Storage Cloud

En Supabase Dashboard:

1. **Storage → Buckets:**
   - `csf-documents` debe existir
   - **Public: NO**

2. **Policies:**
   - `anon` no puede listar objetos
   - `anon` no puede leer objetos directamente
   - Upload público solo a través de RPC con validación de `invoice_request`
   - Signed URLs solo para usuarios autenticados

3. **Probar upload con fixture ficticio:**
   - Subir `docs/qa/fixtures/csf_ricardo_flores_605.pdf` vía formulario público
   - Verificar que aparece en Storage Dashboard
   - Verificar que no es accesible públicamente

---

## Paso 5 — Configurar Vercel Preview

```bash
# Vincular proyecto (ya vinculado actualmente)
# vercel link

# Agregar variables de entorno para Preview
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# Ingresar: https://<project-ref>.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
# Ingresar: <anon-key>

# Verificar variables
vercel env ls
```

**No agregar `SUPABASE_SERVICE_ROLE_KEY`.**

---

## Paso 6 — Deploy Preview

```bash
# Deploy a Preview (no producción)
vercel --target=preview

# O simplemente (sin --prod)
vercel
```

**URL resultante:**
- Preview: `https://fiscobot-<hash>-david17891-9351s-projects.vercel.app`

---

## Paso 7 — Validación web real

Abrir URL Preview en navegador incógnito y probar:

### Landing
- [ ] Carga correctamente
- [ ] No promete producción
- [ ] No promete CFDI automático
- [ ] No promete SAT automático

### Login
- [ ] `admin@dentalrio.test` / `Demo123456!`
- [ ] `recepcion@dentalrio.test` / `Demo123456!`
- [ ] `contador@dentalrio.test` / `Demo123456!`

### Recepción
- [ ] Crear venta
- [ ] Copiar link fiscal
- [ ] Abrir link público

### Paciente (público)
- [ ] Llenar formulario fiscal
- [ ] Subir fixture ficticio PDF/QR
- [ ] Enviar solicitud

### Contador
- [ ] Ver solicitud
- [ ] Abrir constancia (signed URL temporal)
- [ ] Marcar "Requiere corrección"
- [ ] Ingresar motivo
- [ ] Copiar mensaje para paciente
- [ ] Abrir WhatsApp (wa.me) con mensaje prellenado
- [ ] Guardar UUID ficticio
- [ ] Exportar CSV

### Corrección
- [ ] Abrir link con `?correction=<token>`
- [ ] Ver motivo de corrección
- [ ] Corregir datos
- [ ] Enviar
- [ ] Estado cambia a `corrected_by_patient`

### Seguridad
- [ ] CSV no contiene `storage_path`
- [ ] CSV no contiene signed URLs
- [ ] CSV no contiene `correction_token`
- [ ] URLs firmadas expiran
- [ ] Storage privado no expone archivos directamente
- [ ] No hay `service_role` en cliente

---

## Credenciales demo (entorno cloud preview)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@dentalrio.test` | `Demo123456!` |
| Recepción | `recepcion@dentalrio.test` | `Demo123456!` |
| Contador | `contador@dentalrio.test` | `Demo123456!` |

**Solo para demo. No usar en producción.**

---

## Comandos de utilidad

```bash
# Verificar estado de deploy
vercel list fiscobot --yes

# Ver logs de deploy
vercel logs fiscobot --yes

# Re-deploy forzado
vercel --force

# Ver variables
vercel env ls

# Eliminar variable
vercel env rm <NAME> preview
```

---

## Advertencias

- **Datos ficticios únicamente.** No subir constancias reales.
- **No producción.** Este entorno es solo para demo controlada.
- **No piloto operativo.** No conectar con clínicas reales.
- **No usar service_role en cliente.**
- **No hacer Storage público.**
- **No prometer CFDI automático ni validación SAT.**
- **Apagar/limpiar demo** cuando deje de usarse.
- **No versionar secrets.** `.env.local` y claves cloud no deben commitearse.

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Build falla con "Cannot find module" | `npm install` antes de deploy |
| Runtime error connecting to Supabase | Verificar `NEXT_PUBLIC_SUPABASE_URL` en Vercel Dashboard |
| Auth no funciona | Verificar que users existen en Supabase Cloud Auth |
| Storage upload falla | Verificar bucket `csf-documents` existe y policies aplicadas |
| CORS error | Verificar `NEXT_PUBLIC_SUPABASE_URL` apunta a HTTPS, no localhost |
| 401 en deploy | Vercel puede estar protegiendo el dominio; verificar Dashboard |

---

## Próximos pasos recomendados

1. Ejecutar `supabase login` y crear proyecto cloud.
2. Ejecutar `supabase link --project-ref <REF>`.
3. Ejecutar `supabase db push`.
4. Seed users con script adaptado.
5. Ejecutar `vercel env add` para variables cloud.
6. Ejecutar `vercel --target=preview`.
7. Validar flujo E2E con checklist anterior.
8. Compartir URL Preview con stakeholders.
