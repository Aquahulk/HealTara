export async function prefetchDoctorToday(doctorId: number) {
  try {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const date = `${yyyy}-${mm}-${dd}`;
    const qs = new URLSearchParams({ doctorId: String(doctorId), date }).toString();
    const resp = await fetch(`/api/slots/availability?${qs}`, { cache: 'no-store' });
    if (!resp.ok) return;
    const data = await resp.json().catch(() => null);
    if (!data) return;
    const key = `${doctorId}:${date}`;
    const localStorageKey = `slots_${key}`;
    try {
      const payload = { slots: Array.isArray(data.slots) ? data.slots : [], availability: data.availability || null };
      localStorage.setItem(localStorageKey, JSON.stringify(payload));
      localStorage.setItem(`${localStorageKey}_timestamp`, Date.now().toString());
    } catch {}
  } catch {}
}

