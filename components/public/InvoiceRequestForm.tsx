'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, User, WalletCards } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { extractFiscalDataFromFile } from '@/lib/csf/extract-client'
import { Sale, Clinic, CsfExtractionResult, CsfExtractedData } from '@/types'

const MAX_CSF_FILE_SIZE = 10 * 1024 * 1024
const CSF_BUCKET = 'csf-documents'
const CSF_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
const CSF_ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif']

const formSchema = z.object({
  patientName: z.string().min(2, 'Ingresa tu nombre'),
  patientPhone: z.string().optional(),
  email: z.string().email('Correo electrónico inválido'),
  rfc: z
    .string()
    .min(12, 'RFC inválido')
    .max(13, 'RFC inválido')
    .regex(/^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/, 'Formato de RFC incorrecto'),
  legalName: z.string().min(3, 'Nombre o razón social muy corto'),
  taxZipCode: z.string().length(5, 'Código postal debe tener 5 dígitos'),
  taxRegime: z.string().min(1, 'Seleccione un régimen'),
  cfdiUse: z.string().min(1, 'Seleccione un uso de CFDI'),
  notes: z.string().optional(),
  paymentDate: z.string().optional(),
  amount: z.string().optional(),
  serviceName: z.string().optional(),
  paymentMethod: z.string().optional(),
})

interface InvoiceRequestFormProps {
  clinic: Clinic
  sale?: Sale
  mode: 'fixed' | 'sale'
}

function getSafeExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  if (CSF_ALLOWED_EXTENSIONS.includes(extension)) return extension
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/heic') return 'heic'
  if (file.type === 'image/heif') return 'heif'
  return null
}

