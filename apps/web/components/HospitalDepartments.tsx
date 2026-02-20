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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {departments.map((dept, index) => {
        const icon = index % 6 === 0
          ? "🫀"
          : index % 6 === 1
          ? "🧠"
          : index % 6 === 2
          ? "🦴"
          : index % 6 === 3
          ? "👁️"
          : index % 6 === 4
          ? "🦷"
          : "👶";
        const key = (dept.name || "").toLowerCase();
        const isOpen = active === key;
        const deptDoctors = doctorsByDepartment.get(key) || [];

        return (
          <div
            key={index}
            className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 group"
          >
            <button
              type="button"
              onClick={() => {
                const next = isOpen ? null : key;
                setActive(next);
                try {
                  const sp = new URLSearchParams(window.location.search);
                  if (next) sp.set("dept", dept.name);
                  else sp.delete("dept");
                  const path = `${window.location.pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
                  router.replace(path);
                } catch {}
              }}
              className="w-full text-left"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-2">{icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{dept.name}</h3>
                <div className="inline-flex items-center text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  👩‍⚕️ {deptDoctors.length} {deptDoctors.length === 1 ? 'Doctor' : 'Doctors'}
                </div>
              </div>
              {dept.description && (
                <p className="text-gray-600 mb-6 leading-relaxed">{dept.description}</p>
              )}
              {dept.services && dept.services.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Key Services:</h4>
                  <div className="flex flex-wrap gap-2">
                    {dept.services.slice(0, 4).map((service, i) => (
                      <span
                        key={i}
                        className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                    {dept.services.length > 4 && (
                      <span className="inline-block bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                        +{dept.services.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              {dept.conditions && dept.conditions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Conditions Treated:</h4>
                  <div className="flex flex-wrap gap-2">
                    {dept.conditions.slice(0, 3).map((condition, i) => (
                      <span
                        key={i}
                        className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full"
                      >
                        {condition}
                      </span>
                    ))}
                    {dept.conditions.length > 3 && (
                      <span className="inline-block bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                        +{dept.conditions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="text-center">
                <span className="btn-brand text-white font-semibold px-6 py-3 rounded-xl inline-block">
                  {isOpen ? "Hide Doctors" : "View Doctors"}
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="mt-8 pt-6 border-t">
                <h4 className="text-xl font-bold text-gray-900 mb-4">Doctors in {dept.name}</h4>
                {deptDoctors.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {deptDoctors.map((link, di) => {
                      const dp = link.doctor.doctorProfile || undefined;
                      const raw = link.doctor.email.split("@")[0];
                      const name = dp?.slug ? toTitleCase(dp.slug) : raw;
                      return (
                        <div key={di} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-3xl">
                              {dp?.profileImage ? (
                                <img
                                  src={dp.profileImage}
                                  alt={name}
                                  className="w-14 h-14 rounded-full object-cover"
                                />
                              ) : (
                                <span>👨‍⚕️</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">Dr. {name}</div>
                              <div className="text-sm text-blue-600">{dp?.specialization || "Specialist"}</div>
                              {dp?.qualifications && (
                                <div className="text-xs text-gray-600 mt-1">{dp.qualifications}</div>
                              )}
                              <div className="mt-3">
                                <DoctorBookingCTA doctorId={link.doctor.id} clinicName={dp?.clinicName || hospitalName || dept.name} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm">No doctors are linked to this department yet.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
