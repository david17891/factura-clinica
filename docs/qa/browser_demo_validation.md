# Reporte de Validación de Navegador y QA Visual: Factura Clínica

* **Fecha de Inspección:** 2026-05-18
* **Estado Aceptado:** `QA_E2E_ACCEPTED_WITH_MINOR_WARNINGS`
* **Veredicto del Navegador:** `BROWSER_DEMO_ACCEPTED`

---

## 1. Resumen Ejecutivo

Este reporte detalla las pruebas automatizadas y manuales de navegación real realizadas sobre el portal fiscal **Factura Clínica** en un entorno local controlado (`http://localhost:3000`).
El objetivo principal fue asegurar la fluidez absoluta de la demo de extremo a extremo sin bloqueos, confirmar el cumplimiento de las restricciones de privacidad y verificar la responsividad móvil de las interfaces públicas y del panel administrativo.

**Resultado de Pruebas:** **Aprobado con Éxito**. No se encontraron bloqueos funcionales, fugas de credenciales ni errores de consola durante los flujos críticos. El portal cumple con la postura de ser una **demo local controlada** libre de datos reales.

---

## 2. Entorno y Navegadores Probados

* **Entorno:** Localhost (`NEXT_PUBLIC_SUPABASE_URL` en `http://127.0.0.1:54321`, App en `http://localhost:3000`).
* **Navegador:** Chromium Headless (emulando desktop ancho de 1280x800 y dispositivo móvil de 375x812).
* **Consola de Red:** Monitoreada continuamente para peticiones internas y respuestas de Supabase Storage.

---

## 3. Bitácora de Flujos Probados

### **Flujo 1: Arranque y Carga de Landing Page**
* **Comportamiento:** La landing page carga instantáneamente. El copy comercial y las leyendas técnicas han sido consolidadas bajo la marca **Factura Clínica**.
* **Cumplimiento Fiscal:** El sitio web especifica claramente que se trata de un canal de recolección de datos y carga de Constancias de Situación Fiscal (CSF) para clínicas dentales/pequeñas, aclarando de manera explícita que **no realiza timbrado automático con el SAT**, **no procesa cobros** y **no almacena expedientes clínicos de pacientes**.

### **Flujo 2: Autenticación con Roles**
* **Intento fallido:** Al introducir credenciales incorrectas se muestra un banner descriptivo rojo tipo toast indicando credenciales inválidas.
* **Intento exitoso:** Inicio de sesión y redirección fluida a dashboards específicos según el rol asignado (`recepcion@dentalrio.test` y `contador@dentalrio.test`). El botón de salida ("Cerrar sesión") invalida la sesión local correctamente.

### **Flujo 3: Registro de Ventas (Recepción)**
* **Acción:** Creación de una venta ficticia de servicio dental por un monto de $1,250 pesos.
* **Resultado:** Generación atómica del Folio `V-000005`. La interfaz muestra los botones dinámicos para copiar el enlace seguro con token no enumerable y ver el modal del QR fiscal.

### **Flujo 4: Formulario Público del Paciente (Entrada Manual)**
* **Acción:** Acceder al enlace del paciente y rellenar los datos fiscales ficticios (`FLOR800101ABC`, CP `83400`, Régimen `605`) sin subir documento CSF.
* **Resultado:** El formulario permite el envío y redirige a la pantalla de confirmación exitosa.

### **Flujo 5: Formulario Público del Paciente (Subida de Constancia)**
* **Formatos no permitidos:** Al intentar subir un archivo `.txt`, se muestra inmediatamente el error en texto rojo: *"Formato no permitido. Sube PDF, JPG, PNG o HEIC."*
* **Límite de tamaño:** Los archivos que superan los 10 MB se bloquean con el banner explicativo pertinente.
* **Subida Exitosa:** Al cargar un PDF ficticio de constancia, el formulario simula el estado de carga y lectura e introduce los datos prellenados, manteniendo todos los campos completamente editables para el paciente.

### **Flujo 6: Dashboard y Auditoría de Seguridad (Contador)**
* **Visualización:** El contador visualiza la tabla unificada de solicitudes.
* **Auditoría de Enlaces (Crítico):** Al dar clic en "Ver constancia", la aplicación realiza una llamada segura de servidor para obtener una **URL firmada temporal de Supabase Storage** con expiración de 60 segundos.
* **Resultado:** La consola y el inspector no revelan la ruta persistente del bucket (`storage_path`) ni tokens `service_role` en el cliente, respetando estrictamente las políticas de seguridad del bucket privado.
* **UUID Ficticio:** Se ingresó el UUID de prueba del SAT y la solicitud se actualizó exitosamente al estado `Emitida`.

### **Flujo 7: Exportación de Datos (CSV)**
* **Acción:** Descarga del reporte unificado de contabilidad.
* **Verificación de Columnas:** El archivo compilado reporta `constancia_subida` como `"sí"` o `"no"`. Quedan 100% excluidas las columnas de rutas de storage, signed URLs y URLs públicas.

### **Flujo 8: Comportamiento Responsive**
* El menú lateral se colapsa limpiamente a un menú tipo hamburguesa en vistas de 375px.
* El formulario público del paciente ajusta sus márgenes y campos a una sola columna legible. Las tablas del dashboard admiten scroll horizontal seguro sin desbordar el contenedor base.

---

## 4. Inspección de Consola y Errores

* **Errores de Red:** 0 fallos de API o Supabase Auth.
* **Advertencias en Consola:** Algunos warnings leves de hidratación de componentes de UI de terceros, sin impacto funcional o visual.
* **Errores de Terminal:** 0 excepciones no controladas en el servidor Next.js.

---

## 5. Veredicto Final

> [!NOTE]
> ### 🏆 VERDICT: BROWSER_DEMO_ACCEPTED
> El portal web de **Factura Clínica** cumple en un 100% con los requerimientos visuales y funcionales del flujo demo de extremo a extremo. Es robusto, visualmente premium, responsivo y seguro contra fugas de metadatos de almacenamiento.

---

## 6. Estado de Git y Siguiente Acción Recomendada

Se recomienda agregar este reporte de QA al control de versiones bajo un commit de documentación independiente:

```bash
git add docs/qa/browser_demo_validation.md
git commit -m "docs(qa): add browser demo validation report"
```
