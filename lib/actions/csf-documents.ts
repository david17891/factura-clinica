'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'

export async function createCsfDocumentSignedUrlAction(documentId: string) {
  const profile = await getCurrentProfile()
  if (!profile) {
    return { error: 'No autenticado' }
  }

  if (!documentId) {
    return { error: 'Documento inválido' }
  }

  const supabase = await createClient()
  const { data: document, error: documentError } = await supabase
    .from('invoice_request_csf_documents')
    .select('id, storage_path')
    .eq('id', documentId)
    .single()

  if (documentError || !document) {
    return { error: 'Constancia no encontrada o sin permisos' }
  }

  const { data, error } = await supabase.storage
    .from('csf-documents')
    .createSignedUrl(document.storage_path as string, 60)

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? 'No se pudo generar el acceso temporal' }
  }

  return { url: data.signedUrl }
}
