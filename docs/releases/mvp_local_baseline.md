# MVP Local Baseline — Factura Clínica/FiscoBot

## Estado del release

- **Release:** MVP local demo baseline.
- **Alcance:** demo local/controlada con datos ficticios únicamente.
- **No producción.**
- **No piloto operativo.**
- **No usar datos reales.**
- **No usar constancias reales.**

---

## Commits incluidos en esta baseline

| Hash | Mensaje | Propósito |
|------|---------|-----------|
| `4246e11` | `docs(qa): add browser demo validation fixtures` | Fixtures ficticios PDF/PNG para validar CSF v0.4 en navegador |
| `507ede2` | `chore(config): add local development configuration` | Config local versionada (.env.example, config.toml, seed.sql) |
| `6829293` | `docs(qa): add rbac browser validation report` | Reporte de validación RBAC en navegador |
| `81a948e` | `fix(ui): suppress input hydration warnings from browser extensions` | Suprime warnings de hidratación por extensiones |
| `24368b7` | `fix(exports): use secure rpc for accountant invoice exports` | Export CSV por RPC SECURITY DEFINER con alcance de clínica |
| `757bddc` | `fix(rls): harden role policies for billing workflow` | Endurece RLS: separa ALL en SELECT/INSERT/UPDATE/DELETE con checks de rol |
| `ec73655` | `fix(rbac): align role permissions and document workflow matrix` | Filtra UI por rol + documenta matriz RBAC |
| `7a52eda` | `docs(demo): add local controlled demo script` | Guía completa de flujo demo local |
| `7b83a66` | `feat(csf): add private fiscal document prefill extraction` | Prellenado fiscal privado v0.4 (PDF/QR/OCR local) |
| `5fa12de` | `docs(qa): add e2e validation report for csf v0.3` | Reporte QA E2E de CSF v0.3 |
| `620f685` | `feat(clinic-billing): implement secure invoice request MVP with csf upload` | MVP funcional: ventas, solicitudes, CSF, UUID, CSV |
| `e228ed4` | `fix(storage): restrict public csf uploads to existing invoice requests` | Restricción de upload público a invoice_request existente |

---

## Funcionalidad incluida

- **Auth demo por roles:** superadmin, clinic_admin, reception, accountant.
- **Registro de ventas:** folio transaccional, generación de QR/link fiscal.
- **QR/link fiscal por token no enumerable:** token criptográfico único por venta.
- **Formulario público fiscal:** `/factura/{slug}` (QR fijo) y `/factura/{slug}/v/{token}` (por venta).
- **Solicitudes fiscales:** flujo completo con estados y transiciones.
- **Constancia de Situación Fiscal v0.3:** carga opcional en formulario público; bucket privado.
- **Prellenado fiscal privado v0.4:** extracción local de datos desde PDF/QR/OCR sin consulta SAT.
- **Dashboard por roles:** nav filtrada, acciones condicionales por permiso.
- **RLS endurecido:** policies separadas por operación con verificación de rol.
- **Export CSV seguro:** RPC SECURITY DEFINER; CSV sin storage_path ni signed URLs.
- **UUID ficticio/demo:** captura de UUID para cerrar solicitud emitida.
- **QA docs:** reportes E2E, RBAC, demo.
- **Fixtures QA:** PDFs y PNGs ficticios para probar extracción fiscal.
- **Config local versionada:** `.env.example`, `supabase/config.toml`, `supabase/seed.sql`.

---

## Matriz resumida de roles

### Recepción (`reception`)
- Puede crear ventas.
- Puede ver solicitudes de su clínica (solo lectura).
- No puede capturar UUID.
- No puede exportar CSV fiscal.
- No puede eliminar ventas ni solicitudes.
- Puede copiar link fiscal, enviar WhatsApp, mostrar QR.

### Contador (`accountant`)
- No puede crear ventas.
- Ve solicitudes de clínicas asignadas (vía `clinic_accountants`).
- Abre constancias por signed URL temporal server-side (60s).
- Cambia estados permitidos: lista, enviar, rechazar, cancelar, reabrir.
- Captura UUID ficticio.
- Exporta CSV por RPC segura (`get_exportable_invoice_requests`).
- No tiene SELECT general sobre `sales`; solo datos contextuales de solicitud.
- No elimina solicitudes ni constancias.

