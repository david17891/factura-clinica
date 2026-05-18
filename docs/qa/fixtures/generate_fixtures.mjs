import fs from 'fs';
import path from 'path';
import https from 'https';

const FIXTURES_DIR = path.resolve('docs/qa/fixtures');

// Ensure directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// Function to generate a simple, valid, pure-text PDF
function createMockPdf(filename, rfc, name, cp, regimeText) {
  const contentStream = `BT
/F1 12 Tf
70 730 Td
(REGISTRO FEDERAL DE CONTRIBUYENTES: ${rfc}) Tj
0 -20 Td
(DENOMINACION O RAZON SOCIAL: ${name}) Tj
0 -20 Td
(DOMICILIO FISCAL CODIGO POSTAL: ${cp}) Tj
0 -20 Td
(REGIMEN FISCAL: ${regimeText}) Tj
ET`;

  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources 4 0 R /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length ${contentStream.length} >>
stream
${contentStream}
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000216 00000 n
0000000305 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${115 + 101 + 89 + 172 + contentStream.length}
%%EOF`;

  fs.writeFileSync(path.join(FIXTURES_DIR, filename), pdfContent, 'utf-8');
  console.log(`Generated mock PDF: ${filename}`);
}

// Function to download a QR code image from a safe, free public API
function downloadQrCode(filename, rfc, id) {
  const satUrl = `https://siat.sat.gob.mx/app/qr/faces/pages/detalles/detalle.jsf?id=${id}&D3=${rfc}`;
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(satUrl)}`;
  const filePath = path.join(FIXTURES_DIR, filename);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(apiUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded mock QR Code: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.error(`Failed to download QR code: ${filename}`, err);
      reject(err);
    });
  });
}

async function main() {
  console.log('Generating high-fidelity mock validation fixtures...');

  // 1. Generate 4 mock PDFs representing different tax regimens
  createMockPdf(
    'csf_ricardo_flores_605.pdf',
    'FLOR800101ABC',
    'RICARDO FLORES SANCHEZ',
    '83400',
    'SUELDOS Y SALARIOS'
  );

  createMockPdf(
    'csf_carlos_mendez_612.pdf',
    'MENC850101XYZ',
    'CARLOS MENDEZ DIAZ',
    '83420',
    'ACTIVIDADES EMPRESARIALES'
  );

  createMockPdf(
    'csf_dental_rio_601.pdf',
    'DRC180515XYZ',
    'DENTAL RIO COLORADO SA DE CV',
    '83449',
    'GENERAL DE LEY PERSONAS MORALES'
  );

  createMockPdf(
    'csf_ana_gomez_626.pdf',
    'GOMA900101ABC',
    'ANA GOMEZ PEREZ',
    '83410',
    'SIMPLIFICADO DE CONFIANZA'
  );

  // 2. Download 3 mock QR Codes matching these contributor details
  try {
    await downloadQrCode('qr_ricardo_flores_605.png', 'FLOR800101ABC', 'sat-qr-ricardo-flores');
    await downloadQrCode('qr_carlos_mendez_612.png', 'MENC850101XYZ', 'sat-qr-carlos-mendez');
    await downloadQrCode('qr_dental_rio_601.png', 'DRC180515XYZ', 'sat-qr-dental-rio');
  } catch (error) {
    console.error('Error downloading QR fixtures:', error);
  }

  console.log('Validation fixtures generated successfully in docs/qa/fixtures/ !');
}

main();
