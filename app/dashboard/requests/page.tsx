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
  ExternalLink,
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
import { createCsfDocumentSignedUrlAction } from '@/lib/actions/csf-documents'
import type { CsfExtractedData } from '@/types'

interface CsfDocumentRow {
  id: string
  original_filename: string
  mime_type: string
  file_size: number
  extraction_status: string
  extracted_data: CsfExtractedData & Record<string, unknown>
  created_at: string
}

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
  sales: { folio: string; service_name: string; amount: number; created_at: string } | null
  invoice_request_csf_documents: CsfDocumentRow[]
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Info }> = {
  fiscal_data_received: { label: 'Datos recibidos', color: 'bg-blue-100 text-blue-700', icon: Clock },
  fiscal_data_pending: { label: 'Datos pendientes', color: 'bg-amber-100 text-amber-700', icon: Clock },
  ready_to_invoice: { label: 'Lista para facturar', color: 'bg-emerald-100 text-emerald-700', icon: FileCheck },
  sent_to_accountant: { label: 'Enviada al contador', color: 'bg-purple-100 text-purple-700', icon: FileCheck },
  issued: { label: 'Emitida', color: 'bg-slate-100 text-slate-700', icon: CheckCircle2 },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-700', icon: XCircle },
}

const requestsSelect = '*, sales!invoice_requests_sale_id_fkey(folio, service_name, amount, created_at), invoice_request_csf_documents(id, original_filename, mime_type, file_size, extraction_status, extracted_data, created_at)'

function getCsfSuggestionRows(data: CsfExtractedData & Record<string, unknown>) {
  return [
    ['RFC', data.rfc],
    ['Nombre/Razón social', data.legalName],
    ['C.P. fiscal', data.taxZipCode],
    ['Régimen', data.taxRegime],
    ['Fuente', data.source],
    ['Confianza', data.confidence],
  ].filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
}

