import { notFound } from 'next/navigation'
import { InvoiceRequestForm } from '@/components/public/InvoiceRequestForm'
import { Card, CardContent } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { getClinicBySlug } from '@/lib/data/clinics'
import { getSaleByFolio } from '@/lib/data/sales'

export default async function SaleQrPage({
  params
}: {
  params: Promise<{ slug: string; folio: string }>
}) {
  const { slug, folio } = await params
  const clinic = await getClinicBySlug(slug)
  if (!clinic) notFound()

  const sale = await getSaleByFolio(clinic.id, folio)
  if (!sale) notFound()

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
                  <p className="text-muted-foreground">Paciente</p>
                  <p className="font-medium">{sale.patient_name}</p>
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
