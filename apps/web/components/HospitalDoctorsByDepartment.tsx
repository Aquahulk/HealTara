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
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          type="button"
          onClick={() => updateDept(allDept)}
          className={`px-4 py-2 rounded-full border ${selected === allDept ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-800 border-gray-300"}`}
        >
          {allDept} ({total})
        </button>
        {depts.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => updateDept(d)}
            className={`px-4 py-2 rounded-full border ${selected === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-800 border-gray-300"}`}
          >
            {d} ({departmentCounts.get(d) || 0})
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((link, index) => {
            const doctor = link.doctor;
            const profile = doctor.doctorProfile;
            if (!profile) return null;
            const raw = doctor.email.split("@")[0];
            const name = profile.slug ? toTitleCase(profile.slug) : raw;
            return (
              <div key={`${doctor.id}-${index}`} className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    {profile.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.profileImage} alt={name} className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                      <span className="text-4xl">👨‍⚕️</span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Dr. {name}</h3>
                  <p className="text-lg text-blue-600 font-semibold mb-3">{profile.specialization}</p>
                  {profile.qualifications && <p className="text-gray-600 text-sm mb-4">{profile.qualifications}</p>}
                </div>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-center">
                    <EnhancedRatingDisplay entityType="doctor" entityId={String(doctor.id)} size="sm" />
                  </div>
                  {profile.experience && (
                    <div className="flex items-center justify-center"><span className="text-blue-600 mr-2">⏰</span><span className="text-gray-700">{profile.experience}+ Years Experience</span></div>
                  )}
                  {profile.consultationFee && (
                    <div className="flex items-center justify-center"><span className="text-green-600 mr-2">💰</span><span className="text-gray-700">₹{profile.consultationFee} Consultation</span></div>
                  )}
                  {link.department && (
                    <div className="flex items-center justify-center"><span className="text-purple-600 mr-2">🏥</span><span className="text-gray-700">{link.department.name}</span></div>
                  )}
                </div>
                {profile.about && <p className="text-gray-600 text-sm mb-6 leading-relaxed line-clamp-3">{profile.about}</p>}
                <div className="text-center">
                  <DoctorBookingCTA doctorId={doctor.id} clinicName={profile.clinicName || hospitalName || "Clinic"} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👩‍⚕️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Doctors Available</h3>
          <p className="text-gray-600">Try a different department.</p>
        </div>
      )}
    </div>
  );
}
