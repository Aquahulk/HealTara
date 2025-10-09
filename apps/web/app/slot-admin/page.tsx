"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Slot = {
  id: number;
  startTime: string;
  endTime: string;
  doctorProfileId?: number | null;
  hospitalId?: number | null;
  status?: string;
};

export default function SlotAdminPanelPage() {
  const [token, setToken] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("slotAdminToken");
    setToken(t);
    if (t) {
      loadSlots(t);
    }
  }, []);

  const loadSlots = async (tkn: string) => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch(`${API_URL}/api/slot-admin/slots`, {
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

  const cancelSlot = async (slotId: number) => {
    if (!token) return;
    try {
      setMessage(null);
      const res = await fetch(`${API_URL}/api/slot-admin/slots/${slotId}/cancel`, {
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
              <p className="text-gray-600 text-sm">Manage slots for assigned doctor or hospital</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/slot-admin/login" className="text-sm text-gray-600 underline">Switch Account</Link>
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {message && (
          <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">{message}</div>
        )}

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
                {slots.map((slot) => (
                  <li key={slot.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm text-gray-700">ID: {slot.id}</div>
                      <div className="text-gray-800">
                        {new Date(slot.startTime).toLocaleString()} → {new Date(slot.endTime).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {slot.doctorProfileId ? `DoctorProfile: ${slot.doctorProfileId}` : ''}
                        {slot.hospitalId ? ` Hospital: ${slot.hospitalId}` : ''}
                        {slot.status ? ` Status: ${slot.status}` : ''}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => cancelSlot(slot.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}