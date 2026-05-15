# FiscoBot — v0.2C

> **Estado:** Prototipo funcional interno (en reparación de seguridad para MVP piloto)

FiscoBot es un sistema administrativo para clínicas pequeñas y dentales en México. Organiza solicitudes de factura mediante QR fijo, QR por venta, link de WhatsApp y formulario público.

---

## ⚠️ Avisos de Estado

- **NO usar con datos reales aún** — el sistema está en fase de auditoría de seguridad.
- **Constancia Fiscal (CSF):** Pendiente de implementar.
- **PAC/CFDI automático:** Pendiente de implementar.
- **Pagos con tarjeta:** No implementado.
- **WhatsApp API real:** No implementado (solo links manuales).
- **Datos de demo:** Usar únicamente datos ficticios de prueba.

---

## 🛠️ Stack

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v4 + shadcn/ui
- **Backend/Auth/DB:** Supabase (PostgreSQL 17, Auth, RLS)
- **Despliegue:** Vercel

---

## 🚀 Inicio Rápido

### 1. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
# Obligatorio — URL pública de tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co

# Obligatorio — Llave anon (pública, segura para el cliente)
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_llave_anon

# OPCIONAL — Solo para scripts de administración server-side
# NO requerida para el flujo normal del MVP
# NUNCA exponer en variables NEXT_PUBLIC_
# SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 2. Aplicar migraciones de base de datos

Ejecuta **en orden** en el SQL Editor de tu proyecto Supabase:

1. `supabase/migrations/20260515000000_init.sql` — Esquema base
2. `supabase/migrations/20260515000001_schema_hardening.sql` — Índices, RLS mejorado
3. `supabase/migrations/20260515000002_seed_data.sql` — Datos demo (opcional)
4. `supabase/migrations/20260515000003_security_integrity.sql` — **v0.2C: correcciones de seguridad**

### 3. Crear usuarios demo

Después de aplicar las migraciones, crea usuarios en el Auth Dashboard de Supabase:

| Email | Rol | Clínica |
|---|---|---|
| `admin@dentalrio.test` | `clinic_admin` | `dental-rio-colorado` |
| `recepcion@dentalrio.test` | `reception` | `dental-rio-colorado` |
| `contador@demo.test` | `accountant` | (asignado por relación) |

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

## 🧪 Verificación

```bash
npm run lint        # Debe pasar sin errores
npm run typecheck   # Debe pasar en workspace frío (sin npm run build previo)
npm run build       # Build de producción
```

---

## 🔒 Seguridad (v0.2C)

- **RLS habilitado** en todas las tablas.
- **Formulario público** usa RPC `submit_invoice_request` (SECURITY DEFINER) — no inserta directamente.
- **Folio de venta** generado con función transaccional `generate_sale_folio` — sin colisiones concurrentes.
- **Integridad `sale_id/clinic_id`:** FK compuesta garantiza que solicitudes no pueden apuntar a ventas de otra clínica.
- **Duplicados:** Índice único parcial previene múltiples solicitudes activas por venta.
- **assignUuidAction:** Solo `clinic_admin` y `accountant` pueden asignar UUID. Bloquea sobreescritura.
- **Service Role:** No requerida en el flujo normal. Nunca exponer como `NEXT_PUBLIC_`.

---

## 📂 Estructura

```
app/
  (auth)/login/          # Autenticación
  (dashboard)/           # Panel administrativo protegido
    page.tsx             # Dashboard resumen
    sales/               # Registro de ventas
    requests/            # Bandeja de solicitudes
    qr/                  # QR fijo de la clínica
  factura/[slug]/        # QR fijo público
  factura/[slug]/[folio] # QR por venta público
  page.tsx               # Landing
lib/
  actions/               # Server actions (validados por rol)
  auth/                  # Helpers de sesión y permisos
  data/                  # Queries de datos
  supabase/              # Clientes server/client/middleware
supabase/
  migrations/            # Historial de esquema SQL
types/
  index.ts               # Tipos TypeScript compartidos
```

---

## 📋 Changelog

### v0.2C — Security & Integrity Repair
- Eliminada inserción pública directa en `invoice_requests` (`WITH CHECK (true)`)
- Formulario público migrado a RPC `submit_invoice_request` (SECURITY DEFINER)
- FK compuesta `(sale_id, clinic_id)` previene solicitudes cross-clínica
- Índice único parcial previene duplicados activos por `sale_id`
- `createSaleAction`: `clinic_id` desde perfil server-side; folio vía RPC transaccional
- `assignUuidAction`: validación explícita de rol, alcance y UUID no vacío; bloquea sobreescritura
- `updateInvoiceRequestStatusAction`: validación de rol, alcance y transiciones permitidas
- `exportRequestsCsvAction`: validación de rol y filtrado por clínica asignada

### v0.2B — Prototipo funcional interno
- Dashboard con ventas y solicitudes reales
- Auth Supabase, RLS habilitado
- QR por venta y QR fijo
- Exportación CSV
