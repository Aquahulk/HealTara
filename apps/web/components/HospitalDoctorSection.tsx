"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, Appointment, DoctorWorkingHours } from '@/lib/api';
import { io } from 'socket.io-client';

interface Props {
  hospitalId: number;
  doctor: { id: number; email: string; doctorProfile?: { slug?: string; specialization?: string } | null };
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HospitalDoctorSection({ hospitalId, doctor }: Props) {
  const doctorId = doctor.id;
  const [hours, setHours] = useState<DoctorWorkingHours[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketReady, setSocketReady] = useState(false);

  const hoursByDay = useMemo(() => {
    const map: Record<number, { startTime: string; endTime: string } | null> = {};
    for (let d = 0; d < 7; d++) map[d] = null;
    hours.forEach(h => { map[h.dayOfWeek] = { startTime: h.startTime, endTime: h.endTime }; });
    return map;
  }, [hours]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [hrs, appts] = await Promise.all([
          apiClient.getHospitalDoctorWorkingHours(hospitalId, doctorId),
          apiClient.getHospitalDoctorAppointments(hospitalId, doctorId),
        ]);
        if (!mounted) return;
        setHours(hrs);
        setAppointments(appts);
      } catch (e: any) {
        setError(e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [hospitalId, doctorId]);

  async function saveHours() {
    try {
      setLoading(true);
      const payload: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
      for (let d = 0; d < 7; d++) {
        const v = hoursByDay[d];
        if (v && v.startTime && v.endTime) {
          payload.push({ dayOfWeek: d, startTime: v.startTime, endTime: v.endTime });
        }
      }
      const updated = await apiClient.setHospitalDoctorWorkingHours(hospitalId, doctorId, payload);
      setHours(updated);
    } catch (e: any) {
      setError(e?.message || 'Failed to save hours');
    } finally {
      setLoading(false);
    }
  }

  async function updateAppointment(apptId: number, changes: { status?: string; date?: string; time?: string }) {
    try {
      setLoading(true);
      const updated = await apiClient.updateHospitalDoctorAppointment(hospitalId, doctorId, apptId, changes);
      setAppointments(prev => prev.map(a => (a.id === apptId ? { ...a, ...updated } : a)));
    } catch (e: any) {
      setError(e?.message || 'Failed to update appointment');
    } finally {
      setLoading(false);
    }
  }

  function setDayTime(day: number, field: 'start' | 'end', value: string) {
    setHours(prev => {
      const byDay = hoursByDay;
      const current = byDay[day] || { startTime: '', endTime: '' };
      const next = { ...current, [field === 'start' ? 'startTime' : 'endTime']: value } as { startTime: string; endTime: string };
      const others = prev.filter(h => h.dayOfWeek !== day);
      const existing = prev.find(h => h.dayOfWeek === day);
      const nextEntry: DoctorWorkingHours = existing
        ? { ...existing, startTime: next.startTime, endTime: next.endTime }
        : { id: 0, doctorProfileId: 0, dayOfWeek: day, startTime: next.startTime, endTime: next.endTime, createdAt: '', updatedAt: '' };
      return [...others, nextEntry].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
  }

  // WebSocket: hospital Socket.IO subscription; prefer sockets, fallback to SSE when disconnected
  useEffect(() => {
    if (!hospitalId) return;
    const s = io(process.env.NEXT_PUBLIC_API_URL || undefined, { transports: ['websocket'] });
    const onUpdate = (updated: any) => {
      try {
        const id = Number(updated?.id);
        const nextStatus = updated?.status;
        const nextDate = updated?.date;
        const nextTime = updated?.time;
        setAppointments(prev => prev.map(a => (
          a.id === id ? { ...a, status: nextStatus ?? a.status, date: nextDate ?? a.date, time: nextTime ?? a.time } : a
        )));
      } catch {}
    };
    const onCancel = (msg: any) => {
      try {
        const id = Number(msg?.id);
        setAppointments(prev => prev.filter(a => a.id !== id));
      } catch {}
    };
    s.on('connect', () => {
      try { s.emit('join-hospital', hospitalId); } catch {}
      setSocketReady(true);
    });
    s.on('appointment-updated', onUpdate);
    s.on('appointment-updated-optimistic', onUpdate);
    s.on('appointment-cancelled', onCancel);
    s.on('disconnect', () => setSocketReady(false));
    return () => {
      setSocketReady(false);
      try {
        s.off('appointment-updated', onUpdate);
        s.off('appointment-updated-optimistic', onUpdate);
        s.off('appointment-cancelled', onCancel);
        s.disconnect();
      } catch {}
    };
  }, [hospitalId]);

  // Realtime: hospital SSE subscription to reflect updates immediately
  useEffect(() => {
    if (!hospitalId || socketReady) return;
    const es = new EventSource(`/api/hospitals/${hospitalId}/appointments/events`);
    const onUpdate = (ev: MessageEvent) => {
      try {
        const updated: any = JSON.parse(ev.data);
        const id = Number(updated?.id);
        const nextStatus = updated?.status;
        const nextDate = updated?.date;
        const nextTime = updated?.time;
        setAppointments(prev => prev.map(a => (
          a.id === id ? { ...a, status: nextStatus ?? a.status, date: nextDate ?? a.date, time: nextTime ?? a.time } : a
        )));
      } catch {}
    };
    const onCancel = (ev: MessageEvent) => {
      try {
        const msg: any = JSON.parse(ev.data);
        const id = Number(msg?.id);
        setAppointments(prev => prev.filter(a => a.id !== id));
      } catch {}
    };
    es.addEventListener('appointment-updated', onUpdate);
    es.addEventListener('appointment-updated-optimistic', onUpdate);
    es.addEventListener('appointment-cancelled', onCancel);
    es.onerror = () => {};
    return () => { es.close(); };
  }, [hospitalId, socketReady]);

  // Cross-tab updates: listen to BroadcastChannel to react to reschedules from other tabs
  useEffect(() => {
    try {
      const ch = new BroadcastChannel('appointments-updates');
      ch.onmessage = (ev) => {
        const msg: any = ev.data;
        if (msg?.type === 'appointment-update') {
          const id = Number(msg?.id);
          const nextStatus = msg?.status;
          setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status: nextStatus ?? a.status } : a)));
        } else if (msg?.type === 'appointment-reschedule') {
          const id = Number(msg?.id);
          const payload = msg?.payload || {};
          const nextDate = payload?.date;
          const nextTime = payload?.time;
          setAppointments(prev => prev.map(a => (a.id === id ? { ...a, date: nextDate ?? a.date, time: nextTime ?? a.time } : a)));
        } else if (msg?.type === 'appointment-cancel') {
          const id = Number(msg?.id);
          setAppointments(prev => prev.filter(a => a.id !== id));
        }
      };
      return () => { ch.close(); };
    } catch {}
  }, []);

