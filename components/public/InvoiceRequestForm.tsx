'use client'

import { useState } from 'react'
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
import { AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Sale, Clinic } from '@/types'

const formSchema = z.object({
  rfc: z.string().min(12, 'RFC inválido').max(13, 'RFC inválido').regex(/^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/, 'Formato de RFC incorrecto'),
  legalName: z.string().min(3, 'Nombre o razón social muy corto'),
  taxZipCode: z.string().length(5, 'Código postal debe tener 5 dígitos'),
  taxRegime: z.string().min(1, 'Seleccione un régimen'),
  cfdiUse: z.string().min(1, 'Seleccione un uso de CFDI'),
  email: z.string().email('Correo electrónico inválido'),
  notes: z.string().optional(),
  // For fixed QR flow
  paymentDate: z.string().optional(),
  amount: z.string().optional(),
  serviceName: z.string().optional(),
  patientName: z.string().optional(),
})

interface InvoiceRequestFormProps {
  clinic: Clinic
  sale?: Sale
  mode: 'fixed' | 'sale'
}

export function InvoiceRequestForm({ clinic, sale, mode }: InvoiceRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rfc: '',
      legalName: '',
      taxZipCode: '',
      taxRegime: '',
      cfdiUse: 'D01',
      email: sale?.patient_email || '',
      notes: '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: sale?.amount?.toString() || '',
      serviceName: sale?.service_name || '',
      patientName: sale?.patient_name || '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setError(null)
    try {
      // SEGURIDAD: Usamos la RPC SECURITY DEFINER en lugar del server action deshabilitado.
      // La RPC valida el slug de la clínica y el folio server-side.
      // No se envía clinic_id ni sale_id directamente — el servidor los resuelve desde slug/folio.
      const supabase = createClient()
      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_invoice_request', {
        p_clinic_slug:    clinic.slug,
        p_sale_folio:     sale?.folio ?? null,
        p_patient_name:   values.patientName || null,
        p_patient_phone:  null,
        p_payment_date:   values.paymentDate ? new Date(values.paymentDate).toISOString() : null,
        p_amount:         values.amount ? parseFloat(values.amount) : null,
        p_service_name:   values.serviceName || null,
        p_payment_method: null,
        p_email:          values.email,
        p_rfc:            values.rfc,
        p_legal_name:     values.legalName,
        p_tax_zip_code:   values.taxZipCode,
        p_tax_regime:     values.taxRegime,
        p_cfdi_use:       values.cfdiUse,
        p_notes:          values.notes || null,
      })

      if (rpcError) {
        setError(rpcError.message)
      } else if (rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
        setError(String((rpcData as Record<string, unknown>).error))
      } else {
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
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">¡Solicitud Enviada!</h2>
            <p className="text-muted-foreground">
              Hemos recibido tus datos fiscales. La clínica {clinic.name} revisará la información y te enviará tu factura al correo proporcionado ({form.getValues('email')}).
            </p>
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
        {mode === 'fixed' && (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Detalles del Pago</CardTitle>
              <CardDescription>
                Como no hay una venta previa ligada, por favor ingresa los detalles de tu pago.
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
                      <Input placeholder="$0.00" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Servicio recibido</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Consulta dental" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {mode === 'sale' && sale && (
          <Card className="glass bg-primary/5 border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Resumen de Venta</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Folio</p>
                <p className="font-semibold">{sale.folio}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monto</p>
                <p className="font-semibold">${sale.amount}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Servicio</p>
                <p className="font-semibold">{sale.service_name}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Datos Fiscales
            </CardTitle>
            <CardDescription>
              Asegúrate de que coincidan exactamente con tu Constancia de Situación Fiscal.
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
                      <FormLabel>RFC</FormLabel>
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
                      <FormLabel>Código Postal Fiscal</FormLabel>
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
                      <FormLabel>Nombre o Razón Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Como aparece en el SAT" {...field} className="rounded-xl uppercase" onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
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
                      <FormLabel>Régimen Fiscal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <SelectItem value="626">626 - Régimen Simplificado de Confianza (RESICO)</SelectItem>
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
                      <FormLabel>Uso de CFDI</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        A este correo se enviarán los archivos XML y PDF.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Alert className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 rounded-2xl">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertTitle className="text-amber-800 dark:text-amber-400 font-semibold text-sm">Aviso Importante</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-500 text-xs">
                  Los datos deben coincidir exactamente con tu Constancia de Situación Fiscal vigente. La clínica revisará la solicitud antes de emitir la factura.
                </AlertDescription>
              </Alert>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full rounded-2xl h-12 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:scale-[1.01]" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando solicitud...
                  </>
                ) : (
                  'Solicitar Factura'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}
