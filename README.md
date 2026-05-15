# FiscoBot — v0.2E

> **Estado:** MVP piloto interno con datos demo — listo para prueba controlada

FiscoBot es un sistema administrativo para clinicas pequenas y dentales en Mexico. Organiza solicitudes de factura mediante QR fijo, QR por venta, link de WhatsApp y formulario publico.

---

## Avisos

- **NO usar con datos reales aun** — usar unicamente datos ficticios de prueba.
- **Constancia Fiscal (CSF):** Pendiente de implementar.
- **PAC/CFDI automatico:** Pendiente de implementar.
- **Pagos con tarjeta:** No implementado.
- **WhatsApp API real:** No implementado (solo links manuales wa.me).
- **No es expediente clinico** — no guarda diagnosticos ni notas clinicas.

---

## Stack

- **Framework:** Next.js 16 (App Router, proxy.ts)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v4 + shadcn/ui
- **Backend/Auth/DB:** Supabase (PostgreSQL 17, Auth, RLS)
- **Despliegue:** Vercel

---

## Inicio Rapido

### 1. Variables de entorno

Crea `.env.local`:

```env
# Obligatorio — URL publica de tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co

# Obligatorio — Llave anon (publica, segura para el cliente)
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_llave_anon

# OPCIONAL — Solo para scripts de administracion server-side
# NO requerida para el flujo normal del MVP
# NUNCA exponer en variables NEXT_PUBLIC_
# SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 2. Aplicar migraciones de base de datos

Ejecuta **en orden** en el SQL Editor de tu proyecto Supabase:

1. `supabase/migrations/20260515000000_init.sql` — Esquema base
2. `supabase/migrations/20260515000001_schema_hardening.sql` — Indices, RLS mejorado
3. `supabase/migrations/20260515000002_seed_data.sql` — Datos demo (opcional)
4. `supabase/migrations/20260515000003_security_integrity.sql` — Correcciones de seguridad v0.2C
5. `supabase/migrations/20260515000004_public_qr_flow.sql` — v0.2D: flujo publico QR + hardening
6. `supabase/migrations/20260515000005_public_invoice_token.sql` — **v0.2E: token publico no enumerable**

### 3. Crear usuarios demo

Despues de aplicar las migraciones, crea usuarios en el Auth Dashboard de Supabase:

| Email | Rol | Clinica |
|---|---|---|
| `admin@dentalrio.test` | `clinic_admin` | `dental-rio-colorado` |
| `recepcion@dentalrio.test` | `reception` | `dental-rio-colorado` |
| `contador@demo.test` | `accountant` | (asignado por relacion) |

Luego ejecuta en SQL Editor:

```sql
UPDATE profiles SET role = 'clinic_admin', clinic_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'admin@dentalrio.test';

UPDATE profiles SET role = 'reception', clinic_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'recepcion@dentalrio.test';

UPDATE profiles SET role = 'accountant'
WHERE email = 'contador@demo.test';