### Administrador (`clinic_admin` / `superadmin`)
- Opera flujo completo de la clínica.
- Crea ventas.
- Ve todas las solicitudes de su clínica.
- Captura/corrige UUID.
- Exporta CSV.
- No hard delete por defecto; usa estados `cancelled` / `rejected`.

---

## Flujos validados

| Flujo | Estado |
|-------|--------|
| Login por roles (3 usuarios demo) | Validado |
| Venta → QR/link fiscal | Validado |
| Formulario público sin constancia | Validado |
| Formulario público con constancia (PDF/QR) | Validado |
| Extracción PDF/QR/OCR local (v0.4) | Validado |
| Dashboard contador con filtro de clínica | Validado |
| Signed URL temporal para constancia (60s) | Validado |
| Captura UUID y cierre de solicitud | Validado |
| Export CSV seguro | Validado |
| RBAC browser (filtrado de UI por rol) | Validado |
| Fixtures QA para extracción sin datos reales | Validado |
| RLS hardening (separación de policies) | Validado |

---

## Comandos locales

Requisitos: Node.js 20+, Docker Desktop corriendo, Supabase CLI instalado.

```bash
# Instalar dependencias
npm install

# Levantar Supabase local
npm run supabase:start

# Resetear base de datos con migraciones y seed data
npm run supabase:reset

# Sembrar usuarios demo (auth + profiles + asignaciones)
npm run seed:local-users

# Levantar Next.js
npm run dev

# Verificar calidad de código
npm run lint
npm run typecheck
npm run build
```

**URLs locales:**
- App: http://localhost:3000
- Supabase Studio: http://127.0.0.1:54323
- API: http://127.0.0.1:54321

---

## Credenciales demo

