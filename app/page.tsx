import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, CheckCircle2, QrCode, ShieldCheck, Zap, ArrowRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">FiscoBot</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Funciones</a>
            <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">Cómo funciona</a>
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Iniciar Sesión</Link>
          </nav>
          <Button  className="rounded-full px-6">
            <Link href="/login">Acceder</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-4">
          <div className="container mx-auto text-center space-y-8 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-semibold animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Zap className="w-4 h-4" />
              <span>MVP para Clínicas Mexicanas</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700">
              Control de facturación <span className="text-primary italic">sin cambiar</span> tu forma de cobrar
            </h1>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000">
              Sigue cobrando como siempre. FiscoBot captura los datos fiscales por ti y organiza las solicitudes para tu contador.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <Button size="lg"  className="rounded-full px-8 h-14 text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105">
                <Link href="/login">Empezar ahora <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg font-semibold">
                Ver demo en video
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">Todo lo que necesitas para tu MVP</h2>
              <p className="text-slate-500 max-w-2xl mx-auto">Diseñado para consultorios pequeños que quieren dejar de pedir datos fiscales por WhatsApp.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'QR Fijo o por Venta',
                  description: 'Genera un QR único por cobro o mantén uno fijo en recepción.',
                  icon: QrCode,
                  color: 'bg-blue-100 text-blue-600'
                },
                {
                  title: 'WhatsApp con Link',
                  description: 'Envía links de facturación personalizados por WhatsApp en un clic.',
                  icon: MessageCircle,
                  color: 'bg-emerald-100 text-emerald-600'
                },
                {
                  title: 'Bandeja de Entrada',
                  description: 'Organiza las solicitudes y marca el progreso de facturación.',
                  icon: CheckCircle2,
                  color: 'bg-primary/10 text-primary'
                }
              ].map((feature, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 space-y-4 transition-all hover:-translate-y-2">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-24 overflow-hidden">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight">Privacidad y Orden por Diseño</h2>
              <ul className="space-y-4">
                {[
                  'Sin expedientes clínicos ni datos sensibles.',
                  'Aislamiento total de datos por clínica.',
                  'Validación RFC integrada para evitar errores.',
                  'Exportación directa para el contador.'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 relative">
              <div className="absolute -inset-4 bg-primary/20 blur-[100px] rounded-full" />
              <div className="relative bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 rotate-2 max-w-md mx-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vista Previa</span>
                    <Badge className="rounded-full">Recibido</Badge>
                  </div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2" />
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="h-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl" />
                    <div className="h-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl" />
                  </div>
                  <div className="h-12 bg-primary rounded-xl w-full mt-4" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold tracking-tight">FiscoBot</span>
          </div>
          <p className="text-slate-400 text-sm italic">Simplificando la administración para profesionales de la salud.</p>
          <div className="pt-8 text-xs text-slate-400">
            &copy; {new Date().getFullYear()} FiscoBot. Desarrollado con Next.js y Supabase.
          </div>
        </div>
      </footer>
    </div>
  )
}
