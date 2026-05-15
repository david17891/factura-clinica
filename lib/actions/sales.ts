'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { canCreateSale } from '@/lib/auth/permissions'
import * as z from 'zod'

const saleSchema = z.object({
  patient_name: z.string().min(2, 'Nombre muy corto'),
  patient_phone: z.string().optional(),
  patient_email: z.string().email().optional().or(z.literal('')),
  service_name: z.string().min(2, 'Servicio requerido'),
  amount: z.number().positive('Monto debe ser mayor a 0'),
  payment_method: z.string().min(1, 'Metodo de pago requerido'),
  reference: z.string().optional(),
})

export async function createSaleAction(formData: z.infer<typeof saleSchema>) {
  // 1. Validar sesión y rol
  const profile = await getCurrentProfile()
  if (!profile) {
    return { error: 'No autenticado' }
  }
  if (!canCreateSale(profile.role)) {
    return { error: 'No tienes permisos para crear ventas' }
  }

  // 2. Validar que el usuario tiene clinic_id asignado
  // superadmin sin clinic_id no puede crear ventas sin contexto
  if (!profile.clinic_id) {
    return { error: 'Tu usuario no tiene una clinica asignada' }
  }

  // 3. Validar payload — clinic_id viene del perfil server-side, no del cliente
  const validated = saleSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const supabase = await createClient()

  // 4. Generar folio transaccional con función SQL (evita colisiones concurrentes)
  const { data: folioData, error: folioError } = await supabase
    .rpc('generate_sale_folio', { p_clinic_id: profile.clinic_id })

  if (folioError || !folioData) {
    return { error: `Error generando folio: ${folioError?.message ?? 'desconocido'}` }
  }

  const folio = folioData as string

  // 5. Insertar venta — clinic_id forzado desde perfil autenticado
  const { data, error } = await supabase
    .from('sales')
    .insert({
      ...validated.data,
      clinic_id: profile.clinic_id,  // NO se acepta clinic_id del cliente
      folio,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard')
  return { data }
}

export async function updateSaleStatusAction(saleId: string, status: string) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'No autenticado' }

  // Solo clinic_admin y superadmin pueden cambiar estado de ventas
  if (!['superadmin', 'clinic_admin'].includes(profile.role)) {
    return { error: 'No tienes permisos para cambiar el estado de ventas' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('sales')
    .update({ status })
    .eq('id', saleId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/sales')
  return { success: true }
}
