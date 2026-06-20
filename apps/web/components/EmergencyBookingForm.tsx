"use client";

import React, { useState } from "react";
import { apiClient, Doctor } from "@/lib/api";

export default function EmergencyBookingForm({ doctors }: { doctors: Array<{ id: number; email: string; doctor?: Doctor }>} ) {
  const [doctorId, setDoctorId] = useState<number | null>(doctors[0]?.id || null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const token = apiClient.getToken();
    if (!token) { setError("Please login to book an emergency appointment."); return; }
    if (!doctorId) { setError("Please select a doctor."); return; }
    try {
      setSubmitting(true);
      await apiClient.bookEmergencyAppointment({ doctorId, reason: reason || undefined });
      setSuccess("Emergency booking submitted. Admin will assign a slot.");
      setReason("");
    } catch (err: any) {
      setError(err?.message || "Failed to submit emergency booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-3">
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-gray-600 mb-1">Doctor</label>
        <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white" value={doctorId ?? ""} onChange={(e) => setDoctorId(Number(e.target.value) || null)}>
          {doctors.map((d) => {
            const email = d.doctor?.email || d.email;
            const handle = email.split('@')[0].replace(/[\-_\.]+/g, ' ').replace(/\d{5,}/g, '').trim();
            return <option key={d.id} value={d.id}>Dr. {handle.charAt(0).toUpperCase() + handle.slice(1)}</option>;
          })}
        </select>
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
        <input type="text" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Describe briefly" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <button type="submit" disabled={submitting || !doctorId} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 whitespace-nowrap flex-shrink-0">
        {submitting ? "Sending..." : "🚨 Book Emergency"}
      </button>
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
      {success && <p className="text-xs text-green-600 w-full">{success}</p>}
    </form>
  );
}
