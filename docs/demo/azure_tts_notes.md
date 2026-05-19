# FiscoBot — Azure Neural TTS Integration Notes

Esta guía detalla el uso y configuración de **Azure Cognitive Speech Services (Neural TTS)** para generar la locución (voz en off) del video explicativo comercial de FiscoBot.

---

## 1. Voces Recomendadas

Azure proporciona voces neuronales avanzadas para español de México (`es-MX`) con un realismo sobresaliente:

*   🎙️ **Voz Principal (Comercial):** `es-MX-DaliaNeural` (Voz femenina, tono cálido, claro, profesional y de ritmo dinámico). **Recomendada para este video explicativo comercial**.
*   🎙️ **Voz Secundaria (Institucional/Contabilidad):** `es-MX-JorgeNeural` (Voz masculina, tono serio, corporativo, preciso y confiable).

---

## 2. Variables de Entorno Requeridas

Para ejecutar la generación de audio por consola, se leen de manera segura las siguientes variables de entorno locales:

*   `AZURE_SPEECH_KEY`: Llave de suscripción del servicio Azure Speech.
*   `AZURE_SPEECH_REGION`: Región del recurso (ej: `eastus`).
*   `AZURE_TTS_VOICE`: (Opcional) Nombre de la voz neural a utilizar. Default: `es-MX-DaliaNeural`.

---

## 3. Ejemplo de SSML (Speech Synthesis Markup Language) Seguro

Para lograr una modulación de voz natural y con pausas adecuadas para cada escena, se recomienda utilizar formato SSML:

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-MX">
  <voice name="es-MX-DaliaNeural">
    <prosody rate="-5%" pitch="0%">
      ¿Cuánto tiempo pierde su clínica persiguiendo a pacientes por WhatsApp para que manden su Constancia Fiscal?
      Las solicitudes se pierden en los chats, llegan borrosas, incompletas y generan horas de retrabajo inútil.
      <break time="800ms"/>
      Presentamos FiscoBot. La solución inteligente que organiza el flujo de facturación de extremo a extremo, conectando a la recepción de su clínica, al paciente y al contador en una plataforma cloud controlada con datos ficticios.
    </prosody>
  </voice>
</speak>
```

---

## 4. Guion de Locución Estandarizado (75 Segundos)

El texto para el script de generación automática está basado exactamente en el guion comercial:

1.  **Escena 1 (Problema):** *"¿Cuánto tiempo pierde su clínica persiguiendo a pacientes por WhatsApp para que manden su Constancia Fiscal? Las solicitudes se pierden en los chats, llegan borrosas, incompletas y generan horas de retrabajo inútil."*
2.  **Escena 2 (Solución):** *"Presentamos FiscoBot. La solución inteligente que organiza el flujo de facturación de extremo a extremo, conectando a la recepción de su clínica, al paciente y al contador en una plataforma cloud controlada con datos ficticios."*
3.  **Escena 3 (Recepción):** *"El proceso es sumamente sencillo. La recepcionista cobra como siempre, registra la venta en la plataforma en segundos y genera un código QR o un enlace fiscal seguro."*
4.  **Escena 4 (Paciente):** *"Al escanear el QR o abrir el enlace en su celular, el paciente sube su constancia fiscal ficticia de prueba. FiscoBot realiza un prellenado privado desde la constancia, evitando cualquier error de dedo al capturar sus datos."*
5.  **Escena 5 (Contador):** *"El despacho contable recibe de inmediato toda la información estructurada en su panel administrativo. El contador audita los datos ficticios y asocia los folios de facturación en un solo lugar."*
6.  **Escena 6 (Corrección):** *"¿Falta algún dato? Con WhatsApp Manual Assist, el contador envía un aviso con un clic. El paciente corrige su información desde el mismo enlace seguro en segundos, sin llamadas de ida y vuelta."*
7.  **Escena 7 (Cierre):** *"Al final del mes, exporte un reporte CSV limpio, sanitizado y listo para su sistema contable. Menos mensajes perdidos, cero retrabajo y absoluta claridad entre clínica, paciente y contador."*

---

## 5. Directrices de Seguridad
*   **Nunca commitear llaves de API** (`AZURE_SPEECH_KEY`) ni archivos pesados de audio generados (`.wav`, `.mp3`).
*   Los binarios de audio deben generarse localmente en la carpeta `out/audio/` (la cual se encuentra excluida de Git).
