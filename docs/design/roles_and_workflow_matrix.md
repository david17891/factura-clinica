# FiscoBot — Matriz de Roles, Permisos y Flujo de Estados

## Estado del sistema

- **Alcance:** demo local/controlada con datos ficticios
- **No producción**
- **No datos reales**
- **No piloto operativo**
- **Veredicto actual:** RBAC_WORKFLOW_ACCEPTED_WITH_MINOR_FIXES

---

## Roles definidos

| Rol | Descripción | Alcance |
|-----|-------------|---------|
| `superadmin` | Administrador global | Todas las clínicas |
| `clinic_admin` | Administrador de clínica | Su clínica asignada |
| `reception` | Recepción | Su clínica asignada |
| `accountant` | Contador externo | Clínicas asignadas vía `clinic_accountants` |

---

## Matriz de permisos por entidad

### 1. Ventas (`sales`)

| Acción | Admin | Recepción | Contador | Notas |
|--------|:-----:|:---------:|:--------:|-------|
| Crear venta | Sí | Sí | **No** | Backend validado via `canCreateSale` |
| Ver ventas de su clínica | Sí | Sí | Sí (en contexto) | Contador ve ventas ligadas a solicitudes |
| Ver ventas de otra clínica | No | No | No | Alcance por RLS + server action |
| Copiar link fiscal | Sí | Sí | No | Acción operativa de recepción |
| Enviar WhatsApp | Sí | Sí | No | Acción operativa de recepción |
| Ver QR por venta | Sí | Sí | No | Acción operativa de recepción |
| Cambiar estado de venta | Sí | No | No | Solo admin puede cambiar estados de venta |
| Cancelar venta sin solicitud | Sí | Evaluar | No | Requiere motivo; no hard delete |
| Eliminar venta | **No** | **No** | **No** | Política: no hard delete en MVP |
| Eliminar venta con solicitud | **No** | **No** | **No** | Prohibido; usar estado `cancelled` |

### 2. Solicitudes fiscales (`invoice_requests`)

| Acción | Admin | Recepción | Contador | Notas |
|--------|:-----:|:---------:|:--------:|-------|
| Ver solicitudes de su clínica | Sí | Sí | Sí | Todos ven solicitudes de su alcance |
| Ver solicitudes de otra clínica | No | No | No | Alcance por RLS + server action |
| Ver datos fiscales confirmados | Sí | Sí | Sí | Datos que el paciente capturó |
| Ver constancia subida | Sí | Sí | Sí | Metadata visible; archivo vía signed URL |
| Abrir constancia (signed URL) | Sí | Sí | Sí | Server-side temporal 60s |
| Cambiar estado de solicitud | Sí | **No** | Sí | Recepción es solo lectura |
| Marcar en revisión | Sí | No | Sí | `sent_to_accountant` mostrado como "En revisión" |
| Marcar lista para facturar | Sí | No | Sí | `ready_to_invoice` |
| Reabrir solicitud rechazada | Sí | No | Sí | `fiscal_data_received` desde `rejected` |
| Requiere corrección | Sí | No | Sí | `rejected` con motivo |
| Cancelar / No facturable | Sí | No | Sí | `cancelled` |
| Capturar UUID | Sí | **No** | Sí | Requiere rol `clinic_admin` o `accountant` |
| Marcar como emitida | Sí | No | Sí | vía `assignUuidAction` |
| Exportar CSV | Sí | **No** | Sí | `canExport` valida rol |
| Eliminar solicitud | **No** | **No** | **No** | Política: no hard delete en MVP |
| Eliminar constancia | **No** | **No** | **No** | Pendiente para fase futura |

### 3. Constancias fiscales (`invoice_request_csf_documents`)

| Acción | Admin | Recepción | Contador | Notas |
|--------|:-----:|:---------:|:--------:|-------|
| Subir (público/paciente) | — | — | — | Acción anónima vía formulario público |
| Ver metadata | Sí | Sí | Sí | Filename, tamaño, estado de extracción |
| Ver datos sugeridos | Sí | Sí | Sí | Datos detectados por OCR/QR/PDF |
| Abrir archivo | Sí | Sí | Sí | Signed URL server-side 60s |
| Ver storage_path | **No** | **No** | **No** | Nunca expuesto en UI ni CSV |
| Eliminar | **No** | **No** | **No** | Política de retención pendiente |

### 4. Dashboard y navegación

| Sección | Admin | Recepción | Contador |
|---------|:-----:|:---------:|:--------:|
| Dashboard principal | Sí | Sí | Sí |
| Ventas | Sí | Sí | No (no operativo) |
| Solicitudes | Sí | Sí | Sí |
| QR fijo | Sí | Sí | No |
| Sitio público | Sí | Sí | Sí |

