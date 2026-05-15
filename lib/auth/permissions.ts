type Role = 'superadmin' | 'clinic_admin' | 'reception' | 'accountant'

export function hasRole(role: Role, required: Role[]): boolean {
  return required.includes(role)
}

export function canExport(role: Role): boolean {
  return ['superadmin', 'clinic_admin', 'accountant'].includes(role)
}

export function canCreateSale(role: Role): boolean {
  return ['superadmin', 'clinic_admin', 'reception'].includes(role)
}

export function canUpdateRequestStatus(role: Role): boolean {
  // reception puede cambiar estado limitado (solo lectura en práctica)
  // pero la validación de transiciones en el action bloquea acciones inválidas
  return ['superadmin', 'clinic_admin', 'accountant'].includes(role)
}

// Nueva: assignUuid requiere rol elevado — reception NO puede asignar UUID
export function canAssignUuid(role: Role): boolean {
  return ['superadmin', 'clinic_admin', 'accountant'].includes(role)
}

export function canViewAllClinics(role: Role): boolean {
  return role === 'superadmin'
}

export function canManageClinicUsers(role: Role): boolean {
  return ['superadmin', 'clinic_admin'].includes(role)
}
