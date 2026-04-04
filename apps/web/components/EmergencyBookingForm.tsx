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
    <div className="bg-white shadow rounded-3xl p-6 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">Emergency Booking</h3>
      <p className="text-gray-600 mb-4">Select a doctor and submit an emergency booking. Our admin team will allocate the earliest available slot.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Doctor</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900"
            value={doctorId ?? ""}
            onChange={(e) => setDoctorId(Number(e.target.value) || null)}
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.doctor?.email || d.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reason (optional)</label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Describe the emergency briefly"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-600">{success}</div>}
        <button
          type="submit"
          disabled={submitting || !doctorId}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Book Emergency"}
        </button>
      </form>
    </div>
  );
}
