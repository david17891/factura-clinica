'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QrCode, Copy, ExternalLink, Info } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'

export default function ClinicQrPage() {
  const [clinicSlug, setClinicSlug] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClinic() {
      const supabase = createClient()

      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (profile?.clinic_id) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('slug, name')
          .eq('id', profile.clinic_id)
          .single()

        if (clinic) {
          setClinicSlug(clinic.slug)
          setClinicName(clinic.name)
        }
      }

      setLoading(false)
    }
    fetchClinic()
  }, [])

  const publicLink = clinicSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/factura/${clinicSlug}`
    : ''

  const handleCopy = () => {
    if (!publicLink) {
      toast.error('No se pudo generar el link')
      return
    }
    navigator.clipboard.writeText(publicLink)
    toast.success('Link copiado al portapapeles')
  }

  const handleWhatsApp = () => {
    if (!publicLink || !clinicName) {
      toast.error('No se pudo generar el mensaje')
      return
    }
    const text = `Hola, para solicitar tu factura de ${clinicName}, llena tus datos fiscales aqui: ${publicLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return <div className="space-y-6"><div className="text-center py-12 text-muted-foreground">Cargando informacion de la clinica...</div></div>
  }

  if (!clinicSlug) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR de la Clinica</h1>
          <p className="text-muted-foreground">Tu link permanente para que cualquier paciente solicite factura.</p>
        </div>
        <Card className="border-none shadow-xl glass overflow-hidden">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No tienes una clinica asignada. Contacta al administrador.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">QR de la Clinica</h1>
        <p className="text-muted-foreground">Tu link permanente para que cualquier paciente solicite factura.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_350px]">
        <div className="space-y-6">
          <Card className="border-none shadow-xl glass overflow-hidden">
            <CardHeader>
              <CardTitle>{clinicName}</CardTitle>
              <CardDescription>
                Este QR es ideal para tenerlo impreso en la recepcion o en un acrilico sobre el mostrador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                <p className="text-sm font-medium">Link Publico:</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 font-mono truncate">
                    {publicLink}
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-xl shrink-0" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-sm">Autogestion</p>
                  <p className="text-xs text-muted-foreground">El paciente ingresa el monto y servicio manualmente.</p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-sm">Siempre Activo</p>
                  <p className="text-xs text-muted-foreground">No expira y puede ser escaneado por multiples pacientes.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <Button variant="outline" className="rounded-xl" onClick={() => window.open(publicLink, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" /> Probar Formulario
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={handleWhatsApp}>
                  <QrCode className="w-4 h-4 mr-2" /> WhatsApp Generico
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden">
            <CardContent className="p-8 text-center space-y-4">
              <h3 className="text-xl font-bold">Necesitas algo mas automatico?</h3>
              <p className="text-slate-400 text-sm">
                Usa el <strong>QR por Venta</strong> en la seccion de Ventas para que el paciente solo tenga que llenar sus datos fiscales.
              </p>
              <Button variant="secondary" className="rounded-xl">
                <a href="/dashboard/sales">Ir a Ventas</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-2xl glass text-center flex flex-col items-center justify-center p-8 h-fit sticky top-24">
          <p className="text-sm font-bold text-primary mb-6 tracking-widest uppercase">QR Permanente</p>
          <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl border-4 border-primary/20">
            <QRCodeSVG
              value={publicLink}
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="mt-8 space-y-2">
            <p className="font-bold text-lg leading-tight">{clinicName}</p>
            <p className="text-xs text-muted-foreground">Escanea para facturar</p>
          </div>
          <Button variant="ghost" size="sm" className="mt-8 rounded-full text-muted-foreground hover:text-primary" onClick={handleCopy}>
            <Copy className="w-3 h-3 mr-2" /> Copiar URL
          </Button>
        </Card>
      </div>
    </div>
  )
}
