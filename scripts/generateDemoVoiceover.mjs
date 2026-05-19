import fs from 'fs';
import path from 'path';

// Load variables from environment
const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
const voice = process.env.AZURE_TTS_VOICE || 'es-MX-DaliaNeural';

console.log('=== FiscoBot — Generador de Locución Azure Neural TTS ===');

// Validation check to avoid process failure or exposing secrets
if (!key || !region) {
	console.error('⚠️  Error de Configuración:');
	console.error('Faltan las variables de entorno AZURE_SPEECH_KEY o AZURE_SPEECH_REGION.');
	console.error('Por favor, configúrelas localmente antes de ejecutar este script.');
	process.exit(1);
}

const textBlocks = [
	"¿Cuánto tiempo pierde su clínica persiguiendo a pacientes por WhatsApp para que manden su Constancia Fiscal? Las solicitudes se pierden en los chats, llegan borrosas, incompletas y generan horas de retrabajo inútil.",
	"Presentamos FiscoBot. La solución inteligente que organiza el flujo de facturación de extremo a extremo, conectando a la recepción de su clínica, al paciente y al contador en una plataforma cloud controlada con datos ficticios.",
	"El proceso es sumamente sencillo. La recepcionista cobra como siempre, registra la venta en la plataforma en segundos y genera un código QR o un enlace fiscal seguro.",
	"Al escanear el QR o abrir el enlace en su celular, el paciente sube su constancia fiscal ficticia de prueba. FiscoBot realiza un prellenado privado desde la constancia, evitando cualquier error de dedo al capturar sus datos.",
	"El despacho contable recibe de inmediato toda la información estructurada en su panel administrativo. El contador audita los datos ficticios y asocia los folios de facturación en un solo lugar.",
	"¿Falta algún dato? Con WhatsApp Manual Assist, el contador envía un aviso con un clic. El paciente corrige su información desde el mismo enlace seguro en segundos, sin llamadas de ida y vuelta.",
	"Al final del mes, exporte un reporte CSV limpio, sanitizado y listo para su sistema contable. Menos mensajes perdidos, cero retrabajo y absoluta claridad entre clínica, paciente y contador."
];

// Combine all speech blocks with appropriate breathing pauses
const fullText = textBlocks.join(' <break time="1200ms"/> ');

// Build SSML payload
const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-MX">
  <voice name="${voice}">
    <prosody rate="-4%" pitch="0%">
      ${fullText}
    </prosody>
  </voice>
</speak>`;

async function generateVoiceover() {
	try {
		console.log(`Generando voz con: ${voice}...`);

		const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Ocp-Apim-Subscription-Key': key,
				'Content-Type': 'application/ssml+xml',
				'X-Microsoft-OutputFormat': 'audio-24khz-96kbps-mono-mp3',
				'User-Agent': 'FiscoBotTTSClient',
			},
			body: ssml
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Azure API respondió con status ${response.status}: ${errorText}`);
		}

		// Ensure directory exists
		const outputDir = path.join(process.cwd(), 'out', 'audio');
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		const outputPath = path.join(outputDir, 'factura-clinica-demo-voiceover.mp3');
		const buffer = await response.arrayBuffer();
		fs.writeFileSync(outputPath, Buffer.from(buffer));

		console.log('✅ Locución generada con éxito!');
		console.log(`Guardado en: ${outputPath}`);

		// Also copy to public/remotion-assets for Remotion server resolution
		const publicDir = path.join(process.cwd(), 'public', 'remotion-assets');
		if (fs.existsSync(publicDir)) {
			fs.copyFileSync(outputPath, path.join(publicDir, 'factura-clinica-demo-voiceover.mp3'));
			console.log('✅ Copiado a public/remotion-assets/ para la composición de Remotion.');
		}

	} catch (error) {
		console.error('❌ Error al sintetizar voz de Azure:', error.message);
		process.exit(1);
	}
}

generateVoiceover();
