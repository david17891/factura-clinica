# FiscoBot — Storyboard para Remotion

Este documento define la estructura técnica del video para su codificación dentro de **Remotion** (composición de video programática en React).

---

## Especificaciones de Composición en Remotion

*   **Resolución:** 1920x1080 (Horizontal Full HD - ideal para web/YouTube) o 1080x1920 (Vertical - para Shorts/Reels si se re-encuadra).
*   **Framerate:** 30 fps.
*   **Duración total:** 75 segundos (2250 frames en total).
*   **Diseño Visual:** Estética oscura premium (Backgrounds translúcidos, degradados azul-violeta, glassmorphism y tipografía Inter/Outfit).

---

## Storyboard de Escenas

### Escena 1: El Caos Administrativo
*   **Captura:** `docs/demo/video_assets/landing_factura_clinica.png`
*   **Texto en pantalla:** "¿Perdiendo tiempo facturando por WhatsApp?"
*   **Narración:** *"¿Cuánto tiempo pierde su clínica persiguiendo a pacientes por WhatsApp para que manden su Constancia Fiscal? Las solicitudes se pierden en los chats, llegan borrosas, incompletas y generan horas de retrabajo inútil."*
*   **Duración:** 10 segundos (Frames 0 - 300).
*   **Movimiento/Animación:** Entrada con opacidad suave. Un ligero zoom-in del 100% al 105% (escala) durante los 10 segundos, enfocado en el fondo que representa el portal fiscal.

---

### Escena 2: Presentación de FiscoBot
*   **Captura:** `docs/demo/video_assets/login_roles_demo.png`
*   **Texto en pantalla:** "FiscoBot \n Portal Fiscal Inteligente"
*   **Narración:** *"Presentamos FiscoBot. La solución inteligente que organiza el flujo de facturación de extremo a extremo, conectando a la recepción de su clínica, al paciente y al contador en una plataforma cloud controlada con datos ficticios."*
*   **Duración:** 10 segundos (Frames 300 - 600).
*   **Movimiento/Animación:** Transición de barrido (slide) desde la izquierda. Zoom suave y paneo lento hacia la tarjeta de inicio de sesión con presets de roles.

---

### Escena 3: Recepción Simplificada
*   **Captura:** `docs/demo/video_assets/recepcion_crear_venta.png`
*   **Texto en pantalla:** "Recepción: Venta en 2 clics"
*   **Narración:** *"El proceso es sumamente sencillo. La recepcionista cobra como siempre, registra la venta en la plataforma en segundos y genera un código QR o un enlace fiscal seguro."*
*   **Duración:** 10 segundos (Frames 600 - 900).
*   **Movimiento/Animación:** Fade-in. Enfoque inicial en la tarjeta lateral izquierda y luego una animación que resalta la ventana de creación de folios utilizando una escala de 103%.

---

### Escena 4: Carga e Ingesta Inteligente
*   **Captura:** `docs/demo/video_assets/paciente_constancia_prefill.png`
*   **Texto en pantalla:** "Paciente: Prellenado privado de constancia"
*   **Narración:** *"Al escanear el QR o abrir el enlace en su celular, el paciente sube su constancia fiscal ficticia de prueba. FiscoBot realiza un prellenado privado desde la constancia, evitando cualquier error de dedo al capturar sus datos."*
*   **Duración:** 15 segundos (Frames 900 - 1350).
*   **Movimiento/Animación:** Zoom gradual del 100% al 110% centrándose en el área de carga del archivo PDF y los campos de prellenado automático de régimen fiscal.

---

### Escena 5: Panel Administrativo del Contador
*   **Captura:** `docs/demo/video_assets/contador_solicitudes_panel.png`
*   **Texto en pantalla:** "Contador: Panel estructurado de solicitudes"
*   **Narración:** *"El despacho contable recibe de inmediato toda la información estructurada en su panel administrativo. El contador audita los datos ficticios y asocia los folios de facturación en un solo lugar."*
*   **Duración:** 10 segundos (Frames 1350 - 1650).
*   **Movimiento/Animación:** Transición de desvanecimiento (cross-fade). Paneo horizontal suave para mostrar el listado de solicitudes recibidas en orden.

---

### Escena 6: WhatsApp Manual Assist & Corrección
*   **Captura:** `docs/demo/video_assets/contador_requiere_correccion.png` (en secuencia con `docs/demo/video_assets/paciente_correccion.png`)
*   **Texto en pantalla:** "WhatsApp Manual Assist \n Corrección en un clic"
*   **Narración:** *"¿Falta algún dato? Con WhatsApp Manual Assist, el contador envía un aviso con un clic. El paciente corrige su información desde el mismo enlace seguro en segundos, sin llamadas de ida y vuelta."*
*   **Duración:** 13 segundos (Frames 1650 - 2040).
*   **Movimiento/Animación:** Transición rápida de tipo split. Muestra a la izquierda el drawer de rechazo del contador y a la derecha la interfaz móvil de reenvío con la alerta roja del paciente.

---

### Escena 7: Exportación y Cierre
*   **Captura:** `docs/demo/video_assets/export_csv_seguro.png`
*   **Texto en pantalla:** "Reporte CSV limpio y seguro"
*   **Narración:** *"Al final del mes, exporte un reporte CSV limpio, sanitizado y listo para su sistema contable. Menos mensajes perdidos, cero retrabajo y absoluta claridad entre clínica, paciente y contador."*
*   **Duración:** 11 segundos (Frames 2040 - 2250).
*   **Movimiento/Animación:** Zoom out suave revelando todo el panel administrativo limpio con el botón de exportación resaltado en verde con un efecto pulsante. Termina desvaneciendo a negro.

---

## Recomendaciones para la Implementación en Remotion

Al codificar este storyboard en Remotion, te recomendamos seguir los siguientes lineamientos técnicos:

1.  **Composición Base:** Configura la composición principal a `1920x1080` píxeles con una duración de `2250` frames a `30 fps`.
2.  **Imágenes de Alta Resolución:** Utiliza los assets PNG guardados en `docs/demo/video_assets/`. Remotion renderiza con un navegador real (Puppeteer), por lo que las imágenes de alta calidad se verán sumamente nítidas en el MP4 resultante.
3.  **Transiciones en React:** Evita transiciones pesadas de WebGL. Usa animaciones CSS simples o la librería `framer-motion` para lograr fundidos, desplazamientos horizontales y zooms suaves mediante la interpolación del frame actual (`useCurrentFrame()`).
4.  **Uso de `spring`:** Para las entradas de los textos, utiliza la función `spring` de Remotion. Esto le da una inercia elástica muy natural y atractiva a los títulos en pantalla.
5.  **Textos Legibles:** Usa fuentes tipográficas grandes de Google Fonts (como *Inter* o *Outfit*) con un fondo contrastado de tipo semi-transparente (glassmorphism) para que los textos sean perfectamente legibles en cualquier tamaño de pantalla.
6.  **Exportación MP4:** Ejecuta el comando de renderizado nativo de Remotion para empaquetar el video final:
    ```bash
    npx remotion render src/remotion/index.ts FacturaClinicaVideo out/factura_clinica_demo.mp4
    ```
7.  **Música de Fondo:** Puedes incorporar una pista instrumental de fondo de ritmo medio e inspirador. Asegúrate de utilizar música libre de derechos (Royalty-free) para evitar infracciones de copyright al compartir el video de forma externa.
