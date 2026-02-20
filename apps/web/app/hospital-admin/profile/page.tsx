"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
// Link removed as hospital-wide Slot Admin UI has been deprecated

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
  const [doctorAdmins, setDoctorAdmins] = useState<Record<number, { currentEmail?: string; email: string; password: string; saving: boolean; loading: boolean }>>({});
  const [linkedDoctors, setLinkedDoctors] = useState<Array<{ doctor: { id: number; email: string; doctorProfile?: any }, department?: { id: number; name: string } | null }>>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'departments' | 'doctors'>('departments');
  const [departmentsTab, setDepartmentsTab] = useState<'new' | 'existing'>('new');
  const [doctorsTab, setDoctorsTab] = useState<'new' | 'existing'>('new');
  const [newDepartment, setNewDepartment] = useState<{ name: string; description?: string }>({ name: '', description: '' });
  const [newDoctor, setNewDoctor] = useState<{ name: string; primarySpecialty?: string; subSpecialty?: string; departmentName?: string }>({ name: '', primarySpecialty: '', subSpecialty: '', departmentName: '' });
  const isHospitalAdmin = user?.role === "HOSPITAL_ADMIN";

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
        const [profRes, details] = await Promise.all([
          apiClient.getHospitalProfile(mine.id),
          apiClient.getHospitalDetails(mine.id)
        ]);
        if (profRes) setProfile(profRes as HospitalProfile);
        if (details?.doctors) setLinkedDoctors(details.doctors || []);
      } catch (e: any) {
        setMessage(e?.message || "Failed to load hospital profile.");
      }
    };
    load();
  }, [user, loading]);

  // Load per-doctor slot admin details when doctors list changes
  useEffect(() => {
    const doctors = profile.doctors || [];
    const loadPerDoctor = async () => {
      const next: Record<number, { currentEmail?: string; email: string; password: string; saving: boolean; loading: boolean }> = { ...doctorAdmins };
      for (const d of doctors) {
        if (d.doctorId && !next[d.doctorId]) {
          next[d.doctorId] = { email: "", password: "", saving: false, loading: true };
          setDoctorAdmins({ ...next });
          try {
            const sa = await apiClient.getHospitalSlotAdmin(d.doctorId);
            next[d.doctorId] = {
              currentEmail: sa?.slotAdmin?.email,
              email: sa?.slotAdmin?.email || "",
              password: "",
              saving: false,
              loading: false,
            };
            setDoctorAdmins({ ...next });
          } catch (e) {
            next[d.doctorId] = { email: "", password: "", saving: false, loading: false };
            setDoctorAdmins({ ...next });
          }
        }
      }
    };
    loadPerDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.doctors]);

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
    setProfile((prev) => {
      const firstDept = (prev.departments && prev.departments[0] && prev.departments[0].name) ? String(prev.departments[0].name) : "";
      const preset = firstDept ? [firstDept] : [];
      return {
        ...prev,
        doctors: [...(prev.doctors || []), { name: "", primarySpecialty: "", subSpecialty: "", departments: preset }],
      } as HospitalProfile;
    });
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
      const selectedDept = Array.isArray(d?.departments) && d.departments.length > 0 ? String(d.departments[0]) : (profile.departments?.[0]?.name || undefined);
      const payload = {
        name: d?.name || '',
        primarySpecialty: d?.primarySpecialty || undefined,
        subSpecialty: d?.subSpecialty || undefined,
        departmentName: selectedDept,
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
        if (selectedDept) {
          try { await apiClient.updateHospitalDoctorDepartment(myHospital.id, result.doctor.id, { departmentName: selectedDept }); } catch {}
        }
      }
      alert(`Doctor made bookable: ${result?.doctor?.email || 'created'}`);
    } catch (e: any) {
      alert(e?.message || 'Failed to make doctor bookable');
    } finally {
      setSaving(false);
    }
  };

  // Toggle ON/OFF for doctor bookable status
  const toggleDoctorBookable = async (idx: number) => {
    const d = (profile.doctors || [])[idx];
    // If currently OFF (no doctorId), turn ON by creating and linking
    if (!d?.doctorId) {
      await makeDoctorBookable(idx);
      return;
    }
    // If currently ON, turn OFF by unlinking from profile (soft disable)
    try {
      setSaving(true);
      const myHospital = await apiClient.getMyHospital();
      if (!myHospital?.id) throw new Error('Hospital not found for admin');
      const list = [...(profile.doctors || [])];
      const doc = { ...(list[idx] || {}) } as any;
      delete doc.doctorId;
      list[idx] = doc;
      const newProfile = { ...profile, doctors: list } as HospitalProfile;
      setProfile(newProfile);
      await apiClient.updateHospitalProfile(myHospital.id, newProfile);
      setMessage('Doctor set to OFF (not bookable).');
    } catch (e: any) {
      alert(e?.message || 'Failed to set doctor OFF');
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

  // Set a single department via dropdown selection
  const setDoctorDepartment = (idx: number, deptName: string) => {
    setProfile((prev) => {
      const list = [...(prev.doctors || [])];
      const doc = { ...list[idx] } as any;
      // store as single-selection array to keep schema compatibility
      doc.departments = deptName ? [deptName] : [];
      list[idx] = doc;
      return { ...prev, doctors: list } as HospitalProfile;
    });
  };

  const syncDoctorDepartment = async (idx: number) => {
    try {
      const myHospital = await apiClient.getMyHospital();
      if (!myHospital?.id) throw new Error('Hospital not found for admin');
      const d = (profile.doctors || [])[idx] as any;
      if (!d?.doctorId) throw new Error('Link this doctor first using Make Bookable');
      const deptName = Array.isArray(d?.departments) && d.departments[0] ? String(d.departments[0]) : '';
      if (!deptName) throw new Error('Select a department before syncing');
      await apiClient.updateHospitalDoctorDepartment(myHospital.id, d.doctorId, { departmentName: deptName });
      setMessage(`Doctor linked to department: ${deptName}`);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to sync doctor department');
    }
  };

  const saveProfile = async () => {
    if (!hospitalId) return;
    setSaving(true);
    setMessage("");
    try {
      await apiClient.updateHospitalProfile(hospitalId, profile);
      // Silent bulk sync of doctor departments after saving
      let count = 0;
      try {
        const hId = hospitalId;
        for (let i = 0; i < (profile.doctors || []).length; i++) {
          const d: any = (profile.doctors || [])[i];
          if (!d?.doctorId) continue;
          const deptName = Array.isArray(d?.departments) && d.departments[0] ? String(d.departments[0]) : '';
          if (!deptName) continue;
          try {
            await apiClient.updateHospitalDoctorDepartment(hId, d.doctorId, { departmentName: deptName });
            count++;
          } catch {}
        }
      } catch {}
      setMessage(`Profile saved successfully.${count > 0 ? ` Synced departments for ${count} doctors.` : ''}`);
    } catch (e: any) {
      setMessage(e?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const saveDepartments = async () => {
    try {
      if (!hospitalId) return;
      setSaving(true);
      setMessage("");
      await apiClient.updateHospitalProfile(hospitalId, { departments: profile.departments || [] });
      setMessage("Departments saved.");
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save departments');
    } finally {
      setSaving(false);
    }
  };

  const saveDoctorsOnly = async () => {
    try {
      if (!hospitalId) return;
      setSaving(true);
      setMessage("");
      await apiClient.updateHospitalProfile(hospitalId, { doctors: profile.doctors || [] });
      let count = 0;
      // After saving, auto-sync department for each linked doctor with selected department
      for (const d of (profile.doctors || [])) {
        const did = (d as any)?.doctorId;
        const deptName = Array.isArray((d as any)?.departments) && (d as any).departments[0] ? String((d as any).departments[0]) : '';
        if (!did || !deptName) continue;
        try {
          await apiClient.updateHospitalDoctorDepartment(hospitalId, did, { departmentName: deptName });
          count++;
        } catch {}
      }
      // Refresh linked doctors list
      try {
        const details = await apiClient.getHospitalDetails(hospitalId);
        if (details?.doctors) setLinkedDoctors(details.doctors || []);
      } catch {}
      setMessage(`Doctors saved.${count > 0 ? ` Synced departments for ${count} doctors.` : ''}`);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save doctors');
    } finally {
      setSaving(false);
    }
  };

  const syncAllDoctorDepartments = async () => {
    try {
      if (!hospitalId) {
        const myHospital = await apiClient.getMyHospital();
        if (!myHospital?.id) throw new Error('Hospital not found for admin');
        setHospitalId(myHospital.id);
      }
      const hId = hospitalId || (await apiClient.getMyHospital())?.id;
      if (!hId) throw new Error('Hospital not found for admin');
      let count = 0;
      for (let i = 0; i < (profile.doctors || []).length; i++) {
        const d: any = (profile.doctors || [])[i];
        if (!d?.doctorId) continue;
        const deptName = Array.isArray(d?.departments) && d.departments[0] ? String(d.departments[0]) : '';
        if (!deptName) continue;
        try {
          await apiClient.updateHospitalDoctorDepartment(hId, d.doctorId, { departmentName: deptName });
          count++;
        } catch {}
      }
      if (count > 0) setMessage(`Synced departments for ${count} doctors.`);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to sync departments');
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
      try {
        const perf = await import('@/lib/performance');
        if (perf && typeof perf.CacheManager?.clear === 'function') {
          perf.CacheManager.clear('homepage_hospitals');
        }
      } catch {}
    } catch (e: any) {
      setMessage(e?.message || "Failed to create hospital.");
    } finally {
      setCreatingHospital(false);
    }
  };

  // Removed hospital-wide Doctors Management save handler; only doctor-scoped management remain

  const saveDoctorSlotAdmin = async (doctorId?: number) => {
    if (!hospitalId) {
      setMessage("Create your hospital first, then add Doctors Management.");
      return;
    }
    if (!doctorId || !Number.isInteger(doctorId)) {
      setMessage("Link a real doctor first (Make Bookable) to assign Doctors Management.");
      return;
    }
    const current = doctorAdmins[doctorId] || { email: "", password: "", saving: false, loading: false };
    if (!current.email || !current.password) {
      setMessage("Please provide Slot Admin email and password for the doctor.");
      return;
    }
    setDoctorAdmins((prev) => ({ ...prev, [doctorId]: { ...current, saving: true } }));
    try {
      const res = await apiClient.upsertHospitalSlotAdmin(current.email, current.password, doctorId);
      setDoctorAdmins((prev) => ({ ...prev, [doctorId]: { ...prev[doctorId], currentEmail: res.slotAdmin.email, password: "", saving: false } }));
      setMessage("Doctor Slot Admin credentials updated successfully.");
    } catch (e: any) {
      setMessage(e?.message || "Failed to update Doctor Slot Admin credentials.");
      setDoctorAdmins((prev) => ({ ...prev, [doctorId]: { ...prev[doctorId], saving: false } }));
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

  // Frontend guard: surface clearer hint if not HOSPITAL_ADMIN

  const handleUploadLogo = async () => {
    if (!hospitalId) {
      setMessage("Create your hospital first before uploading a logo.");
      return;
    }
    if (!logoFile) {
      setMessage("Please select a logo file to upload.");
      return;
    }
    try {
      setUploadingLogo(true);
      setMessage("");
      const res = await apiClient.uploadHospitalLogo(hospitalId, logoFile);
      setProfile((p) => ({ ...p, general: { ...(p.general || {}), logoUrl: res.url } }));
      setMessage("Logo uploaded successfully.");
    } catch (e: any) {
      setMessage(e?.message || "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 min-h-screen bg-gray-50 text-gray-900">
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6">
  <div className="flex items-center space-x-4">
    {profile.general?.logoUrl && (
      <img src={profile.general.logoUrl} alt="Logo" className="h-12 w-12 rounded-full border border-white/30" />
    )}
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold">{profile.general?.brandName || profile.general?.legalName || 'Hospital Profile'}</h1>
      <p className="opacity-90 text-sm sm:text-base">{profile.general?.tagline || 'Manage your hospital information and doctor team'}</p>
    </div>
  </div>
</section>
      {message && <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">{message}</div>}

      {/* Hospital-wide Slot Admin section removed. Only per-doctor Slot Admin controls remain below. */}

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
            <div className="space-y-2">
              <input className="border rounded p-2 w-full" placeholder="Logo URL" value={profile.general?.logoUrl || ""} onChange={(e) => updateGeneralField("logoUrl", e.target.value)} />
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="border rounded p-2 w-full"
                />
                <button
                  type="button"
                  onClick={handleUploadLogo}
                  disabled={!logoFile || uploadingLogo || !hospitalId}
                  className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {uploadingLogo ? "Uploading…" : "Upload Logo"}
                </button>
              </div>
            </div>
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

      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-3 py-2 rounded ${activeTab === 'departments' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
          onClick={() => setActiveTab('departments')}
        >
          Departments
        </button>
        <button
          className={`px-3 py-2 rounded ${activeTab === 'doctors' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
          onClick={() => setActiveTab('doctors')}
        >
          Doctors
        </button>
      </div>

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
      {activeTab === 'departments' && (
      <section className="border rounded-lg p-4 bg-white shadow text-gray-900">
        <div className="flex items-center gap-2 mb-4">
          <button
            className={`px-3 py-2 rounded ${departmentsTab === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
            onClick={() => setDepartmentsTab('new')}
          >
            New Department
          </button>
          <button
            className={`px-3 py-2 rounded ${departmentsTab === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
            onClick={() => setDepartmentsTab('existing')}
          >
            Existing Departments
          </button>
        </div>

        {departmentsTab === 'new' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                className="border rounded p-2"
                placeholder="Department Name"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
              />
              <input
                className="border rounded p-2 md:col-span-2"
                placeholder="Description (optional)"
                value={newDepartment.description || ''}
                onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={() => {
                  const name = (newDepartment.name || '').trim();
                  if (!name) { setMessage('Please enter Department Name'); return; }
                  setProfile((prev) => ({
                    ...prev,
                    departments: [...(prev.departments || []), { name, description: (newDepartment.description || '').trim(), services: [], conditions: [], equipment: [], photos: [], videos: [], associatedDoctorIds: [] }],
                  }));
                  setNewDepartment({ name: '', description: '' });
                  setDepartmentsTab('existing');
                }}
              >
                Add Department
              </button>
              <button
                className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
                onClick={saveDepartments}
                disabled={saving || !hospitalId}
              >
                Save Departments
              </button>
            </div>
          </div>
        )}

        {departmentsTab === 'existing' && (
          <div>
            <button className="w-full text-left" onClick={() => setDepartmentsExpanded(!departmentsExpanded)}>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Medical Departments & Specialties</h2>
                <span>{departmentsExpanded ? "▾" : "▸"}</span>
              </div>
            </button>
            {departmentsExpanded && (
              <div className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setDepartmentsTab('new')}>Add Department</button>
                  <button className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50" onClick={saveDepartments} disabled={saving || !hospitalId}>Save Departments</button>
                </div>
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
          </div>
        )}
      </section>
      )}

      {/* Doctors */}
      {activeTab === 'doctors' && (
      <section className="border rounded-lg p-4 bg-white shadow text-gray-900">
        <div className="flex items-center gap-2 mb-4">
          <button
            className={`px-3 py-2 rounded ${doctorsTab === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
            onClick={() => setDoctorsTab('new')}
          >
            New Doctor
          </button>
          <button
            className={`px-3 py-2 rounded ${doctorsTab === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
            onClick={() => setDoctorsTab('existing')}
          >
            Existing Doctors
          </button>
        </div>
        {doctorsTab === 'new' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className="border rounded p-2" placeholder="Doctor Name" value={newDoctor.name} onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })} />
              <input className="border rounded p-2" placeholder="Primary Specialty" value={newDoctor.primarySpecialty || ''} onChange={(e) => setNewDoctor({ ...newDoctor, primarySpecialty: e.target.value })} />
              <input className="border rounded p-2" placeholder="Sub-Specialty" value={newDoctor.subSpecialty || ''} onChange={(e) => setNewDoctor({ ...newDoctor, subSpecialty: e.target.value })} />
            </div>
            {(profile.departments || []).length > 0 && (
              <div>
                <h3 className="font-semibold">Associate with Department</h3>
                <select
                  className="border rounded p-2 w-full mt-2"
                  value={newDoctor.departmentName || ''}
                  onChange={(e) => setNewDoctor({ ...newDoctor, departmentName: e.target.value })}
                >
                  <option value="">Select a department (optional)</option>
                  {(profile.departments || []).map((d, i) => (
                    <option key={i} value={d.name}>{d.name || `Dept ${i+1}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={() => {
                  const name = (newDoctor.name || '').trim();
                  if (!name) { setMessage('Please enter Doctor Name'); return; }
                  const deptName = (newDoctor.departmentName || '').trim();
                  setProfile((prev) => ({
                    ...prev,
                    doctors: [...(prev.doctors || []), { name, primarySpecialty: (newDoctor.primarySpecialty || '').trim(), subSpecialty: (newDoctor.subSpecialty || '').trim(), departments: deptName ? [deptName] : [] }],
                  } as HospitalProfile));
                  setNewDoctor({ name: '', primarySpecialty: '', subSpecialty: '', departmentName: '' });
                  setDoctorsTab('existing');
                }}
              >
                Add Doctor
              </button>
              <button
                className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
                onClick={saveDoctorsOnly}
                disabled={saving || !hospitalId}
              >
                Save Doctors
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Doctors</h2>
              <div className="flex gap-2">
                <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setDoctorsTab('new')}>Add Doctor</button>
                <button className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50" onClick={saveDoctorsOnly} disabled={saving || !hospitalId}>Save Doctors</button>
              </div>
            </div>
            <div className="space-y-4 mt-4">
              {(profile.doctors || []).map((doc, idx) => (
                <div key={idx} className="border rounded p-3 space-y-3">
                  <div className="flex gap-2">
                    <input className="border rounded p-2 flex-1" placeholder="Doctor Name" value={doc.name || ""} onChange={(e) => updateDoctor(idx, "name", e.target.value)} />
                    <input className="border rounded p-2 flex-1" placeholder="Primary Specialty" value={doc.primarySpecialty || ""} onChange={(e) => updateDoctor(idx, "primarySpecialty", e.target.value)} />
                    <input className="border rounded p-2 flex-1" placeholder="Sub-Specialty" value={doc.subSpecialty || ""} onChange={(e) => updateDoctor(idx, "subSpecialty", e.target.value)} />
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700">Bookable</span>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={Boolean((profile.doctors || [])[idx]?.doctorId)}
                          onChange={() => toggleDoctorBookable(idx)}
                          disabled={saving}
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-green-600 transition-colors relative">
                          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                        </div>
                        <span className="ml-2 text-sm text-gray-800">{Boolean((profile.doctors || [])[idx]?.doctorId) ? 'ON' : 'OFF'}</span>
                      </label>
                    </div>
                    <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={() => removeDoctor(idx)}>Remove</button>
                  </div>

                  {/* Doctor-scoped Slot Admin */}
                  <div className="mt-2 border rounded p-3 bg-gray-50">
                    <h3 className="font-semibold">Doctor Slot Admin</h3>
                    {!doc.doctorId && (
                      <div className="text-sm text-gray-700 mt-1">
                        Link this doctor to a real account first by clicking <span className="font-semibold">Make Bookable</span>.
                      </div>
                    )}
                    {doc.doctorId && (
                      <div className="space-y-2 mt-2">
                        <div className="text-sm text-gray-700">
                          Current Slot Admin: {doctorAdmins[doc.doctorId]?.currentEmail ? (
                            <span className="font-mono">{doctorAdmins[doc.doctorId]?.currentEmail}</span>
                          ) : (
                            <span className="text-gray-500">None</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="email"
                            className="border rounded p-2"
                            placeholder="Slot Admin Email"
                            value={doctorAdmins[doc.doctorId]?.email || ""}
                            onChange={(e) => setDoctorAdmins((prev) => ({ ...prev, [doc.doctorId!]: { ...prev[doc.doctorId!], email: e.target.value } }))}
                            disabled={doctorAdmins[doc.doctorId]?.loading}
                          />
                          <input
                            type="password"
                            className="border rounded p-2"
                            placeholder="New Password"
                            value={doctorAdmins[doc.doctorId]?.password || ""}
                            onChange={(e) => setDoctorAdmins((prev) => ({ ...prev, [doc.doctorId!]: { ...prev[doc.doctorId!], password: e.target.value } }))}
                            disabled={doctorAdmins[doc.doctorId]?.loading}
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                            onClick={() => saveDoctorSlotAdmin(doc.doctorId)}
                            disabled={doctorAdmins[doc.doctorId]?.saving || doctorAdmins[doc.doctorId]?.loading}
                          >
                            {doctorAdmins[doc.doctorId]?.saving ? 'Saving...' : (doctorAdmins[doc.doctorId]?.currentEmail ? 'Update Slot Admin' : 'Create Slot Admin')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Associate with Departments */}
                  {(profile.departments || []).length > 0 && (
                    <div>
                      <h3 className="font-semibold">Associate with Departments</h3>
                      <div className="mt-2">
                        <select
                          className="border rounded p-2 w-full"
                          value={(doc.departments && doc.departments[0]) || ""}
                          onChange={(e) => setDoctorDepartment(idx, e.target.value)}
                        >
                          <option value="" disabled>Select a department</option>
                          {(profile.departments || []).map((d, i) => (
                            <option key={i} value={d.name}>{d.name || `Dept ${i+1}`}</option>
                          ))}
                        </select>
                        {doc.doctorId && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => syncDoctorDepartment(idx)}
                              className="px-3 py-2 bg-emerald-600 text-white rounded"
                            >
                              Sync Department
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      )}

      {activeTab === 'doctors' && doctorsTab === 'existing' && linkedDoctors.length > 0 && (
        <section className="border rounded-lg p-4 bg-white shadow text-gray-900 mt-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Linked Doctors (Real Accounts)</h2>
          </div>
          <div className="space-y-3">
            {linkedDoctors.map((link, i) => (
              <div key={i} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-mono">{link.doctor.email}</div>
                  <div className="text-xs text-gray-600">Current: {link.department?.name || 'None'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded p-2"
                    value={link.department?.name || ''}
                    onChange={async (e) => {
                      const name = e.target.value;
                      try {
                        if (!hospitalId) return;
                        await apiClient.updateHospitalDoctorDepartment(hospitalId, link.doctor.id, { departmentName: name || undefined });
                        const details = await apiClient.getHospitalDetails(hospitalId);
                        setLinkedDoctors(details?.doctors || []);
                        setMessage(`Updated ${link.doctor.email} → ${name || 'None'}`);
                      } catch (err: any) {
                        setMessage(err?.message || 'Failed to update department');
                      }
                    }}
                  >
                    <option value="">Select department</option>
                    {(profile.departments || []).map((d, di) => (
                      <option key={di} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-between">
        <button onClick={syncAllDoctorDepartments} disabled={saving || !profile.doctors || profile.doctors.length === 0} className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">
          Sync All Doctor Departments
        </button>
        <button onClick={saveProfile} disabled={saving || !hospitalId} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