---

## Estados y transiciones

### Flujo final de solicitud

El flujo visible evita la acción "Enviar al contador" porque el contador ya ve automáticamente las solicitudes de sus clínicas asignadas. El estado interno `sent_to_accountant` se conserva por compatibilidad, pero en UI y documentación se interpreta como **En revisión**.

| Acción visible | Estado interno resultante | Roles |
|----------------|---------------------------|-------|
| Marcar en revisión | `sent_to_accountant` | Admin, Contador |
| Lista para facturar | `ready_to_invoice` | Admin, Contador |
| Requiere corrección | `rejected` | Admin, Contador |
| Cancelar / No facturable | `cancelled` | Admin, Contador |
| Guardar UUID y marcar como emitida | `issued` | Admin, Contador |

Recepción puede ver solicitudes, estado, constancia y datos confirmados, pero no opera el flujo fiscal.

### Flujo "Requiere corrección"

1. Admin o contador detecta un problema en los datos fiscales.
2. Admin o contador marca la solicitud como **Requiere corrección** y debe capturar un mensaje para el paciente.
3. El sistema guarda `correction_message`, `correction_requested_at`, `correction_requested_by`, incrementa `correction_count` y mantiene un `correction_token` no enumerable.
4. Recepción, admin o contador pueden copiar el mensaje o abrir WhatsApp manual con el enlace `/factura/[slug]?correction=[token]`.
5. El paciente abre el enlace, ve el motivo, revisa los datos precargados y reenvía el formulario.
6. La RPC pública actualiza la misma `invoice_request`; no crea duplicado.
7. La solicitud pasa a `corrected_by_patient`.
8. Admin o contador la revisa de nuevo, la marca en revisión o lista para facturar, y después captura UUID para dejarla `issued`.

### WhatsApp Manual Assist

- El sistema **no usa WhatsApp API oficial** ni automatiza envíos.
- El flujo de corrección genera un mensaje prellenado y abre `wa.me` en una nueva pestaña del navegador.
- El usuario humano (recepción, admin o contador) debe revisar el mensaje y confirmar manualmente el envío en WhatsApp Web o la app móvil.
- No se guardan sesiones, cookies ni conversaciones de WhatsApp.
- El número telefónico se normaliza antes de construir la URL: números de 10 dígitos se prefija con `52` (México); si ya incluye prefijo internacional se usa tal cual después de limpiar no-dígitos.
- Si no hay teléfono registrado, se abre `wa.me/?text=` para que el usuario elija el destinatario manualmente.

### Estados de solicitud fiscal (`invoice_status`)

| Estado | Significado | Quién puede llegar |
|--------|-------------|-------------------|
| `fiscal_data_pending` | Se creó venta pero paciente no ha enviado datos | Automático al crear venta |
| `fiscal_data_received` | Recibida; paciente envió datos fiscales | Admin/Contador puede reabrir desde `rejected` |
| `ready_to_invoice` | Datos validados; lista para facturar | Admin/Contador desde `fiscal_data_received` |
| `sent_to_accountant` | En revisión fiscal | Admin/Contador desde `fiscal_data_received` |
| `corrected_by_patient` | Corregida por paciente; pendiente de nueva revisión | Paciente vía enlace de corrección |
| `issued` | Factura emitida; UUID capturado | Admin/Contador vía `assignUuidAction` |
| `rejected` | Requiere corrección; datos insuficientes o incorrectos | Admin/Contador desde estados previos |
| `cancelled` | Cancelada / No facturable | Admin/Contador desde estados previos |
| `not_requested` | Venta sin solicitud asociada | Estado de venta, no de solicitud |

### Transiciones permitidas

```
fiscal_data_received → ready_to_invoice
fiscal_data_received → sent_to_accountant  (marcar en revisión)
fiscal_data_received → rejected
fiscal_data_received → cancelled

fiscal_data_pending → fiscal_data_received  (cuando paciente envía)
fiscal_data_pending → rejected
fiscal_data_pending → cancelled

ready_to_invoice → rejected
ready_to_invoice → cancelled

sent_to_accountant → ready_to_invoice
sent_to_accountant → rejected
sent_to_accountant → cancelled

corrected_by_patient → sent_to_accountant
corrected_by_patient → ready_to_invoice
corrected_by_patient → rejected
corrected_by_patient → cancelled

rejected → fiscal_data_received  (reabrir)

issued → (estado final, no transiciones)
cancelled → (estado final, no transiciones)
```

### Estados de venta (`sales.status`)

