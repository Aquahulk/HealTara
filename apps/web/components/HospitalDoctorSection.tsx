"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, Appointment, DoctorWorkingHours } from '@/lib/api';

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
              <div key={idx} className="border rounded p-4">
                <div className="font-medium mb-2">{name}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    className="border rounded px-2 py-1 w-28"
                    value={v.startTime || ''}
                    onChange={(e) => setDayTime(idx, 'start', e.target.value)}
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    className="border rounded px-2 py-1 w-28"
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
                <div className="font-medium">{new Date(appt.date).toLocaleString()} • {appt.time}</div>
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
                  defaultValue={appt.time}
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