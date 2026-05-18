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
  Plus,
  Search,
  MoreHorizontal,
  MessageCircle,
  QrCode,
  Copy,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { createSaleAction } from '@/lib/actions/sales'

interface SaleRow {
  id: string
  clinic_id: string
  folio: string
  public_invoice_token: string
  patient_name: string
  patient_phone: string | null
  patient_email: string | null
  service_name: string
  amount: number
  payment_method: string
  reference: string | null
  status: string
  created_at: string
}

const statusMap: Record<string, { label: string; variant: 'outline' | 'secondary' | 'default' }> = {
  not_requested: { label: 'Sin datos recibidos', variant: 'outline' },
  fiscal_data_pending: { label: 'Datos pendientes', variant: 'outline' },
  fiscal_data_received: { label: 'Datos recibidos', variant: 'secondary' },
  ready_to_invoice: { label: 'Lista para facturar', variant: 'default' },
  sent_to_accountant: { label: 'Enviada al contador', variant: 'default' },
  issued: { label: 'Emitida', variant: 'default' },
  rejected: { label: 'Rechazada', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([])
  const [clinicSlug, setClinicSlug] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddingSale, setIsAddingSale] = useState(false)
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [emptyState, setEmptyState] = useState({
    title: 'Aun no hay ventas registradas',
    description: 'Crea una venta para generar un QR o link fiscal.',
  })

  useEffect(() => {
    async function fetchSales() {
      const supabase = createClient()

      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id, role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (profile?.clinic_id) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('slug')
          .eq('id', profile.clinic_id)
          .single()
        if (clinic) setClinicSlug(clinic.slug)
      } else if (profile?.role !== 'superadmin') {
        setEmptyState({
          title: 'No tienes una clínica asignada',
          description: 'Solicita a un administrador que revise tu perfil.',
        })
      }

      let query = supabase.from('sales').select('*').order('created_at', { ascending: false })

      if (profile?.clinic_id && profile.role !== 'superadmin') {
        query = query.eq('clinic_id', profile.clinic_id)
      }

      const { data } = await query
      if (data) setSales(data as SaleRow[])
      setLoading(false)
    }
    fetchSales()
  }, [])

  const filteredSales = sales.filter(sale =>
    sale.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.folio.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getSaleLink = (token: string) => {
    if (!clinicSlug) return ''
    return `${window.location.origin}/factura/${clinicSlug}/v/${token}`
  }

  const handleCopyLink = (sale: SaleRow) => {
    const link = getSaleLink(sale.public_invoice_token)
    if (!link) {
      toast.error('No se pudo generar el link')
      return
    }
    navigator.clipboard.writeText(link)
    toast.success('Link copiado al portapapeles')
  }

  const handleWhatsApp = (sale: SaleRow) => {
    const link = getSaleLink(sale.public_invoice_token)
    if (!link) {
      toast.error('No se pudo generar el link')
      return
    }
    const text = `Hola ${sale.patient_name}, para solicitar tu factura, llena tus datos fiscales aqui: ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleCreateSale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    const patientName = formData.get('patient') as string
    const serviceName = formData.get('service') as string
    const amountStr = formData.get('amount') as string
    const paymentMethod = formData.get('method') as string
    const patientPhone = formData.get('phone') as string
    const patientEmail = formData.get('email') as string
    const reference = formData.get('reference') as string

    if (!patientName || !serviceName || !amountStr || !paymentMethod) {
      toast.error('Completa los campos obligatorios')
      setSubmitting(false)
      return
    }

    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Monto invalido')
      setSubmitting(false)
      return
    }

    const profile = await createClient().from('profiles').select('clinic_id').eq('id', (await createClient().auth.getUser()).data.user?.id).single()
    const clinicId = profile.data?.clinic_id

    if (!clinicId) {
      toast.error('No tienes una clínica asignada')
      setSubmitting(false)
      return
    }

    // clinic_id is resolved server-side from the authenticated profile — do NOT pass from client
    const result = await createSaleAction({
      patient_name: patientName,
      patient_phone: patientPhone || undefined,
      patient_email: patientEmail || undefined,
      service_name: serviceName,
      amount,
      payment_method: paymentMethod,
      reference: reference || undefined,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Venta creada exitosamente')
      setIsAddingSale(false)
      const supabase = createClient()
      const { data } = await supabase.from('sales').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false })
      if (data) setSales(data as SaleRow[])
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="space-y-6"><div className="text-center py-12 text-muted-foreground">Cargando ventas...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas y links fiscales</h1>
          <p className="text-muted-foreground">Registra un pago para generar un QR o link fiscal unico.</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Después de cobrar, recepción puede registrar la venta y compartir un link seguro para que el paciente complete sus datos fiscales.
          </p>
        </div>
        <Dialog open={isAddingSale} onOpenChange={setIsAddingSale}>
          <Button asChild className="rounded-xl shadow-lg shadow-primary/10">
            <DialogTrigger>
              <Plus className="w-4 h-4 mr-2" /> Nueva venta
            </DialogTrigger>
          </Button>
          <DialogContent className="sm:max-w-[525px] rounded-3xl glass">
            <DialogHeader>
              <DialogTitle>Registrar pago</DialogTitle>
              <DialogDescription>
                Guarda los datos basicos de la venta para generar un link seguro de factura.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSale}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient">Nombre del paciente</Label>
                    <Input id="patient" name="patient" placeholder="Nombre completo" className="rounded-xl" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefono</Label>
                    <Input id="phone" name="phone" placeholder="6531234567" className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo opcional</Label>
                  <Input id="email" name="email" type="email" placeholder="paciente@email.com" className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service">Servicio</Label>
                    <Select name="service" required>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Consulta dental">Consulta dental</SelectItem>
                        <SelectItem value="Limpieza dental">Limpieza dental</SelectItem>
                        <SelectItem value="Resina dental">Resina dental</SelectItem>
                        <SelectItem value="Endodoncia">Endodoncia</SelectItem>
                        <SelectItem value="Ortodoncia">Ortodoncia</SelectItem>
                        <SelectItem value="Extraccion">Extraccion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto ($)</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" className="rounded-xl" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Metodo de pago</Label>
                  <Select name="method" required>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Referencia opcional</Label>
                  <Input id="reference" name="reference" placeholder="Autorizacion, transferencia o nota interna" className="rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="rounded-xl w-full" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar y generar link fiscal'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-xl glass overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2 rounded-xl border bg-white dark:bg-slate-900 px-3 py-2 max-w-sm mb-4">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente o folio..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSales.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">{emptyState.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{emptyState.description}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableHead className="w-[100px]">Folio</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado de solicitud</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="group hover:bg-primary/5 transition-colors">
                    <TableCell className="font-medium">{sale.folio}</TableCell>
                    <TableCell>
                      <div className="font-medium">{sale.patient_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleDateString('es-MX')}</div>
                    </TableCell>
                    <TableCell>{sale.service_name}</TableCell>
                    <TableCell className="font-semibold">${Number(sale.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[sale.status]?.variant ?? 'outline'} className="rounded-full font-medium">
                        {statusMap[sale.status]?.label || sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="rounded-full" title="Copiar link seguro de factura" onClick={() => handleCopyLink(sale)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full text-emerald-600" title="Enviar link por WhatsApp" onClick={() => handleWhatsApp(sale)}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full text-primary" title="Ver QR por venta" onClick={() => { setSelectedSale(sale); setIsQrOpen(true); }}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <Button asChild variant="ghost" size="icon" className="rounded-full">
                            <DropdownMenuTrigger>
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                          </Button>
                          <DropdownMenuContent align="end" className="rounded-2xl">
                            <DropdownMenuLabel>Opciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleCopyLink(sale)}>Copiar link seguro</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleWhatsApp(sale)}>Enviar link por WhatsApp</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl glass text-center">
          <DialogHeader>
            <DialogTitle>Link seguro de factura</DialogTitle>
            <DialogDescription>
              Comparte este QR o link para que el paciente envíe sus datos fiscales. Se abrirá WhatsApp con un mensaje prellenado; recepción solo debe presionar enviar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 flex flex-col items-center gap-6">
            <div className="p-4 bg-white rounded-3xl shadow-2xl border border-primary/10">
              {selectedSale && (
                <QRCodeSVG
                  value={getSaleLink(selectedSale.public_invoice_token)}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>
            <div className="space-y-1">
              <p className="font-bold text-lg">Folio interno {selectedSale?.folio}</p>
              <p className="text-sm text-muted-foreground">{selectedSale?.patient_name}</p>
              <p className="text-xl font-bold text-primary">${selectedSale ? Number(selectedSale.amount).toLocaleString() : 0}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button variant="outline" className="rounded-xl" onClick={() => selectedSale && handleCopyLink(selectedSale)}>
                <Copy className="w-4 h-4 mr-2" /> Copiar link
              </Button>
              <Button className="rounded-xl" onClick={() => selectedSale && handleWhatsApp(selectedSale)}>
                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