type UserRole = 'superadmin' | 'clinic_admin' | 'reception' | 'accountant'

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [uuidInput, setUuidInput] = useState('')
  const [role, setRole] = useState<UserRole>('reception')
  const [emptyState, setEmptyState] = useState({
    title: 'Aun no hay solicitudes de factura',
    description: 'Comparte el QR fijo o genera una venta con link fiscal.',
  })

  async function fetchRequests() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('clinic_id, role')
      .eq('id', user?.id)
      .single()

    if (profile?.role) {
      setRole(profile.role as UserRole)
    }

    let query = supabase
      .from('invoice_requests')
      .select(requestsSelect)
      .order('created_at', { ascending: false })

    if (profile?.clinic_id && profile.role !== 'superadmin') {
      query = query.eq('clinic_id', profile.clinic_id)
    }

    const { data, error } = await query
    if (error) {
      toast.error(error.message)
    } else if (data) {
      setRequests(data as unknown as RequestRow[])
      if (data.length === 0 && profile?.role === 'accountant') {
        const { data: assignments } = await supabase
          .from('clinic_accountants')
          .select('clinic_id')
          .eq('accountant_id', user?.id)
          .limit(1)
        setEmptyState(assignments?.length
          ? {
              title: 'Aun no hay solicitudes de factura',
              description: 'Cuando la clínica reciba datos fiscales, aparecerán aquí.',
            }
          : {
              title: 'No tienes clínicas asignadas',
              description: 'Cuando una clínica te asigne como contador, verás sus solicitudes aquí.',
            })
      } else if (data.length === 0 && !profile?.clinic_id && profile?.role !== 'superadmin') {
        setEmptyState({
          title: 'No tienes una clínica asignada',
          description: 'Solicita a un administrador que revise tu perfil.',
        })
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    async function loadInitialRequests() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id, role')
        .eq('id', user?.id)
        .single()

      if (profile?.role) {
        setRole(profile.role as UserRole)
      }

      let query = supabase
        .from('invoice_requests')
        .select(requestsSelect)
        .order('created_at', { ascending: false })

      if (profile?.clinic_id && profile.role !== 'superadmin') {
        query = query.eq('clinic_id', profile.clinic_id)
      }

      const { data, error } = await query
      if (error) {
        toast.error(error.message)
      } else if (data) {
        setRequests(data as unknown as RequestRow[])
        if (data.length === 0 && profile?.role === 'accountant') {
          const { data: assignments } = await supabase
            .from('clinic_accountants')
            .select('clinic_id')
            .eq('accountant_id', user?.id)
            .limit(1)
          setEmptyState(assignments?.length
            ? {
                title: 'Aun no hay solicitudes de factura',
                description: 'Cuando la clínica reciba datos fiscales, aparecerán aquí.',
              }
            : {
                title: 'No tienes clínicas asignadas',
                description: 'Cuando una clínica te asigne como contador, verás sus solicitudes aquí.',
              })
        } else if (data.length === 0 && !profile?.clinic_id && profile?.role !== 'superadmin') {
          setEmptyState({
            title: 'No tienes una clínica asignada',
            description: 'Solicita a un administrador que revise tu perfil.',
          })
        }
      }
      setLoading(false)
    }

    loadInitialRequests()
  }, [])

  const filteredRequests = requests.filter(req =>
    (req.legal_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.rfc || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.sales?.folio || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getAvailableStatusActions = (status: string) => ({
    canMarkReady: ['fiscal_data_received'].includes(status),
    canSendAccountant: ['fiscal_data_received', 'ready_to_invoice'].includes(status),
    canReject: ['fiscal_data_received', 'fiscal_data_pending', 'ready_to_invoice', 'sent_to_accountant'].includes(status),
    canCancel: ['fiscal_data_received', 'fiscal_data_pending', 'ready_to_invoice', 'sent_to_accountant'].includes(status),
    canReopen: status === 'rejected',
  })

  const canManageRequests = ['superadmin', 'clinic_admin', 'accountant'].includes(role)
  const canExportRequests = ['superadmin', 'clinic_admin', 'accountant'].includes(role)

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
    toast.success('Exportación completada')
  }

  const handleStatusChange = async (id: string, newStatus: string, rejectionReason?: string) => {
    const result = await updateInvoiceRequestStatusAction(id, newStatus, rejectionReason)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Estado actualizado a ${statusConfig[newStatus]?.label || newStatus}`)
    await fetchRequests()
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
    setRequests(prev => prev.map(req =>
      req.id === selectedRequest.id
        ? { ...req, uuid: uuidInput.trim(), status: 'issued' }
        : req
    ))
    setUuidInput('')
    await fetchRequests()
  }

  const handleViewCsfDocument = async (documentId: string) => {
    const result = await createCsfDocumentSignedUrlAction(documentId)
    if (result.error || !result.url) {
      toast.error(result.error ?? 'No se pudo abrir la constancia')
      return
    }
    window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return <div className="space-y-6"><div className="text-center py-12 text-muted-foreground">Cargando solicitudes...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de factura</h1>
          <p className="text-muted-foreground">Revisa datos fiscales, prepara facturas y cierra solicitudes con UUID.</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Descarga un CSV con los datos fiscales y de venta para apoyar la emision de facturas.
          </p>
        </div>
        {canExportRequests && (
          <Button variant="outline" className="rounded-xl border-primary text-primary hover:bg-primary/5" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Exportar para contador
          </Button>
        )}
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
            <div className="p-10 text-center">
              <p className="font-semibold">{emptyState.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{emptyState.description}</p>
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
                          <Button asChild variant="ghost" size="sm" className="rounded-xl">
                            <SheetTrigger onClick={() => { setSelectedRequest(req); setUuidInput(req.uuid || '') }}>
                              <Eye className="w-4 h-4 mr-2" /> Detalle
                            </SheetTrigger>
                          </Button>
                          <SheetContent className="sm:max-w-md rounded-l-3xl glass">
                            <SheetHeader>
                              <SheetTitle>Detalle de solicitud</SheetTitle>
                              <SheetDescription>
                                Revisa los datos fiscales proporcionados por el paciente.
                              </SheetDescription>
                            </SheetHeader>

                            {selectedRequest && selectedRequest.id === req.id && (
                              <div className="mt-8 space-y-8">
                                <div className="space-y-4">
                                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Datos fiscales</h3>
                                  <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="col-span-2">
                                      <p className="text-xs text-muted-foreground">Nombre / Razon social</p>
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
                                      <p className="text-xs text-muted-foreground">Régimen</p>
                                      <p className="font-semibold">{selectedRequest.tax_regime}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Uso CFDI</p>
                                      <p className="font-semibold">{selectedRequest.cfdi_use}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-xs text-muted-foreground">Correo para recibir factura</p>
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
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Referencia de venta</h3>
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

                                <div className="space-y-4">
                                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Constancia fiscal</h3>
                                  {selectedRequest.invoice_request_csf_documents?.length ? (
                                    selectedRequest.invoice_request_csf_documents.map((document) => {
                                      const hasSuggestions = document.extracted_data && Object.keys(document.extracted_data).length > 0
                                      const suggestionRows = getCsfSuggestionRows(document.extracted_data)
                                      const statusLabel = document.extraction_status === 'extracted'
                                        ? 'Datos sugeridos'
                                        : document.extraction_status === 'failed'
                                          ? 'No se pudo leer automáticamente'
                                          : 'Subida'

                                      return (
                                        <div key={document.id} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-bold">{document.original_filename}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {statusLabel} · {(document.file_size / 1024 / 1024).toFixed(2)} MB
                                              </p>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="shrink-0 rounded-xl"
                                              onClick={() => handleViewCsfDocument(document.id)}
                                            >
                                              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver
                                            </Button>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            La constancia es apoyo documental. Los datos confirmados por el paciente son los usados en la solicitud.
                                          </p>
                                          {hasSuggestions && (
                                            <div className="space-y-2 rounded-xl bg-cyan-50 p-3 text-xs text-cyan-800">
                                              <p className="font-semibold">Datos sugeridos por constancia</p>
                                              {suggestionRows.length ? (
                                                <div className="grid gap-1 sm:grid-cols-2">
                                                  {suggestionRows.map(([label, value]) => (
                                                    <div key={label}>
                                                      <span className="font-medium">{label}:</span> {value}
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p>Hay datos técnicos de extracción, pero ningún campo fiscal confiable para mostrar.</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })
                                  ) : (
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900/50">
                                      No subida
                                    </div>
                                  )}
                                </div>

                                {canManageRequests && (
                                  <div className="space-y-3 pt-4">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase px-1">Cambiar estado</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {getAvailableStatusActions(selectedRequest.status).canMarkReady && (
                                        <Button
                                          variant="outline"
                                          className="rounded-xl border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                                          onClick={() => handleStatusChange(selectedRequest.id, 'ready_to_invoice')}
                                        >
                                          <FileCheck className="w-4 h-4 mr-2" /> Marcar lista
                                        </Button>
                                      )}
                                      {getAvailableStatusActions(selectedRequest.status).canSendAccountant && (
                                        <Button
                                          variant="outline"
                                          className="rounded-xl border-purple-200 hover:bg-purple-50 text-purple-700"
                                          onClick={() => handleStatusChange(selectedRequest.id, 'sent_to_accountant')}
                                        >
                                          <Mail className="w-4 h-4 mr-2" /> Enviar al contador
                                        </Button>
                                      )}
                                      {getAvailableStatusActions(selectedRequest.status).canReopen && (
                                        <Button
                                          variant="outline"
                                          className="rounded-xl border-blue-200 hover:bg-blue-50 text-blue-700"
                                          onClick={() => handleStatusChange(selectedRequest.id, 'fiscal_data_received')}
                                        >
                                          <Clock className="w-4 h-4 mr-2" /> Reabrir
                                        </Button>
                                      )}
                                      {getAvailableStatusActions(selectedRequest.status).canReject && (
                                        <Button
                                          variant="outline"
                                          className="rounded-xl border-red-100 hover:bg-red-50 text-red-600"
                                          onClick={() => handleStatusChange(selectedRequest.id, 'rejected', 'Datos incorrectos')}
                                        >
                                          <XCircle className="w-4 h-4 mr-2" /> Rechazar
                                        </Button>
                                      )}
                                      {getAvailableStatusActions(selectedRequest.status).canCancel && (
                                        <Button
                                          variant="outline"
                                          className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700"
                                          onClick={() => handleStatusChange(selectedRequest.id, 'cancelled')}
                                        >
                                          <XCircle className="w-4 h-4 mr-2" /> Cancelar
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {canManageRequests && ['ready_to_invoice', 'sent_to_accountant'].includes(selectedRequest.status) && (
                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <Label>Capturar UUID y marcar como emitida</Label>
                                      <p className="text-xs text-muted-foreground">
                                        Después de emitir la factura en tu sistema fiscal, captura el UUID para cerrar la solicitud.
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Input
                                        value={uuidInput}
                                        onChange={(e) => setUuidInput(e.target.value)}
                                        placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                                        className="rounded-xl font-mono text-xs"
                                      />
                                      <Button size="sm" className="rounded-xl" onClick={handleAssignUuid}>Guardar UUID</Button>
                                    </div>
                                  </div>
                                )}

                                {selectedRequest.status === 'issued' && (
                                  <div className="space-y-2">
                                    <Label>UUID de factura emitida</Label>
                                    <div className="rounded-xl border bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-xs">
                                      {selectedRequest.uuid || 'Sin UUID registrado'}
                                    </div>
                                  </div>
                                )}

                                {!canManageRequests && (
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                                    Solo administradores y contadores pueden cambiar el estado de las solicitudes.
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
