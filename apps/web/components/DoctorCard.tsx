"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Doctor } from "@/lib/api";
import { useRouter } from "next/navigation";
import SaveButton from "@/components/SaveButton";
import { hospitalMicrositeUrl, doctorMicrositeUrl, hospitalIdMicrositeUrl, shouldUseSubdomainNav, slugifyName, customSubdomainUrl } from "@/lib/subdomain";

export interface DoctorCardProps {
    doctor: Doctor;
    // Prefer this handler: pages pass a closed-over doctor to trigger booking
    onBookAppointment?: () => void;
    // Backward-compatible handler: accepts a doctorId
    onBookClick?: (doctorId: number) => void;
    // Optional search query to attach analytics context
    searchQuery?: string;
}

export default function DoctorCard({ doctor, onBookAppointment, onBookClick, searchQuery }: DoctorCardProps) {
    const router = useRouter();
    const cardRef = useRef<HTMLDivElement | null>(null);
    const profile = doctor.doctorProfile;
    const hospital = doctor.hospital;
    const clinicName = profile?.clinicName || "Clinic";
    const specialization = profile?.specialization || "Specialist";
    const fee = profile?.consultationFee;
    const city = profile?.city;
    const state = profile?.state;
    const slug = profile?.slug;
    const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Determine the profile link and label based on hospital association
    const profileLink = hospital ? `/hospital-site/${hospital.id}` : (slug ? `/doctor-site/${slug}` : null);
    const displayName = hospital ? hospital.name : clinicName;

    // Track a view when the card enters viewport
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
		<div ref={cardRef} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col relative">
            <div className="absolute top-2 right-2 z-10">
                <SaveButton entityType="doctor" entityId={doctor.id} />
            </div>
			<div className="p-4 flex-1">
				<h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
					{hospital && <span className="text-blue-600">🏥</span>}
					{displayName}
				</h3>
				{hospital && (
					<p className="text-xs text-purple-600 font-semibold mt-1">Hospital Doctor</p>
				)}
				<p className="text-sm text-gray-600 mt-1">{specialization}</p>
				<p className="text-sm text-gray-500 mt-2">
					{city && state ? `${city}, ${state}` : city || state || ""}
				</p>
				{typeof fee === "number" && (
					<p className="text-sm text-gray-700 mt-2">Fee: ₹{fee}</p>
				)}
			</div>
			<div className="p-4 border-t border-gray-200 flex gap-3">
                {profileLink ? (
                    <Link
                        href={profileLink}
                        className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 rounded-lg transition-colors"
                onMouseEnter={() => {
                  try {
                    if (shouldUseSubdomainNav()) {
                      const url = hospital?.subdomain ? customSubdomainUrl(hospital.subdomain) : (slug ? doctorMicrositeUrl(slug) : '');
                      if (url) {
                        import('@/lib/navWarmup').then(m => { try { m.preconnect(url); m.dnsPrefetch(url); } catch {} });
                      }
                    }
                  } catch {}
                }}
                onClick={(e) => {
                            if (shouldUseSubdomainNav()) {
                                // Navigate via subdomain
                                e.preventDefault();
                                if (hospital?.subdomain) {
                                    window.location.href = customSubdomainUrl(hospital.subdomain);
                                } else if (slug) {
                                    window.location.href = doctorMicrositeUrl(slug);
                                }
                            }
                            import("@/lib/api").then(({ apiClient }) => {
                                apiClient.trackDoctorClick(doctor.id, 'site', searchQuery || undefined).catch(() => {});
                                if (searchQuery) {
                                    apiClient.trackSearch(searchQuery, { topDoctorIds: [doctor.id] }).catch(() => {});
                                }
                            });
                        }}
                    >
                        {hospital ? 'Visit Hospital' : 'Visit Website'}
                    </Link>
                ) : (
                    <button
                        className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 rounded-lg transition-colors"
                        onClick={() => {
                            import("@/lib/api").then(({ apiClient }) => {
                                apiClient
                                    .getHospitalByDoctorId(doctor.id)
                                    .then((resp) => {
                                        const hId = resp?.id;
                                        const sub = resp?.subdomain as string | undefined;
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
                                        // ignore if no hospital link
                                    });
                            });
                        }}
                    >
                        Visit Website
                    </button>
                )}
                {onBookAppointment || onBookClick ? (
                    <button
                        onMouseEnter={() => {
                          try {
                            import('@/lib/slotsPrefetch').then(m => m.prefetchDoctorToday(doctor.id).catch(() => {}));
                          } catch {}
                        }}
                        onClick={() => {
                            if (onBookAppointment) {
                                onBookAppointment();
                            } else if (onBookClick) {
                                onBookClick(doctor.id);
                            }
                            import("@/lib/api").then(({ apiClient }) => {
                                apiClient.trackDoctorClick(doctor.id, 'book', searchQuery || undefined).catch(() => {});
                                if (searchQuery) {
                                    apiClient.trackSearch(searchQuery, { topDoctorIds: [doctor.id] }).catch(() => {});
                                }
                            });
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
                    >
                        Book
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

