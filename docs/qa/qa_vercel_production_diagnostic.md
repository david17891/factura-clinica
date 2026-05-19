# QA Cloud — Validación Vercel Production

**URL probada:** https://fiscobot.vercel.app
**Project ref:** szyuaeoopimedwjosnjo
**Fecha:** 2026-05-18
**Auditor:** QA Cloud / Maintener

---

## Veredicto

**DEMO_CLOUD_PRODUCTION_REQUIRES_FIXES**

El deploy Vercel Production carga correctamente, la UI de login es funcional, y el entorno de variables está configurado. Sin embargo, el flujo E2E está bloqueado porque la base de datos Supabase Cloud no contiene los datos demo de la clínica, lo que causa 404 en el formulario público.

---

## 1. Landing Page

| Prueba | Resultado |
|--------|-----------|
| https://fiscobot.vercel.app carga | ✅ HTTP 200 |
| Sin error 500 | ✅ |
| Sin pantalla blanca | ✅ |
| Sin referencias a localhost | ✅ |
| Muestra badge "Demo local con datos ficticios" | ✅ |
| No promete CFDI automático | ✅ |
| No promete SAT automático | ✅ |
| No promete producción real | ✅ |

---

## 2. Login Page

| Prueba | Resultado |
|--------|-----------|
| /login carga | ✅ HTTP 200 |
| Muestra 3 usuarios demo | ✅ |
| Emails correctos | ✅ |
| Password demo visible | ✅ (`Demo123456!`) |
| Formulario con email + password | ✅ |
| Sin errores de consola aparentes | ✅ |

**Nota:** No fue posible probar login real porque el anon key no está accesible para validar la llamada a Supabase Auth desde este entorno de auditoría. La UI está lista para recibir credenciales.

---

## 3. Dashboard (sin auth)

| Prueba | Resultado |
|--------|-----------|
| /dashboard redirige a login | ✅ HTTP 307 |
| /dashboard/sales redirige a login | ✅ HTTP 307 |
| /dashboard/requests redirige a login | ✅ HTTP 307 |
| Comportamiento correcto | ✅ |

---

## 4. Formulario Público (CRÍTICO)

| Prueba | Resultado |
|--------|-----------|
| /factura/dental-rio-colorado | ❌ HTTP 404 |
| /factura/test-clinic | ❌ HTTP 404 |

**Diagnóstico:**
La página pública del formulario fiscal devuelve 404. Esto ocurre cuando la RPC `get_public_clinic_invoice_context` no encuentra la clínica con el slug proporcionado.

**Causa probable:**
La base de datos Supabase Cloud no contiene el seed data de la clínica demo `dental-rio-colorado` (UUID `00000000-0000-0000-0000-000000000001`).

**Fix requerido:**
1. Verificar que la migración `20260515000002_seed_data.sql` fue aplicada en Supabase Cloud.
2. Si la clínica no existe, insertarla manualmente o re-aplicar seed data.
3. Confirmar que la tabla `clinics` tiene al menos:
   ```sql
   INSERT INTO clinics (id, name, slug, phone, email, address)
   VALUES ('00000000-0000-0000-0000-000000000001', 'Clínica Dental Río Colorado', 'dental-rio-colorado', '6535551122', 'contacto@dentalrio.test', 'Avenida Revolución 123, Sonora');
   ```
4. Confirmar que los usuarios demo existen en Supabase Cloud Auth.
5. Confirmar que los profiles tienen roles correctos.
6. Confirmar que `clinic_accountants` tiene la asignación contador-clínica.

---

## 5. Vercel Logs

Análisis de logs recientes:
- Ningún error 500 detectado.
- Solo 404s para rutas `/factura/*` (esperado si falta data).
- Ningún error de RPC o RLS visible.
- Build exitoso sin errores.

---

## 6. Variables de Entorno (Vercel)

