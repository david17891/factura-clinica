# FiscoBot — Demo local controlada

## Estado del sistema

- **Alcance:** demo local/controlada con datos ficticios
- **No producción**
- **No datos reales**
- **No piloto operativo**
- **No consulta SAT ni servicios externos**
- **CSF v0.4** con prellenado fiscal privado (PDF/QR/OCR local)

---

## Requisitos previos

- Node.js 20+
- Docker Desktop corriendo
- Supabase CLI instalado (`npx supabase --version`)

---

## Comandos para levantar

```bash
# 1. Levantar Supabase local
npm run supabase:start

# 2. Resetear base de datos con migraciones y seed data
npm run supabase:reset

# 3. Sembrar usuarios demo (crea auth users, profiles y asignaciones)
npm run seed:local-users

# 4. Levantar Next.js
npm run dev
```

**URLs locales:**
- App: http://localhost:3000
- Supabase Studio: http://127.0.0.1:54323
- API: http://127.0.0.1:54321

---

## Credenciales demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@dentalrio.test` | `Demo123456!` |
| Recepción | `recepcion@dentalrio.test` | `Demo123456!` |
| Contador | `contador@dentalrio.test` | `Demo123456!` |

Todos los usuarios pertenecen a la clínica demo **Clínica Dental Río Colorado** (slug `dental-rio-colorado`).

---

## Datos ficticios precargados

El seed `20260515000002_seed_data.sql` inserta al hacer `supabase:reset`:

- **1 clínica demo:** Clínica Dental Río Colorado
- **4 ventas demo:**
  - V-000001 — Ana López Demo / Limpieza dental / \$800.00 (fiscal_data_received)
  - V-000002 — Carlos Méndez Demo / Consulta dental / \$500.00 (not_requested)
  - V-000003 — María Ruiz Demo / Endodoncia / \$3,500.00 (ready_to_invoice)
  - V-000004 — Roberto Salazar Demo / Resina dental / \$1,200.00 (issued)
- **4 solicitudes de factura demo** con RFCs ficticios
- **1 documento de factura emitida** con UUID ficticio

Los RFCs ficticios en seed siguen formato válido pero no pertenecen a personas reales:
`LOAA900101ABC`, `RUMM880202DEF`, `XAXX010101000`, `SARJ760303GHI`

---

## Flujo recomendado para demo

### 1. Login como Recepción

- Abrir http://localhost:3000/login
- Ingresar `recepcion@dentalrio.test` / `Demo123456!`
- Llega al dashboard de recepción

### 2. Crear una venta

- Ir a `/dashboard/sales`
- Clic en **"+ Nueva venta"**
- Llenar:
  - **Paciente:** `Pedro Pérez Demo`
  - **Teléfono:** `6535556677`
  - **Correo:** `pedro@demo.test`
  - **Servicio:** `Ortodoncia`
  - **Monto:** `2500`
  - **Método de pago:** `Tarjeta`
- Clic en **"Guardar y generar link fiscal"**
- Se muestra QR y link seguro con token no enumerable

### 3. Compartir link al paciente

- Clic en el ícono de copiar o WhatsApp en la fila de la venta
- El link tiene formato: `/factura/dental-rio-colorado/v/{token}`
- Abrir el link en otra pestaña o ventana incógnito

### 4. Formulario público

- El paciente ve página pública con:
  - Nombre de la clínica
  - Servicio y monto pre-llenados desde la venta
  - Sección **Sube tu constancia o escanea el QR** (CSF con prellenado)
  - Sección **Datos fiscales** (RFC, nombre, C.P., régimen, CFDI)

### 5. Subir constancia ficticia (opcional)

- Subir un archivo PDF, JPG o PNG de prueba
- Si el archivo contiene QR fiscal, el sistema detecta RFC y C.P.
- Campos detectados muestran badge **"Detectado"** en verde
- Los datos se pueden editar manualmente
- **No usar constancias reales**

### 6. Llenar datos fiscales manualmente

Si no se sube archivo, llenar manualmente con datos ficticios:

| Campo | Valor sugerido |
|-------|---------------|
| RFC | `PEPP900101ABC` |
| C.P. fiscal | `83440` |
| Nombre | `PEDRO PEREZ PADILLA` |
| Régimen | `605 - Sueldos y Salarios` |
| CFDI | `D01 - Honorarios médicos` |
| Correo | `pedro@demo.test` |

### 7. Enviar solicitud

- Clic en **"Enviar datos para factura"**
- Pantalla de confirmación: _"Solicitud recibida"_

### 8. Login como Contador

- Abrir http://localhost:3000/login
- Ingresar `contador@dentalrio.test` / `Demo123456!`

### 9. Revisar solicitud

- Ir a `/dashboard/requests`
- Ver la nueva solicitud en la tabla con estado **"Datos recibidos"**
- Clic en **"Detalle"** para abrir panel lateral
- Si se subió constancia, aparece en **"Constancia fiscal"** con:
  - Nombre del archivo y tamaño
  - Botón **"Ver"** que abre con signed URL temporal (60s)
  - Datos sugeridos detectados

### 10. Cambiar estado

- **"Marcar lista"** → ready_to_invoice
- Aparece campo para capturar UUID

### 11. Capturar UUID ficticio

- Ingresar UUID ficticio: `B2C3D4E5-F6A7-8901-BCDE-F01234567890`
- Clic **"Guardar UUID"**
- La solicitud pasa a estado **"Emitida"**
- El UUID queda registrado y visible en el detalle

### 12. Exportar CSV

- Clic en **"Exportar para contador"**
- Descarga archivo CSV con todos los datos fiscales y de venta
- **No contiene storage_path ni signed URLs** (seguridad)

---

## QR fijo de recepción (flujo alternativo)

- Login como Recepción
- Ir a `/dashboard/qr`
- Ver QR fijo con cartel _"Requieres factura?"_
- Copiar link o compartir por WhatsApp
- El formulario en `/factura/dental-rio-colorado` pide **datos del pago manualmente** (monto, servicio, método)
- Útil cuando no se registra venta previa

---

## Advertencias

- **NO usar RFCs reales** ni constancias reales de situación fiscal
- **NO usar datos de pacientes reales** (nombre, teléfono, correo)
- **NO subir PDFs de contribuyentes reales** al bucket `csf-documents`
- **NO usar UUIDs de facturas reales emitidas por el SAT**
- El sistema **no consulta el SAT** ni servicios externos de validación
- Los QR del SAT escaneados localmente no validan vigencia ni autenticidad
- El bucket `csf-documents` es privado; solo se accede vía signed URL
- El sistema **no está listo para producción** ni para datos reales
- Usar `npm run supabase:reset` para limpiar y reiniciar entre demos

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| Supabase no levanta | `docker ps` — verificar Docker corriendo |
| Error de conexión DB | `npm run supabase:status` revisar estado |
| Usuarios demo no existen | `npm run seed:local-users` |
| Error de RLS/perfil | `npm run supabase:reset` y volver a sembrar |
| ESLint atascado en pdf.worker.mjs | Ya está ignorado en `eslint.config.mjs` |
| Puerto 3000 ocupado | `npx kill-port 3000` o cambiar puerto con `next dev -p 3001` |
