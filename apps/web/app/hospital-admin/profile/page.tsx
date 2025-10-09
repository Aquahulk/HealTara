"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import Link from "next/link";

type HospitalProfile = {
  general?: {
    legalName?: string;
    brandName?: string;
    tagline?: string;
    logoUrl?: string;
    address?: string;
    pincode?: string;
    googleMapsLink?: string;
    contacts?: {
      emergency?: string;
      reception?: string;
      ambulance?: string;
      appointment?: string;
      healthCheckups?: string;
      fax?: string;
    };
    emails?: {
      info?: string;
      appointments?: string;
      feedback?: string;
      careers?: string;
    };
    social?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
    };
  };
  about?: {
    mission?: string;
    vision?: string;
    values?: string;
    history?: string;
    leadership?: Array<{ name: string; title: string; photoUrl?: string; message?: string }>;
    accreditations?: Array<{ name: string; logoUrl?: string }>;
    awards?: Array<{ title: string; year?: string }>;
    media?: Array<{ title: string; url: string }>;
    csr?: string;
  };
  departments?: Array<{
    name: string;
    description?: string;
    services?: string[];
    conditions?: string[];
    equipment?: string[];
    photos?: string[];
    videos?: string[];
    associatedDoctorIds?: number[];
  }>;
  doctors?: Array<{
    doctorId?: number;
    name?: string;
    title?: string;
    primarySpecialty?: string;
    subSpecialty?: string;
    bio?: string;
    credentials?: Array<{ degree: string; institute?: string; year?: string }>;
    councilRegistration?: string;
    experienceYears?: number;
    fellowships?: string[];
    memberships?: string[];
    certifications?: string[];
    expertise?: string[];
    procedures?: string[];
    languages?: string[];
    opdSchedule?: Array<{ day: string; start: string; end: string }>;
    hospitalBranch?: string;
    testimonials?: Array<{ author: string; content: string }>;
    publications?: Array<{ title: string; link?: string }>;
    awards?: string[];
    departments?: string[];
  }>;
};

