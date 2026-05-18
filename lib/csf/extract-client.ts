'use client'

import type { CsfExtractedData, CsfExtractionResult } from '@/types'

type BarcodeDetectorLike = {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>
}

type BarcodeDetectorConstructorLike = new (options?: { formats?: string[] }) => BarcodeDetectorLike

type PdfPageLike = {
  getTextContent(): Promise<{ items: Array<{ str?: string }> }>
  getViewport(options: { scale: number }): { width: number; height: number }
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void> }
}

type PdfDocumentLike = {
  numPages: number
  getPage(pageNumber: number): Promise<PdfPageLike>
}

type CandidateResult = {
  data: CsfExtractedData
  text?: string
}

const RFC_PATTERN = /[A-Z&\u00d1]{3,4}\d{6}[A-Z0-9]{3}/
const ZIP_PATTERN = /(?:C\.?\s*P\.?|CODIGO\s+POSTAL|C\u00d3DIGO\s+POSTAL|DOMICILIO\s+FISCAL)[^\d]{0,40}(\d{5})/i
const QR_D3_RFC_PATTERN = /^[A-Z&\u00d1]{3,4}\d{6}[A-Z0-9]{3}$/
const MAX_PDF_PAGES_TO_SCAN = 2

const REGIME_MATCHES: Array<{ code: string; patterns: RegExp[] }> = [
  { code: '601', patterns: [/GENERAL\s+DE\s+LEY\s+PERSONAS\s+MORALES/i] },
  { code: '603', patterns: [/PERSONAS\s+MORALES\s+CON\s+FINES\s+NO\s+LUCRATIVOS/i] },
  { code: '605', patterns: [/SUELDOS\s+Y\s+SALARIOS/i] },
  { code: '612', patterns: [/ACTIVIDADES\s+EMPRESARIALES/i] },
  { code: '626', patterns: [/SIMPLIFICADO\s+DE\s+CONFIANZA|RESICO/i] },
]

function cleanText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeFiscalName(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^(NOMBRE|DENOMINACI[OÓ]N\s+O\s+RAZ[OÓ]N\s+SOCIAL|RAZ[OÓ]N\s+SOCIAL)\s*:?\s*/i, '')
    .trim()
    .toUpperCase()
}

function extractValueAfterLabel(text: string, label: RegExp) {
  const lines = cleanText(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const inlineMatch = line.match(label)
    if (!inlineMatch) continue

    const afterLabel = line.slice(inlineMatch.index ?? 0).replace(label, '').trim()
    if (afterLabel && !/^(DATOS|IDENTIFICACI[OÓ]N|FISCAL)$/i.test(afterLabel)) return afterLabel

    const next = lines[index + 1]
    if (next) return next
  }

  return ''
}

function parseQrUrl(rawValue: string): CsfExtractedData {
  const data: CsfExtractedData = { qrRawValue: rawValue, source: 'qr', confidence: 'medium' }

  try {
    const url = new URL(rawValue)
    const d3 = url.searchParams.get('D3')?.toUpperCase()
    if (d3 && QR_D3_RFC_PATTERN.test(d3)) {
      data.rfc = d3
      data.confidence = 'high'
    }
  } catch {
    // SAT QR values can be raw text or a partial URL. Regex parsing below still applies.
  }

  const normalized = rawValue.toUpperCase()
  const rfc = normalized.match(RFC_PATTERN)?.[0]
  if (rfc) data.rfc = rfc

  const zip = rawValue.match(ZIP_PATTERN)?.[1]
  if (zip) data.taxZipCode = zip

  if (!data.rfc) {
    data.warnings = ['El QR fue leído, pero no contenía RFC completo.']
  }

  return data
}

function mergeData(primary: CsfExtractedData, secondary: CsfExtractedData): CsfExtractedData {
  return {
    ...secondary,
    ...primary,
    warnings: [...(secondary.warnings ?? []), ...(primary.warnings ?? [])],
  }
}

function parseFiscalDataFromText(text: string, source: CsfExtractedData['source'], baseConfidence: CsfExtractedData['confidence']): CsfExtractedData {
  const cleaned = cleanText(text)
  const normalized = cleaned.toUpperCase()
  const data: CsfExtractedData = { source, confidence: baseConfidence, warnings: [] }

  const rfc = normalized.match(RFC_PATTERN)?.[0]
  if (rfc) data.rfc = rfc

  const zip = cleaned.match(ZIP_PATTERN)?.[1]
  if (zip) data.taxZipCode = zip

  const legalName =
    extractValueAfterLabel(cleaned, /DENOMINACI[OÓ]N\s+O\s+RAZ[OÓ]N\s+SOCIAL\s*:?\s*/i) ||
    extractValueAfterLabel(cleaned, /RAZ[OÓ]N\s+SOCIAL\s*:?\s*/i) ||
    extractValueAfterLabel(cleaned, /NOMBRE\s*:?\s*/i)

  if (legalName && !RFC_PATTERN.test(legalName.toUpperCase())) {
    data.legalName = normalizeFiscalName(legalName)
  }

  const regime = REGIME_MATCHES.find((item) => item.patterns.some((pattern) => pattern.test(normalized)))
  if (regime) data.taxRegime = regime.code

  if (!data.rfc) data.warnings?.push('No se detectó RFC.')
  if (!data.legalName) data.warnings?.push('No se detectó nombre o razón social.')
  if (!data.taxZipCode) data.warnings?.push('No se detectó código postal fiscal.')
  if (!data.taxRegime) data.warnings?.push('No se detectó régimen fiscal.')

  if (Object.keys(data).filter((key) => !['source', 'confidence', 'warnings'].includes(key)).length >= 3) {
    data.confidence = source === 'ocr' ? 'medium' : 'high'
  }

  if (!data.warnings?.length) delete data.warnings
  return data
}

