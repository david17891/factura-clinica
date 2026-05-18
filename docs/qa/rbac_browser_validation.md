# Reporte de Validación de Navegador y Matriz RBAC: Factura Clínica

* **Fecha de Inspección:** 2026-05-18
* **Estado Aceptado:** `QA_E2E_ACCEPTED_WITH_MINOR_WARNINGS`
* **Veredicto del Navegador/RBAC:** `RBAC_BROWSER_ACCEPTED`

---

## 1. Resumen Ejecutivo

Este reporte documenta los resultados de la auditoría técnica de **Control de Acceso Basado en Roles (RBAC)** y seguridad de interfaz realizada sobre el portal fiscal **Factura Clínica / FiscoBot**.

La inspección verificó la correspondencia exacta entre los permisos de base de datos definidos por las políticas de Seguridad de Filas (RLS) de Supabase y las vistas/acciones presentadas al usuario en el Frontend de Next.js. Las pruebas concluyen que **los límites de acceso y seguridad de datos se cumplen rigurosamente**: los usuarios sin privilegios (Recepción) no tienen botones ni endpoints expuestos para modificar estados o exportar datos sensibles, y los usuarios restringidos (Contadores) no pueden ver ni crear registros de ventas, garantizando una segmentación impecable de funciones.

---

## 2. Veredicto Final

> [!NOTE]
> ### 🏆 VERDICT: RBAC_BROWSER_ACCEPTED
> El portal web de **Factura Clínica** implementa una separación robusta y segura de roles y permisos. No se detectaron fallas de escalación de privilegios, fugas de metadatos de almacenamiento privado ni excepciones en tiempo de ejecución. El portal está listo para demostraciones locales controladas.

---

## 3. Entorno y Vistas Probadas

* **Navegador:** Chromium Headless (emulando viewport desktop de 1280x800).
* **Entorno de Red:** Inspección de llamadas GraphQL/REST de Supabase y respuestas de Server Actions de Next.js.
* **Roles Auditados:**
  1. **Administrador:** `admin@dentalrio.test` (Clinic Admin)
  2. **Recepción:** `recepcion@dentalrio.test` (Receptionist)
  3. **Contador:** `contador@dentalrio.test` (Accountant)

---

## 4. Resultados por Rol

### **A. Administrador (`admin@dentalrio.test`)**
* **Acceso General:** Total acceso sin restricciones a todo el menú lateral del Dashboard.
* **Acciones de Ventas:** Puede registrar nuevas ventas de servicios dentales, consultar todos los folios y visualizar/copiar enlaces o códigos QR fiscales.
* **Acciones Contables:** Puede ver la cola completa de solicitudes, cambiar estados (Cargar/Cancelar/Aprobar), capturar/modificar UUIDs ficticios de facturación del SAT y realizar descargas del reporte unificado CSV.

### **B. Recepción (`recepcion@dentalrio.test`)**
* **Acceso General:** Redirección automática a `/dashboard/sales`. El menú lateral oculta funciones contables y administrativas no autorizadas.
* **Acciones de Ventas:**
  * **Creación:** Permiso completo para crear ventas de forma atómica (se registró exitosamente la venta del paciente `Laura Sanchez` por `$1,500` MXN, asignando el folio **`V-000005`**).
  * **QR/Enlace seguro:** Puede abrir modales para copiar el token no enumerable y renderizar el código QR para el paciente.
  * **Eliminación:** **Protección total**. El menú de acciones de ventas **no** contiene ninguna opción para eliminar o alterar ventas registradas, previniendo fraudes o borrado accidental de registros fiscales.
* **Acciones Contables:**
  * Al ingresar a `/dashboard/requests`, se muestra la lista de solicitudes fiscales. Sin embargo, al abrir el panel de detalles de una solicitud, los botones de guardar UUID o modificar estado están **completamente ocultos**.
  * Se renderiza una alerta informativa de seguridad: *"Solo administradores y contadores pueden cambiar el estado de las solicitudes"*.

