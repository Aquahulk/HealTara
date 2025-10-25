"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import BookAppointmentModal from "@/components/BookAppointmentModal";
import { hospitalMicrositeUrl, shouldUseSubdomainNav } from "@/lib/subdomain";

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
  const router = useRouter();
  const params = useParams();
  const hospitalId = params?.id as string | undefined;

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
          const toTitle = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
          const nameFromSlug = dp?.slug ? toTitle(dp.slug) : '';
          const docName = (profileName && profileName.trim().length > 0)
            ? profileName.trim()
            : (nameFromSlug || link.doctor.email.split('@')[0]);
          const specialization = dp?.specialization || 'Specialist';
          const clinicName = dp?.clinicName || 'Clinic';
          // On hospital pages, redirect doctor details to the hospital microsite
          return (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="text-5xl mb-4">👨‍⚕️</div>
              <h3 className="text-xl font-semibold text-gray-900">Dr. {docName}</h3>
              <p className="text-gray-600 mt-1">{specialization}</p>
              <p className="text-gray-500 mt-1">{clinicName}</p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => openBooking(link.doctor.id)}
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Book
                </button>
                {hospitalId && (
                  <button
                    type="button"
                    onClick={() => {
                      const slug = String(hospitalId);
                      if (shouldUseSubdomainNav()) {
                        window.location.href = hospitalMicrositeUrl(slug);
                      } else {
                        router.push(`/hospital-site/${slug}`);
                      }
                    }}
                    className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold px-4 py-2 rounded-lg"
                  >
                    Visit Website
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && selectedDoctorId && (
        <BookAppointmentModal
          open={showModal}
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