async function scanQrFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  const context = canvas.getContext('2d')
  if (!context) return null

  const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructorLike }).BarcodeDetector
  if (BarcodeDetectorCtor) {
    try {
      const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] })
      const codes = await detector.detect(canvas)
      const rawValue = codes.find((code) => code.rawValue)?.rawValue
      if (rawValue) return rawValue
    } catch {
      // Fall through to jsQR.
    }
  }

  try {
    const { default: jsQR } = await import('jsqr')
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    return jsQR(imageData.data, imageData.width, imageData.height)?.data ?? null
  } catch {
    return null
  }
}

async function fileToCanvas(file: File): Promise<HTMLCanvasElement | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    return canvas
  } catch {
    return null
  }
}

async function extractFromImage(file: File): Promise<CandidateResult> {
  const canvas = await fileToCanvas(file)
  if (!canvas) return { data: { source: 'manual', confidence: 'low', warnings: ['No se pudo abrir la imagen.'] } }

  const qrValue = await scanQrFromCanvas(canvas)
  if (qrValue) {
    return { data: parseQrUrl(qrValue) }
  }

  const ocrText = await runLocalOcr(canvas)
  if (ocrText) {
    return { data: parseFiscalDataFromText(ocrText, 'ocr', 'low'), text: ocrText }
  }

  return {
    data: {
      source: 'manual',
      confidence: 'low',
      warnings: ['No se detectó QR ni texto legible en la imagen.'],
    },
  }
}

async function loadPdfDocument(file: File): Promise<PdfDocumentLike> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.mjs'
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data })
  return loadingTask.promise as Promise<PdfDocumentLike>
}

async function renderPdfPageToCanvas(page: PdfPageLike) {
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) return null
  await page.render({ canvasContext: context, viewport }).promise
  return canvas
}

async function extractFromPdf(file: File): Promise<CandidateResult> {
  try {
    const pdf = await loadPdfDocument(file)
    const texts: string[] = []
    let qrData: CsfExtractedData | null = null

    const pagesToScan = Math.min(pdf.numPages, MAX_PDF_PAGES_TO_SCAN)
    for (let pageNumber = 1; pageNumber <= pagesToScan; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      texts.push(textContent.items.map((item) => item.str ?? '').join('\n'))

      if (!qrData) {
        const canvas = await renderPdfPageToCanvas(page)
        if (canvas) {
          const qrValue = await scanQrFromCanvas(canvas)
          if (qrValue) qrData = parseQrUrl(qrValue)
        }
      }
    }

    const pdfText = cleanText(texts.join('\n'))
    const pdfData = pdfText ? parseFiscalDataFromText(pdfText, 'pdf_text', 'medium') : {}
    const mergedData = qrData ? mergeData(pdfData, qrData) : pdfData

    if (Object.keys(mergedData).some((key) => !['source', 'confidence', 'warnings'].includes(key))) {
      return { data: mergedData, text: pdfText }
    }

    const firstPage = await pdf.getPage(1)
    const canvas = await renderPdfPageToCanvas(firstPage)
    const ocrText = canvas ? await runLocalOcr(canvas) : ''
    if (ocrText) {
      return { data: parseFiscalDataFromText(ocrText, 'ocr', 'low'), text: ocrText }
    }

    return {
      data: {
        source: 'manual',
        confidence: 'low',
        warnings: ['No se detectó texto fiscal en el PDF.'],
      },
      text: pdfText,
    }
  } catch {
    return {
      data: {
        source: 'manual',
        confidence: 'low',
        warnings: ['No pudimos leer el PDF automáticamente.'],
      },
    }
  }
}

async function runLocalOcr(canvas: HTMLCanvasElement): Promise<string> {
  let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | null = null
  try {
    const { createWorker, PSM } = await import('tesseract.js')
    worker = await createWorker('spa+eng', undefined, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/tesseract-core-lstm.wasm.js',
      langPath: '/tesseract/lang',
      gzip: true,
      workerBlobURL: false,
      logger: () => {},
    })

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
    })

    const result = await worker.recognize(canvas)
    return cleanText(result.data.text ?? '')
  } catch {
    return ''
  } finally {
    await worker?.terminate().catch(() => {})
  }
}

function buildMessage(data: CsfExtractedData) {
  if (data.source === 'manual') {
    return 'No pudimos leerlo automáticamente. Puedes capturarlo manualmente.'
  }

  const detected = [
    data.rfc ? 'RFC' : '',
    data.legalName ? 'nombre o razón social' : '',
    data.taxZipCode ? 'código postal' : '',
    data.taxRegime ? 'régimen fiscal' : '',
  ].filter(Boolean)

  if (!detected.length) {
    return 'Leímos el documento, pero no encontramos datos suficientes. Puedes capturarlos manualmente.'
  }

  return `Datos detectados: ${detected.join(', ')}. Revisa antes de enviar.`
}

export async function extractFiscalDataFromFile(file: File): Promise<CsfExtractionResult> {
  const result = file.type === 'application/pdf'
    ? await extractFromPdf(file)
    : await extractFromImage(file)

  const hasDetectedData = Object.keys(result.data).some((key) => !['source', 'confidence', 'warnings'].includes(key))

  return {
    status: hasDetectedData ? 'extracted' : result.data.source === 'manual' ? 'manual_review' : 'failed',
    message: buildMessage(result.data),
    data: result.data,
  }
}
