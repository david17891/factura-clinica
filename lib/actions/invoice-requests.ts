'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { canUpdateRequestStatus, canAssignUuid } from '@/lib/auth/permissions'

// ============================================================
// createInvoiceRequestAction — ELIMINADA
// El formulario público NO debe llamar a este server action.
// Debe llamar a la RPC pública submit_invoice_request directamente
// desde el cliente (lib/supabase/client.ts -> supabase.rpc(...))
// Esto cierra el riesgo de inserción arbitraria.
// ============================================================

// Exportamos un stub para evitar errores de importación en código legado
// que aún no haya sido migrado a usar la RPC.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createInvoiceRequestAction(_input: unknown) {
  return {
    error:
      'Este método está deshabilitado. El formulario público debe usar la RPC submit_invoice_request.',
  }
}

// ============================================================
// updateInvoiceRequestStatusAction
// Valida: sesión, rol, alcance de clínica, transición básica
// ============================================================

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  fiscal_data_received: ['ready_to_invoice', 'sent_to_accountant', 'rejected', 'cancelled'],
  fiscal_data_pending:  ['fiscal_data_received', 'rejected', 'cancelled'],
  ready_to_invoice:     ['rejected', 'cancelled'],
  sent_to_accountant:   ['ready_to_invoice', 'rejected', 'cancelled'],
  corrected_by_patient: ['sent_to_accountant', 'ready_to_invoice', 'rejected', 'cancelled'],
  issued:               [],  // estado final — no se puede cambiar desde aquí
  rejected:             ['fiscal_data_received'],  // permite reintento
  cancelled:            [],  // estado final
}

export async function updateInvoiceRequestStatusAction(
  requestId: string,
  newStatus: string,
  rejectionReason?: string
) {
  // 1. Validar sesión y rol
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'No autenticado' }
  if (!canUpdateRequestStatus(profile.role)) {
    return { error: 'No tienes permisos para cambiar el estado de solicitudes' }
  }

  if (!requestId || !newStatus) {
    return { error: 'Parametros invalidos' }
  }

  if (newStatus === 'issued') {
    return { error: 'Para marcar como facturado debes asignar el UUID de la factura' }
  }

  const supabase = await createClient()

  // 2. Verificar que la solicitud existe y pertenece a una clínica accesible
  const { data: request, error: fetchError } = await supabase
    .from('invoice_requests')
    .select('id, clinic_id, status, correction_count')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    return { error: 'Solicitud no encontrada' }
  }

  // 3. Validar alcance según rol
  if (profile.role !== 'superadmin') {
    if (profile.role === 'accountant') {
      // Accountant solo puede acceder a clínicas asignadas
      const { data: assignment } = await supabase
        .from('clinic_accountants')
        .select('clinic_id')
        .eq('accountant_id', profile.id)
        .eq('clinic_id', request.clinic_id)
        .single()
      if (!assignment) {
        return { error: 'No tienes acceso a esta clinica' }
      }
    } else if (profile.clinic_id !== request.clinic_id) {
      // clinic_admin y reception: solo su clínica
      return { error: 'No tienes acceso a esta solicitud' }
    }
  }

  // 4. Validar transición de estado
  const allowed = ALLOWED_STATUS_TRANSITIONS[request.status] ?? []
  if (!allowed.includes(newStatus)) {
    return {
      error: `Transicion no permitida: ${request.status} -> ${newStatus}`,
    }
  }

  // 5. Aplicar actualización
  const updateData: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'rejected') {
    if (!rejectionReason?.trim()) {
      return { error: 'Ingresa el motivo de correccion para el paciente' }
    }
    const correctionMessage = rejectionReason.trim()
    updateData.rejection_reason = correctionMessage
    updateData.correction_message = correctionMessage
    updateData.correction_requested_at = new Date().toISOString()
    updateData.correction_requested_by = profile.id
    updateData.correction_resolved_at = null
    updateData.correction_count = (request.correction_count ?? 0) + 1
  } else {
    updateData.rejection_reason = null
  }

  const { error } = await supabase
    .from('invoice_requests')
    .update(updateData)
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard')
  return { success: true }
}

// ============================================================
// assignUuidAction
// Valida: sesión, rol (clinic_admin o accountant únicamente),
// alcance de clínica, UUID no vacío, estado previo válido
// ============================================================
export async function assignUuidAction(requestId: string, cfdiUuid: string) {
  // 1. Validar sesión
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'No autenticado' }

  // 2. Validar rol explícito — reception NO puede asignar UUID
  if (!canAssignUuid(profile.role)) {
    return { error: 'No tienes permisos para asignar UUID. Requiere rol clinic_admin o accountant.' }
  }

  // 3. Validar que UUID no esté vacío
  const trimmedUuid = cfdiUuid?.trim()
  if (!trimmedUuid) {
    return { error: 'El UUID no puede estar vacio' }
  }

  const supabase = await createClient()

  // 4. Verificar que la solicitud existe y es accesible
  const { data: request, error: fetchError } = await supabase
    .from('invoice_requests')
    .select('id, clinic_id, status, uuid')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    return { error: 'Solicitud no encontrada' }
  }

  // 5. Validar alcance
  if (profile.role !== 'superadmin') {
    if (profile.role === 'accountant') {
      const { data: assignment } = await supabase
        .from('clinic_accountants')
        .select('clinic_id')
        .eq('accountant_id', profile.id)
        .eq('clinic_id', request.clinic_id)
        .single()
      if (!assignment) {
        return { error: 'No tienes acceso a esta clinica' }
      }
    } else if (profile.clinic_id !== request.clinic_id) {
      return { error: 'No tienes acceso a esta solicitud' }
    }
  }

  // 6. Bloquear si ya tiene UUID asignado (evitar sobreescritura accidental)
  if (request.uuid) {
    return {
      error: `Esta solicitud ya tiene un UUID asignado (${request.uuid}). Contacta a un superadmin para corregirlo.`,
    }
  }

  // 7. Verificar que la solicitud esté en estado apropiado para asignar UUID
  const validStatesForUuid = ['ready_to_invoice']
  if (!validStatesForUuid.includes(request.status)) {
    return {
      error: `No se puede asignar UUID a una solicitud en estado '${request.status}'`,
    }
  }

  // 8. Persistir UUID y actualizar estado a 'issued'
  const { error: updateError } = await supabase
    .from('invoice_requests')
    .update({ uuid: trimmedUuid, status: 'issued' })
    .eq('id', requestId)

  if (updateError) return { error: updateError.message }

  // 9. Crear registro en invoice_documents
  const { error: docError } = await supabase
    .from('invoice_documents')
    .insert({ invoice_request_id: requestId, cfdi_uuid: trimmedUuid })

  if (docError) {
    // No revertir — el UUID ya fue guardado. Solo reportar el error secundario.
    console.error('Error al crear invoice_document: error secundario, UUID ya guardado')
  }

  revalidatePath('/dashboard/requests')
  return { success: true }
}
