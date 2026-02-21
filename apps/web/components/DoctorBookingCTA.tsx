"use client";

import React, { useState } from "react";
import BookAppointmentModal from "./BookAppointmentModal";
import { apiClient } from "@/lib/api";

interface DoctorBookingCTAProps {
  doctorId: number;
  clinicName?: string;
}

export default function DoctorBookingCTA({ doctorId, clinicName }: DoctorBookingCTAProps) {
  const [open, setOpen] = useState(false);
  const [prefetchDate, setPrefetchDate] = useState<string | null>(null);

  const todayIST = () => {
    try {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      return fmt.format(now);
    } catch {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    }
  };

  const prefetchToday = async () => {
    try {
      const date = todayIST();
      setPrefetchDate(date);
      const key = `${doctorId}:${date}`;
      const storageKey = `slots_${key}`;
      const [combined, insights] = await Promise.all([
        apiClient.getSlotsAndAvailability({ doctorId, date }).catch(() => null),
        apiClient.getSlotInsights({ doctorId, date }).catch(() => null),
      ]);
      const slotsArr = Array.isArray((combined as any)?.slots) ? (combined as any).slots : [];
      const availability = (insights as any)?.availability || (combined as any)?.availability || null;
      const payload = { slots: slotsArr, availability } as any;
      try { localStorage.setItem(storageKey, JSON.stringify(payload)); } catch {}
      try { localStorage.setItem(`${storageKey}_timestamp`, Date.now().toString()); } catch {}
    } catch {}
  };

  return (
    <>
      <button
        type="button"
        onMouseEnter={prefetchToday}
        onClick={() => { if (!prefetchDate) prefetchToday(); setOpen(true); }}
        className="bg-white text-green-600 font-bold py-4 px-8 rounded-lg text-lg hover:bg-gray-100 transition-all duration-200"
      >
        Book Appointment
      </button>

      {open && (
        <BookAppointmentModal
          open={open}
          onClose={() => setOpen(false)}
          doctorId={doctorId}
          doctorName={clinicName}
          initialDate={prefetchDate ?? undefined}
        />
      )}
    </>
  );
}
