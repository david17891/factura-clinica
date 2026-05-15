import { notFound } from 'next/navigation'
import { InvoiceRequestForm } from '@/components/public/InvoiceRequestForm'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, MapPin, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface ClinicContext {
  clinic_name: string
  clinic_slug: string
  address: string | null
  phone: string | null
}

export default async function FixedQrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Usar RPC publica SECURITY DEFINER para obtener datos minimos de clinica.
  // Esto evita depender de SELECT directo con RLS anon.
  const { data, error } = await supabase.rpc('get_public_clinic_invoice_context', {
    p_clinic_slug: slug,
  })

  if (error || !data || data.length === 0) {
    notFound()
  }

  const ctx = data[0] as ClinicContext

  const clinic = {
    id: '',
    name: ctx.clinic_name,
    legal_name: null,
    slug: ctx.clinic_slug,
    phone: ctx.phone,
    email: null,
    address: ctx.address,
    logo_url: null,
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
            <p className="text-slate-500 dark:text-slate-400">Solicitud de Facturacion</p>
          </div>
        </header>

        <Card className="glass overflow-hidden border-none shadow-2xl">
          <CardContent className="p-0">
            <div className="bg-primary/5 p-6 border-b border-primary/10">
              <div className="grid gap-3 text-sm">
                {clinic.address && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span>{clinic.address}</span>
                  </div>
                )}
                {clinic.phone && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span>{clinic.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 md:p-8">
              <InvoiceRequestForm clinic={clinic} mode="fixed" />
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