| Estado | Significado |
|--------|-------------|
| `not_requested` | Sin solicitud fiscal |
| `fiscal_data_pending` | Solicitud iniciada, datos pendientes |
| `fiscal_data_received` | Recibida |
| `ready_to_invoice` | Lista para facturar |
| `sent_to_accountant` | En revisión |
| `corrected_by_patient` | Corregida por paciente |
| `issued` | Factura emitida |
| `rejected` | Requiere corrección |
| `cancelled` | Cancelada / No facturable |

**Nota:** Las ventas y solicitudes comparten el enum `invoice_status`, pero representan cosas distintas. Una venta puede estar `not_requested` mientras su solicitud asociada (si existe) tiene su propio estado.

---

## Reglas de cancelación

1. **No hard delete por defecto.** Toda eliminación lógica se hace vía estados.
2. **Ventas sin solicitud:** Admin puede cancelar. Recepción puede evaluarse con permiso limitado.
3. **Ventas con solicitud:** Solo admin; solicitud debe cancelarse primero o simultáneamente.
4. **Solicitudes fiscales:** Admin o contador pueden cancelar. Recepción no.
5. **Cancelación requiere motivo:** Campo opcional `rejection_reason` o `notes`.
6. **Constancias fiscales:** No se eliminan en MVP. Retención y política de borrado queda para fase futura.

---

## Política de no eliminación (MVP)

| Entidad | ¿Eliminación física? | Alternativa |
|---------|----------------------|-------------|
| Ventas | **No** | Estado `cancelled` |
| Solicitudes fiscales | **No** | Estado `cancelled` |
| Constancias | **No** | Retención indefinida en MVP |
| Documentos CFDI | **No** | Registro histórico |
| Usuarios | **No** | Desactivación (futuro) |

---

## Auditoría de permisos actual (backend)

| Server Action | Función de permiso | Roles permitidos | Estado |
|-------------|-------------------|-----------------|--------|
| `createSaleAction` | `canCreateSale` | superadmin, clinic_admin, reception | Correcto |
| `updateSaleStatusAction` | Inline check | superadmin, clinic_admin | Correcto |
| `updateInvoiceRequestStatusAction` | `canUpdateRequestStatus` | superadmin, clinic_admin, accountant | Correcto |
| `assignUuidAction` | `canAssignUuid` | superadmin, clinic_admin, accountant | Correcto |
| `exportRequestsCsvAction` | `canExport` | superadmin, clinic_admin, accountant | Correcto |
| `createCsfDocumentSignedUrlAction` | Inline check (auth) | Cualquier autenticado | Correcto |

**Observación:** Los server actions correctamente validan roles. El riesgo principal es en la UI: botones visibles para usuarios que no pueden ejecutarlos.

---

## Riesgos pendientes

1. **RLS all-policy en sales:** La policy `Clinic members can manage sales` permite ALL (incluyendo DELETE) a cualquier miembro de la clínica. Reception podría borrar si manipula el cliente.
2. **RLS all-policy en invoice_requests:** Similar — cualquier miembro de clínica puede actualizar/borrar.
3. **Nav no filtrada:** El layout muestra todas las secciones a todos los roles.
4. **Requests page no filtrada:** Todos los botones de acción visibles para todos los roles.
5. **Sales page no filtrada:** Botón "Nueva venta" visible para accountant.

**Mitigación inmediata:** Filtrar UI por rol + mantener validaciones server-side.
**Mitigación futura:** Dividir RLS policies ALL en SELECT/INSERT/UPDATE/DELETE con checks de rol.

---

## Flujo de trabajo recomendado

### Recepción
1. Login → Dashboard
2. Ir a Ventas → Crear venta → Registrar pago
3. Copiar link o enviar WhatsApp al paciente
4. Ver QR fijo si es necesario
5. Ir a Solicitudes → Ver solicitudes recibidas (solo lectura)
6. Confirmar que el paciente envió datos

### Contador
1. Login → Dashboard
2. Ir a Solicitudes → Ver solicitudes de clínicas asignadas
3. Revisar datos fiscales y constancia (signed URL)
4. Marcar en revisión o lista para facturar según el avance real
5. Capturar UUID cuando la factura sea emitida en sistema externo
6. Exportar CSV para contabilidad

### Administrador
1. Login → Dashboard
2. Operar flujo completo (ventas + solicitudes)
3. Resolver excepciones (reabrir rechazadas, corregir UUID)
4. Cancelar registros si es necesario
5. Exportar reportes

---

## Advertencias

- Este sistema es **demo local/controlada** con datos ficticios.
- **No usar en producción.**
- **No usar datos reales.**
- **No usar constancias reales.**
- Las validaciones server-side son la línea de defensa principal.
- La UI filtrada es la segunda línea de defensa (UX + seguridad por oscuridad).
- RLS debe endurecerse antes de producción.
