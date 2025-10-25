// Centralized display helpers
export function friendlyHandleFromEmail(email?: string): string | undefined {
  try {
    return email ? email.split('@')[0] : undefined;
  } catch {
    return undefined;
  }
}

export function getDoctorLabel(doc: { email?: string; id?: number; doctorProfile?: { name?: string; slug?: string } } | undefined): string {
  if (!doc) return 'Unknown Doctor';
  const name = doc.doctorProfile?.name;
  const slug = doc.doctorProfile?.slug;
  const handle = friendlyHandleFromEmail(doc.email);
  const idStr = typeof doc.id !== 'undefined' ? String(doc.id) : undefined;
  return name || slug || handle || idStr || 'Unknown Doctor';
}

export function getPatientLabel(patient: { name?: string; slug?: string; email?: string } | undefined, fallback?: string | number): string {
  if (!patient) return typeof fallback !== 'undefined' ? String(fallback) : 'Unknown';
  const handle = friendlyHandleFromEmail(patient.email);
  return patient.name || patient.slug || handle || (typeof fallback !== 'undefined' ? String(fallback) : 'Unknown');
}

export function getUserLabel(user: { role?: string; email?: string } | undefined, opts?: { doctorProfile?: { slug?: string }; hospitalProfile?: { general?: { name?: string } } }): string {
  if (!user) return 'Unknown';
  if (user.role === 'HOSPITAL_ADMIN') {
    const hospName = opts?.hospitalProfile?.general?.name;
    return hospName || friendlyHandleFromEmail(user.email) || 'Hospital Admin';
  }
  if (user.role === 'DOCTOR') {
    const docSlug = opts?.doctorProfile?.slug;
    return docSlug || friendlyHandleFromEmail(user.email) || 'Doctor';
  }
  return friendlyHandleFromEmail(user.email) || 'User';
}