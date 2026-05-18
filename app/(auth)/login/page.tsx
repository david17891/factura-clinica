'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Calculator, ClipboardList, Loader2, Lock, Mail, ShieldCheck, UserCog } from 'lucide-react'
import { toast } from 'sonner'

const DEMO_PASSWORD = 'Demo123456!'

const demoUsers = [
  {
    role: 'Administrador de clínica',
    email: 'admin@dentalrio.test',
    description: 'Consulta ventas, solicitudes, QR y exportación.',
    icon: UserCog,
  },
  {
    role: 'Recepción',
    email: 'recepcion@dentalrio.test',
    description: 'Registra pagos y comparte links fiscales.',
    icon: ClipboardList,
  },
  {
    role: 'Contador',
    email: 'contador@dentalrio.test',
    description: 'Revisa solicitudes, captura UUID y exporta CSV.',
    icon: Calculator,
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const fillDemoUser = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword(DEMO_PASSWORD)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('No se pudo iniciar sesión: ' + error.message)
      setLoading(false)
    } else {
      toast.success('Bienvenido a Factura Clínica')
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef8ff_0%,#f8fbff_45%,#ffffff_100%)] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">Factura Clínica</p>
              <p className="text-sm text-slate-500">Portal fiscal para clínicas</p>
            </div>
          </Link>

          <div className="space-y-4">
            <Badge className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700 hover:bg-cyan-50">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Demo local con datos ficticios
            </Badge>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight md:text-5xl">
              Entra como clínica, recepción o contador
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              Usa cualquiera de estos usuarios para recorrer el flujo completo:
              venta, QR, solicitud fiscal, UUID y exportación CSV.
            </p>
          </div>

          <div className="grid gap-3">
            {demoUsers.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => fillDemoUser(user.email)}
                className="flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/50 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <user.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">{user.role}</p>
                  <p className="truncate text-sm font-medium text-cyan-700">{user.email}</p>
                  <p className="mt-1 text-sm text-slate-500">{user.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <Card className="border-slate-200 bg-white/95 shadow-2xl shadow-slate-300/40">
          <CardHeader className="space-y-2 border-b border-slate-100">
            <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
            <CardDescription>
              Estos usuarios son solo para demostración local. No uses datos reales.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@dentalrio.test"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-lg pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-lg pl-10"
                    required
                  />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-950">Password demo</p>
                <p className="mt-1 font-mono text-cyan-700">{DEMO_PASSWORD}</p>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3 border-t border-slate-100 pt-5">
              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-slate-950 font-semibold hover:bg-slate-800"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
              <Button asChild variant="ghost" className="w-full rounded-lg">
                <Link href="/">Volver al sitio público</Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
