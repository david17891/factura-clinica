# FiscoBot — Implementación del Video Explicativo en Remotion

Este documento detalla la estructura visual, técnica y de código del video explicativo comercial autogenerado mediante **Remotion**.

---

## 1. Ficha Técnica del Video

*   **Identificador de la Composición:** `FacturaClinicaDemo`
*   **Resolución:** 1920x1080 píxeles (Horizontal Full HD)
*   **Framerate:** 30 fps
*   **Duración Total:** 75 segundos (2250 frames en total)
*   **Estética:** SaaS premium, glassmorphism, degradados radiales dinámicos por escena y modo oscuro nativo.

---

## 2. Escenas Implementadas

El video se compone de 7 escenas fluidas que representan la narrativa comercial del producto FiscoBot (Factura Clínica):

### 🎬 Escena 1: El Caos Administrativo (Frames 0 - 300 / 10s)
*   **Visual:** Landing page del portal con un zoom lento del 100% al 105%.
*   **Copia en pantalla:** *"¿Perdiendo tiempo facturando por WhatsApp?"*
*   **Enfoque:** Mostrar el dolor administrativo de los chats desordenados.
*   **Asset:** `remotion-assets/landing_factura_clinica.png`

### 🎬 Escena 2: Presentación de FiscoBot (Frames 300 - 600 / 10s)
*   **Visual:** Formulario de inicio de sesión con presets de roles de prueba. Entrada con barrido lateral y zoom del 102% al 107%.
*   **Copia en pantalla:** *"FiscoBot: El Portal Fiscal de su Clínica"*
*   **Enfoque:** Introducir el portal unificado.
*   **Asset:** `remotion-assets/login_roles_demo.png`

### 🎬 Escena 3: Recepción Simplificada (Frames 600 - 900 / 10s)
*   **Visual:** Panel de recepción creando folios de venta ficticios por $150 MXN. En el frame 720, un modal emergente elástico muestra el código QR y enlace seguro generados.
*   **Copia en pantalla:** *"Cobre como siempre. Genere link en 2 clics."*
*   **Enfoque:** Demostrar agilidad operativa.
*   **Assets:** `remotion-assets/recepcion_crear_venta.png` y `remotion-assets/venta_link_qr_generado.png`

### 🎬 Escena 4: Carga e Ingesta Inteligente (Frames 900 - 1350 / 15s)
*   **Visual:** Mockup móvil centrado que simula la subida del PDF ficticio de Constancia Fiscal y el prellenado de campos en un segundo.
*   **Copia en pantalla:** *"Prellenado privado desde Constancia Fiscal"*
*   **Enfoque:** Eliminar errores de dedo.
*   **Asset:** `remotion-assets/paciente_constancia_prefill.png`

### 🎬 Escena 5: Panel del Contador (Frames 1350 - 1650 / 10s)
*   **Visual:** Bandeja de auditoría contable mostrando la solicitud recibida.
*   **Copia en pantalla:** *"Panel ordenado para auditoría contable"*
*   **Enfoque:** Mostrar control y orden del despacho.
*   **Asset:** `remotion-assets/contador_solicitudes_panel.png`

### 🎬 Escena 6: WhatsApp Manual Assist (Frames 1650 - 2040 / 13s)
*   **Visual:** Split screen. A la izquierda la solicitud de rechazo del contador y a la derecha la alerta roja móvil de reenvío corregido.
*   **Copia en pantalla:** *"WhatsApp Manual Assist en un clic"*
*   **Enfoque:** Agilizar correcciones sin fricciones.
*   **Assets:** `remotion-assets/contador_requiere_correccion.png` y `remotion-assets/paciente_correccion.png`

### 🎬 Escena 7: Exportación y Cierre (Frames 2040 - 2250 / 11s)
*   **Visual:** Panel contable con un botón pulsante verde en "Exportar para contador" revelando la descarga de CSV limpio.
*   **Copia en pantalla:** *"UUID, CSV y cierre contable sin errores"*
*   **Enfoque:** Transmitir tranquilidad e integración final de la demo cloud controlada.
*   **Asset:** `remotion-assets/export_csv_seguro.png`

---

## 3. Comandos de Gestión y Renderizado

Para previsualizar o exportar el video, utiliza los scripts integrados de npm:

### Abrir Estudio de Desarrollo (Preview)
```bash
npm run video:preview
```

### Renderizar MP4 de Humo (3 Segundos / Frames 0-90)
```bash
npx remotion render remotion/index.ts FacturaClinicaDemo out/factura-clinica-demo-smoke.mp4 --frames=0-90
```

### Renderizar Video Completo (75 Segundos / Frames 0-2250)
```bash
npm run video:render
```

*   **Ruta de Salida:** `out/factura-clinica-demo.mp4` (Esta ruta y archivo están estrictamente excluidos en `.gitignore` para no subir binarios pesados al repositorio privado).
