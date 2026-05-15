export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

export function generateWhatsAppMessage(clinicName: string, patientName: string, link: string): string {
  return `Hola ${patientName}, para solicitar tu factura de ${clinicName}, llena tus datos fiscales aqui: ${link}`
}

export function generateGenericWhatsAppMessage(clinicName: string, link: string): string {
  return `Hola, para solicitar tu factura de ${clinicName}, llena tus datos fiscales aqui: ${link}`
}
