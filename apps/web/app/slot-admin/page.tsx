"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = ""; // use relative URLs with Next.js dev rewrites

 type Slot = {
   id: number;
   date: string;   // YYYY-MM-DD
   time: string;   // HH:mm
   doctorProfileId?: number | null;
   hospitalId?: number | null;
   status?: string;
 };

type Appointment = {
  id: number;
  date: string;
  status: string;
  reason?: string;
  doctorId?: number;
  patientId?: number;
  doctor?: { id: number; email: string };
  patient?: { id: number; email: string };
  time?: string;
};

type DoctorTimeOff = {
  id: number;
  doctorProfileId: number;
  start: string;
  end: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
};

export default function SlotAdminPanelPage() {
  const [token, setToken] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('');
  const [hospitalName, setHospitalName] = useState<string>('');
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [doctorProfileId, setDoctorProfileId] = useState<number | null>(null);
  const [doctorOptions, setDoctorOptions] = useState<Array<{ id: number; email: string; doctorProfileId: number }>>([]);
  const [timeOff, setTimeOff] = useState<DoctorTimeOff[]>([]);
  const [timeOffStart, setTimeOffStart] = useState<string>("");
  const [timeOffEnd, setTimeOffEnd] = useState<string>("");
  const [timeOffReason, setTimeOffReason] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStart, setEditStart] = useState<string>('');
  const [editEnd, setEditEnd] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<Array<{ dayOfWeek: number; start: string | null; end: string | null }>>([]);
  const [hoursInputs, setHoursInputs] = useState<Record<number, { start: string; end: string }>>({
    0: { start: "09:00", end: "17:00" },
    1: { start: "09:00", end: "17:00" },
    2: { start: "09:00", end: "17:00" },
    3: { start: "09:00", end: "17:00" },
    4: { start: "09:00", end: "17:00" },
    5: { start: "10:00", end: "14:00" },
    6: { start: "", end: "" },
  });

  useEffect(() => {
    const t = localStorage.getItem("slotAdminToken");
    setToken(t);
    if (t) {
      // Load context first so header shows correct doctor/hospital even with no appointments
      loadContext(t);
      loadSlots(t);
      loadAppointments(t);
    }
  }, []);

  const loadContext = async (tkn: string) => {
    try {
      const res = await fetch(`/api/slot-admin/context`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) {
        // Do not surface as error banner; keep header fallback graceful
        return;
      }
      const data = await res.json();
      const doc = data?.doctor as { id: number; email: string; doctorProfileId?: number } | null;
      const hosp = data?.hospital as { id: number; name: string } | null;
      if (doc) {
        setDoctorId(doc.id);
        if (typeof doc.doctorProfileId === 'number') setDoctorProfileId(doc.doctorProfileId);
        const derivedName = doc.email ? doc.email.split('@')[0] : `Doctor ${doc.id}`;
        setDoctorName(derivedName);
      }
      if (hosp) {
        setHospitalName(hosp.name || '');
        // If hospital-managed and doctor is not set, load doctors in scope for selection
        if (!doc) {
          await loadDoctors(tkn);
        }
      }
      // After context, load time-off and working hours for selected doctorProfileId (if any)
      if (doctorProfileId) {
        await loadTimeOff(tkn, doctorProfileId);
        await loadWorkingHours(tkn, doctorProfileId);
      }
    } catch {
      // ignore
    }
  };

  const loadDoctors = async (tkn: string) => {
    try {
      const res = await fetch(`/api/slot-admin/doctors`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list)) {
        setDoctorOptions(list);
        // Auto-select single doctor
        if (list.length === 1) {
          setDoctorProfileId(list[0].doctorProfileId);
          setDoctorId(list[0].id);
          const derivedName = list[0].email ? list[0].email.split('@')[0] : `Doctor ${list[0].id}`;
          setDoctorName(derivedName);
        }
      }
    } catch {
      // ignore
    }
  };

  const loadSlots = async (tkn: string) => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch(`/api/slot-admin/slots`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to load slots" }));
        throw new Error(err.message || "Failed to load slots");
      }
      const data = await res.json();
      setSlots(data?.slots || data || []);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load slots");
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async (tkn: string) => {
    try {
      const res = await fetch(`/api/slot-admin/appointments`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to load appointments" }));
        throw new Error(err.message || "Failed to load appointments");
      }
      const data = await res.json();
      const items = Array.isArray(data) ? data : data?.appointments || [];
      setAppointments(items);
      // As a fallback, derive doctor/hospital context from first appointment if header is still empty
      if ((!doctorId || !doctorName || !hospitalName) && items && items.length > 0) {
        const first = items[0];
        const docId = (first.doctorId || first.doctor?.id) as number | undefined;
        if (docId && Number.isInteger(docId)) {
          setDoctorId((prev) => prev ?? docId);
          const email = first.doctor?.email || '';
          const derivedName = email ? email.split('@')[0] : `Doctor ${docId}`;
          setDoctorName((prev) => prev || derivedName);
          try {
            const hres = await fetch(`/api/hospitals/by-doctor/${docId}`);
            if (hres.ok) {
              const hjson = await hres.json();
              if (!hospitalName) setHospitalName(hjson?.hospital?.name || '');
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to load appointments");
    }
  };

  const loadWorkingHours = async (tkn: string, dpid?: number) => {
    try {
      const qs = dpid ? `?doctorProfileId=${dpid}` : '';
      const res = await fetch(`/api/slot-admin/working-hours${qs}`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) return; // keep UI graceful if not configured
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.workingHours || [];
      setWorkingHours(list);
      const nextInputs: Record<number, { start: string; end: string }> = { ...hoursInputs };
      list.forEach((wh: any) => {
        if (typeof wh.dayOfWeek === 'number') {
          nextInputs[wh.dayOfWeek] = {
            start: wh.start ? wh.start.slice(0,5) : "",
            end: wh.end ? wh.end.slice(0,5) : "",
          };
        }
      });
      setHoursInputs(nextInputs);
    } catch {
      // ignore
    }
  };

  const loadTimeOff = async (tkn: string, dpid?: number) => {
    try {
      const qs = dpid ? `?doctorProfileId=${dpid}` : '';
      const res = await fetch(`/api/slot-admin/time-off${qs}`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to load time-off" }));
        throw new Error(err.message || "Failed to load time-off");
      }
      const data = await res.json();
      setTimeOff(Array.isArray(data) ? data : data?.timeOff || data || []);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load time-off");
    }
  };

  const cancelSlot = async (slotId: number) => {
    if (!token) return;
    try {
      setMessage(null);
      const res = await fetch(`/api/slot-admin/slots/${slotId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: "Cancelled by Slot Admin" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to cancel slot" }));
        throw new Error(err.message || "Failed to cancel slot");
      }
      // Refresh slots after cancellation
      await loadSlots(token);
      setMessage("Slot cancelled successfully");
    } catch (e: any) {
      setMessage(e?.message || "Failed to cancel slot");
    }
  };

  // Broadcast channel to sync updates across dashboards
  const [bc, setBc] = useState<BroadcastChannel | null>(null);
  useEffect(() => {
    const channel = new BroadcastChannel('appointments-updates');
    setBc(channel);
    channel.onmessage = (ev) => {
      const msg = ev.data as any;
      if (msg?.type === 'appointment-update') {
        setAppointments((prev) => prev.map((a) => (a.id === msg.id ? { ...a, status: msg.status } : a)));
      } else if (msg?.type === 'appointment-cancel') {
        setAppointments((prev) => prev.filter((a) => a.id !== msg.id));
      }
    };
    return () => channel.close();
  }, []);

  const updateAppointmentStatus = async (id: number, status: string) => {
    if (!token) return;
    try {
      setMessage(null);
      // Optimistically update local state to reflect change immediately
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      bc?.postMessage({ type: 'appointment-update', id, status });

      // Use correct endpoint to update status server-side
      const res = await fetch(`/api/slot-admin/appointments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to update appointment' }));
        throw new Error(err.message || 'Failed to update appointment');
      }
      setMessage('Appointment updated');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update appointment');
    }
  };

  const cancelAppointment = async (id: number) => {
    if (!token) return;
    try {
      setMessage(null);
      // Optimistically remove appointment locally to avoid reload delays
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      bc?.postMessage({ type: 'appointment-cancel', id });

      // Use correct endpoint to cancel server-side
      const res = await fetch(`/api/slot-admin/appointments/${id}/cancel`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: 'Cancelled by slot admin' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to cancel appointment' }));
        throw new Error(err.message || 'Failed to cancel appointment');
      }
      setMessage('Appointment cancelled');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to cancel appointment');
    }
  };

  const saveWorkingHours = async () => {
    if (!token) return;
    if (!doctorProfileId && hospitalName) {
      setMessage('Please select a doctor to set timing.');
      return;
    }
    try {
      setMessage(null);
      const payload = Object.keys(hoursInputs).map((k) => {
        const day = Number(k);
        const { start, end } = hoursInputs[day];
        return { dayOfWeek: day, start: start ? `${start}:00` : null, end: end ? `${end}:00` : null };
      });
      const qs = doctorProfileId ? `?doctorProfileId=${doctorProfileId}` : '';
      const res = await fetch(`/api/slot-admin/working-hours${qs}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workingHours: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to save working hours' }));
        throw new Error(err.message || 'Failed to save working hours');
      }
      await loadWorkingHours(token, doctorProfileId ?? undefined);
      setMessage('Doctor timing saved');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save working hours');
    }
  };

  const createTimeOff = async () => {
    if (!token) return;
    if (!timeOffStart || !timeOffEnd) {
      setMessage("Please select start and end time for time-off");
      return;
    }
    // Hospital-managed admins must choose a doctor
    if (!doctorProfileId && !doctorId && hospitalName) {
      setMessage("Please select a doctor to create time-off.");
      return;
    }
    try {
      setMessage(null);
      const res = await fetch(`/api/slot-admin/time-off`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ start: new Date(timeOffStart).toISOString(), end: new Date(timeOffEnd).toISOString(), reason: timeOffReason || undefined, doctorProfileId: doctorProfileId ?? undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create time-off" }));
        throw new Error(err.message || "Failed to create time-off");
      }
      setTimeOffStart("");
      setTimeOffEnd("");
      setTimeOffReason("");
      await loadTimeOff(token, doctorProfileId ?? undefined);
      setMessage("Time-off created successfully");
    } catch (e: any) {
      setMessage(e?.message || "Failed to create time-off");
    }
  };

  const deleteTimeOff = async (id: number) => {
    if (!token) return;
    try {
      setMessage(null);
      const res = await fetch(`/api/slot-admin/time-off/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to delete time-off" }));
        throw new Error(err.message || "Failed to delete time-off");
      }
      await loadTimeOff(token);
      setMessage("Time-off deleted successfully");
    } catch (e: any) {
      setMessage(e?.message || "Failed to delete time-off");
    }
  };

  const startEditTimeOff = (t: DoctorTimeOff) => {
    setEditingId(t.id);
    // Convert ISO to local datetime-local format yyyy-MM-ddTHH:mm
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const da = pad(d.getDate());
      const h = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${y}-${m}-${da}T${h}:${mi}`;
    };
    setEditStart(toLocal(t.start));
    setEditEnd(toLocal(t.end));
    setEditReason(t.reason || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditStart('');
    setEditEnd('');
    setEditReason('');
  };

  const updateTimeOff = async () => {
    if (!token || editingId === null) return;
    if (!editStart || !editEnd) {
      setMessage('Please set both start and end.');
      return;
    }
    try {
      setMessage(null);
      const res = await fetch(`/api/slot-admin/time-off/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ start: new Date(editStart).toISOString(), end: new Date(editEnd).toISOString(), reason: editReason || undefined })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to update time-off' }));
        throw new Error(err.message || 'Failed to update time-off');
      }
      await loadTimeOff(token);
      cancelEdit();
      setMessage('Time-off updated successfully');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update time-off');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("slotAdminToken");
    setToken(null);
    setSlots([]);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-6 text-center">
          <div className="text-5xl mb-2">🕒</div>
          <h1 className="text-2xl font-bold text-gray-800">Slot Admin Panel</h1>
          <p className="text-gray-600 mb-4">Please log in to manage slots.</p>
          <Link href="/slot-admin/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg inline-block">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🕒</div>
            <div>
              <h1 className="text-xl font-semibold">Slot Admin Panel</h1>
              <p className="text-gray-600 text-sm">Manage slots for assigned doctor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/slot-admin/login" className="text-sm text-gray-600 underline">Switch Account</Link>
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Logout</button>
          </div>
        </div>
        {/* Context bar */}
        <div className="max-w-6xl mx-auto px-4 pb-4 text-sm text-gray-700">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div><span className="font-semibold">Doctor:</span> {doctorName ? `Dr. ${doctorName}` : 'Unknown'}</div>
              {doctorId && <div className="text-xs text-gray-500">ID: {doctorId}</div>}
            </div>
            <div>
              <div><span className="font-semibold">Hospital:</span> {hospitalName || 'Unknown'}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {message && (
          <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">{message}</div>
        )}

        {/* Appointments for managed doctor */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Doctor Appointments</h2>
              <button onClick={() => token && loadAppointments(token)} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Refresh</button>
            </div>
            {/* Filters */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">From date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">To date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex items-end">
                <button onClick={() => { setStatusFilter(''); setFromDate(''); setToDate(''); }} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded">Clear</button>
              </div>
            </div>
          </div>
          <div className="p-6">
            {appointments.length === 0 ? (
              <div className="text-center text-gray-600">No appointments found.</div>
            ) : (
              <ul className="divide-y">
                {appointments
                  .filter((a) => {
                    const okStatus = statusFilter ? a.status === statusFilter : true;
                    const dt = new Date(a.date);
                    const okFrom = fromDate ? dt >= new Date(`${fromDate}T00:00:00`) : true;
                    const okTo = toDate ? dt <= new Date(`${toDate}T23:59:59`) : true;
                    return okStatus && okFrom && okTo;
                  })
                  .map((a) => (
                  <li key={a.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm text-gray-700">ID: {a.id}</div>
                      <div className="text-gray-800">{new Date(a.date).toLocaleString()} — <span className="uppercase text-xs bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{a.status}</span></div>
                      <div className="text-sm text-gray-600">{a.reason || "No reason provided"}</div>
                      <div className="text-sm text-gray-600">Patient: {a.patient?.email || a.patientId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateAppointmentStatus(a.id, 'CONFIRMED')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded">Confirm</button>
                      <button onClick={() => updateAppointmentStatus(a.id, 'COMPLETED')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded">Complete</button>
                      <button onClick={() => cancelAppointment(a.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded">Cancel</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Time-Off (Blackout) management */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Doctor Time-Off (Booking Stopper)</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Create Time-Off</h3>
              <div className="space-y-3">
                {/* Doctor selector for hospital-managed admins */}
                {doctorOptions.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Doctor</label>
                    <select
                      value={doctorProfileId ?? ''}
                      onChange={async (e) => {
                        const val = Number(e.target.value);
                        if (Number.isInteger(val) && val > 0) {
                          setDoctorProfileId(val);
                          if (token) await loadTimeOff(token, val);
                          const found = doctorOptions.find(d => d.doctorProfileId === val);
                          if (found) {
                            setDoctorId(found.id);
                            const derivedName = found.email ? found.email.split('@')[0] : `Doctor ${found.id}`;
                            setDoctorName(derivedName);
                          }
                        } else {
                          setDoctorProfileId(null);
                        }
                      }}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select a doctor</option>
                      {doctorOptions.map((d) => (
                        <option key={d.doctorProfileId} value={d.doctorProfileId}>Dr. {d.email.split('@')[0]} (ID: {d.id})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Start</label>
                  <input type="datetime-local" value={timeOffStart} onChange={(e) => setTimeOffStart(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">End</label>
                  <input type="datetime-local" value={timeOffEnd} onChange={(e) => setTimeOffEnd(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Reason (optional)</label>
                  <input type="text" value={timeOffReason} onChange={(e) => setTimeOffReason(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="e.g., Conference, Leave" />
                </div>
                <div>
                  <button onClick={createTimeOff} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Add Time-Off</button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Appointments cannot be booked within these time ranges.</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Existing Time-Off</h3>
              {timeOff.length === 0 ? (
                <div className="text-gray-600">No time-off set.</div>
              ) : (
                <ul className="divide-y">
                  {timeOff.map((t) => (
                    <li key={t.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm text-gray-700">ID: {t.id}</div>
                        <div className="text-gray-800">{new Date(t.start).toLocaleString()} → {new Date(t.end).toLocaleString()}</div>
                        <div className="text-sm text-gray-600">{t.reason || "No reason provided"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEditTimeOff(t)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg">Edit</button>
                        <button onClick={() => deleteTimeOff(t.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Delete</button>
                      </div>
                      {editingId === t.id && (
                        <div className="mt-3 w-full">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Start</label>
                              <input type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">End</label>
                              <input type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Reason</label>
                              <input type="text" value={editReason} onChange={(e) => setEditReason(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={updateTimeOff} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                            <button onClick={cancelEdit} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg">Cancel</button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Assigned Slots</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center text-gray-600">Loading slots...</div>
            ) : slots.length === 0 ? (
              <div className="text-center text-gray-600">No slots available in your scope.</div>
            ) : (
              <ul className="divide-y">
                {slots.map((slot) => {
                  const slotStart = new Date(`${slot.date}T${String(slot.time).slice(0,5)}:00`);
                  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                  const inSlot = appointments.filter((a) => {
                    const t = new Date(a.date).getTime();
                    return t >= slotStart.getTime() && t <= slotEnd.getTime();
                  });
                  // Availability check based on configured working hours
                  const dayIdx = slotStart.getDay();
                  const wh = hoursInputs[dayIdx];
                  const hasTiming = wh && wh.start && wh.end;
                  const within = (() => {
                    if (!hasTiming) return true; // if not configured, don't block
                    const toMin = (t: string) => {
                      const [hh, mm] = t.split(':').map(Number);
                      return hh * 60 + mm;
                    };
                    const startMin = slotStart.getHours() * 60 + slotStart.getMinutes();
                    const endMin = startMin + 60;
                    const whStart = toMin(wh.start);
                    const whEnd = toMin(wh.end);
                    return startMin >= whStart && endMin <= whEnd;
                  })();
                  return (
                    <li key={slot.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-mono text-sm text-gray-700">Slot #{slot.id}</div>
                        <div className="text-gray-800">
                          {slotStart.toLocaleString()} → {slotEnd.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {slot.doctorProfileId ? `DoctorProfile: ${slot.doctorProfileId}` : ''}
                          {slot.hospitalId ? ` Hospital: ${slot.hospitalId}` : ''}
                          {slot.status ? ` Status: ${slot.status}` : ''}
                        </div>
                        {hasTiming && !within && (
                          <div className="mb-2 inline-block px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">Not available</div>
                        )}
                        {inSlot.length > 0 ? (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Bookings in this slot</div>
                            <ul className="space-y-2">
                              {inSlot.map((a) => (
                                <li key={a.id} className="border border-gray-200 rounded px-3 py-2 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm text-gray-800">Appt #{a.id} — {new Date(a.date).toLocaleTimeString()}</div>
                                    <div className="text-xs text-gray-600">Patient: {a.patient?.email || a.patientId} • Status: {a.status}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => updateAppointmentStatus(a.id, 'CONFIRMED')} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded">Confirm</button>
                                    <button onClick={() => updateAppointmentStatus(a.id, 'COMPLETED')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-2 rounded">Complete</button>
                                    <button onClick={() => cancelAppointment(a.id)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded">Cancel</button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No bookings in this slot.</div>
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() => cancelSlot(slot.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
                        >
                          Cancel Slot
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Doctor Timing */}
        <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Doctor Timing</h2>
            <button onClick={() => token && loadWorkingHours(token, doctorProfileId ?? undefined)} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Refresh</button>
          </div>
          <div className="p-6">
            {/* Doctor selector for hospital-managed admins */}
            {doctorOptions.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-1">Doctor</label>
                <select
                  value={doctorProfileId ?? ''}
                  onChange={async (e) => {
                    const val = Number(e.target.value);
                    if (Number.isInteger(val) && val > 0) {
                      setDoctorProfileId(val);
                      if (token) await loadWorkingHours(token, val);
                      const found = doctorOptions.find(d => d.doctorProfileId === val);
                      if (found) {
                        setDoctorId(found.id);
                        const derivedName = found.email ? found.email.split('@')[0] : `Doctor ${found.id}`;
                        setDoctorName(derivedName);
                      }
                    } else {
                      setDoctorProfileId(null);
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select a doctor</option>
                  {doctorOptions.map((d) => (
                    <option key={d.doctorProfileId} value={d.doctorProfileId}>Dr. {d.email.split('@')[0]} (ID: {d.id})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day, idx) => (
                <div key={idx} className="border rounded p-3">
                  <div className="font-medium mb-2">{day}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start</label>
                      <input type="time" value={hoursInputs[idx]?.start ?? ''} onChange={(e) => setHoursInputs((prev) => ({ ...prev, [idx]: { start: e.target.value, end: prev[idx]?.end ?? '' } }))} className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End</label>
                      <input type="time" value={hoursInputs[idx]?.end ?? ''} onChange={(e) => setHoursInputs((prev) => ({ ...prev, [idx]: { start: prev[idx]?.start ?? '', end: e.target.value } }))} className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button onClick={saveWorkingHours} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Save Timing</button>
            </div>
            <p className="text-xs text-gray-500 mt-2">These hours define when bookings are allowed, per day.</p>
          </div>
        </div>
      </main>
    </div>
  );
}