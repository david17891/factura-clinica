# FiscoBot — Guía de Configuración de Remotion

Esta guía detalla la instalación, arquitectura y comandos disponibles para el entorno de video programático de **FiscoBot (Factura Clínica)** utilizando **Remotion**.

---

## 1. Declaración de Alcance y Propósito

> [!NOTE]
> ### 🔍 ESTADO DEL MÓDULO: SETUP MÍNIMO
> *   Esta fase **solo establece el setup, dependencias y configuración mínima funcional** para Remotion.
> *   **No contiene aún el video final complejo ni las animaciones completas**.
> *   El propósito es asegurar que el compilador de video funcione de manera estable en el repositorio.

---

## 2. Dependencias Instaladas

Se han instalado las librerías nativas de Remotion como dependencias del proyecto:

*   `remotion`: Core de animaciones y composición.
*   `@remotion/cli`: Interfaz de línea de comandos para compilar y levantar el preview.
*   `@remotion/player`: Reproductor de video interactivo para React.
*   `@remotion/renderer`: Compilador nativo basado en Puppeteer para exportar a video físico.

---

## 3. Estructura de Carpetas

Las composiciones y código de video se organizan bajo la carpeta `/remotion/` en la raíz del proyecto:

```
fiscobot/
├── remotion/
│   ├── index.ts          # Entrypoint de registro de composiciones
│   ├── Root.tsx           # Declaración del árbol de composiciones
│   ├── Video.tsx          # Componente React principal del video (Sleek Placeholder)
│   └── constants.ts      # Parámetros globales (1920x1080, 30fps, 60s)
├── docs/demo/
│   └── video_assets/     # Ubicación de las capturas de pantalla de soporte
└── out/                  # Directorio autogenerado para renders finales (ignorado en Git)
```

---

## 4. Scripts y Comandos Disponibles

Se agregaron comandos dedicados en el `package.json` para facilitar la gestión del video:

### A. Abrir Vista Previa (Preview Studio)
Permite visualizar e iterar interactivamente el video en tiempo real dentro de una interfaz de desarrollo en el navegador local:
```bash
npm run video:preview
```

### B. Renderizar Video Completo
Compila y exporta la animación a un archivo MP4 físico en alta resolución:
```bash
npm run video:render
```
*   **Output de Render:** El archivo compilado se guardará en `out/factura-clinica-demo.mp4`.

---

## 5. Directrices de Seguridad y Git (Importante)

> [!CAUTION]
> ### 🚨 REGLA DE EXCLUSIÓN DE MULTIMEDIA
> *   **Nunca se deben commitear archivos de video físicos (`.mp4`, `.webm`, `.mov`)** al repositorio.
> *   El directorio `/out/` y las extensiones multimedia correspondientes están estrictamente excluidos en el archivo `.gitignore` del proyecto.
