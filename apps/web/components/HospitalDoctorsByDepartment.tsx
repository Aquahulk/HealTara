"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DoctorBookingCTA from "@/components/DoctorBookingCTA";
import { EnhancedRatingDisplay } from "@/components/SimpleRatingDisplay";

type DoctorProfileLite = {
  slug?: string;
  specialization?: string;
  clinicName?: string;
  profileImage?: string;
  qualifications?: string;
  experience?: number;
  consultationFee?: number;
  about?: string;
  services?: string[];
};

type HospitalDoctorLink = {
  doctor: {
    id: number;
    email: string;
    doctorProfile?: DoctorProfileLite | null;
  };
  department?: { id: number; name: string } | null;
};

interface Props {
  doctors: HospitalDoctorLink[];
  hospitalName?: string;
}

function toTitleCase(input: string): string {
  return input.replace(/[\-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HospitalDoctorsByDepartment({ doctors, hospitalName }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const allDept = "All";

  const departmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of doctors) {
      const nm = String(link?.department?.name || "").trim();
      const key = nm || "";
      const prev = counts.get(key) || 0;
      counts.set(key, prev + 1);
    }
    return counts;
  }, [doctors]);

  const depts = useMemo(() => {
    const names = Array.from(departmentCounts.keys()).filter((k) => k);
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [departmentCounts]);

  const total = doctors.length;
  const [selected, setSelected] = useState<string>(allDept);

  useEffect(() => {
    const q = params?.get("dept");
    if (q) {
      const found = depts.find((d) => d.toLowerCase() === q.toLowerCase());
      if (found) setSelected(found);
    }
  }, [params, depts]);

  const filtered = useMemo(() => {
    if (!selected || selected === allDept) return doctors;
    return doctors.filter((d) => String(d?.department?.name || "").trim().toLowerCase() === selected.toLowerCase());
  }, [doctors, selected]);

  const updateDept = (name: string) => {
    setSelected(name);
    try {
      const search = new URLSearchParams(window.location.search);
      if (name && name !== allDept) {
        search.set("dept", name);
      } else {
        search.delete("dept");
      }
      const path = `${window.location.pathname}${search.toString() ? `?${search.toString()}` : ""}`;
      router.replace(path);
    } catch {}
  };

  return (
    <div>
      {depts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-5">
          <button type="button" onClick={() => updateDept(allDept)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selected === allDept ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
            All ({total})
          </button>
          {depts.map((d) => (
            <button key={d} type="button" onClick={() => updateDept(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selected === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
              {d} ({departmentCounts.get(d) || 0})
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((link, index) => {
            const doctor = link.doctor;
            const profile = doctor.doctorProfile;
            if (!profile) return null;
            const raw = doctor.email.split("@")[0];
            const derivedName = (() => {
              // Try email handle first — strip number IDs and format nicely
              const fromEmail = raw.replace(/[\-_\.]+/g, ' ').replace(/\d{5,}/g, '').trim();
              if (fromEmail.length > 2) return toTitleCase(fromEmail);
              // Try slug but strip long IDs
              if (profile.slug) {
                const cleaned = profile.slug.replace(/[\-_]\d{5,}/g, '').replace(/[\-_]+/g, ' ').trim();
                if (cleaned.length > 2) return toTitleCase(cleaned);
              }
              return 'Doctor';
            })();
            const name = derivedName;
            return (
              <div key={`${doctor.id}-${index}`} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden">
                    {profile.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.profileImage} alt={name} className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <span className="text-2xl">👨‍⚕️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">Dr. {name}</h3>
                    <p className="text-sm text-blue-600 font-medium">{profile.specialization}</p>
                    {link.department && <p className="text-xs text-gray-400">{link.department.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4 text-xs text-gray-600">
                  <EnhancedRatingDisplay entityType="doctor" entityId={String(doctor.id)} size="sm" />
                  {profile.experience && <span>• {profile.experience}yr exp</span>}
                  {profile.consultationFee && <span>• ₹{profile.consultationFee}</span>}
                </div>
                {profile.about && <p className="text-gray-500 text-xs mb-4 line-clamp-2">{profile.about}</p>}
                <DoctorBookingCTA doctorId={doctor.id} clinicName={profile.clinicName || hospitalName || "Clinic"}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm text-center transition-colors" label="Book Appointment" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">👩‍⚕️</div>
          <h3 className="text-sm font-bold text-gray-700">No Doctors Available</h3>
          <p className="text-xs text-gray-500">Try a different department.</p>
        </div>
      )}
    </div>
  );
}