function getDetectedLabel(fieldName: keyof CsfExtractedData, data: CsfExtractedData) {
  return data[fieldName] ? (
    <span className="ml-2 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
      Detectado
    </span>
  ) : null
}
export function InvoiceRequestForm({ clinic, sale, mode }: InvoiceRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [csfFile, setCsfFile] = useState<File | null>(null)
  const [isReadingCsf, setIsReadingCsf] = useState(false)
  const [csfUploadWarning, setCsfUploadWarning] = useState<string | null>(null)
  const csfExtractionRunRef = useRef(0)
  const [csfExtraction, setCsfExtraction] = useState<CsfExtractionResult>({
    status: 'not_attempted',
    message: '',
    data: {},
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: '',
      patientPhone: '',
      email: sale?.patient_email || '',
      rfc: '',
      legalName: '',
      taxZipCode: '',
      taxRegime: '',
      cfdiUse: 'D01',
      notes: '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: sale?.amount?.toString() || '',
      serviceName: sale?.service_name || '',
      paymentMethod: '',
    },
  })

  async function handleCsfFileChange(file: File | null) {
    const extractionRun = csfExtractionRunRef.current + 1
    csfExtractionRunRef.current = extractionRun
    setError(null)
    setCsfUploadWarning(null)
    setCsfFile(null)
    setCsfExtraction({ status: 'not_attempted', message: '', data: {} })
    setIsReadingCsf(false)

    if (!file) return

    const extension = getSafeExtension(file)
    if (!extension || !CSF_ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no permitido. Sube PDF, JPG, PNG o HEIC.')
      return
    }

    if (file.size > MAX_CSF_FILE_SIZE) {
      setError('El archivo no debe pesar más de 10 MB.')
      return
    }

    setCsfFile(file)
    setIsReadingCsf(true)
    let result: CsfExtractionResult
    try {
      result = await extractFiscalDataFromFile(file)
    } catch {
      result = {
        status: 'manual_review',
        message: 'No pudimos leerlo automáticamente. Puedes capturarlo manualmente.',
        data: { source: 'manual', confidence: 'low' },
      }
    } finally {
      if (csfExtractionRunRef.current === extractionRun) {
        setIsReadingCsf(false)
      }
    }

    if (csfExtractionRunRef.current !== extractionRun) return

    setCsfExtraction(result)

    const applyDetectedValue = (fieldName: 'rfc' | 'legalName' | 'taxZipCode' | 'taxRegime', value?: string) => {
      if (!value) return
      const currentValue = form.getValues(fieldName)
      const fieldState = form.getFieldState(fieldName)
      if (currentValue && fieldState.isDirty) return
      form.setValue(fieldName, value, { shouldValidate: true, shouldDirty: false })
    }

    applyDetectedValue('rfc', result.data.rfc)
    applyDetectedValue('legalName', result.data.legalName)
    applyDetectedValue('taxZipCode', result.data.taxZipCode)
    applyDetectedValue('taxRegime', result.data.taxRegime)
  }

  async function attachCsfDocument(supabase: ReturnType<typeof createClient>, requestId: string) {
    if (!csfFile) return

    const extension = getSafeExtension(csfFile)
    if (!extension) {
      setCsfUploadWarning('La solicitud fue recibida, pero el tipo de archivo no pudo adjuntarse.')
      return
    }

    const storagePath = `requests/${requestId}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from(CSF_BUCKET)
      .upload(storagePath, csfFile, {
        contentType: csfFile.type,
        upsert: false,
      })

    if (uploadError) {
      setCsfUploadWarning('La solicitud fue recibida, pero no pudimos adjuntar la constancia. La clínica puede dar seguimiento manual.')
      return
    }

    const { data: registerData, error: registerError } = await supabase.rpc('register_public_csf_document', {
      p_invoice_request_id: requestId,
      p_clinic_slug: clinic.slug,
      p_public_invoice_token: sale?.public_invoice_token ?? null,
      p_storage_path: storagePath,
      p_original_filename: csfFile.name,
      p_mime_type: csfFile.type,
      p_file_size: csfFile.size,
      p_extraction_status: csfExtraction.status,
      p_extracted_data: csfExtraction.data,
    })

    if (registerError || (registerData && typeof registerData === 'object' && 'error' in registerData)) {
      setCsfUploadWarning('La solicitud fue recibida, pero no pudimos ligar la constancia. La clínica puede dar seguimiento manual.')
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setError(null)
    setCsfUploadWarning(null)

    try {
      const supabase = createClient()
      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_invoice_request', {
        p_clinic_slug: clinic.slug,
        p_public_invoice_token: sale?.public_invoice_token ?? null,
        p_patient_name: values.patientName || null,
        p_patient_phone: values.patientPhone || null,
        p_payment_date: values.paymentDate ? new Date(values.paymentDate).toISOString() : null,
        p_amount: values.amount ? parseFloat(values.amount) : null,
        p_service_name: values.serviceName || null,
        p_payment_method: values.paymentMethod || null,
        p_email: values.email,
        p_rfc: values.rfc,
        p_legal_name: values.legalName,
        p_tax_zip_code: values.taxZipCode,
        p_tax_regime: values.taxRegime,
        p_cfdi_use: values.cfdiUse,
        p_notes: values.notes || null,
      })

      if (rpcError) {
        setError(rpcError.message)
      } else if (rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
        setError(String((rpcData as Record<string, unknown>).error))
      } else {
        if (rpcData && typeof rpcData === 'object' && 'id' in rpcData) {
          await attachCsfDocument(supabase, String((rpcData as Record<string, unknown>).id))
        }
        setIsSuccess(true)
      }
    } catch {
      setError('Hubo un error al enviar tu solicitud. Por favor intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="glass border-emerald-500/20">
        <CardContent className="space-y-4 pt-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Solicitud recibida</h2>
            <p className="text-muted-foreground">
              Tu clínica o contador revisará los datos y emitirá la factura en su sistema actual.
            </p>
            <p className="text-sm text-muted-foreground">
              Guarda este comprobante o consulta con la clínica. El correo registrado es {form.getValues('email')}.
            </p>
            {csfFile && (
              <p className="text-sm text-muted-foreground">
                También revisaremos la constancia que subiste como apoyo documental.
              </p>
            )}
            {csfUploadWarning && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                {csfUploadWarning}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => setIsSuccess(false)} className="rounded-xl">
            Enviar otra solicitud
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="glass border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Datos de contacto
            </CardTitle>
            <CardDescription>
              Estos datos ayudan a la clínica a identificar tu solicitud.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del paciente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="patientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="6531234567" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Correo para recibir factura</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="usuario@ejemplo.com" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormDescription>
                    La clínica usará este correo para dar seguimiento a tu factura.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {mode === 'fixed' && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletCards className="h-5 w-5 text-primary" />
                Datos del pago
              </CardTitle>
              <CardDescription>
                Esta solicitud no está ligada a una venta registrada. Por eso necesitamos algunos datos del pago.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha del pago</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto pagado</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servicio recibido</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Consulta dental" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de pago</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {mode === 'sale' && sale && (
          <Card className="glass border-primary/10 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pago registrado por la clínica</CardTitle>
              <CardDescription>
                Esta solicitud está ligada a un pago registrado por la clínica. Solo necesitamos tus datos fiscales.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Folio interno</p>
                <p className="font-semibold">{sale.folio}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monto</p>
                <p className="font-semibold">${Number(sale.amount).toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Servicio</p>
                <p className="font-semibold">{sale.service_name}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Sube tu constancia o escanea el QR
            </CardTitle>
            <CardDescription>
              Puedes subir tu Constancia, CIF o Cédula de Datos Fiscales para prellenar tus datos. No consultamos SAT ni servicios externos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,application/pdf,image/jpeg,image/png,image/heic,image/heif"
                className="rounded-xl bg-white"
                onChange={(event) => handleCsfFileChange(event.target.files?.[0] ?? null)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Formatos permitidos: PDF, JPG, PNG o HEIC. Tamaño máximo: 10 MB. Los datos detectados siempre se pueden editar.
              </p>
            </div>

            {csfFile && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{csfFile.name}</p>
                <p className="text-xs text-muted-foreground">{(csfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                {isReadingCsf && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-cyan-50 p-3 text-sm text-cyan-800">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Leyendo documento...
                  </div>
                )}
                {!isReadingCsf && csfExtraction.message && (
                  <p className="mt-3 text-sm text-muted-foreground">{csfExtraction.message}</p>
                )}
                {!isReadingCsf && Object.keys(csfExtraction.data).length > 0 && (
                  <div className="mt-3 space-y-2 rounded-xl bg-cyan-50 p-3 text-sm text-cyan-800">
                    <p className="font-semibold">Datos detectados</p>
                    <div className="grid gap-1 text-xs">
                      {csfExtraction.data.rfc && <span>RFC: {csfExtraction.data.rfc}</span>}
                      {csfExtraction.data.legalName && <span>Nombre/Razón social: {csfExtraction.data.legalName}</span>}
                      {csfExtraction.data.taxZipCode && <span>C.P. fiscal: {csfExtraction.data.taxZipCode}</span>}
                      {csfExtraction.data.taxRegime && <span>Régimen: {csfExtraction.data.taxRegime}</span>}
                    </div>
                    <p className="text-xs">Revisa antes de enviar. Estos campos siguen siendo editables.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Datos fiscales
            </CardTitle>
            <CardDescription>
              Los datos deben coincidir con tu Constancia de Situación Fiscal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="rfc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RFC{getDetectedLabel('rfc', csfExtraction.data)}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="XAXX010101000"
                          {...field}
                          className="rounded-xl uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxZipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código postal fiscal{getDetectedLabel('taxZipCode', csfExtraction.data)}</FormLabel>
                      <FormControl>
                        <Input placeholder="00000" maxLength={5} {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nombre o razón social{getDetectedLabel('legalName', csfExtraction.data)}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Como aparece en el SAT"
                          {...field}
                          className="rounded-xl uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxRegime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Régimen fiscal{getDetectedLabel('taxRegime', csfExtraction.data)}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Seleccione su régimen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="601">601 - General de Ley Personas Morales</SelectItem>
                          <SelectItem value="603">603 - Personas Morales con Fines no Lucrativos</SelectItem>
                          <SelectItem value="605">605 - Sueldos y Salarios</SelectItem>
                          <SelectItem value="612">612 - Personas Físicas con Actividades Empresariales</SelectItem>
                          <SelectItem value="626">626 - Régimen Simplificado de Confianza</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cfdiUse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uso CFDI</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Seleccione el uso" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="D01">D01 - Honorarios médicos, dentales y gastos hospitalarios</SelectItem>
                          <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                          <SelectItem value="S01">S01 - Sin efectos fiscales</SelectItem>
                          <SelectItem value="CP01">CP01 - Pagos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Alert className="rounded-2xl border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-400">Antes de enviar</AlertTitle>
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-500">
                  Revisa que RFC, nombre o razón social, código postal, régimen fiscal y uso CFDI coincidan con tu Constancia de Situación Fiscal.
                </AlertDescription>
              </Alert>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando datos...
                  </>
                ) : (
                  'Enviar datos para factura'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}