  return (
    <div className="border rounded-lg p-6 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{doctor.email}</h3>
          <p className="text-gray-600 text-sm">{doctor.doctorProfile?.specialization || 'Doctor'}</p>
        </div>
        {doctor.doctorProfile?.slug && (
          <a href={`/doctor/${doctor.doctorProfile.slug}`} className="text-blue-600 hover:underline text-sm">View Microsite</a>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
      )}

      {/* Working Hours */}
      <div className="mt-6">
        <h4 className="text-lg font-semibold mb-3">Working Hours</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dayNames.map((name, idx) => {
            const v = hoursByDay[idx] || { startTime: '', endTime: '' };
            return (
              <div key={idx} className="border border-gray-200 rounded p-4 bg-gray-50">
                <div className="font-medium mb-2">{name}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    className="border border-gray-300 rounded px-2 py-1 w-28 bg-white text-gray-900 placeholder-gray-400"
                    value={v.startTime || ''}
                    onChange={(e) => setDayTime(idx, 'start', e.target.value)}
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    className="border border-gray-300 rounded px-2 py-1 w-28 bg-white text-gray-900 placeholder-gray-400"
                    value={v.endTime || ''}
                    onChange={(e) => setDayTime(idx, 'end', e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={saveHours}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Hours'}
        </button>
      </div>

      {/* Appointments */}
      <div className="mt-8">
        <h4 className="text-lg font-semibold mb-3">Bookings</h4>
        <div className="space-y-3">
          {appointments.length === 0 && (
            <div className="text-gray-500">No bookings found.</div>
          )}
          {appointments.map(appt => (
            <div key={appt.id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Patient: {appt.patient?.email || appt.patientId}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1"
                  defaultValue={appt.status}
                  onChange={(e) => updateAppointment(appt.id, { status: e.target.value })}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                {/* Simple reschedule: change time */}
                <input
                  type="time"
                  className="border rounded px-2 py-1"
                  defaultValue={appt.date ? new Date(appt.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                  onBlur={(e) => updateAppointment(appt.id, { time: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}