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
| Marcar lista para facturar | Sí | No | Sí | `ready_to_invoice` |
| Enviar al contador | Sí | No | Sí | `sent_to_accountant` |
| Reabrir solicitud rechazada | Sí | No | Sí | `fiscal_data_received` desde `rejected` |
| Rechazar solicitud | Sí | No | Sí | `rejected` con motivo |
| Cancelar solicitud | Sí | No | Sí | `cancelled` |
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

### Estados de solicitud fiscal (`invoice_status`)

| Estado | Significado | Quién puede llegar |
|--------|-------------|-------------------|
| `fiscal_data_pending` | Se creó venta pero paciente no ha enviado datos | Automático al crear venta |
| `fiscal_data_received` | Paciente envió datos; pendiente de revisión | Admin/Contador puede reabrir desde `rejected` |
| `ready_to_invoice` | Datos validados; lista para facturar | Admin/Contador desde `fiscal_data_received` |
| `sent_to_accountant` | Enviada al contador (delegación) | Admin/Contador desde `fiscal_data_received` o `ready_to_invoice` |
| `issued` | Factura emitida; UUID capturado | Admin/Contador vía `assignUuidAction` |
| `rejected` | Datos incorrectos; paciente debe corregir | Admin/Contador desde estados previos |
| `cancelled` | Cancelada; no se facturará | Admin/Contador desde estados previos |
| `not_requested` | Venta sin solicitud asociada | Estado de venta, no de solicitud |

### Transiciones permitidas

```
fiscal_data_received → ready_to_invoice
fiscal_data_received → sent_to_accountant
fiscal_data_received → rejected
fiscal_data_received → cancelled

fiscal_data_pending → fiscal_data_received  (cuando paciente envía)
fiscal_data_pending → rejected
fiscal_data_pending → cancelled

ready_to_invoice → sent_to_accountant
ready_to_invoice → rejected
ready_to_invoice → cancelled

sent_to_accountant → rejected
sent_to_accountant → cancelled

rejected → fiscal_data_received  (reabrir)

issued → (estado final, no transiciones)
cancelled → (estado final, no transiciones)
```

### Estados de venta (`sales.status`)

| Estado | Significado |
|--------|-------------|
| `not_requested` | Sin solicitud fiscal |
| `fiscal_data_pending` | Solicitud iniciada, datos pendientes |
| `fiscal_data_received` | Datos fiscales recibidos |
| `ready_to_invoice` | Lista para facturar |
| `sent_to_accountant` | Enviada al contador |
| `issued` | Factura emitida |
| `rejected` | Solicitud rechazada |
| `cancelled` | Cancelada |

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
4. Marcar como lista para facturar / enviar al contador
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
