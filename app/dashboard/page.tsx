'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ClipboardList,
  Clock3,
  FileCheck2,
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface DashboardStats {
  totalSales: number
  totalIncome: number
  pendingRequests: number
  readyToInvoice: number
  issued: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentRequests, setRecentRequests] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      const { data: sales } = await supabase
        .from('sales')
        .select('id, amount, status')

      const { data: requests } = await supabase
        .from('invoice_requests')
        .select('id, status, legal_name, rfc, amount, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (sales) {
        const totalSales = sales.length
        const totalIncome = sales.reduce((sum, s) => sum + Number(s.amount || 0), 0)
        const pending = sales.filter(s =>
          s.status === 'not_requested' || s.status === 'fiscal_data_pending'
        ).length
        const ready = sales.filter(s => s.status === 'ready_to_invoice').length
        const issued = sales.filter(s => s.status === 'issued').length

        setStats({
          totalSales,
          totalIncome,
          pendingRequests: pending,
          readyToInvoice: ready,
          issued,
        })
      }

      if (requests) {
        setRecentRequests(requests)
      }

      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12 text-muted-foreground">Cargando estadisticas...</div>
      </div>
    )
  }

  const statCards = [
    { title: 'Ventas Totales', value: String(stats?.totalSales ?? 0), icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Ingresos Registrados', value: `$${(stats?.totalIncome ?? 0).toLocaleString()}`, icon: WalletCards, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: 'Pendientes Factura', value: String(stats?.pendingRequests ?? 0), icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-100' },
    { title: 'Facturas Emitidas', value: String(stats?.issued ?? 0), icon: FileCheck2, color: 'text-primary', bg: 'bg-primary/10' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido de nuevo</h1>
          <p className="text-muted-foreground">Aqui tienes un resumen de la actividad de tu clinica.</p>
        </div>
        <div className="flex gap-3">
          <Button className="rounded-xl shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]">
            <Link href="/dashboard/sales">Nueva Venta</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-none shadow-xl glass card-hover overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-xl glass overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Solicitudes Recientes</CardTitle>
            <Button variant="ghost" size="sm" className="rounded-xl">
              <Link href="/dashboard/requests">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentRequests.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No hay solicitudes recientes
                </div>
              ) : (
                recentRequests.map((req) => (
                  <div key={String(req.id)} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <FileCheck2 className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{String(req.legal_name || 'Sin nombre')}</p>
                      <p className="text-xs text-muted-foreground">RFC: {String(req.rfc || 'N/A')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">${Number(req.amount || 0).toLocaleString()}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {String(req.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl glass overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Actividad del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground text-center">
              Registro de actividad disponible en futuras versiones.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
