"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DoctorBookingCTA from "@/components/DoctorBookingCTA";

type HospitalDepartment = {
  name: string;
  description?: string;
  services?: string[];
  conditions?: string[];
  equipment?: string[];
  photos?: string[];
};

type DoctorProfileLite = {
  slug?: string;
  specialization?: string;
  clinicName?: string;
  profileImage?: string;
  qualifications?: string;
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
  departments: HospitalDepartment[];
  doctors: HospitalDoctorLink[];
  hospitalName?: string;
}

function toTitleCase(input: string): string {
  return input
    .replace(/[\-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HospitalDepartments({ departments, doctors, hospitalName }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const params = useSearchParams();
  const router = useRouter();

  const doctorsByDepartment = useMemo(() => {
    const map = new Map<string, HospitalDoctorLink[]>();
    for (const link of doctors) {
      const deptName = link.department?.name?.trim() || "";
      if (!deptName) continue;
      const key = deptName.toLowerCase();
      const list = map.get(key) || [];
      list.push(link);
      map.set(key, list);
    }
    return map;
  }, [doctors]);

  useEffect(() => {
    const q = params?.get("dept");
    if (!q) return;
    const match = (departments || []).find((d) => String(d?.name || "").trim().toLowerCase() === q.toLowerCase());
    if (match) setActive(String(match.name).toLowerCase());
  }, [params, departments]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {departments.map((dept, index) => {
        const icons = ['🫀','🧠','🦴','👁️','🦷','👶','💊','🩺'];
        const icon = icons[index % icons.length];
        const key = (dept.name || "").toLowerCase();
        const isOpen = active === key;
        const deptDoctors = doctorsByDepartment.get(key) || [];

        return (
          <div key={index} className={`bg-white rounded-xl border overflow-hidden transition-all ${isOpen ? 'border-blue-300 shadow-md' : 'border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md'}`}>
            <button type="button" onClick={() => {
              const next = isOpen ? null : key;
              setActive(next);
              try { const sp = new URLSearchParams(window.location.search); if (next) sp.set("dept", dept.name); else sp.delete("dept"); router.replace(`${window.location.pathname}${sp.toString() ? `?${sp.toString()}` : ""}`); } catch {}
            }} className="w-full text-left p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{dept.name}</h3>
                  <span className="text-[10px] text-gray-500">👨‍⚕️ {deptDoctors.length} doctor{deptDoctors.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {dept.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{dept.description}</p>}
              {dept.services && dept.services.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {dept.services.slice(0, 3).map((s, i) => (
                    <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                  {dept.services.length > 3 && <span className="text-[10px] text-gray-400">+{dept.services.length - 3}</span>}
                </div>
              )}
              <span className={`text-xs font-medium ${isOpen ? 'text-blue-600' : 'text-gray-500'}`}>
                {isOpen ? '▲ Hide' : '▼ View Doctors'}
              </span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                {deptDoctors.length > 0 ? (
                  <div className="space-y-2">
                    {deptDoctors.map((link, di) => {
                      const dp = link.doctor.doctorProfile || undefined;
                      const raw = link.doctor.email.split("@")[0];
                      const derivedName = raw.replace(/[\-_\.]+/g, ' ').replace(/\d{5,}/g, '').trim();
                      const docName = derivedName.length > 2 ? toTitleCase(derivedName) : 'Doctor';
                      return (
                        <div key={di} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {dp?.profileImage ? <img src={dp.profileImage} alt={docName} className="w-9 h-9 rounded-lg object-cover" /> : <span className="text-sm">👨‍⚕️</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">Dr. {docName}</div>
                            <div className="text-[10px] text-gray-500">{dp?.specialization || 'Specialist'}</div>
                          </div>
                          <DoctorBookingCTA doctorId={link.doctor.id} clinicName={dp?.clinicName || hospitalName || dept.name}
                            className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1.5 rounded-lg" label="Book" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No doctors linked yet.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
