"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Doctor, API_BASE_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import SaveButton from "@/components/SaveButton";
// Subdomain helpers for name-only microsite URLs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { hospitalMicrositeUrl, doctorMicrositeUrl, hospitalIdMicrositeUrl, shouldUseSubdomainNav, slugifyName, customSubdomainUrl } from "@/lib/subdomain";

interface DoctorOyoCardProps {
  doctor: Doctor;
  onBookAppointment?: () => void;
  // Optional: current search query to tie clicks to analytics
  searchQuery?: string;
}

// OYO-style horizontal listing card: image left, details middle, price/actions right
export default function DoctorOyoCard({ doctor, onBookAppointment, searchQuery }: DoctorOyoCardProps) {
  const router = useRouter();
  const profile = doctor.doctorProfile;
  const emailName = (doctor?.email || "").split("@")[0];
  const clinicName = profile?.clinicName || "Clinic";
  const specialization = profile?.specialization || "Specialist";
  const fee = profile?.consultationFee;
  const city = profile?.city;
  const state = profile?.state;
  const slug = profile?.slug;

  // Prefer a human-friendly name derived from slug; fall back to email handle
  const toTitle = (s: string) => s.replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  const displayName = slug ? toTitle(slug) : emailName;

  const location = city && state ? `${city}, ${state}` : city || state || "";

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

  return (
    <div ref={cardRef} className="bg-white rounded-lg border border-gray-200 shadow-sm p-2 md:p-3 relative max-w-4xl mx-auto">
      <div className="absolute top-1 right-1 z-10 scale-90">
        <SaveButton entityType="doctor" entityId={doctor.id} />
      </div>
      <div className="flex flex-col md:flex-row gap-2 md:gap-3">
        {/* Image / avatar - Smaller on mobile */}
        <div className="w-full h-24 md:w-28 md:h-24 rounded-lg bg-gray-100 flex items-center justify-center text-2xl md:text-3xl shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div>👨‍⚕️</div>
        </div>

        {/* Middle details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 flex-wrap">
            <h3 className="text-sm md:text-base font-bold text-gray-900">Dr. {displayName}</h3>
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-bold">Verified</span>
          </div>
          <div className="text-[10px] md:text-xs text-gray-700 mt-0.5 font-medium">{clinicName}</div>
          <div className="text-[10px] md:text-xs text-blue-600 mt-0.5 font-bold">{specialization}</div>
          {location && <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            {location}
          </div>}
          
          {/* facilities / tags - Compact on mobile */}
          <div className="mt-1.5 md:mt-2 flex flex-wrap gap-1 md:gap-1.5">
            {city && (
              <span className="inline-block text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase tracking-tight">{city}</span>
            )}
          </div>
        </div>

        {/* Right-side price and actions - Hidden on mobile, shown on desktop */}
        <div className="hidden md:flex md:w-32 flex-col justify-between items-end border-l border-gray-100 pl-3">
          <div className="text-right">
            {typeof fee === "number" ? (
              <div className="text-base font-black text-gray-900">₹{fee}</div>
            ) : (
              <div className="text-[10px] text-gray-500">Fee not set</div>
            )}
            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Consultation</div>
          </div>
          <div className="mt-2 flex flex-col gap-1.5 w-full">
            {onBookAppointment ? (
              <button
                onMouseEnter={() => {
                  try {
                    import('@/lib/slotsPrefetch').then(m => m.prefetchDoctorToday(doctor.id).catch(() => {}));
                  } catch {}
                }}
                onClick={() => {
                  onBookAppointment();
                  import("@/lib/api").then(({ apiClient }) => {
                      apiClient.trackDoctorClick(doctor.id, 'book', searchQuery || undefined).catch(() => {});
                      if (searchQuery) {
                        apiClient.trackSearch(searchQuery, { topDoctorIds: [doctor.id] }).catch(() => {});
                      }
                  });
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-1.5 rounded-lg transition-colors text-xs uppercase shadow-sm"
              >
                Book
              </button>
            ) : (
              <div className="w-full text-center bg-gray-100 text-gray-400 font-bold py-1.5 rounded-lg text-xs">Book</div>
            )}
            {slug ? (
              <Link
                href={`/doctor-site/${slug}`}
                className="w-full text-center bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-1.5 rounded-lg transition-colors text-[10px] uppercase border border-gray-200"
                onClick={(e) => {
                  if (shouldUseSubdomainNav()) { e.preventDefault(); }
                  import("@/lib/api").then(({ apiClient }) => {
                    if (shouldUseSubdomainNav()) { window.location.href = doctorMicrositeUrl(slug); }
                    else { router.push(`/doctor-site/${slug}`); }
                    apiClient.trackDoctorClick(doctor.id, 'site', searchQuery || undefined).catch(() => {});
                  });
                }}
              >
                Profile
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      
      {/* Mobile Actions - Compact grid at bottom */}
      <div className="md:hidden mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          {typeof fee === "number" && (
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-gray-900">₹{fee}</span>
              <span className="text-[8px] text-gray-400 font-bold uppercase">Fee</span>
            </div>
          )}
        </div>
        <div className="flex gap-1.5 flex-1 justify-end">
          {slug && (
            <Link
              href={`/doctor-site/${slug}`}
              className="px-3 py-1.5 bg-gray-50 text-gray-700 font-bold rounded-lg text-[10px] uppercase border border-gray-200"
              onClick={(e) => {
                if (shouldUseSubdomainNav()) { e.preventDefault(); }
                import("@/lib/api").then(({ apiClient }) => {
                  if (shouldUseSubdomainNav()) { window.location.href = doctorMicrositeUrl(slug); }
                  else { router.push(`/doctor-site/${slug}`); }
                });
              }}
            >
              Profile
            </Link>
          )}
          {onBookAppointment && (
            <button
              onClick={onBookAppointment}
              className="px-5 py-1.5 bg-blue-600 text-white font-black rounded-lg text-[10px] uppercase shadow-sm"
            >
              Book Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
