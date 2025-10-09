"use client";

import React, { useState } from "react";
import BookAppointmentModal from "./BookAppointmentModal";

interface DoctorBookingCTAProps {
  doctorId: number;
  clinicName?: string;
}

export default function DoctorBookingCTA({ doctorId, clinicName }: DoctorBookingCTAProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
        />
      )}
    </>
  );
}