export default function HospitalAdminProfilePage() {
  const { user, loading } = useAuth();
  const [hospitalId, setHospitalId] = useState<number | null>(null);
  const [profile, setProfile] = useState<HospitalProfile>({});
  const [saving, setSaving] = useState(false);
  const [creatingHospital, setCreatingHospital] = useState(false);
  const [createHospitalForm, setCreateHospitalForm] = useState({ name: "", address: "", city: "", state: "", phone: "" });
  const [message, setMessage] = useState<string>("");
  const [departmentsExpanded, setDepartmentsExpanded] = useState(true);
  const [aboutExpanded, setAboutExpanded] = useState(true);
  const [generalExpanded, setGeneralExpanded] = useState(true);
  const [slotAdminEmail, setSlotAdminEmail] = useState("");
  const [currentSlotAdminEmail, setCurrentSlotAdminEmail] = useState<string | null>(null);
  const [slotAdminPassword, setSlotAdminPassword] = useState("");
  const [slotAdminSaving, setSlotAdminSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    // Allow both classic ADMIN and HOSPITAL_ADMIN roles
    if (!user || (user.role !== "ADMIN" && user.role !== "HOSPITAL_ADMIN")) return;


    const load = async () => {
      try {
        const mine = await apiClient.getMyHospital();
        if (!mine || !mine.id) {
          setMessage("No hospital found for this admin. Please create one.");
          return;
        }
        setHospitalId(mine.id);
        const profRes = await apiClient.getHospitalProfile(mine.id);
        if (profRes?.profile) setProfile(profRes.profile as HospitalProfile);
        // Load existing Slot Admin
        const sa = await apiClient.getHospitalSlotAdmin();
        if (sa?.slotAdmin) {
          setCurrentSlotAdminEmail(sa.slotAdmin.email);
          setSlotAdminEmail(sa.slotAdmin.email);
        } else {
          setCurrentSlotAdminEmail(null);
        }
      } catch (e: any) {
        setMessage(e?.message || "Failed to load hospital profile.");
      }
    };
    load();
  }, [user, loading]);

  const updateGeneralField = (path: (keyof NonNullable<HospitalProfile["general"]>) | string, value: any) => {
    setProfile((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        [path as string]: value,
      },
    }));
  };

  const addDepartment = () => {
    setProfile((prev) => ({
      ...prev,
      departments: [...(prev.departments || []), { name: "", description: "", services: [], conditions: [], equipment: [], photos: [], videos: [], associatedDoctorIds: [] }],
    }));
  };

  const updateDepartment = (idx: number, field: string, value: any) => {
    setProfile((prev) => {
      const list = [...(prev.departments || [])];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, departments: list };
    });
  };

  const removeDepartment = (idx: number) => {
    setProfile((prev) => {
      const list = [...(prev.departments || [])];
      list.splice(idx, 1);
      return { ...prev, departments: list };
    });
  };

  const addListItem = (idx: number, field: "services" | "conditions" | "equipment" | "photos" | "videos", value: string) => {
    updateDepartment(idx, field, [ ...((profile.departments?.[idx] as any)?.[field] || []), value ]);
  };

  const removeListItem = (idx: number, field: "services" | "conditions" | "equipment" | "photos" | "videos", itemIdx: number) => {
    const arr = [ ...(((profile.departments?.[idx] as any)?.[field] || [])) ];
    arr.splice(itemIdx, 1);
    updateDepartment(idx, field, arr);
  };

  const addDoctor = () => {
    setProfile((prev) => ({
      ...prev,
      doctors: [...(prev.doctors || []), { name: "", primarySpecialty: "", subSpecialty: "", departments: [] }],
    }));
  };

  const updateDoctor = (idx: number, field: string, value: any) => {
    setProfile((prev) => {
      const list = [...(prev.doctors || [])];
      list[idx] = { ...list[idx], [field]: value } as any;
      return { ...prev, doctors: list } as HospitalProfile;
    });
  };

  // Create and link a real doctor account for booking
  const makeDoctorBookable = async (idx: number) => {
    try {
      setSaving(true);
      const myHospital = await apiClient.getMyHospital();
      if (!myHospital?.id) throw new Error('Hospital not found for admin');
      const d = (profile.doctors || [])[idx];
      const payload = {
        name: d?.name || '',
        primarySpecialty: d?.primarySpecialty || undefined,
        subSpecialty: d?.subSpecialty || undefined,
      };
      const result = await apiClient.createHospitalDoctor(myHospital.id, payload);
      // Link created doctor to hospital profile and persist immediately
      if (result?.doctor?.id) {
        const list = [...(profile.doctors || [])];
        const doc = { ...(list[idx] || {}) } as any;
        doc.doctorId = result.doctor.id;
        list[idx] = doc;
        const newProfile = { ...profile, doctors: list } as HospitalProfile;
        setProfile(newProfile);
        await apiClient.updateHospitalProfile(myHospital.id, newProfile);
      }
      alert(`Doctor made bookable: ${result?.doctor?.email || 'created'}`);
    } catch (e: any) {
      alert(e?.message || 'Failed to make doctor bookable');
    } finally {
      setSaving(false);
    }
  };

  const removeDoctor = (idx: number) => {
    setProfile((prev) => {
      const list = [...(prev.doctors || [])];
      list.splice(idx, 1);
      return { ...prev, doctors: list } as HospitalProfile;
    });
  };

  const toggleDoctorDepartment = (idx: number, deptName: string) => {
    setProfile((prev) => {
      const list = [...(prev.doctors || [])];
      const doc = { ...list[idx] } as any;
      const depts = new Set<string>(doc.departments || []);
      if (depts.has(deptName)) {
        depts.delete(deptName);
      } else {
        depts.add(deptName);
      }
      doc.departments = Array.from(depts);
      list[idx] = doc;
      return { ...prev, doctors: list } as HospitalProfile;
    });
  };

  const saveProfile = async () => {
    if (!hospitalId) return;
    setSaving(true);
    setMessage("");
    try {
      await apiClient.updateHospitalProfile(hospitalId, profile);
      setMessage("Profile saved successfully.");
    } catch (e: any) {
      setMessage(e?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const createHospital = async () => {
    if (!createHospitalForm.name.trim()) {
      setMessage("Please enter a hospital name to create it.");
      return;
    }
    setCreatingHospital(true);
    setMessage("");
    try {
      const hospital = await apiClient.createHospital(createHospitalForm);
      setHospitalId(hospital.id);
      setMessage("Hospital created. You can now save the profile.");
    } catch (e: any) {
      setMessage(e?.message || "Failed to create hospital.");
    } finally {
      setCreatingHospital(false);
    }
  };

  const saveHospitalSlotAdmin = async () => {
    if (!slotAdminEmail || !slotAdminPassword) {
      setMessage("Please provide Slot Admin email and password");
      return;
    }
    setSlotAdminSaving(true);
    try {
      const res = await apiClient.upsertHospitalSlotAdmin(slotAdminEmail, slotAdminPassword);
      setCurrentSlotAdminEmail(res.slotAdmin.email);
      setSlotAdminPassword("");
      setMessage("Slot Admin credentials updated successfully.");
    } catch (e: any) {
      setMessage(e?.message || "Failed to update Slot Admin credentials.");
    } finally {
      setSlotAdminSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Please log in</h1>
        <p className="text-gray-600">Hospital admin access required.</p>
      </div>
    );
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "HOSPITAL_ADMIN" && user.role !== "DOCTOR")) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-gray-600">This page is only for hospital admins.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 min-h-screen bg-gray-50 text-gray-900">
      <h1 className="text-3xl font-bold">Hospital Profile</h1>
      {message && <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">{message}</div>}

      {/* Slot Admin Settings */}
      <section className="border rounded-lg p-4 bg-white shadow text-gray-900">
        <h2 className="text-xl font-semibold mb-3">Slot Booking Admin</h2>
        <p className="text-sm text-gray-600 mb-4">Create or update a dedicated Slot Admin login for your hospital staff.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Slot Admin</label>
            <div className="text-gray-800">{currentSlotAdminEmail ? <span className="font-mono">{currentSlotAdminEmail}</span> : <span className="text-gray-500">No Slot Admin configured yet</span>}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slot Admin Email</label>
              <input type="email" value={slotAdminEmail} onChange={(e) => setSlotAdminEmail(e.target.value)} placeholder="slot-admin@example.com" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={slotAdminPassword} onChange={(e) => setSlotAdminPassword(e.target.value)} placeholder="Enter new password" className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <button onClick={saveHospitalSlotAdmin} disabled={slotAdminSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50">
              {slotAdminSaving ? "Saving..." : (currentSlotAdminEmail ? "Update Slot Admin" : "Create Slot Admin")}
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Share the login URL with staff: <Link href="/slot-admin/login" className="text-blue-600 underline">Slot Admin Login</Link>
          </p>
        </div>
      </section>

      {!hospitalId && (
        <section className="border rounded-lg p-4 bg-white shadow text-gray-900">
          <h2 className="text-xl font-semibold mb-3">Create Your Hospital</h2>
          <p className="text-sm text-gray-600 mb-4">No hospital is linked to your admin account yet. Create one to enable saving the profile.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="border rounded p-2" placeholder="Hospital Name (required)" value={createHospitalForm.name} onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, name: e.target.value })} />
            <input className="border rounded p-2" placeholder="Phone" value={createHospitalForm.phone} onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, phone: e.target.value })} />
            <input className="border rounded p-2 md:col-span-2" placeholder="Address" value={createHospitalForm.address} onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, address: e.target.value })} />
            <input className="border rounded p-2" placeholder="City" value={createHospitalForm.city} onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, city: e.target.value })} />
            <input className="border rounded p-2" placeholder="State" value={createHospitalForm.state} onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, state: e.target.value })} />
          </div>
          <div className="mt-4">
            <button onClick={createHospital} disabled={creatingHospital} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
              {creatingHospital ? "Creating..." : "Create Hospital"}
            </button>
          </div>
        </section>
      )}

      {/* General & Contact Information */}
      <section className="border rounded-lg p-4 bg-white shadow text-gray-900">
        <button className="w-full text-left" onClick={() => setGeneralExpanded(!generalExpanded)}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">General & Contact Information</h2>
            <span>{generalExpanded ? "▾" : "▸"}</span>
          </div>
        </button>
        {generalExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <input className="border rounded p-2" placeholder="Full Legal Name" value={profile.general?.legalName || ""} onChange={(e) => updateGeneralField("legalName", e.target.value)} />
            <input className="border rounded p-2" placeholder="Brand Name" value={profile.general?.brandName || ""} onChange={(e) => updateGeneralField("brandName", e.target.value)} />
            <input className="border rounded p-2" placeholder="Tagline" value={profile.general?.tagline || ""} onChange={(e) => updateGeneralField("tagline", e.target.value)} />
            <input className="border rounded p-2" placeholder="Logo URL" value={profile.general?.logoUrl || ""} onChange={(e) => updateGeneralField("logoUrl", e.target.value)} />
            <input className="border rounded p-2 md:col-span-2" placeholder="Complete Address" value={profile.general?.address || ""} onChange={(e) => updateGeneralField("address", e.target.value)} />
            <input className="border rounded p-2" placeholder="PIN code" value={profile.general?.pincode || ""} onChange={(e) => updateGeneralField("pincode", e.target.value)} />
            <input className="border rounded p-2" placeholder="Google Maps Link" value={profile.general?.googleMapsLink || ""} onChange={(e) => updateGeneralField("googleMapsLink", e.target.value)} />

            {/* Contacts */}
            <input className="border rounded p-2" placeholder="Emergency/Casualty" value={profile.general?.contacts?.emergency || ""} onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), emergency: e.target.value })} />
            <input className="border rounded p-2" placeholder="Reception" value={profile.general?.contacts?.reception || ""} onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), reception: e.target.value })} />
            <input className="border rounded p-2" placeholder="Ambulance" value={profile.general?.contacts?.ambulance || ""} onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), ambulance: e.target.value })} />
            <input className="border rounded p-2" placeholder="Appointment Desk" value={profile.general?.contacts?.appointment || ""} onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), appointment: e.target.value })} />
            <input className="border rounded p-2" placeholder="Health Check-ups" value={profile.general?.contacts?.healthCheckups || ""} onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), healthCheckups: e.target.value })} />
            <input className="border rounded p-2" placeholder="Fax" value={profile.general?.contacts?.fax || ""} onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), fax: e.target.value })} />

            {/* Emails */}
            <input className="border rounded p-2" placeholder="Email: info@" value={profile.general?.emails?.info || ""} onChange={(e) => updateGeneralField("emails", { ...(profile.general?.emails || {}), info: e.target.value })} />
            <input className="border rounded p-2" placeholder="Email: appointments@" value={profile.general?.emails?.appointments || ""} onChange={(e) => updateGeneralField("emails", { ...(profile.general?.emails || {}), appointments: e.target.value })} />
            <input className="border rounded p-2" placeholder="Email: feedback@" value={profile.general?.emails?.feedback || ""} onChange={(e) => updateGeneralField("emails", { ...(profile.general?.emails || {}), feedback: e.target.value })} />
            <input className="border rounded p-2" placeholder="Email: hr@" value={profile.general?.emails?.careers || ""} onChange={(e) => updateGeneralField("emails", { ...(profile.general?.emails || {}), careers: e.target.value })} />

            {/* Social */}
            <input className="border rounded p-2" placeholder="Facebook URL" value={profile.general?.social?.facebook || ""} onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), facebook: e.target.value })} />
            <input className="border rounded p-2" placeholder="Twitter URL" value={profile.general?.social?.twitter || ""} onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), twitter: e.target.value })} />
            <input className="border rounded p-2" placeholder="Instagram URL" value={profile.general?.social?.instagram || ""} onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), instagram: e.target.value })} />
            <input className="border rounded p-2" placeholder="LinkedIn URL" value={profile.general?.social?.linkedin || ""} onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), linkedin: e.target.value })} />
            <input className="border rounded p-2" placeholder="YouTube URL" value={profile.general?.social?.youtube || ""} onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), youtube: e.target.value })} />
          </div>
        )}
      </section>

      {/* About Us */}
      <section className="border rounded-lg p-4 bg-white shadow text-gray-900">
        <button className="w-full text-left" onClick={() => setAboutExpanded(!aboutExpanded)}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">About Us</h2>
            <span>{aboutExpanded ? "▾" : "▸"}</span>
          </div>
        </button>
        {aboutExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <textarea className="border rounded p-2 md:col-span-2" placeholder="Mission" value={profile.about?.mission || ""} onChange={(e) => setProfile((p) => ({ ...p, about: { ...(p.about || {}), mission: e.target.value } }))} />
            <textarea className="border rounded p-2 md:col-span-2" placeholder="Vision" value={profile.about?.vision || ""} onChange={(e) => setProfile((p) => ({ ...p, about: { ...(p.about || {}), vision: e.target.value } }))} />
            <textarea className="border rounded p-2 md:col-span-2" placeholder="Values" value={profile.about?.values || ""} onChange={(e) => setProfile((p) => ({ ...p, about: { ...(p.about || {}), values: e.target.value } }))} />
            <textarea className="border rounded p-2 md:col-span-2" placeholder="History" value={profile.about?.history || ""} onChange={(e) => setProfile((p) => ({ ...p, about: { ...(p.about || {}), history: e.target.value } }))} />
          </div>
        )}
      </section>

      {/* Departments & Specialties */}
      <section className="border rounded-lg p-4 bg-white shadow text-gray-900">
        <button className="w-full text-left" onClick={() => setDepartmentsExpanded(!departmentsExpanded)}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Medical Departments & Specialties</h2>
            <span>{departmentsExpanded ? "▾" : "▸"}</span>
          </div>
        </button>
        {departmentsExpanded && (
          <div className="space-y-4 mt-4">
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={addDepartment}>Add Department</button>
            {(profile.departments || []).map((dept, idx) => (
              <div key={idx} className="border rounded p-3">
                <div className="flex gap-2">
                  <input className="border rounded p-2 flex-1" placeholder="Department Name" value={dept.name} onChange={(e) => updateDepartment(idx, "name", e.target.value)} />
                  <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={() => removeDepartment(idx)}>Remove</button>
                </div>
                <textarea className="border rounded p-2 w-full mt-2" placeholder="Description" value={dept.description || ""} onChange={(e) => updateDepartment(idx, "description", e.target.value)} />

                {/* Services */}
                <div className="mt-2">
                  <h3 className="font-semibold">Services</h3>
                  <div className="flex gap-2 mt-1">
                    <input id={`service-${idx}`} className="border rounded p-2 flex-1" placeholder="Add a service" />
                    <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => {
                      const input = document.getElementById(`service-${idx}`) as HTMLInputElement;
                      if (input?.value) { addListItem(idx, "services", input.value); input.value = ""; }
                    }}>Add</button>
                  </div>
                  <ul className="list-disc ml-6 mt-2">
                    {(dept.services || []).map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span>{s}</span>
                        <button className="text-red-600" onClick={() => removeListItem(idx, "services", i)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Conditions */}
                <div className="mt-2">
                  <h3 className="font-semibold">Conditions Treated</h3>
                  <div className="flex gap-2 mt-1">
                    <input id={`condition-${idx}`} className="border rounded p-2 flex-1" placeholder="Add a condition" />
                    <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => {
                      const input = document.getElementById(`condition-${idx}`) as HTMLInputElement;
                      if (input?.value) { addListItem(idx, "conditions", input.value); input.value = ""; }
                    }}>Add</button>
                  </div>
                  <ul className="list-disc ml-6 mt-2">
                    {(dept.conditions || []).map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span>{s}</span>
                        <button className="text-red-600" onClick={() => removeListItem(idx, "conditions", i)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Equipment */}
                <div className="mt-2">
                  <h3 className="font-semibold">Key Technology & Equipment</h3>
                  <div className="flex gap-2 mt-1">
                    <input id={`equipment-${idx}`} className="border rounded p-2 flex-1" placeholder="Add equipment" />
                    <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => {
                      const input = document.getElementById(`equipment-${idx}`) as HTMLInputElement;
                      if (input?.value) { addListItem(idx, "equipment", input.value); input.value = ""; }
                    }}>Add</button>
                  </div>
                  <ul className="list-disc ml-6 mt-2">
                    {(dept.equipment || []).map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span>{s}</span>
                        <button className="text-red-600" onClick={() => removeListItem(idx, "equipment", i)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Doctors */}
      <section className="border rounded-lg p-4 bg-white shadow text-gray-900">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Doctors</h2>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={addDoctor}>Add Doctor</button>
        </div>
        <div className="space-y-4 mt-4">
          {(profile.doctors || []).map((doc, idx) => (
            <div key={idx} className="border rounded p-3 space-y-3">
              <div className="flex gap-2">
                <input className="border rounded p-2 flex-1" placeholder="Doctor Name" value={doc.name || ""} onChange={(e) => updateDoctor(idx, "name", e.target.value)} />
                <input className="border rounded p-2 flex-1" placeholder="Primary Specialty" value={doc.primarySpecialty || ""} onChange={(e) => updateDoctor(idx, "primarySpecialty", e.target.value)} />
                <input className="border rounded p-2 flex-1" placeholder="Sub-Specialty" value={doc.subSpecialty || ""} onChange={(e) => updateDoctor(idx, "subSpecialty", e.target.value)} />
                <button className="px-3 py-2 bg-green-600 text-white rounded" disabled={saving} onClick={() => makeDoctorBookable(idx)}>Make Bookable</button>
                <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={() => removeDoctor(idx)}>Remove</button>
              </div>

              {/* Associate with Departments */}
              {(profile.departments || []).length > 0 && (
                <div>
                  <h3 className="font-semibold">Associate with Departments</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {(profile.departments || []).map((d, i) => {
                      const checked = (doc.departments || []).includes(d.name);
                      return (
                        <label key={i} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={checked} onChange={() => toggleDoctorDepartment(idx, d.name)} />
                          <span>{d.name || `Dept ${i+1}`}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={saveProfile} disabled={saving || !hospitalId} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}