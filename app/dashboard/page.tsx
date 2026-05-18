'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  ClipboardList,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  MessageCircle,
  QrCode,
  ReceiptText,
  WalletCards,
} from 'lucide-react'

type Role = 'superadmin' | 'clinic_admin' | 'reception' | 'accountant'

interface DashboardStats {
  totalSales: number
  totalIncome: number
  pendingRequests: number
  readyToInvoice: number
  issued: number
}

interface ProfileSummary {
  role: Role
  clinic_id: string | null
}

const statusLabels: Record<string, string> = {
  not_requested: 'Sin solicitud',
  fiscal_data_pending: 'Datos pendientes',
  fiscal_data_received: 'Datos recibidos',
  ready_to_invoice: 'Lista para facturar',
  sent_to_accountant: 'Enviada al contador',
  issued: 'Emitida',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
}

const roleCopy: Record<Role, { title: string; subtitle: string }> = {
  superadmin: {
    title: 'Panel administrador',
    subtitle: 'Consulta ventas, solicitudes de factura, QR y reportes de las clínicas.',
  },
  clinic_admin: {
    title: 'Panel administrador de clínica',
    subtitle: 'Consulta ventas, solicitudes de factura, QR y reportes de tu clínica.',
  },
  reception: {
    title: 'Panel de recepción',
    subtitle: 'Registra pagos, genera QR y envía links fiscales por WhatsApp.',
  },
  accountant: {
    title: 'Panel del contador',
    subtitle: 'Revisa solicitudes listas para facturar, captura UUID y exporta información.',
  },
}

const roleVisual: Record<Role, { eyebrow: string; panel: string; iconBg: string }> = {
  superadmin: {
    eyebrow: 'Vista global',
    panel: 'bg-[linear-gradient(135deg,#f8fafc,#eef8ff)]',
    iconBg: 'bg-slate-950 text-white',
  },
  clinic_admin: {
    eyebrow: 'Administrador de clínica',
    panel: 'bg-[linear-gradient(135deg,#eef8ff,#ffffff)]',
    iconBg: 'bg-cyan-700 text-white',
  },
  reception: {
    eyebrow: 'Recepción',
    panel: 'bg-[linear-gradient(135deg,#ecfdf5,#ffffff)]',
    iconBg: 'bg-emerald-700 text-white',
  },
  accountant: {
    eyebrow: 'Contador',
    panel: 'bg-[linear-gradient(135deg,#f5f3ff,#ffffff)]',
    iconBg: 'bg-violet-700 text-white',
  },
}

