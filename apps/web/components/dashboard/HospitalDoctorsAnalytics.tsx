"use client";

import React, { useEffect, useState } from "react";
import { EnhancedRatingDisplay } from "@/components/SimpleRatingDisplay";

type DoctorWithDepartment = {
  doctor: {
    id: number;
    email: string;
    status: string;
    doctorProfile?: {
      slug?: string;
      specialization?: string;
      qualifications?: string;
      experience?: number;
      clinicName?: string;
      consultationFee?: number;
      profileImage?: string;
      city?: string;
      state?: string;
      phone?: string;
    } | null;
  };
  department?: {
    id: number;
    name: string;
    description?: string;
  } | null;
  createdAt?: string;
};

type Department = {
  id: number;
  name: string;
  description?: string;
};

interface Props {
  hospitalId: number;
  hospitalName: string;
}

function toTitleCase(input: string): string {
  return input
    .replace(/[\-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HospitalDoctorsAnalytics({ hospitalId, hospitalName }: Props) {
  const [doctors, setDoctors] = useState<DoctorWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [expandedDoctor, setExpandedDoctor] = useState<number | null>(null);
  const [updatingDept, setUpdatingDept] = useState<number | null>(null);
  const [unlinking, setUnlinking] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [hospitalId]);

  const fetchData = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Fetch doctors
      const doctorsRes = await fetch(`/api/hospitals/${hospitalId}/doctors`, { headers });
      if (doctorsRes.ok) {
        const data = await doctorsRes.json();
        setDoctors(data.doctors || []);
      }
      
      // Fetch departments
      const deptRes = await fetch(`/api/hospitals/${hospitalId}/departments`, { headers });
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(Array.isArray(deptData) ? deptData : []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkDoctor = async (doctorId: number, doctorName: string) => {
    if (!confirm(`Are you sure you want to unlink ${doctorName} from ${hospitalName}?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    try {
      setUnlinking(doctorId);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/hospitals/${hospitalId}/doctors/${doctorId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        alert(`✅ ${doctorName} has been unlinked successfully`);
        fetchData(); // Refresh the list
      } else {
        const data = await res.json();
        alert(`Error: ${data.message || "Failed to unlink doctor"}`);
      }
    } catch (error) {
      console.error("Error unlinking doctor:", error);
      alert("Failed to unlink doctor. Please try again.");
    } finally {
      setUnlinking(null);
    }
  };

  const handleUpdateDepartment = async (doctorId: number, departmentId: number | null) => {
    try {
      setUpdatingDept(doctorId);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/hospitals/${hospitalId}/doctors/${doctorId}/department`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ departmentId }),
      });
      
      if (res.ok) {
        await fetchData(); // Refresh the list
      } else {
        const data = await res.json();
        alert(`Error: ${data.message || "Failed to update department"}`);
      }
    } catch (error) {
      console.error("Error updating department:", error);
      alert("Failed to update department. Please try again.");
    } finally {
      setUpdatingDept(null);
    }
  };

  const handleExportCSV = () => {
    const csvData = [
      ["Doctor Name", "Email", "Specialization", "Department", "Experience", "Fee", "City", "State", "Status"],
      ...filteredDoctors.map((link) => {
        const doctor = link.doctor;
        const profile = doctor.doctorProfile;
        const raw = doctor.email.split("@")[0];
        const name = raw.replace(/[\-_\.]+/g, " ").replace(/\d{5,}/g, "").trim() || "Doctor";
        
        return [
          name,
          doctor.email,
          profile?.specialization || "N/A",
          link.department?.name || "Unassigned",
          profile?.experience ? `${profile.experience}` : "N/A",
          profile?.consultationFee ? `₹${profile.consultationFee}` : "N/A",
          profile?.city || "N/A",
          profile?.state || "N/A",
          doctor.status,
        ];
      }),
    ];
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${hospitalName.replace(/\s+/g, "-")}-doctors-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredDoctors = doctors.filter((link) => {
    if (filter === "all") return true;
    if (filter === "active") return link.doctor.status === "ACTIVE";
    if (filter === "inactive") return link.doctor.status !== "ACTIVE";
    return true;
  });

  const stats = {
    total: doctors.length,
    active: doctors.filter((d) => d.doctor.status === "ACTIVE").length,
    inactive: doctors.filter((d) => d.doctor.status !== "ACTIVE").length,
    departments: new Set(doctors.map((d) => d.department?.name).filter(Boolean)).size,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Our Doctors</h2>
          <p className="text-sm text-gray-500">Manage doctors linked to {hospitalName}</p>
        </div>
        {doctors.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            📥 Export CSV
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="text-3xl font-black text-blue-600">{stats.total}</div>
          <div className="text-xs text-gray-600 mt-1">Total Doctors</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
          <div className="text-3xl font-black text-emerald-600">{stats.active}</div>
          <div className="text-xs text-gray-600 mt-1">Active</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
          <div className="text-3xl font-black text-amber-600">{stats.inactive}</div>
          <div className="text-xs text-gray-600 mt-1">Inactive</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
          <div className="text-3xl font-black text-purple-600">{stats.departments}</div>
          <div className="text-xs text-gray-600 mt-1">Departments</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === "active"
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Active ({stats.active})
        </button>
        <button
          onClick={() => setFilter("inactive")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === "inactive"
              ? "bg-amber-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Inactive ({stats.inactive})
        </button>
      </div>

      {/* Doctors Grid */}
      {filteredDoctors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map((link) => {
            const doctor = link.doctor;
            const profile = doctor.doctorProfile;
            const raw = doctor.email.split("@")[0];
            const derivedName = (() => {
              const fromEmail = raw
                .replace(/[\-_\.]+/g, " ")
                .replace(/\d{5,}/g, "")
                .trim();
              if (fromEmail.length > 2) return toTitleCase(fromEmail);
              if (profile?.slug) {
                const cleaned = profile.slug
                  .replace(/[\-_]\d{5,}/g, "")
                  .replace(/[\-_]+/g, " ")
                  .trim();
                if (cleaned.length > 2) return toTitleCase(cleaned);
              }
              return "Doctor";
            })();
            
            const isExpanded = expandedDoctor === doctor.id;

            return (
              <div
                key={doctor.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden">
                    {profile?.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.profileImage}
                        alt={derivedName}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="text-2xl">👨‍⚕️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">
                      Dr. {derivedName}
                    </h3>
                    <p className="text-sm text-blue-600 font-medium">
                      {profile?.specialization || "General"}
                    </p>
                    {link.department && (
                      <p className="text-xs text-gray-500">{link.department.name}</p>
                    )}
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      doctor.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {doctor.status === "ACTIVE" ? "✓ Active" : "○ Inactive"}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-600 mb-4">
                  <EnhancedRatingDisplay
                    entityType="doctor"
                    entityId={String(doctor.id)}
                    size="sm"
                  />
                  {profile?.experience && (
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>{profile.experience} years experience</span>
                    </div>
                  )}
                  {profile?.consultationFee && (
                    <div className="flex items-center gap-1">
                      <span>💰</span>
                      <span>₹{profile.consultationFee} consultation fee</span>
                    </div>
                  )}
                  {profile?.city && (
                    <div className="flex items-center gap-1">
                      <span>📍</span>
                      <span>
                        {profile.city}
                        {profile.state ? `, ${profile.state}` : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded Options */}
                {isExpanded && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                    {/* Department Assignment */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Department Assignment
                      </label>
                      <select
                        value={link.department?.id || ""}
                        onChange={(e) => {
                          const deptId = e.target.value ? Number(e.target.value) : null;
                          handleUpdateDepartment(doctor.id, deptId);
                        }}
                        disabled={updatingDept === doctor.id}
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="">No Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      {updatingDept === doctor.id && (
                        <p className="text-xs text-blue-600 mt-1">Updating...</p>
                      )}
                    </div>

                    {/* Unlink Button */}
                    <button
                      onClick={() => handleUnlinkDoctor(doctor.id, `Dr. ${derivedName}`)}
                      disabled={unlinking === doctor.id}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {unlinking === doctor.id ? "Unlinking..." : "🔗 Unlink Doctor"}
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <a
                    href={`/doctor-site/${profile?.slug || doctor.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-3 rounded-lg text-xs font-bold transition-colors"
                  >
                    View Profile
                  </a>
                  <button
                    onClick={() => setExpandedDoctor(isExpanded ? null : doctor.id)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-colors"
                    title={isExpanded ? "Hide options" : "More options"}
                  >
                    {isExpanded ? "▲" : "⋯"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="text-4xl mb-3">👩‍⚕️</div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">No Doctors Found</h3>
          <p className="text-sm text-gray-500">
            {filter === "all"
              ? "No doctors are linked to this hospital yet."
              : `No ${filter} doctors found.`}
          </p>
        </div>
      )}
    </div>
  );
}
