// Centralized display helpers
export function friendlyHandleFromEmail(email?: string): string | undefined {
  try {
    if (!email) return undefined;
    const handle = email.split('@')[0];
    // Remove "dr" or "doc" prefix, separators, trailing numbers to get a real name
    let cleaned = handle
      .replace(/^(dr|doc)[\._-]?/i, '') // Remove leading "dr" or "doc" prefix
      .replace(/[._-]/g, ' ')  // Replace separators with spaces
      .replace(/\d{3,}/g, '')  // Remove long number sequences (IDs)
      .replace(/^\d+\s*/, '')  // Remove leading numbers
      .trim();
    if (cleaned.length < 2) {
      // Fallback: just clean the handle minimally
      cleaned = handle.replace(/[._-]/g, ' ').replace(/\d{4,}/g, '').trim();
    }
    if (cleaned.length < 2) return undefined;
    // Capitalize first letter of each word
    return cleaned.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  } catch {
    return undefined;
  }
}

export function getDoctorLabel(doc: { email?: string; id?: number; doctorProfile?: { name?: string; slug?: string; clinicName?: string } } | undefined): string {
  if (!doc) return 'Unknown Doctor';
  // Priority: explicit name > clinicName (entered name) > clean from email > fallback
  const name = doc.doctorProfile?.name;
  if (name && name.trim()) return `Dr. ${name.trim()}`;
  
  const clinicName = (doc.doctorProfile as any)?.clinicName;
  if (clinicName && clinicName.trim() && !clinicName.match(/^\d+$/) && clinicName.trim().length >= 2) {
    // clinicName stores the doctor's real name entered during creation
    return `Dr. ${clinicName.trim()}`;
  }
  
  // Extract real name from email as last resort
  const handle = friendlyHandleFromEmail(doc.email);
  if (handle && handle.length >= 2) return `Dr. ${handle}`;
  
  return `Doctor #${doc.id || '?'}`;
}

export function getPatientLabel(patient: { name?: string; slug?: string; email?: string } | undefined, fallback?: string | number): string {
  if (!patient) return typeof fallback !== 'undefined' ? String(fallback) : 'Unknown';
  const handle = friendlyHandleFromEmail(patient.email);
  return patient.name || patient.slug || handle || (typeof fallback !== 'undefined' ? String(fallback) : 'Unknown');
}

export function getUserLabel(user: { role?: string; email?: string } | undefined, opts?: { doctorProfile?: { slug?: string; name?: string }; hospitalProfile?: { general?: { name?: string } } }): string {
  if (!user) return 'Unknown';
  if (user.role === 'HOSPITAL_ADMIN') {
    const hospName = opts?.hospitalProfile?.general?.name;
    return hospName || friendlyHandleFromEmail(user.email) || 'Hospital Admin';
  }
  if (user.role === 'DOCTOR') {
    const docName = opts?.doctorProfile?.name;
    if (docName && docName.trim()) return `Dr. ${docName.trim()}`;
    const handle = friendlyHandleFromEmail(user.email);
    return handle ? `Dr. ${handle}` : 'Doctor';
  }
  return friendlyHandleFromEmail(user.email) || 'User';
}