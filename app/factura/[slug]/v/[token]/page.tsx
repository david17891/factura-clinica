import { notFound } from 'next/navigation'
import { InvoiceRequestForm } from '@/components/public/InvoiceRequestForm'
import { Card, CardContent } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface SaleContext {
  clinic_name: string
  clinic_slug: string
  sale_folio: string
  service_name: string
  amount: number
}

export default async function SaleTokenPage({
  params
}: {
  params: Promise<{ slug: string; token: string }>
}) {
  const { slug, token } = await params
  const supabase = await createClient()

  // Usar RPC publica SECURITY DEFINER por token — no enumerable.
  // NO expone patient_name, payment_method, ni datos internos.
  const { data, error } = await supabase.rpc('get_public_sale_invoice_context_by_token', {
    p_clinic_slug: slug,
    p_public_invoice_token: token,
  })

  if (error || !data || data.length === 0) {
    notFound()
  }

  const ctx = data[0] as SaleContext

  const clinic = {
    id: '',
    name: ctx.clinic_name,
    legal_name: null,
    slug: ctx.clinic_slug,
    phone: null,
    email: null,
    address: null,
    logo_url: null,
    created_at: '',
  }

  // No precargamos patient_name — el paciente lo captura en el formulario.
  // El token no expone datos personales.
  const sale = {
    id: '',
    clinic_id: '',
    folio: ctx.sale_folio,
    public_invoice_token: token,
    patient_name: '',
    patient_phone: null,
    patient_email: null,
    service_name: ctx.service_name,
    amount: Number(ctx.amount),
    payment_method: '',
    reference: null,
    status: 'not_requested' as const,
    created_at: '',
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center border border-primary/10">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {clinic.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Folio: {sale.folio}</p>
          </div>
        </header>

        <Card className="glass overflow-hidden border-none shadow-2xl">
          <CardContent className="p-0">
            <div className="bg-primary/5 p-6 border-b border-primary/10">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Servicio</p>
                  <p className="font-medium">{sale.service_name}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-muted-foreground">Monto</p>
                  <p className="font-bold text-primary text-lg">${sale.amount}</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8">
              <InvoiceRequestForm clinic={clinic} sale={sale} mode="sale" />
            </div>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-slate-400 pb-8">
          Powered by FiscoBot &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  )
}
