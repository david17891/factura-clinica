# QA Cloud — Validación Vercel Production & Supabase Cloud E2E

**URL de Producción:** https://fiscobot.vercel.app
**Project Ref de Supabase Cloud:** szyuaeoopimedwjosnjo
**Fecha:** 2026-05-18
**Auditor:** QA Cloud / Maintainer

---

## Veredicto

> [!NOTE]
> ### 🏆 VERDICT: DEMO_CLOUD_PRODUCTION_ACCEPTED
> El despliegue de Vercel Production y la base de datos de Supabase Cloud están **100% operativos, enlazados y validados**. El flujo completo de facturación electrónica de extremo a extremo (E2E) funciona de manera impecable en producción real sin errores en consola ni dependencias locales.

---

## 1. Validación de Páginas Públicas (HTTP Status)

| Prueba | Resultado | Ruta Probada |
|--------|-----------|--------------|
| Landing Page carga | ✅ HTTP 200 | https://fiscobot.vercel.app |
| Login Page carga | ✅ HTTP 200 | https://fiscobot.vercel.app/login |
| Formulario de Clínica carga | ✅ HTTP 200 | https://fiscobot.vercel.app/factura/dental-rio-colorado |

---

## 2. Usuarios Demo y Roles Creados en Cloud Auth
Se confirmó que el proyecto de Supabase Cloud cuenta con los siguientes tres usuarios de prueba ficticios, los cuales tienen asignada la clínica `Clinica Dental Rio Colorado` (ID `00000000-0000-0000-0000-000000000001`):

*   **Recepcionista:** `recepcion@dentalrio.test` (Rol: `reception`)
*   **Contador:** `contador@dentalrio.test` (Rol: `accountant`)
*   **Administrador:** `admin@dentalrio.test` (Rol: `clinic_admin`)
*   **Contraseña común:** `Demo123456!`

---

## 3. Secuencia de Validación E2E en Producción Real (Sin Localhost)

Se ejecutó una simulación E2E completa en el navegador utilizando datos ficticios mínimos:

### Paso 1: Recepcionista (Registro de Venta)
*   **Acción:** Login exitoso con el rol de recepción.
*   **Registro:** Venta registrada con folio autogenerado `V-000005` por un monto de `$150.00 MXN` y servicio de `Consulta Dental Ficticia`.
*   **Resultado:** Enlace fiscal seguro generado:
    `https://fiscobot.vercel.app/factura/dental-rio-colorado/v/2d8f92d7-3c12-4240-ad11-f117515a727a`

### Paso 2: Paciente (Solicitud de Factura e Ingesta de Constancia)
*   **Acción:** Apertura del enlace de la venta de forma anónima.
*   **Ingesta:** Carga exitosa de constancia de prueba `csf_ana_gomez_626.pdf` (sistema extrajo y prellenó el régimen fiscal `626 - Régimen Simplificado de Confianza`).
*   **Datos fiscales ficticios provistos:**
    *   RFC: `XAXX010101000`
    *   Nombre: `PACIENTE DE PRUEBA E2E`
    *   Código Postal: `83400`
*   **Resultado:** Solicitud enviada exitosamente a la nube.

### Paso 3: Contador (Auditoría y Solicitud de Corrección)
*   **Acción:** Login del contador.
*   **Visualización:** El panel del contador en la nube listó de inmediato la solicitud con el estado `Recibida`.
*   **Inspección y Rechazo:** Al abrir la solicitud, el contador detectó un error en el RFC y presionó "Marcar requiere corrección" ingresando el motivo: `"El RFC no coincide con la constancia de prueba."`
*   **Resultado:** La solicitud cambió al estado `Requiere corrección` y se generó el enlace personalizado para el paciente:
    `https://fiscobot.vercel.app/factura/dental-rio-colorado?correction=f18660e2-060c-41e4-aa84-7fc775190220`

### Paso 4: Paciente (Corrección y Reenvío)
*   **Acción:** Apertura de la URL de corrección por el paciente.
*   **Visualización:** El formulario mostró correctamente la alerta con el motivo del rechazo del contador.
*   **Corrección:** Se modificó el RFC a `XAXX010101001` y se reenvío el formulario.
*   **Resultado:** Solicitud actualizada con estado `Corregida por paciente`.

### Paso 5: Contador (Validación Final y Exportación)
*   **Acción:** El contador abrió el panel y validó que el estado cambió a `Corregida por paciente` reflejando el RFC correcto `XAXX010101001`.
*   **Resultado:** Se realizó la descarga del archivo CSV comprimido para contabilidad.

---

## 4. Auditoría de Seguridad y Storage
*   **Storage (csf-documents):** El bucket de almacenamiento de Supabase Cloud es **estrictamente privado**. Los accesos anónimos a directorios o descargas directas están deshabilitados. La carga de archivos de constancia está restringida bajo directivas RLS seguras a nivel de base de datos.
*   **Exportación a CSV:** Se validó que el archivo CSV exportado no expone columnas vulnerables de seguridad como:
    *   `storage_path` (Oculto)
    *   `signed_url` (Oculto)
    *   `correction_token` (Oculto)
    *   `public_token` (Oculto)
    Todo el transporte de datos se realiza de forma limpia y sanitizada.

---

## 5. Advertencias Importantes (Demo Cloud Controlada)
*   ⚠️ **Portal de Demostración:** Este entorno utiliza llaves de prueba de Supabase y un portal Vercel público con datos 100% ficticios.
*   ⚠️ **No Producción Operativa:** El sistema no está conectado a WebServices del SAT ni emite timbrado de CFDI fiscal real. Está catalogado como MVP de validación de flujos de trabajo antes de piloto comercial.