INSERT INTO clinic_accountants (clinic_id, accountant_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM profiles
WHERE email = 'contador@demo.test'
ON CONFLICT DO NOTHING;
```

### 4. Instalar y correr localmente

```bash
npm install
npm run dev
```

---

## Verificacion

```bash
npm run lint        # 0 errores, 0 warnings
npm run typecheck   # TypeScript --noEmit
npm run build       # Build de produccion
```

---

## Seguridad (v0.2E)

- **RLS habilitado** en todas las tablas.
- **Formulario publico** usa RPC `submit_invoice_request` (SECURITY DEFINER, search_path seguro).
- **QR por venta publico** usa token UUID no enumerable (`public_invoice_token`) — NO usa folio secuencial en URLs publicas.
- **RPC `get_public_sale_invoice_context_by_token`:** valida token + clinic_slug, devuelve solo clinic_name, clinic_slug, sale_folio, service_name, amount. **NO expone patient_name, payment_method, payment_reference, ni IDs internos.**
- **QR fijo publico** usa RPC `get_public_clinic_invoice_context` (SECURITY DEFINER).
- **Folio de venta** generado con `generate_sale_folio` — valida rol y clinic_id del caller dentro de la funcion.
- **Integridad `sale_id/clinic_id`:** FK compuesta previene cross-clinica.
- **Duplicados:** Indice unico parcial previene multiples solicitudes activas por sale_id.
- **assignUuidAction:** Solo `clinic_admin` y `accountant`. Bloquea sobreescritura.
- **updateInvoiceRequestStatusAction:** Valida rol, alcance y transiciones permitidas.
- **exportRequestsCsvAction:** Filtra por rol y clinica asignada.
- **Service Role:** No requerida en flujo normal. Nunca exponer como `NEXT_PUBLIC_`.
- **SECURITY DEFINER functions:** Todas con `SET search_path = public, pg_temp`.
- **No hay logs de datos fiscales** en console.error.
- **Ruta `/factura/[slug]/[folio]` deprecada** — responde notFound para evitar enumeracion de folios.

---

## Estructura

```
app/
  dashboard/             # Panel administrativo protegido
    page.tsx             # Dashboard resumen (stats reales)
    sales/               # Registro de ventas (datos reales)
    requests/            # Bandeja de solicitudes (datos reales)
    qr/                  # QR fijo de la clinica (datos reales)
  factura/[slug]/        # QR fijo publico (RPC segura)
  factura/[slug]/v/[token]  # QR por venta publico (token no enumerable)
  factura/[slug]/[folio] # DEPRECADA — responde notFound
  (auth)/login/          # Autenticacion
  page.tsx               # Landing
lib/
  actions/               # Server actions (validados por rol)
  auth/                  # Helpers de sesion y permisos
  data/                  # Queries de datos
  supabase/              # Clientes server/client/middleware
supabase/
  migrations/            # Historial de esquema SQL
types/
  index.ts               # Tipos TypeScript compartidos
proxy.ts                 # Auth guard + session refresh (Next 16)
```

---

## Changelog

### v0.2E — Public Invoice Token + Secure QR Flow
- **`public_invoice_token` en sales:** UUID generado automaticamente, unico, no enumerable, no derivado del folio
- **RPC `get_public_sale_invoice_context_by_token`:** Reemplaza la version por folio — valida token + slug, NO expone patient_name ni payment_method
- **Ruta `/factura/[slug]/v/[token]`:** Nueva ruta publica para QR por venta con token no enumerable
- **Ruta `/factura/[slug]/[folio]` deprecada:** Responde notFound — ya no expone datos por folio secuencial
- **`submit_invoice_request` actualizada:** Acepta `p_public_invoice_token` en lugar de `p_sale_folio`
- **Dashboard sales:** Genera links y QR con token, no con folio
- **WhatsApp:** Usa link con token, no con folio
- **Formulario publico:** No precarga patient_name desde venta — el paciente lo captura
- **RPC folio-based eliminada:** `get_public_sale_invoice_context` removida (insegura)
- **Migracion 000005:** Backfill de tokens para ventas existentes, unique index, default gen_random_uuid()

### v0.2D — Public QR Flow + Security Hardening
- **RPC `get_public_sale_invoice_context`:** Permite anon obtener datos minimos de venta para formulario sin abrir SELECT en tabla `sales`
- **RPC `get_public_clinic_invoice_context`:** Permite anon obtener datos minimos de clinica sin SELECT directo
- **`/factura/[slug]/[folio]`** ahora usa RPC publica — paciente anon puede abrir folio valido
- **`/factura/[slug]`** ahora usa RPC publica — consistente con QR por venta
- **`generate_sale_folio`:** Valida rol y clinic_id del caller dentro de la funcion — usuario de otra clinica no puede avanzar contador ajeno
- **Todas las funciones SECURITY DEFINER** ahora tienen `SET search_path = public, pg_temp`
- **`console.error`** en `assignUuidAction` ya no registra datos sensibles
- **`.env.local.example`:** `SUPABASE_SERVICE_ROLE_KEY` comentada y marcada SERVER ONLY
- **`middleware.ts` → `proxy.ts`:** Migrado a convencion Next 16
- **0 warnings de lint**

### v0.2C — Security & Integrity Repair
- Eliminada insercion publica directa en `invoice_requests` (`WITH CHECK (true)`)
- Formulario publico migrado a RPC `submit_invoice_request` (SECURITY DEFINER)
- FK compuesta `(sale_id, clinic_id)` previene solicitudes cross-clinica
- Indice unico parcial previene duplicados activos por `sale_id`
- `createSaleAction`: `clinic_id` desde perfil server-side; folio via RPC transaccional
- `assignUuidAction`: validacion explicita de rol, alcance y UUID no vacio; bloquea sobreescritura
- `updateInvoiceRequestStatusAction`: validacion de rol, alcance y transiciones permitidas
- `exportRequestsCsvAction`: validacion de rol y filtrado por clinica asignada

### v0.2B — Prototipo funcional interno
- Dashboard con ventas y solicitudes reales
- Auth Supabase, RLS habilitado
- QR por venta y QR fijo
- Exportacion CSV
