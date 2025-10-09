"use client";

import React, { useState } from "react";
import BookAppointmentModal from "@/components/BookAppointmentModal";

interface DoctorProfileLite {
  slug?: string;
  specialization?: string;
  clinicName?: string;
}

interface HospitalDoctorLinkProps {
  doctors: Array<{
    doctor: {
      id: number;
      email: string;
      doctorProfile?: DoctorProfileLite | null;
    };
    department?: { id: number; name: string } | null;
  }>;
  // Optional: doctors listed in the hospital profile JSON, may include a doctorId once linked
  profileDoctors?: Array<{ doctorId?: number; name?: string }>;
}

export default function HospitalDoctorsRoster({ doctors, profileDoctors }: HospitalDoctorLinkProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  const openBooking = (doctorId: number) => {
    setSelectedDoctorId(doctorId);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDoctorId(null);
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {doctors.map((link, idx) => {
          const dp = link.doctor.doctorProfile || undefined;
          const profileName = profileDoctors?.find(pd => pd.doctorId === link.doctor.id)?.name;
          const docName = (profileName && profileName.trim().length > 0)
            ? profileName.trim()
            : link.doctor.email.split('@')[0];
          const specialization = dp?.specialization || 'Specialist';
          const clinicName = dp?.clinicName || 'Clinic';
          const slug = dp?.slug;
          const siteHref = slug ? `/site/${slug}` : undefined;
          return (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="text-5xl mb-4">👨‍⚕️</div>
              <h3 className="text-xl font-semibold text-gray-900">Dr. {docName}</h3>
              <p className="text-gray-600 mt-1">{specialization}</p>
              <p className="text-gray-500 mt-1">{clinicName}</p>
              <div className="mt-4 flex gap-3">
                {siteHref ? (
                  <a href={siteHref} className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">
                    View Site
                  </a>
                ) : (
                  <span className="inline-block bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg">Profile Coming Soon</span>
                )}
                <button
                  onClick={() => openBooking(link.doctor.id)}
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Book
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && selectedDoctorId && (
        <BookAppointmentModal
          doctorId={selectedDoctorId}
          doctorName={`Dr. ${(() => {
            const link = doctors.find(d => d.doctor.id === selectedDoctorId);
            const fromProfile = profileDoctors?.find(pd => pd.doctorId === selectedDoctorId)?.name;
            const fallback = link?.doctor.email.split('@')[0] || '';
            return (fromProfile && fromProfile.trim().length > 0) ? fromProfile.trim() : fallback;
          })()}`}
          onClose={closeModal}
        />
      )}
    </div>
  );
}