const quickActionsByRole: Record<Role, Array<{ label: string; description: string; href: string; icon: typeof ClipboardList }>> = {
  superadmin: [
    { label: 'Crear venta', description: 'Registrar pago y generar link fiscal.', href: '/dashboard/sales', icon: ClipboardList },
    { label: 'Ver solicitudes', description: 'Revisar datos fiscales recibidos.', href: '/dashboard/requests', icon: FileText },
    { label: 'Ver QR fijo', description: 'Abrir link permanente de recepción.', href: '/dashboard/qr', icon: QrCode },
    { label: 'Exportar solicitudes', description: 'Descargar CSV desde solicitudes.', href: '/dashboard/requests', icon: Download },
  ],
  clinic_admin: [
    { label: 'Crear venta', description: 'Registrar pago y generar link fiscal.', href: '/dashboard/sales', icon: ClipboardList },
    { label: 'Ver solicitudes', description: 'Revisar avance de facturación.', href: '/dashboard/requests', icon: FileText },
    { label: 'Ver QR fijo', description: 'Compartir formulario permanente.', href: '/dashboard/qr', icon: QrCode },
    { label: 'Exportar solicitudes', description: 'Descargar CSV para contador.', href: '/dashboard/requests', icon: Download },
  ],
  reception: [
    { label: 'Crear venta', description: 'Registrar pago y generar QR por venta.', href: '/dashboard/sales', icon: ClipboardList },
    { label: 'Enviar WhatsApp', description: 'Abrir mensaje con link fiscal.', href: '/dashboard/sales', icon: MessageCircle },
    { label: 'Ver QR fijo', description: 'Usar formulario permanente.', href: '/dashboard/qr', icon: QrCode },
    { label: 'Solicitudes recientes', description: 'Confirmar datos recibidos.', href: '/dashboard/requests', icon: FileText },
  ],
  accountant: [
    { label: 'Ver solicitudes', description: 'Revisar pendientes de factura.', href: '/dashboard/requests', icon: FileText },
    { label: 'Exportar CSV', description: 'Descargar información fiscal.', href: '/dashboard/requests', icon: Download },
    { label: 'Capturar UUID', description: 'Cerrar solicitudes emitidas.', href: '/dashboard/requests', icon: ReceiptText },
    { label: 'Marcar emitida', description: 'Registrar factura ya emitida.', href: '/dashboard/requests', icon: FileCheck2 },
  ],
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [recentRequests, setRecentRequests] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role, clinic_id')
        .eq('id', user?.id)
        .single()

      if (currentProfile) {
        setProfile(currentProfile as ProfileSummary)
      }

      const { data: sales } = await supabase
        .from('sales')
        .select('id, amount, status')

      const { data: requests } = await supabase
        .from('invoice_requests')
        .select('id, status, legal_name, rfc, amount, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      const totalSales = sales?.length ?? 0
      const totalIncome = sales?.reduce((sum, s) => sum + Number(s.amount || 0), 0) ?? 0
      const pending = requests?.filter((r) =>
        ['fiscal_data_received', 'fiscal_data_pending'].includes(String(r.status))
      ).length ?? 0
      const ready = requests?.filter((r) => r.status === 'ready_to_invoice').length ?? 0
      const issued = requests?.filter((r) => r.status === 'issued').length ?? 0

      setStats({
        totalSales,
        totalIncome,
        pendingRequests: pending,
        readyToInvoice: ready,
        issued,
      })

      if (requests) {
        setRecentRequests(requests)
      }

      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Cargando panel...</div>
  }

  const role = profile?.role ?? 'reception'
  const copy = roleCopy[role]
  const visual = roleVisual[role]
  const quickActions = quickActionsByRole[role]

  const statCards = [
    { title: 'Ventas registradas', value: String(stats?.totalSales ?? 0), icon: ClipboardList, color: 'text-cyan-700', bg: 'bg-cyan-50' },
    { title: 'Importe registrado', value: `$${(stats?.totalIncome ?? 0).toLocaleString()}`, icon: WalletCards, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { title: 'Datos recibidos', value: String(stats?.pendingRequests ?? 0), icon: Clock3, color: 'text-amber-700', bg: 'bg-amber-50' },
    { title: 'Emitidas', value: String(stats?.issued ?? 0), icon: FileCheck2, color: 'text-slate-700', bg: 'bg-slate-100' },
  ]

  return (
    <div className="space-y-8">
      <section className={`rounded-3xl border border-slate-200 p-6 shadow-sm ${visual.panel}`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-3xl gap-4">
            <div className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl md:flex ${visual.iconBg}`}>
              <Building2 className="h-6 w-6" />
            </div>
            <div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">{visual.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{copy.title}</h1>
            <p className="mt-2 text-muted-foreground">{copy.subtitle}</p>
            </div>
          </div>
          <Button asChild className="w-full rounded-lg bg-slate-950 hover:bg-slate-800 sm:w-auto">
            <Link href={role === 'accountant' ? '/dashboard/requests' : '/dashboard/sales'}>
              {role === 'accountant' ? 'Ver solicitudes' : 'Crear venta'}
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <h3 className="mt-1 text-2xl font-bold">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/40"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <action.icon className="h-5 w-5" />
            </div>
            <p className="font-bold">{action.label}</p>
            <p className="mt-2 text-sm text-muted-foreground">{action.description}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Solicitudes recientes</CardTitle>
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link href="/dashboard/requests">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentRequests.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-semibold">Aun no hay solicitudes de factura</p>
                <p className="mt-1 text-sm text-muted-foreground">Comparte el QR fijo o genera una venta con link fiscal.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRequests.map((req) => (
                  <div key={String(req.id)} className="grid grid-cols-[1fr_auto] gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold uppercase">{String(req.legal_name || 'Sin nombre')}</p>
                      <p className="text-xs text-muted-foreground">RFC: {String(req.rfc || 'N/A')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">${Number(req.amount || 0).toLocaleString()}</p>
                      <span className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">
                        {statusLabels[String(req.status)] ?? String(req.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Flujo recomendado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              'Registra una venta.',
              'Comparte el QR o link por WhatsApp.',
              'El paciente llena sus datos fiscales.',
              'El contador revisa y marca la factura como emitida.',
            ].map((step, index) => (
              <div key={step} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm text-slate-700">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