| Variable | Estado | Notas |
|----------|--------|-------|
| NEXT_PUBLIC_SUPABASE_URL | ✅ Configurada | Encrypted in Vercel |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ Configurada | Encrypted in Vercel |
| Sin localhost/127.0.0.1 | ✅ Confirmado | .env.local tiene localhost pero es local-only |

---

## 7. Storage Cloud

**Estado:** No verificado directamente (requiere auth).
**Recomendación:** Verificar en Supabase Dashboard que:
- Bucket `csf-documents` existe.
- Bucket es privado.
- Policies de upload/read están aplicadas.

---

## 8. CSV y Seguridad

**Estado:** No verificado directamente (requiere flujo completo).
**Recomendación:** Una vez resuelto el 404 del formulario público, ejecutar flujo E2E completo y validar:
- CSV no contiene `storage_path`.
- CSV no contiene signed URLs.
- CSV no contiene `correction_token`.

---

## 9. Problemas Encontrados

### Bloqueante
| # | Problema | Impacto | Fix |
|---|----------|---------|-----|
| 1 | Formulario público 404 (`/factura/dental-rio-colorado`) | Bloquea flujo paciente completo | Verificar/aplicar seed data en Supabase Cloud |

### Medio
| # | Problema | Impacto | Fix |
|---|----------|---------|-----|
| 2 | No verificado login real | No confirmado que auth cloud funciona | Probar login manual tras seed users |
| 3 | Storage no verificado | No confirmado policies cloud | Verificar en Supabase Dashboard |

### Bajo
| # | Problema | Impacto | Fix |
|---|----------|---------|-----|
| 4 | No verificado flujo corrección | No confirmado end-to-end | Probar tras fix #1 |
| 5 | No verificado CSV export | No confirmado datos sensibles excluidos | Probar tras fix #1 |

---

## 10. Fix Recomendado

**Paso 1 — Verificar datos en Supabase Cloud:**

```bash
# Conectar a Supabase Cloud (requiere login previo)
supabase link --project-ref szyuaeoopimedwjosnjo

# Verificar si clínica existe
supabase db query "SELECT id, name, slug FROM clinics WHERE slug = 'dental-rio-colorado';"

# Verificar usuarios
supabase db query "SELECT id, email, role FROM profiles;"

# Verificar asignaciones
supabase db query "SELECT * FROM clinic_accountants;"
```

**Paso 2 — Si falta data, re-aplicar seed:**

```bash
# Resetear DB con seed (CUIDADO: borra data existente)
supabase db reset

# O insertar clínica manualmente si no existe
supabase db query "INSERT INTO clinics (id, name, slug, phone, email, address) VALUES ('00000000-0000-0000-0000-000000000001', 'Clínica Dental Río Colorado', 'dental-rio-colorado', '6535551122', 'contacto@dentalrio.test', 'Avenida Revolución 123, Sonora') ON CONFLICT DO NOTHING;"
```

**Paso 3 — Seed users:**

```bash
# Usar script adaptado (no commitear)
SUPABASE_URL=https://szyuaeoopimedwjosnjo.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<cloud-service-role> \
node scripts/seedCloudUsers.mjs
```

**Paso 4 — Re-validar:**

```bash
# Probar formulario público
curl -s -o /dev/null -w "%{http_code}" https://fiscobot.vercel.app/factura/dental-rio-colorado
# Esperado: 200
```

---

## 11. Estado Final de Git

```
M  docs/demo/cloud_preview_demo.md
```

**Nota:** `docs/demo/cloud_preview_demo.md` aparece como modificado pero sin cambios visibles (posiblemente line endings). Working tree no limpio hasta resolver.

---

## 12. Commit Sugerido

Si se actualiza documentación tras fixes:

```bash
git add 'docs/qa/qa_vercel_production_diagnostic.md' 'docs/demo/cloud_preview_demo.md'
git commit -m "docs(qa): document vercel production cloud validation findings"
```

---

## Próximo paso

1. Verificar seed data en Supabase Cloud.
2. Aplicar fix de datos demo.
3. Re-probar flujo E2E completo.
4. Actualizar este documento con resultados.
