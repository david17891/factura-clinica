# FiscoBot

MVP interno para clinicas pequenas/dentales en Mexico. Organiza solicitudes de factura mediante QR fijo, QR por venta con token publico no enumerable, link manual de WhatsApp, formulario publico, panel de clinica/contador y exportacion CSV.

## Estado y limites

- Usar solo datos demo. No usar datos reales.
- El proyecto Supabase cloud anterior no se repara ni se usa para desarrollo.
- Desarrollo base: Supabase local primero.
- No incluye Constancia Fiscal, PAC/CFDI automatico, pagos, WhatsApp API ni Storage productivo.
- No usar `service_role` en cliente. Nunca exponerlo como `NEXT_PUBLIC_`.

## Requisitos

- Node.js compatible con Next.js 16.
- Docker Desktop corriendo.
- Supabase CLI instalado y disponible como `supabase`.

Verificacion:

```bash
docker --version
supabase --version
```

Si `supabase` no existe en Windows, instala el CLI con una de las opciones oficiales:

```bash
scoop install supabase
# o
choco install supabase
```

Tambien puedes usar el binario publicado en `https://github.com/supabase/cli/releases`.

## Desarrollo local con Supabase

1. Instala dependencias:

```bash
npm install
```

2. Arranca Supabase local:

```bash
npm run supabase:start
npm run supabase:status
```

3. Copia `.env.local.example` a `.env.local` y usa los valores locales de `supabase status`. En versiones recientes del CLI, la llave publica aparece como `Publishable`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key local>
```

No commitear `.env.local`.

4. Reconstruye la base desde cero:

```bash
npm run db:reset
```

Esto aplica, en orden:

1. `supabase/migrations/20260515000000_init.sql`
2. `supabase/migrations/20260515000001_schema_hardening.sql`
3. `supabase/migrations/20260515000002_seed_data.sql`
4. `supabase/migrations/20260515000003_security_integrity.sql`
5. `supabase/migrations/20260515000004_public_qr_flow.sql`
6. `supabase/migrations/20260515000005_public_invoice_token.sql`
7. `supabase/seed.sql`

5. Crea/actualiza usuarios demo locales:

```bash
npm run seed:local-users
```

Este script usa la `SERVICE_ROLE_KEY` local obtenida desde `supabase status -o json` solo en Node para desarrollo local. No guarda secretos en `.env.local` y no se usa en cliente.

6. Arranca Next.js:

```bash
npm run dev
```

App: `http://localhost:3000`
Supabase Studio: `http://127.0.0.1:54323`
API local: `http://127.0.0.1:54321`

## Usuarios demo locales

Los usuarios demo se crean de forma idempotente con:

```bash
npm run seed:local-users
```

| Email | Password | Rol esperado |
|---|---|---|
| `admin@dentalrio.test` | `Demo123456!` | `clinic_admin` |
| `recepcion@dentalrio.test` | `Demo123456!` | `reception` |
| `contador@dentalrio.test` | `Demo123456!` | `accountant` |

El script:

- crea usuarios Auth con email confirmado;
- actualiza password y metadata si ya existen;
- asigna `clinic_id` a admin y recepcion;
- deja `clinic_id = null` para contador;
- asigna el contador a `dental-rio-colorado` en `clinic_accountants`;
- valida login de los tres usuarios al final.

## Datos demo

La clinica demo es `dental-rio-colorado`.

Tokens publicos estables para pruebas:

| Folio | Token |
|---|---|
| `V-000001` | `11111111-1111-4111-8111-111111111101` |
| `V-000002` | `11111111-1111-4111-8111-111111111102` |
| `V-000003` | `11111111-1111-4111-8111-111111111103` |
| `V-000004` | `11111111-1111-4111-8111-111111111104` |

## Flujos a probar

Publico:

- `http://localhost:3000/factura/dental-rio-colorado`
- `http://localhost:3000/factura/dental-rio-colorado/v/11111111-1111-4111-8111-111111111102`
- `http://localhost:3000/factura/dental-rio-colorado/V-000001` debe responder `notFound`.
- Token invalido debe responder `notFound`.
- Enviar solicitud funciona.
- Segundo submit activo para la misma venta queda bloqueado.

Dashboard:

- Login como admin, recepcion y contador.
- `/dashboard`
- `/dashboard/sales`
- Crear venta; el folio sale de `generate_sale_folio`.
- QR y WhatsApp usan `/factura/<slug>/v/<public_invoice_token>`.
- `/dashboard/requests`
- Cambio de estado persiste.
- Asignacion de UUID persiste.
- Exportacion CSV funciona.

Seguridad:

- `anon` no debe poder hacer `SELECT` directo a `sales`.
- `anon` no debe poder hacer `INSERT` directo a `invoice_requests`.
- RPC publica `get_public_sale_invoice_context_by_token` no devuelve `patient_name` ni `payment_method`.
- Usuarios de clinicas distintas no deben ver datos ajenos cuando exista seed multi-clinica.
- `accountant` solo debe ver clinicas asignadas.

## Scripts

```bash
npm run supabase:start
npm run supabase:stop
npm run supabase:status
npm run supabase:reset
npm run db:reset
npm run db:types
npm run seed:local-users
npm run lint
npm run typecheck
npm run build
```

## Seguridad actual

- RLS habilitado en tablas publicas.
- Grants explicitos para Data API; RLS sigue siendo la frontera de filas.
- Formulario publico usa RPC `submit_invoice_request`.
- QR por venta usa `public_invoice_token`, no folio secuencial.
- RPC publica por token devuelve solo clinica, slug, folio, servicio y monto.
- `generate_sale_folio` valida rol y `clinic_id` del caller.
- FK compuesta `(sale_id, clinic_id)` evita solicitudes cross-clinica.
- Indice unico parcial evita multiples solicitudes activas por venta.

## Migrar despues a Supabase cloud limpio

1. Crear un proyecto Supabase nuevo. No reutilizar el cloud roto.
2. Confirmar version de Postgres compatible con local.
3. Aplicar las migraciones desde cero con el CLI o SQL Editor, en el mismo orden.
4. No copiar datos reales desde el proyecto roto.
5. Crear usuarios reales desde Auth y asignar perfiles con SQL controlado.
6. Configurar variables de Vercel con la URL y anon key del proyecto nuevo.
7. Ejecutar pruebas publicas, Auth, dashboard y seguridad antes de habilitar pilotos.
