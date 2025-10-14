"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Doctor } from "@/lib/api";
import { useRouter } from "next/navigation";
// Subdomain helpers for name-only microsite URLs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { hospitalMicrositeUrl, doctorMicrositeUrl, hospitalIdMicrositeUrl, shouldUseSubdomainNav, slugifyName } from "@/lib/subdomain";

interface DoctorOyoCardProps {
  doctor: Doctor;
  onBookAppointment?: () => void;
}

// OYO-style horizontal listing card: image left, details middle, price/actions right
export default function DoctorOyoCard({ doctor, onBookAppointment }: DoctorOyoCardProps) {
  const router = useRouter();
  const profile = doctor.doctorProfile;
  const emailName = (doctor?.email || "").split("@")[0];
  const clinicName = profile?.clinicName || "Clinic";
  const specialization = profile?.specialization || "Specialist";
  const fee = profile?.consultationFee;
  const city = profile?.city;
  const state = profile?.state;
  const slug = profile?.slug;
  const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // Prefer a human-friendly name derived from slug; fall back to email handle
  const toTitle = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
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
    <div ref={cardRef} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex gap-4 items-stretch">
        {/* Image / avatar */}
        <div className="w-44 h-28 sm:w-52 sm:h-32 rounded-xl bg-gray-100 flex items-center justify-center text-4xl shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div>👨‍⚕️</div>
        </div>

        {/* Middle details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Dr. {displayName}</h3>
            <span className="ml-2 inline-block text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">Verified</span>
          </div>
          <div className="text-sm text-gray-700 mt-1 truncate">{clinicName}</div>
          <div className="text-sm text-gray-600 mt-1 truncate">{specialization}</div>
          <div className="text-sm text-gray-500 mt-1 truncate">{location}</div>
          {/* facilities / tags */}
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

        {/* Right-side price and actions */}
        <div className="w-40 sm:w-48 flex flex-col justify-between">
          <div className="text-right">
            {typeof fee === "number" ? (
              <div className="text-xl font-bold text-gray-900">₹{fee}</div>
            ) : (
              <div className="text-sm text-gray-500">Fee not set</div>
            )}
            <div className="text-xs text-gray-500">per consultation</div>
          </div>
          <div className="mt-3 flex gap-2">
            {slug ? (
              <Link
                href={`/site/${slug}`}
                className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 rounded-lg transition-colors"
                onClick={(e) => {
                  // Conditionally use name-only subdomain navigation
                  if (shouldUseSubdomainNav()) {
                    e.preventDefault();
                  }
                  import("@/lib/api").then(({ apiClient }) => {
                    apiClient
                      .getHospitalByDoctorId(doctor.id)
                      .then((resp) => {
                        // Track microsite click
                        apiClient.trackDoctorClick(doctor.id, 'site').catch(() => {});
                        if (resp && resp.hospitalId) {
                          // Prefer hospital microsite if doctor is hospital-linked
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
                        } else {
                          if (shouldUseSubdomainNav()) {
                            window.location.href = doctorMicrositeUrl(slug);
                          } // otherwise let Link navigate to /site/[slug]
                        }
                      })
                      .catch(() => {
                        // Fallback to doctor microsite
                        if (shouldUseSubdomainNav()) {
                          window.location.href = doctorMicrositeUrl(slug);
                        } else {
                          router.push(`/site/${slug}`);
                        }
                        // Track microsite click (fallback)
                        apiClient.trackDoctorClick(doctor.id, 'site').catch(() => {});
                      });
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
                          window.location.href = hospitalMicrositeUrl(name);
                        } else {
                          window.location.href = hospitalIdMicrositeUrl(resp.hospitalId);
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
              <div className="flex-1 text-center bg-gray-100 text-gray-400 font-medium py-2 rounded-lg">Book</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}