import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Stethoscope,
  UserRoundCheck,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

const valueChips = ['Datos fiscales completos', 'Solicitudes ordenadas', 'Exportación para contador']

const problems = [
  'Datos fiscales incompletos',
  'Mensajes dispersos en WhatsApp',
  'Pagos difíciles de relacionar',
  'Seguimiento manual por recepción',
  'Retrabajo para el contador',
]

const features = [
  { title: 'QR fijo para recepción', description: 'Un link permanente para pacientes que solicitan factura después de pagar.', icon: QrCode },
  { title: 'QR único por venta', description: 'Cada pago puede tener un link fiscal seguro ligado al folio interno.', icon: ClipboardList },
  { title: 'WhatsApp con link fiscal', description: 'Se abre WhatsApp con un mensaje prellenado para que recepción solo presione enviar.', icon: MessageCircle },
  { title: 'Formulario fiscal público', description: 'El paciente captura RFC, razón social, régimen, uso CFDI y correo.', icon: UserRoundCheck },
  { title: 'Panel de solicitudes', description: 'Clínica y contador revisan pendientes, estados y detalles de cada solicitud.', icon: CheckCircle2 },
  { title: 'Exportación CSV', description: 'El contador descarga la información ordenada para facturar en su sistema actual.', icon: FileSpreadsheet },
]

const audience = [
  'Clínicas dentales pequeñas',
  'Consultorios médicos pequeños',
  'Recepción y administración',
  'Contadores que atienden clínicas',
]

const notYet = [
  'No timbra CFDI automáticamente.',
  'No reemplaza al contador.',
  'No procesa pagos.',
  'No es expediente clínico.',
  'No guarda diagnósticos médicos.',
]

const flowSteps = [
  ['01', 'La clínica cobra como siempre.', 'No cambia la forma de pago ni el sistema fiscal actual.'],
  ['02', 'Recepción genera un QR o envía un link por WhatsApp.', 'Puede usar QR fijo o link seguro por venta.'],
  ['03', 'El paciente llena sus datos fiscales.', 'El formulario pide la información necesaria para facturar.'],
  ['04', 'Clínica y contador revisan la solicitud en un panel.', 'Se actualizan estados, UUID y exportación CSV.'],
]

