# Suite de Datos de Validación de Constancia y Código QR

Esta carpeta contiene archivos de prueba ficticios de alta fidelidad, diseñados específicamente para validar y auditar el extractor automático de Constancias de Situación Fiscal (CSF) y códigos QR en **Factura Clínica / FiscoBot**.

> [!NOTE]
> Todos los datos contenidos en estos archivos son **100% ficticios**. No contienen contraseñas, secretos, API keys ni información confidencial real de contribuyentes.

---

## 🛠️ Estructura del Extractor

El lector automatizado en cliente (`lib/csf/extract-client.ts`) utiliza las siguientes reglas para detectar datos de forma nativa:
* **RFC:** Expresión regular que busca patrones de 12 o 13 caracteres de longitud (`/[A-Z&\u00d1]{3,4}\d{6}[A-Z0-9]{3}/`).
* **Código Postal:** Detecta números de 5 dígitos precedidos de etiquetas fiscales clave (`C.P.`, `CODIGO POSTAL`, `CÓDIGO POSTAL`, `DOMICILIO FISCAL`).
* **Régimen Fiscal:** Clasifica códigos estándar del SAT (601, 603, 605, 612, 626) mediante la búsqueda de patrones textuales clave.
* **Denominación o Razón Social (Nombre):** Captura el valor que sigue a etiquetas estándar como `DENOMINACIÓN O RAZÓN SOCIAL`, `RAZÓN SOCIAL`, o `NOMBRE`.

---

## 📁 Archivos Disponibles en esta Suite

### 1. Documentos PDF Ficticios (`.pdf`)
Creados utilizando codificación de texto nativo compatible con el motor de lectura de `pdfjs-dist`:

| Nombre del Archivo | RFC Esperado | Razón Social Esperada | C.P. Esperado | Régimen Fiscal (Código) |
| :--- | :--- | :--- | :--- | :--- |
| `csf_ricardo_flores_605.pdf` | `FLOR800101ABC` | `RICARDO FLORES SANCHEZ` | `83400` | Sueldos y Salarios (`605`) |
| `csf_carlos_mendez_612.pdf` | `MENC850101XYZ` | `CARLOS MENDEZ DIAZ` | `83420` | Actividades Empresariales (`612`) |
| `csf_dental_rio_601.pdf` | `DRC180515XYZ` | `DENTAL RIO COLORADO SA DE CV` | `83449` | General Ley Personas Morales (`601`) |
| `csf_ana_gomez_626.pdf` | `GOMA900101ABC` | `ANA GOMEZ PEREZ` | `83410` | Simplificado de Confianza / RESICO (`626`) |

### 2. Códigos QR de Simulación SAT (`.png`)
Imágenes de códigos QR generadas pixel-perfect para activar la librería `jsqr`. Enlazarán a un endpoint ficticio del SAT que contiene el parámetro clave `D3` (RFC de contribuyente):

| Nombre del Archivo | RFC embebido en QR | URL del QR Generada |
| :--- | :--- | :--- |
| `qr_ricardo_flores_605.png` | `FLOR800101ABC` | `https://siat.sat.gob.mx/app/qr/faces/pages/detalles/detalle.jsf?id=sat-qr-ricardo-flores&D3=FLOR800101ABC` |
| `qr_carlos_mendez_612.png` | `MENC850101XYZ` | `https://siat.sat.gob.mx/app/qr/faces/pages/detalles/detalle.jsf?id=sat-qr-carlos-mendez&D3=MENC850101XYZ` |
| `qr_dental_rio_601.png` | `DRC180515XYZ` | `https://siat.sat.gob.mx/app/qr/faces/pages/detalles/detalle.jsf?id=sat-qr-dental-rio&D3=DRC180515XYZ` |

---

## 🚀 Guía de Pruebas de Navegador

Para validar el extractor en el portal local:
1. Inicia sesión como recepcionista (`recepcion@dentalrio.test` / `Demo123456!`).
2. Registra un nuevo folio de venta para generar el enlace del paciente.
3. Abre el enlace del paciente en tu navegador o activa el responsive en vista móvil.
4. En la sección de carga de Constancia:
   * Arrastra o selecciona el archivo `csf_ricardo_flores_605.pdf`.
   * Verifica que el RFC cambie a `FLOR800101ABC`, el Nombre a `RICARDO FLORES SANCHEZ`, el C.P. a `83400` y el Régimen a `605`.
   * Repite la operación arrastrando el código QR `qr_carlos_mendez_612.png` y confirma la extracción instantánea a través del lector de cámara o imagen.
5. Confirma que todos los campos prellenados permanezcan editables en caso de que requieras corregir o refinar manualmente.
