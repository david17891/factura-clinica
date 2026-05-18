'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  LogOut,
  Menu,
  QrCode,
  Settings,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { toast } from 'sonner'

const navItems = [
  { label: 'Inicio', icon: Home, href: '/dashboard' },
  { label: 'Ventas', icon: ClipboardList, href: '/dashboard/sales' },
  { label: 'Solicitudes', icon: FileText, href: '/dashboard/requests' },
  { label: 'QR fijo', icon: QrCode, href: '/dashboard/qr' },
  { label: 'Sitio publico', icon: Landmark, href: '/' },
]

function SidebarContent({ user, pathname, onLogout }: { user: { email: string } | null; pathname: string; onLogout: () => void }) {
  return (
    <div className="flex flex-col h-full py-6">
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div className="leading-tight">
          <span className="block text-lg font-bold tracking-tight">Factura Clínica</span>
          <span className="block text-xs text-slate-500">Portal fiscal</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'group-hover:text-primary transition-colors'}`} />
              <span className="font-medium">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 mt-auto">
        <Separator className="mb-6 opacity-50" />
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border-2 border-primary/20">
            <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.email?.split('@')[0] || 'Usuario'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="rounded-xl">
            <LogOut className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user ? { email: user.email ?? '' } : null)
      setLoading(false)
    }
    getUser()
  }, [supabase.auth, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <aside className="hidden lg:block w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 h-screen">
        <SidebarContent user={user} pathname={pathname} onLogout={handleLogout} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet>
              <Button asChild variant="ghost" size="icon" className="lg:hidden rounded-xl">
                <SheetTrigger>
                  <Menu className="w-5 h-5" />
                </SheetTrigger>
              </Button>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent user={user} pathname={pathname} onLogout={handleLogout} />
              </SheetContent>
            </Sheet>
            <h2 className="text-lg font-semibold lg:hidden">Factura Clínica</h2>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <Button asChild variant="ghost" size="icon" className="rounded-xl border border-slate-200 dark:border-slate-800">
                <DropdownMenuTrigger>
                  <Settings className="w-5 h-5" />
                </DropdownMenuTrigger>
              </Button>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
