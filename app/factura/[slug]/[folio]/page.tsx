import { notFound } from 'next/navigation'

// DEPRECATED: Esta ruta fue reemplazada por /factura/[slug]/v/[token]
// El folio secuencial es enumerable y expone datos sensibles.
// Cualquier acceso aqui redirige a notFound.
export default async function DeprecatedFolioPage() {
  notFound()
}