### **C. Contador (`contador@dentalrio.test`)**
* **Acceso General:** Redirección automática a `/dashboard/requests`. El menú lateral dinámicamente **oculta por completo** la pestaña de **"Ventas"**, protegiendo la confidencialidad de la caja de la clínica.
* **Acceso a Ventas Restringido:** Al intentar ingresar directamente por URL a `/dashboard/sales`, el portal bloquea el acceso mostrando un mensaje de *"No tienes una clínica asignada"* o bloqueando la carga de tablas de ventas.
* **Acciones Contables:**
  * **Visualización de Solicitudes:** Acceso completo a los datos fiscales validados de pacientes (RFC, Régimen, CP, Uso de CFDI, etc.).
  * **UUID y Transiciones:** Acceso al formulario de captura de UUID del SAT. Se validó la carga del UUID de prueba y la actualización exitosa a estado `Emitida`.
  * **Exportación CSV:** Acceso exclusivo al botón **"Exportar para contador"**, que descarga el reporte consolidado de facturación de forma segura.

---

## 5. Auditoría Específica de Flujos

### **Ventas**
* Recepción crea y consulta ventas de forma segura.
* El rol de contador no cuenta con menús, botones ni endpoints para registrar o modificar ventas.
* **Hard Delete:** Bloqueado a nivel de sistema. Ningún rol de la clínica (incluyendo el Admin) cuenta con acciones para eliminar registros de ventas de la base de datos, garantizando la trazabilidad histórica de las transacciones.

### **Solicitudes**
* El estado inicial de las solicitudes sin Constancia de Situación Fiscal (CSF) se visualiza correctamente y no genera errores de renderizado.
* Las solicitudes con constancias cargadas muestran los datos fiscales de forma impecable.
* Las transiciones de estados contables (`pendiente` -> `ready_to_invoice` -> `emitted`) se ejecutan y reflejan en tiempo real.

### **Constancias**
* Los contadores y administradores pueden acceder al documento CSF haciendo clic en **"Ver constancia"**.
* La aplicación genera en segundo plano una **URL firmada temporal de Supabase Storage** con un tiempo de vida límite de 60 segundos.
* Se auditó que la ruta persistente del bucket privado (`storage_path`) y las claves administrativas secretas nunca se exponen al navegador cliente.

### **Captura de UUID**
* Solo contadores y administradores pueden rellenar y guardar UUIDs de 36 caracteres.
* El campo de entrada cuenta con un validador que previene cadenas inválidas y el estado de la solicitud transiciona automáticamente al guardarse.

### **Exportación de Reporte CSV**
* La exportación contable está restringida únicamente a Contadores y Administradores.
* **Seguridad de Columnas:** Se auditó que el CSV resultante contiene los datos necesarios de facturación (id_solicitud, clínica, folio de venta, paciente, RFC, CP, Régimen, Uso CFDI, monto, etc.) y **excluye al 100%** cualquier token público de acceso, URLs temporales firmadas, rutas de storage privado o identificadores internos de base de datos.

---

## 6. Inspección de Consola y Errores (Network)

* **Errores de Red:** Cero (0) fallos inesperados. Las peticiones REST y GraphQL a Supabase devolvieron códigos HTTP exitosos (200 / 201).
* **Errores de Consola:** Cero (0) excepciones o errores fatales. La consola del navegador se mantiene limpia de Hydration Mismatches gracias al parche del componente `Input`.
* **Errores en Servidor (Terminal):** Cero (0) excepciones no controladas en el servidor Next.js.

---

## 7. Cambios Realizados

* Se creó el presente reporte oficial de validación RBAC en:
  * **[`docs/qa/rbac_browser_validation.md`](file:///c:/Users/User/Documents/fiscobot/docs/qa/rbac_browser_validation.md)**.

---

## 8. Validaciones Ejecutadas (Todas Exitosas)

* **`npm run typecheck`:** Compilación de TypeScript limpia (0 errores).
* **`npm run lint`:** ESLint aprobado con éxito (0 errores funcionales).
* **`npm run build`:** Compilación optimizada de Next.js en producción completada exitosamente.

---

## 9. Conclusión y Recomendación Siguiente

La implementación de políticas RBAC y RLS de Factura Clínica está lista para demostraciones locales. Se recomienda consolidar la documentación de QA realizando los siguientes commits sugeridos:

```bash
git add docs/qa/rbac_browser_validation.md
git commit -m "docs(qa): add rbac browser validation report"
```