**Ambiente local únicamente.** No usar en producción ni con datos reales.

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@dentalrio.test` | `Demo123456!` |
| Recepción | `recepcion@dentalrio.test` | `Demo123456!` |
| Contador | `contador@dentalrio.test` | `Demo123456!` |

Todos los usuarios pertenecen a la clínica demo **Clínica Dental Río Colorado** (slug `dental-rio-colorado`).

Los datos ficticios precargados incluyen 4 ventas, 4 solicitudes de factura y 1 documento emitido con UUID ficticio. Los RFCs son ficticios con formato válido.

---

## Fixtures QA

**Ubicación:** `docs/qa/fixtures/`

| Archivo | Tipo | Contenido |
|---------|------|-----------|
| `csf_ricardo_flores_605.pdf` | PDF ficticio | RFC FLOR800101ABC, régimen 605 |
| `csf_carlos_mendez_612.pdf` | PDF ficticio | RFC MENC850101XYZ, régimen 612 |
| `csf_dental_rio_601.pdf` | PDF ficticio | RFC DRC180515XYZ, régimen 601 |
| `csf_ana_gomez_626.pdf` | PDF ficticio | RFC GOMA900101ABC, régimen 626 |
| `qr_ricardo_flores_605.png` | PNG ficticio | QR con URL SAT ficticia |
| `qr_carlos_mendez_612.png` | PNG ficticio | QR con URL SAT ficticia |
| `qr_dental_rio_601.png` | PNG ficticio | QR con URL SAT ficticia |
| `generate_fixtures.mjs` | Script | Genera PDFs/QRs ficticios |
| `README.md` | Documento | Guía de uso de fixtures |

> **Advertencia:** Todos los datos en fixtures son 100% ficticios. No contienen información real de contribuyentes. No usar constancias reales en el sistema de demo.

---

## Seguridad implementada

- **RLS activo** en todas las tablas principales.
- **Storage privado:** bucket `csf-documents` sin acceso público directo.
- **Signed URLs temporales:** 60 segundos, generadas server-side via RPC `get_csf_signed_url`.
- **CSV sin storage_path ni signed URLs:** export solo datos fiscales/venta.
- **Export por RPC SECURITY DEFINER:** `get_exportable_invoice_requests` con control de alcance por rol.
- **Upload público restringido:** solo a `invoice_request` existente con validación de tamaño y formato.
- **No service_role en cliente:** todas las operaciones privilegiadas usan server actions o RPCs con `SECURITY DEFINER`.
- **RLS hardening:** policies separadas por operación (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) con verificación de rol.

---

## Limitaciones conocidas

- **OCR local pesado en móviles:** Tesseract.js puede ser lento en dispositivos de baja capacidad.
- **Parser fiscal parcial:** No cubre todos los regímenes SAT; solo los más comunes (601, 603, 605, 612, 626).
- **Sin rate limiting:** No hay protección anti-abuso en endpoints públicos.
- **Sin content scanning:** No hay validación profunda de contenido de archivos (solo mime-type y extensión).
- **Sin política formal de retención/borrado:** Constancias se retienen indefinidamente en MVP.
- **Funciones privilegiadas en public:** Algunas RPCs `SECURITY DEFINER` residen en schema `public`.
- **npm audit:** 2 vulnerabilidades moderadas (`postcss` via `next`), sin fix no-break disponible. `npm audit fix --force` instalaría `next@9.3.3` (breaking change).
- **No producción.** El sistema no está preparado para datos reales ni tráfico público.

---

## Pendientes antes de producción

| Item | Prioridad | Estado |
|------|-----------|--------|
| Rate limiting / anti-abuso | Alta | Pendiente |
| Política de privacidad y consentimiento | Alta | Pendiente |
| Retención y borrado de constancias | Alta | Pendiente |
| Validación fuerte de archivos (magic bytes, content scanning) | Alta | Pendiente |
| Auditoría cloud (who did what, when) | Media | Pendiente |
| Revisión legal/fiscal por abogado/contador certificado | Media | Pendiente |
| Hardening adicional de funciones (mover de public si aplica) | Media | Pendiente |
| Pruebas automatizadas RLS/Storage | Media | Pendiente |
| Monitoreo y logging estructurado | Media | Pendiente |
| Backups y disaster recovery | Media | Pendiente |
| Despliegue Supabase Cloud controlado | Baja | Pendiente |
| Remediación de vulnerabilidades npm audit | Baja | Pendiente (bloqueado por next) |

---

## Qué NO hacer

- **No usar datos reales** de pacientes, RFCs, constancias ni UUIDs.
- **No subir constancias reales** al sistema de demo.
- **No prometer CFDI automático** ni emisión fiscal directa.
- **No prometer conexión SAT** ni validación en tiempo real.
- **No usar como piloto operativo** con clínicas reales.
- **No abrir Storage públicamente** ni generar URLs públicas de constancias.
- **No reabrir SELECT general de sales al contador** sin controles.
- **No usar service_role en cliente** ni exponer claves de admin.
- **No ejecutar `npm audit fix --force`** sin revisar breaking changes.

---

## Próximo paso recomendado

**Ruta A — Demo comercial controlada con datos ficticios:**
- Preparar presentación/screen recording del flujo completo.
- Usar fixtures QA para demostrar extracción sin datos reales.
- Documentar escenarios de uso para stakeholders.
- No conectar a sistemas reales.

**Ruta B — Hardening pre-cloud/pre-piloto:**
- Implementar rate limiting en formulario público.
- Definir política de retención/borrado de constancias.
- Mover funciones privilegiadas a schema seguro.
- Agregar pruebas automatizadas de RLS y permisos.
- Preparar despliegue en Supabase Cloud con configuración de producción.
- Revisión legal de flujo fiscal y consentimiento.

**Recomendación:** Comenzar con Ruta A (demo comercial controlada) mientras se prepara Ruta B en paralelo. No saltar a piloto operativo sin completar los pendientes de seguridad y legal.

---

## Notas del release

- Baseline generada: `2026-05-18`
- Repositorio: Factura Clínica / FiscoBot
- Versión: `0.1.0`
- Entorno: demo local / controlado
- Datos: ficticios
