'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  Mail,
  Info,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { updateInvoiceRequestStatusAction, assignUuidAction } from '@/lib/actions/invoice-requests'
import { exportRequestsCsvAction } from '@/lib/actions/exports'

interface RequestRow {
  id: string
  clinic_id: string
  sale_id: string | null
  status: string
  rfc: string
  legal_name: string
  tax_zip_code: string
  tax_regime: string
  cfdi_use: string
  email: string
  notes: string | null
  amount: number | null
  service_name: string | null
  payment_method: string | null
  patient_name: string | null
  patient_phone: string | null
  uuid: string | null
  rejection_reason: string | null
  source: string
  created_at: string
  sales: { folio: string; service_name: string; amount: number } | null
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Info }> = {
  fiscal_data_received: { label: 'Recibido', color: 'bg-blue-100 text-blue-700', icon: Clock },
  fiscal_data_pending: { label: 'Datos Pendientes', color: 'bg-amber-100 text-amber-700', icon: Clock },
  ready_to_invoice: { label: 'Listo', color: 'bg-emerald-100 text-emerald-700', icon: FileCheck },
  sent_to_accountant: { label: 'Enviado al Contador', color: 'bg-purple-100 text-purple-700', icon: FileCheck },
  issued: { label: 'Facturado', color: 'bg-slate-100 text-slate-700', icon: CheckCircle2 },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700', icon: XCircle },
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [uuidInput, setUuidInput] = useState('')

  useEffect(() => {
    async function fetchRequests() {
      const supabase = createClient()

      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id, role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      let query = supabase
        .from('invoice_requests')
        .select('*, sales(folio, service_name, amount)')
        .order('created_at', { ascending: false })

      if (profile?.clinic_id && profile.role !== 'superadmin') {
        query = query.eq('clinic_id', profile.clinic_id)
      }

      const { data } = await query
      if (data) setRequests(data as unknown as RequestRow[])
      setLoading(false)
    }
    fetchRequests()
  }, [])

  const filteredRequests = requests.filter(req =>
    (req.legal_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.rfc || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.sales?.folio || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleExport = async () => {
    const result = await exportRequestsCsvAction()
    if (result.error) {
      toast.error(result.error)
      return
    }

    const csv = Papa.unparse(result.data ?? [])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `solicitudes_factura_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Exportacion completada')
  }

  const handleStatusChange = async (id: string, newStatus: string, rejectionReason?: string) => {
    const result = await updateInvoiceRequestStatusAction(id, newStatus, rejectionReason)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Estado actualizado a ${statusConfig[newStatus]?.label || newStatus}`)
    const supabase = createClient()
    const { data } = await supabase
      .from('invoice_requests')
      .select('*, sales(folio, service_name, amount)')
      .order('created_at', { ascending: false })
    if (data) setRequests(data as unknown as RequestRow[])
    if (selectedRequest?.id === id) {
      setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null)
    }
  }

  const handleAssignUuid = async () => {
    if (!selectedRequest || !uuidInput.trim()) {
      toast.error('Ingresa un UUID valido')
      return
    }
    const result = await assignUuidAction(selectedRequest.id, uuidInput.trim())
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('UUID asignado correctamente')
    setSelectedRequest(prev => prev ? { ...prev, uuid: uuidInput.trim(), status: 'issued' } : null)
    setUuidInput('')
  }

  if (loading) {
    return <div className="space-y-6"><div className="text-center py-12 text-muted-foreground">Cargando solicitudes...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de Factura</h1>
          <p className="text-muted-foreground">Bandeja de entrada de datos fiscales para procesar.</p>
        </div>
        <Button variant="outline" className="rounded-xl border-primary text-primary hover:bg-primary/5" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <Card className="border-none shadow-xl glass overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2 rounded-xl border bg-white dark:bg-slate-900 px-3 py-2 max-w-sm mb-4">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar RFC, nombre o folio..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay solicitudes registradas.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableHead>RFC / Nombre</TableHead>
                  <TableHead>Venta</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => {
                  const StatusIcon = statusConfig[req.status]?.icon || Info
                  return (
                    <TableRow key={req.id} className="group hover:bg-primary/5 transition-colors">
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-white uppercase">{req.rfc}</div>
                        <div className="text-xs text-muted-foreground uppercase truncate max-w-[200px]">{req.legal_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{req.sales?.folio || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString('es-MX')}</div>
                      </TableCell>
                      <TableCell className="font-semibold">${Number(req.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[req.status]?.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[req.status]?.label || req.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Sheet>
                          <SheetTrigger>
                            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => { setSelectedRequest(req); setUuidInput(req.uuid || '') }}>
                              <Eye className="w-4 h-4 mr-2" /> Detalle
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="sm:max-w-md rounded-l-3xl glass">
                            <SheetHeader>
                              <SheetTitle>Detalle de Solicitud</SheetTitle>
                              <SheetDescription>
                                Revisa los datos fiscales proporcionados por el paciente.
                              </SheetDescription>
                            </SheetHeader>

                            {selectedRequest && selectedRequest.id === req.id && (
                              <div className="mt-8 space-y-8">
                                <div className="space-y-4">
                                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Datos de Facturacion</h3>
                                  <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="col-span-2">
                                      <p className="text-xs text-muted-foreground">Nombre / Razon Social</p>
                                      <p className="font-bold uppercase">{selectedRequest.legal_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">RFC</p>
                                      <p className="font-bold uppercase">{selectedRequest.rfc}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">C.P. Fiscal</p>
                                      <p className="font-bold">{selectedRequest.tax_zip_code}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Regimen</p>
                                      <p className="font-semibold">{selectedRequest.tax_regime}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Uso CFDI</p>
                                      <p className="font-semibold">{selectedRequest.cfdi_use}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-xs text-muted-foreground">Correo de recepcion</p>
                                      <div className="flex items-center gap-2">
                                        <Mail className="w-3 h-3" />
                                        <p className="font-semibold">{selectedRequest.email}</p>
                                      </div>
                                    </div>
                                    {selectedRequest.notes && (
                                      <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground">Notas</p>
                                        <p className="text-sm">{selectedRequest.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {selectedRequest.sales && (
                                  <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Referencia de Venta</h3>
                                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Folio</p>
                                        <p className="font-bold">{selectedRequest.sales.folio}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Monto</p>
                                        <p className="text-xl font-bold text-primary">${Number(selectedRequest.sales.amount).toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-3 pt-4">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase px-1">Cambiar Estado</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      variant="outline"
                                      className="rounded-xl border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                                      onClick={() => handleStatusChange(selectedRequest.id, 'ready_to_invoice')}
                                    >
                                      <FileCheck className="w-4 h-4 mr-2" /> Marcar Listo
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="rounded-xl border-purple-200 hover:bg-purple-50 text-purple-700"
                                      onClick={() => handleStatusChange(selectedRequest.id, 'sent_to_accountant')}
                                    >
                                      <Mail className="w-4 h-4 mr-2" /> Enviar Contador
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="rounded-xl border-slate-200 hover:bg-slate-50"
                                      onClick={() => handleStatusChange(selectedRequest.id, 'issued')}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar Facturado
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="rounded-xl border-red-100 hover:bg-red-50 text-red-600"
                                      onClick={() => handleStatusChange(selectedRequest.id, 'rejected', 'Datos incorrectos')}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" /> Rechazar
                                    </Button>
                                  </div>
                                </div>

                                {selectedRequest.status === 'issued' && (
                                  <div className="space-y-3">
                                    <Label>UUID de Factura</Label>
                                    <div className="flex gap-2">
                                      <Input
                                        value={uuidInput}
                                        onChange={(e) => setUuidInput(e.target.value)}
                                        placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                                        className="rounded-xl font-mono text-xs"
                                      />
                                      <Button size="sm" className="rounded-xl" onClick={handleAssignUuid}>Guardar</Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
