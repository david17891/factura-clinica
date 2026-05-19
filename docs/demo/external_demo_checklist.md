# FiscoBot — Lista de Verificación (Checklist) para Demo Externa

Esta lista de verificación operativa asegura que cada demostración de **FiscoBot (Factura Clínica)** se ejecute sin inconvenientes técnicos, cumpla con la protección de datos ficticios y documente de manera estructurada la retroalimentación de los aliados.

---

## 1. Antes de la Demostración (Preparación y Preflight)

Realiza este checklist 10–15 minutos antes de iniciar la presentación:

- [ ] **Acceso a la Red:** Confirmar conexión a internet estable.
- [ ] **Carga de URL:** Abrir el portal en el navegador [https://fiscobot.vercel.app](https://fiscobot.vercel.app) y comprobar que responde de inmediato (HTTP 200).
- [ ] **Acceso a Clínica Pública:** Abrir la ruta pública `/factura/dental-rio-colorado` y verificar que carga la identidad corporativa de la clínica demo.
- [ ] **Prueba de Autenticación de Recepción:** Iniciar sesión con `recepcion@dentalrio.test` / `Demo123456!` y cerrar sesión tras confirmar el panel.
- [ ] **Prueba de Autenticación de Contador:** Iniciar sesión con `contador@dentalrio.test` / `Demo123456!` y verificar que se visualiza el listado.
- [ ] **Limpieza de Datos de la Demo:** Si hay demasiadas solicitudes previas de otras pruebas, ejecuta el comando de reset remoto en tu terminal local:
  ```bash
  npx supabase db reset --linked --yes
  ```
- [ ] **Preparación de Fixtures:** Tener a la mano y ubicados en una carpeta visible del equipo los archivos ficticios de prueba:
  *   Constancia Fiscal ficticia: `docs/qa/fixtures/csf_ana_gomez_626.pdf`
- [ ] **Navegador en Modo Incógnito:** Tener lista una ventana en modo incógnito dedicada a la simulación del flujo de paciente para no interferir con las cookies de las sesiones administrativas.

---

## 2. Durante la Demostración (Reglas y Buenas Prácticas)

Sigue estas directrices estrictamente mientras el cliente observa la presentación:

- [ ] **Enfoque de Demo Controlada:** Recordar al inicio y durante la demo que se trata de una **"demo cloud controlada con datos ficticios"**.
- [ ] **Prohibido usar Datos Reales:** **Nunca** utilices RFCs, nombres, números telefónicos o PDFs de constancias reales de clientes reales.
- [ ] **Claridad del Proceso Contable (SAT):** No prometas timbrado automático al SAT o generación automática de CFDI desde FiscoBot. Explica que exportamos la base de datos limpia en CSV para cargarse al facturador actual del negocio.
- [ ] **WhatsApp Manual Assist:** Aclara que no requerimos integraciones de pago costosas con la API oficial de WhatsApp Meta; el sistema genera mensajes semiautomáticos listos para enviarse desde el propio WhatsApp del negocio sin costo.
- [ ] **Privacidad de Storage:** Menciona que los documentos subidos van a un almacén de nube (bucket) estrictamente privado con cifrado SSL y políticas de protección para que ningún tercero o paciente externo pueda ver constancias ajenas.

---

## 3. Después de la Demostración (Handoff e Inteligencia Comercial)

Completa estos pasos justo al terminar la sesión comercial:

- [ ] **Limpieza de Registros:** Si utilizaste nombres o correos de prueba que hagan alusión al cliente de la demo y deseas borrar los registros, ejecuta una resiembra para dejar el entorno impecable.
- [ ] **Registro de Feedback y Objeciones:** Anota las respuestas del cliente frente a los siguientes puntos clave:
  *   *¿Qué fue lo que más le gustó del prellenado con la Constancia PDF?*
  *   *¿Qué opinión tiene el contador sobre el archivo CSV que se genera?*
- [ ] **Registro de Mejoras Solicitadas:** Apuntar funciones que hayan sugerido (ej. soporte para múltiples clínicas, logotipos personalizados, etc.).
- [ ] **Seguimiento Comercial:** Agendar la siguiente llamada de seguimiento y enviar este paquete de demostración como soporte documental.
