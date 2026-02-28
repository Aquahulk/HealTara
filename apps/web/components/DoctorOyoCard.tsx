"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Doctor } from "@/lib/api";
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
  const toSlug = (s: string) => s.toLowerCase()
        .replace(/[^\w\s-]/g, '') // Keep alphanumeric, spaces, and hyphens
        .replace(/\s+/g, '-') // Replace spaces with single hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

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
    <div ref={cardRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 md:p-4 relative">
      <div className="absolute top-2 right-2 z-10">
        <SaveButton entityType="doctor" entityId={doctor.id} />
      </div>
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        {/* Image / avatar - Smaller on mobile */}
        <div className="w-full h-32 md:w-44 md:h-28 rounded-lg bg-gray-100 flex items-center justify-center text-3xl md:text-4xl shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div>👨‍⚕️</div>
        </div>

        {/* Middle details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Dr. {displayName}</h3>
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Verified</span>
          </div>
          <div className="text-xs md:text-sm text-gray-700 mt-1">{clinicName}</div>
          <div className="text-xs md:text-sm text-gray-600 mt-1">{specialization}</div>
          {location && <div className="text-xs md:text-sm text-gray-500 mt-1">{location}</div>}
          
          {/* Price on mobile - show here */}
          {typeof fee === "number" && (
            <div className="md:hidden mt-2">
              <span className="text-lg font-bold text-gray-900">₹{fee}</span>
              <span className="text-xs text-gray-500 ml-1">per consultation</span>
            </div>
          )}
          
          {/* facilities / tags - Compact on mobile */}
          <div className="mt-2 md:mt-3 flex flex-wrap gap-1.5 md:gap-2">
            {specialization && (
              <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">{specialization}</span>
            )}
            {city && (
              <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">{city}</span>
            )}
          </div>
        </div>

        {/* Right-side price and actions - Hidden on mobile, shown on desktop */}
        <div className="hidden md:flex md:w-40 lg:w-48 flex-col justify-between">
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
                href={`/doctor-site/${slug}`}
                className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 rounded-lg transition-colors text-sm"
                onMouseEnter={() => {
                  try {
                    if (shouldUseSubdomainNav()) {
                      const url = doctorMicrositeUrl(slug);
                      import('@/lib/navWarmup').then(m => { try { m.preconnect(url); m.dnsPrefetch(url); } catch {} });
                    } else {
                      router.prefetch(`/doctor-site/${slug}`);
                    }
                  } catch {}
                }}
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
                        apiClient.trackDoctorClick(doctor.id, 'site', searchQuery || undefined).catch(() => {});
                        if (searchQuery) {
                          apiClient.trackSearch(searchQuery, { topDoctorIds: [doctor.id] }).catch(() => {});
                        }
                        if (resp && resp.id) {
                          const hId = resp.id;
                          const sub = (resp as any)?.subdomain as string | undefined;
                          if (shouldUseSubdomainNav()) {
                            if (sub && sub.length > 1) {
                              window.location.href = customSubdomainUrl(sub);
                            } else {
                              window.location.href = hospitalIdMicrositeUrl(hId);
                            }
                          } else {
                            router.push(`/hospital-site/${String(hId)}`);
                          }
                        } else {
                          if (shouldUseSubdomainNav()) {
                            window.location.href = doctorMicrositeUrl(slug);
                          } // otherwise let Link navigate to /doctor-site/[slug]
                        }
                      })
                      .catch(() => {
                        // Fallback to doctor microsite
                        if (shouldUseSubdomainNav()) {
                          window.location.href = doctorMicrositeUrl(slug);
                        } else {
                          router.push(`/doctor-site/${slug}`);
                        }
                        // Track microsite click (fallback)
                        apiClient.trackDoctorClick(doctor.id, 'site', searchQuery || undefined).catch(() => {});
                        if (searchQuery) {
                          apiClient.trackSearch(searchQuery, { topDoctorIds: [doctor.id] }).catch(() => {});
                        }
                      });
                  });
                }}
              >
                Visit
              </Link>
            ) : (
              <button
                className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 rounded-lg transition-colors text-sm"
                onClick={() => {
                  import("@/lib/api").then(({ apiClient }) => {
                apiClient
                  .getHospitalByDoctorId(doctor.id)
                  .then((resp) => {
                        const hId = resp?.id;
                        const sub = (resp as any)?.subdomain as string | undefined;
                        if (hId != null) {
                          if (shouldUseSubdomainNav()) {
                            if (sub && sub.length > 1) {
                              window.location.href = customSubdomainUrl(sub);
                            } else {
                              window.location.href = hospitalIdMicrositeUrl(hId);
                            }
                          } else {
                            router.push(`/hospital-site/${String(hId)}`);
                          }
                        }
                      })
                      .catch(() => {
                        // silently ignore if no hospital link
                      });
                  });
                }}
              >
                Visit
              </button>
            )}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                Book
              </button>
            ) : (
              <div className="flex-1 text-center bg-gray-100 text-gray-400 font-medium py-2 rounded-lg text-sm">Book</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Actions - Full width buttons at bottom */}
      <div className="md:hidden mt-3 flex gap-2">
        {slug ? (
          <Link
            href={`/doctor-site/${slug}`}
            className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 rounded-lg transition-colors text-sm"
            onMouseEnter={() => {
              try {
                if (shouldUseSubdomainNav()) {
                  const url = doctorMicrositeUrl(slug);
                  import('@/lib/navWarmup').then(m => { try { m.preconnect(url); m.dnsPrefetch(url); } catch {} });
                } else {
                  router.prefetch(`/doctor-site/${slug}`);
                }
              } catch {}
            }}
            onClick={(e) => {
              if (shouldUseSubdomainNav()) {
                e.preventDefault();
              }
              import("@/lib/api").then(({ apiClient }) => {
                // Priority: Use the doctor's own slug for the website link
                if (shouldUseSubdomainNav()) {
                  window.location.href = doctorMicrositeUrl(slug);
                } else {
                  router.push(`/doctor-site/${slug}`);
                }
                
                // Track the click
                apiClient.trackDoctorClick(doctor.id, 'site', searchQuery || undefined).catch(() => {});
                if (searchQuery) {
                  apiClient.trackSearch(searchQuery, { topDoctorIds: [doctor.id] }).catch(() => {});
                }
              });
            }}
          >
            Visit Website
          </Link>
        ) : (
          <button
            className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 rounded-lg transition-colors text-sm"
            onClick={() => {
              // Even if no slug, try to find the linked hospital as a backup
              import("@/lib/api").then(({ apiClient }) => {
                apiClient
                  .getHospitalByDoctorId(doctor.id)
                  .then((resp) => {
                    const hId = resp?.id;
                    const sub = (resp as any)?.subdomain as string | undefined;
                    if (hId != null) {
                      if (shouldUseSubdomainNav()) {
                        if (sub && sub.length > 1) {
                          window.location.href = customSubdomainUrl(sub);
                        } else {
                          window.location.href = hospitalIdMicrositeUrl(hId);
                        }
                      } else {
                        router.push(`/hospital-site/${String(hId)}`);
                      }
                    }
                  })
                  .catch(() => {});
              });
            }}
          >
            Visit Website
          </button>
        )}
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            Book Now
          </button>
        ) : (
          <div className="flex-1 text-center bg-gray-100 text-gray-400 font-medium py-2.5 rounded-lg text-sm">Book Now</div>
        )}
      </div>
    </div>
  );
}
