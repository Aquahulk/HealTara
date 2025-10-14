"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Doctor } from "@/lib/api";
import { useRouter } from "next/navigation";
import { hospitalMicrositeUrl, doctorMicrositeUrl, hospitalIdMicrositeUrl, shouldUseSubdomainNav, slugifyName } from "@/lib/subdomain";

interface DoctorGridCardProps {
  doctor: Doctor;
  onBookAppointment?: () => void;
}

export default function DoctorGridCard({ doctor, onBookAppointment }: DoctorGridCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Track a view when the card becomes visible
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    let fired = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!fired && entry.isIntersecting) {
          fired = true;
          import("@/lib/api").then(({ apiClient }) => {
            apiClient.trackDoctorView(doctor.id).catch(() => {});
          });
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [doctor.id]);
  const profile = doctor.doctorProfile;
  const emailName = (doctor?.email || "").split("@")[0];
  const clinicName = profile?.clinicName || "Clinic";
  const specialization = profile?.specialization || "Specialist";
  const fee = profile?.consultationFee;
  const city = profile?.city;
  const state = profile?.state;
  const slug = profile?.slug;

  const toTitle = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  const displayName = slug ? toTitle(slug) : emailName;

  return (
    <div ref={cardRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-3xl">👨‍⚕️</div>
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900">Dr. {displayName}</h3>
            <p className="text-sm text-gray-600">{clinicName}</p>
            <p className="text-sm text-gray-600 mt-1">{specialization}</p>
            <p className="text-sm text-gray-500 mt-1">
              {city && state ? `${city}, ${state}` : city || state || ""}
            </p>
            {typeof fee === "number" && (
              <p className="text-sm text-gray-700 mt-2">Consultation Fee: ₹{fee}</p>
            )}
          </div>
        </div>

        {/* Meta badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {specialization && (
            <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">{specialization}</span>
          )}
          {city && (
            <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">{city}</span>
          )}
          {typeof fee === "number" && (
            <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">₹{fee}</span>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 flex gap-3">
        {slug ? (
          <Link
            href={`/site/${slug}`}
            className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 rounded-lg transition-colors"
            onClick={(e) => {
              if (shouldUseSubdomainNav()) {
                e.preventDefault();
                window.location.href = doctorMicrositeUrl(slug);
              }
              import("@/lib/api").then(({ apiClient }) => {
                apiClient.trackDoctorClick(doctor.id, 'site').catch(() => {});
              });
            }}
          >
            View Details
          </Link>
        ) : (
          <button
            className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 rounded-lg transition-colors"
            onClick={() => {
              import("@/lib/api").then(({ apiClient }) => {
                apiClient
                  .getHospitalByDoctorId(doctor.id)
                  .then((resp) => {
                    const name = resp?.hospital?.name || '';
                    if (name) {
                      if (shouldUseSubdomainNav()) {
                        window.location.href = hospitalMicrositeUrl(name);
                      } else {
                        router.push(`/hospital-site/${slugifyName(name)}`);
                      }
                    } else {
                      if (shouldUseSubdomainNav()) {
                        window.location.href = hospitalIdMicrositeUrl(resp.hospitalId);
                      } else {
                        router.push(`/hospital-site/${String(resp.hospitalId)}`);
                      }
                    }
                  })
                  .catch(() => {
                    // silently ignore if no hospital link
                  });
              });
            }}
          >
            View Details
          </button>
        )}
        {onBookAppointment ? (
          <button
            onClick={() => {
              onBookAppointment();
              import("@/lib/api").then(({ apiClient }) => {
                apiClient.trackDoctorClick(doctor.id, 'book').catch(() => {});
              });
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Book Now
          </button>
        ) : (
          <div className="flex-1 text-center bg-gray-100 text-gray-400 font-medium py-2 rounded-lg cursor-not-allowed">
            Book
          </div>
        )}
      </div>
    </div>
  );
}