function ProductMockup() {
  return (
    <div className="relative">
      <div className="absolute -right-4 top-10 hidden rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-xl shadow-slate-200/70 lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-950">WhatsApp fiscal</p>
            <p className="text-xs text-slate-500">Mensaje listo para enviar</p>
          </div>
        </div>
      </div>

      <div className="absolute -left-5 bottom-12 hidden rounded-2xl border border-cyan-200 bg-white p-4 shadow-xl shadow-slate-200/70 lg:block">
        <div className="grid h-20 w-20 grid-cols-4 gap-1 rounded-lg bg-slate-950 p-2">
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className={`rounded-[2px] ${[0, 3, 5, 6, 9, 10, 12, 15].includes(index) ? 'bg-white' : 'bg-cyan-300'}`}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-slate-600">QR por venta</p>
      </div>

      <div className="rounded-[28px] border border-slate-200/80 bg-white/75 p-4 shadow-2xl shadow-slate-300/50 backdrop-blur">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4">
            <div>
              <p className="text-sm font-bold text-slate-950">Solicitudes de factura</p>
              <p className="text-xs text-slate-500">Vista para clínica y contador</p>
            </div>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">En orden</span>
          </div>

          <div className="space-y-3 p-5">
            {[
              ['V-000128', 'Datos recibidos', 'Consulta dental', '$850'],
              ['V-000129', 'Lista para facturar', 'Limpieza dental', '$700'],
              ['V-000130', 'Enviada al contador', 'Resina dental', '$1,200'],
            ].map(([folio, status, service, amount]) => (
              <div key={folio} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="text-sm font-bold text-slate-950">{folio}</p>
                  <p className="text-sm text-slate-600">{service}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-950">{amount}</p>
                  <p className="text-xs font-semibold text-cyan-700">{status}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 border-t border-slate-200 text-center text-xs">
            <div className="p-4">
              <p className="text-lg font-black text-slate-950">QR</p>
              <p className="text-slate-500">seguro</p>
            </div>
            <div className="border-x border-slate-200 p-4">
              <p className="text-lg font-black text-slate-950">CSV</p>
              <p className="text-slate-500">Exportación</p>
            </div>
            <div className="p-4">
              <p className="text-lg font-black text-slate-950">UUID</p>
              <p className="text-slate-500">Seguimiento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f6f9fc] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-bold">Factura Clínica</p>
              <p className="text-xs text-slate-500">Portal fiscal para clínicas</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#problem" className="hover:text-slate-950">Problema</a>
            <a href="#how-it-works" className="hover:text-slate-950">Cómo funciona</a>
            <a href="#features" className="hover:text-slate-950">Qué hace</a>
            <a href="#scope" className="hover:text-slate-950">Alcance</a>
          </nav>
          <Button asChild className="rounded-xl bg-slate-950 px-5 shadow-lg shadow-slate-900/10 hover:bg-slate-800">
            <Link href="/login">Entrar a la demo</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(135deg,#eef8ff_0%,#f8fbff_42%,#ffffff_100%)]">
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgba(8,47,73,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(8,47,73,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute right-0 top-20 hidden h-72 w-1/2 rounded-l-[80px] bg-cyan-100/20 lg:block" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-10 md:pt-12 lg:min-h-[620px] lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pb-16">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-sm font-semibold text-cyan-800 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Para clínicas pequeñas y contadores en México
              </div>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl xl:text-[3.65rem] xl:leading-[1.04]">
                  Organiza las solicitudes de factura de tu clínica con QR y WhatsApp
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600">
                  Factura Clínica ayuda a recepción y contador a recibir datos fiscales completos,
                  ligar solicitudes a pagos y exportar información lista para facturar.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {valueChips.map((chip) => (
                  <span key={chip} className="rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                    {chip}
                  </span>
                ))}
              </div>

              <p className="text-sm font-semibold text-slate-700">
                Menos mensajes sueltos. Menos datos incompletos. Más orden para tu contador.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-xl bg-slate-950 px-6 shadow-xl shadow-slate-900/15 hover:bg-slate-800">
                  <Link href="/login">Entrar a la demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-slate-300 bg-white/80 px-6">
                  <a href="#how-it-works">Ver flujo en 3 pasos</a>
                </Button>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-slate-500">
                Tu clínica cobra como siempre. Tus pacientes envían sus datos fiscales por QR o WhatsApp.
                Tu contador recibe todo ordenado.
              </p>
            </div>

            <ProductMockup />
          </div>
        </section>

        <section id="problem" className="bg-[#f6f9fc] py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[0.85fr_1fr]">
            <div className="space-y-4">
              <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Problema</p>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">
                Hoy muchas solicitudes de factura se pierden en WhatsApp
              </h2>
              <p className="text-slate-600">
                La recepción termina persiguiendo datos, el contador recibe información incompleta
                y cada pago se vuelve difícil de relacionar.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {problems.map((problem) => (
                <div key={problem} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-700">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-10 max-w-2xl space-y-4">
              <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Cómo funciona</p>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">Un flujo simple para ordenar cada solicitud</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-4">
              {flowSteps.map(([step, title, description]) => (
                <div key={step} className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-5 shadow-sm">
                  <p className="mb-5 text-sm font-black text-cyan-700">{step}</p>
                  <h3 className="font-bold text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-[#f6f9fc] py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-10 max-w-2xl space-y-4">
              <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Qué hace</p>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">Herramientas para recepción, administración y contador</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-md">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fbff,#ffffff)] p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Para quién es</p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">Pensado para operaciones pequeñas</h2>
              <div className="mt-6 grid gap-3">
                {audience.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                    <Stethoscope className="h-4 w-4 text-cyan-700" />
                    <span className="text-sm font-semibold text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div id="scope" className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10">
              <p className="text-sm font-bold uppercase tracking-wide text-cyan-300">Alcance claro</p>
              <h2 className="mt-3 text-2xl font-black">Qué no hace todavía</h2>
              <div className="mt-6 grid gap-3">
                {notYet.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
                    <XCircle className="h-4 w-4 text-cyan-300" />
                    <span className="text-sm font-semibold text-slate-100">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#f6f9fc] py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-950">Factura Clínica</p>
              <p>Portal fiscal para clínicas</p>
            </div>
          </div>
          <p>Demo local con datos ficticios. Sin CFDI automático, pagos ni expediente clínico.</p>
        </div>
      </footer>
    </div>
  )
}
