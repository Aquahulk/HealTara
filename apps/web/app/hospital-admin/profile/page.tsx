"use client";
// Hospital Admin Dashboard: Profile & Team Management
// Route: /hospital-admin/profile
// Purpose: Manage hospital profile JSON (general, about, departments, doctors),
// link real doctors (bookable ON/OFF), assign departments, set microsite subdomain,
// and upload branding assets like logo.

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";

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
  const [doctorAdmins, setDoctorAdmins] = useState<Record<number, { currentEmail?: string; email: string; password: string; saving: boolean; loading: boolean }>>({});
  const [linkedDoctors, setLinkedDoctors] = useState<Array<{ doctor: { id: number; email: string; doctorProfile?: any }, department?: { id: number; name: string } | null }>>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'general' | 'about' | 'departments' | 'doctors'>('general');
  const [newDepartment, setNewDepartment] = useState<{ name: string; description?: string }>({ name: '', description: '' });
  const [newDoctor, setNewDoctor] = useState<{ name: string; primarySpecialty?: string; subSpecialty?: string; departmentName?: string }>({ name: '', primarySpecialty: '', subSpecialty: '', departmentName: '' });
  const [subdomain, setSubdomain] = useState<string>('');
  const [subdomainChecking, setSubdomainChecking] = useState<boolean>(false);
  const [subdomainError, setSubdomainError] = useState<string>('');
  const [initialSubdomain, setInitialSubdomain] = useState<string>('');
  const [expandedDepartments, setExpandedDepartments] = useState<Set<number>>(new Set());
  const [expandedDoctors, setExpandedDoctors] = useState<Set<number>>(new Set());

  const isHospitalAdmin = user?.role === "HOSPITAL_ADMIN";

  useEffect(() => {
    if (loading) return;
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
        if (details?.subdomain) {
          setSubdomain(details.subdomain);
          setInitialSubdomain(details.subdomain);
        }
      } catch (e: any) {
        setMessage(e?.message || "Failed to load hospital profile.");
      }
    };
    load();
  }, [user, loading]);

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

  // Verification submission for hospital
  const [verification, setVerification] = useState<{ registrationNumberGov: string; phone: string; address: string; city: string; state: string }>({
    registrationNumberGov: '',
    phone: '',
    address: '',
    city: '',
    state: '',
  });
  async function submitHospitalVerification() {
    try {
      setSaving(true);
      setMessage('');
      await apiClient.submitHospitalVerification(verification);
      setMessage('Verification submitted. Waiting for admin confirmation.');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to submit hospital verification');
    } finally {
      setSaving(false);
    }
  }
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

  const validateSubdomainFormat = (s: string) => {
    const v = (s || '').toLowerCase().trim();
    if (!v) return '';
    if (v.length < 2 || v.length > 63) return 'Must be 2-63 characters';
    if (v.includes('.')) return 'Enter only the name, not .healtara.com';
    if (!/^[a-z0-9-]+$/.test(v)) return 'Only lowercase letters, numbers, and hyphens';
    if (v.startsWith('-') || v.endsWith('-')) return 'Cannot start or end with hyphen';
    const reserved = new Set(['www','api','admin','doctor','doctors','hospital','hospitals']);
    if (reserved.has(v)) return 'Reserved subdomain';
    return '';
  };

  const checkAvailability = async (name: string) => {
    const err = validateSubdomainFormat(name);
    setSubdomainError(err);
    if (err || !name) return;
    setSubdomainChecking(true);
    try {
      const r = await apiClient.isHospitalSubdomainAvailable(name);
      setSubdomainError(r.available ? '' : 'Subdomain already taken');
    } catch (e: any) {
      setSubdomainError(e?.message || 'Check failed');
    } finally {
      setSubdomainChecking(false);
    }
  };

  const saveSubdomain = async () => {
    if (!hospitalId) {
      setMessage('Create your hospital first.');
      return;
    }
    const err = validateSubdomainFormat(subdomain);
    if (err) {
      setSubdomainError(err);
      return;
    }
    setSaving(true);
    try {
      await apiClient.setHospitalSubdomain(hospitalId, subdomain);
      setInitialSubdomain(subdomain);
      setMessage('Subdomain saved successfully. This cannot be changed.');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save subdomain');
    } finally {
      setSaving(false);
    }
  };

  const addListItem = (idx: number, field: "services" | "conditions" | "equipment" | "photos" | "videos", value: string) => {
    updateDepartment(idx, field, [ ...((profile.departments?.[idx] as any)?.[field] || []), value ]);
  };

  const removeListItem = (idx: number, field: "services" | "conditions" | "equipment" | "photos" | "videos", itemIdx: number) => {
    const arr = [ ...(((profile.departments?.[idx] as any)?.[field] || [])) ];
    arr.splice(itemIdx, 1);
    updateDepartment(idx, field, arr);
  };

  const updateDoctor = (idx: number, field: string, value: any) => {
    setProfile((prev) => {
      const list = [...(prev.doctors || [])];
      list[idx] = { ...list[idx], [field]: value } as any;
      return { ...prev, doctors: list } as HospitalProfile;
    });
  };

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

  const toggleDoctorBookable = async (idx: number) => {
    const d = (profile.doctors || [])[idx];
    if (!d?.doctorId) {
      await makeDoctorBookable(idx);
      return;
    }
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

  const setDoctorDepartment = (idx: number, deptName: string) => {
    setProfile((prev) => {
      const list = [...(prev.doctors || [])];
      const doc = { ...list[idx] } as any;
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
      for (const d of (profile.doctors || [])) {
        const did = (d as any)?.doctorId;
        const deptName = Array.isArray((d as any)?.departments) && (d as any).departments[0] ? String((d as any).departments[0]) : '';
        if (!did || !deptName) continue;
        try {
          await apiClient.updateHospitalDoctorDepartment(hospitalId, did, { departmentName: deptName });
          count++;
        } catch {}
      }
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

  const bulkSyncDoctorDepartments = async () => {
    try {
      if (!hospitalId) return;
      setSaving(true);
      let count = 0;
      const myHospital = await apiClient.getMyHospital();
      const hId = myHospital?.id || hospitalId;
      for (const d of (profile.doctors || [])) {
        const did = (d as any)?.doctorId;
        const deptName = Array.isArray((d as any)?.departments) && (d as any).departments[0] ? String((d as any).departments[0]) : '';
        if (!did || !deptName) continue;
        try {
          await apiClient.updateHospitalDoctorDepartment(hId, did, { departmentName: deptName });
          count++;
        } catch {}
      }
      setMessage(count > 0 ? `Synced departments for ${count} doctors.` : 'No linked doctors to sync');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to sync departments');
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Please log in</h1>
          <p className="text-gray-600 mt-2">Hospital admin access required.</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "HOSPITAL_ADMIN" && user.role !== "DOCTOR")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Access denied</h1>
          <p className="text-gray-600 mt-2">This page is only for hospital admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header with Analytics */}
        <div className="mb-8">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {profile.general?.logoUrl ? (
                <img src={profile.general.logoUrl} alt="Logo" className="w-24 h-24 rounded-2xl border-4 border-white/30 object-cover shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center text-white text-4xl font-bold backdrop-blur-sm shadow-lg">
                  🏥
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  {profile.general?.brandName || profile.general?.legalName || 'Hospital Dashboard'}
                </h1>
                <p className="text-blue-100 text-lg">{profile.general?.tagline || 'Manage your hospital information and doctor team'}</p>
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          {hospitalId && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {/* Total Doctors */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Doctors</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{(profile.doctors || []).length}</p>
                    <p className="text-green-600 text-xs mt-1 font-semibold">
                      {(profile.doctors || []).filter((d: any) => d.doctorId).length} Active
                    </p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-4">
                    <span className="text-3xl">👨‍⚕️</span>
                  </div>
                </div>
              </div>

              {/* Departments */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Departments</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{(profile.departments || []).length}</p>
                    <p className="text-gray-500 text-xs mt-1">Medical Specialties</p>
                  </div>
                  <div className="bg-green-100 rounded-full p-4">
                    <span className="text-3xl">🏥</span>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Services</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {(profile.departments || []).reduce((acc: number, d: any) => acc + (d.services || []).length, 0)}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">Across all departments</p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-4">
                    <span className="text-3xl">💊</span>
                  </div>
                </div>
              </div>

              {/* Profile Completion */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Profile Status</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {(() => {
                        let score = 0;
                        if (profile.general?.brandName) score += 20;
                        if (profile.general?.address) score += 20;
                        if ((profile.departments || []).length > 0) score += 20;
                        if ((profile.doctors || []).length > 0) score += 20;
                        if (profile.about?.mission) score += 20;
                        return score;
                      })()}%
                    </p>
                    <p className="text-orange-600 text-xs mt-1 font-semibold">
                      {(() => {
                        const score = (() => {
                          let s = 0;
                          if (profile.general?.brandName) s += 20;
                          if (profile.general?.address) s += 20;
                          if ((profile.departments || []).length > 0) s += 20;
                          if ((profile.doctors || []).length > 0) s += 20;
                          if (profile.about?.mission) s += 20;
                          return s;
                        })();
                        return score === 100 ? 'Complete' : 'In Progress';
                      })()}
                    </p>
                  </div>
                  <div className="bg-orange-100 rounded-full p-4">
                    <span className="text-3xl">📊</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('Error') || message.includes('Failed') ? 'bg-red-50 border-2 border-red-200 text-red-800' : 'bg-green-50 border-2 border-green-200 text-green-800'}`}>
            <p className="font-medium">{message}</p>
          </div>
        )}

        {/* Create Hospital Section */}
        {!hospitalId && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🏥</div>
              <h2 className="text-2xl font-bold text-gray-900">Create Your Hospital</h2>
              <p className="text-gray-600 mt-2">No hospital is linked to your admin account yet. Create one to enable saving the profile.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <input 
                className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                placeholder="Hospital Name (required)" 
                value={createHospitalForm.name} 
                onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, name: e.target.value })} 
              />
              <input 
                className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                placeholder="Phone" 
                value={createHospitalForm.phone} 
                onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, phone: e.target.value })} 
              />
              <input 
                className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all md:col-span-2" 
                placeholder="Address" 
                value={createHospitalForm.address} 
                onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, address: e.target.value })} 
              />
              <input 
                className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                placeholder="City" 
                value={createHospitalForm.city} 
                onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, city: e.target.value })} 
              />
              <input 
                className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                placeholder="State" 
                value={createHospitalForm.state} 
                onChange={(e) => setCreateHospitalForm({ ...createHospitalForm, state: e.target.value })} 
              />
            </div>
            <div className="mt-6 text-center">
              <button 
                onClick={createHospital} 
                disabled={creatingHospital} 
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingHospital ? "Creating..." : "Create Hospital"}
              </button>
            </div>
          </div>
        )}

        {/* Verification Section */}
        {hospitalId && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Verification</h2>
              <p className="text-gray-600">Submit required details to enable services</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Government Registration Number</label>
                <input
                  type="text"
                  value={verification.registrationNumberGov}
                  onChange={(e) => setVerification((v) => ({ ...v, registrationNumberGov: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="Gov Reg. Number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile</label>
                <input
                  type="text"
                  value={verification.phone}
                  onChange={(e) => setVerification((v) => ({ ...v, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="+91..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={verification.address}
                  onChange={(e) => setVerification((v) => ({ ...v, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="Street and locality"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={verification.city}
                  onChange={(e) => setVerification((v) => ({ ...v, city: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={verification.state}
                  onChange={(e) => setVerification((v) => ({ ...v, state: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-3"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                disabled={saving}
                onClick={submitHospitalVerification}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200"
              >
                {saving ? 'Submitting…' : 'Submit Verification'}
              </button>
            </div>
          </div>
        )}
        {/* Navigation Tabs */}
        {hospitalId && (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-2 mb-8 flex gap-2 overflow-x-auto">
              <button
                className={`flex-1 min-w-[120px] px-6 py-4 rounded-xl font-semibold transition-all ${
                  activeSection === 'general'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveSection('general')}
              >
                <div className="text-2xl mb-1">🏢</div>
                General Info
              </button>
              <button
                className={`flex-1 min-w-[120px] px-6 py-4 rounded-xl font-semibold transition-all ${
                  activeSection === 'about'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveSection('about')}
              >
                <div className="text-2xl mb-1">📖</div>
                About Us
              </button>
              <button
                className={`flex-1 min-w-[120px] px-6 py-4 rounded-xl font-semibold transition-all ${
                  activeSection === 'departments'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveSection('departments')}
              >
                <div className="text-2xl mb-1">🏥</div>
                Departments
              </button>
              <button
                className={`flex-1 min-w-[120px] px-6 py-4 rounded-xl font-semibold transition-all ${
                  activeSection === 'doctors'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveSection('doctors')}
              >
                <div className="text-2xl mb-1">👨‍⚕️</div>
                Doctors
              </button>
            </div>

            {/* General Information Section */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                    <p className="text-sm text-gray-600 mt-1">Hospital identity and branding</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Legal Name</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Full Legal Name" 
                        value={profile.general?.legalName || ""} 
                        onChange={(e) => updateGeneralField("legalName", e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Brand Name</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Brand Name" 
                        value={profile.general?.brandName || ""} 
                        onChange={(e) => updateGeneralField("brandName", e.target.value)} 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tagline</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Hospital Tagline" 
                        value={profile.general?.tagline || ""} 
                        onChange={(e) => updateGeneralField("tagline", e.target.value)} 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Logo</label>
                      <div className="flex gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                          className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleUploadLogo}
                          disabled={!logoFile || uploadingLogo}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingLogo ? "Uploading…" : "Upload"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location & Contact */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Location & Address</h2>
                    <p className="text-sm text-gray-600 mt-1">Physical location details</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Complete Address</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Street Address" 
                        value={profile.general?.address || ""} 
                        onChange={(e) => updateGeneralField("address", e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">PIN Code</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="PIN code" 
                        value={profile.general?.pincode || ""} 
                        onChange={(e) => updateGeneralField("pincode", e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Google Maps Link</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Google Maps URL" 
                        value={profile.general?.googleMapsLink || ""} 
                        onChange={(e) => updateGeneralField("googleMapsLink", e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* Hospital Website Domain */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Hospital’s Website Domain</h2>
                    <p className="text-sm text-gray-600 mt-1">One-time setup for your hospital website domain {initialSubdomain && <span className="text-red-600 font-semibold">(Cannot be changed once set)</span>}</p>
                  </div>
                  <div className="p-6">
                    {initialSubdomain ? (
                      <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-1">Hospital Website Domain:</p>
                            <p className="text-xl font-bold text-gray-900">{`${initialSubdomain}.`}{process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'healtara.com'}</p>
                          </div>
                          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold text-sm">
                            ✓ Active
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-3">
                          ⚠️ Domain cannot be changed once set. Contact support if you need to update it.
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <div className="flex items-stretch">
                            <input
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-l-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                              placeholder="hospitalname"
                              value={subdomain}
                              onChange={(e) => {
                                const v = e.target.value.toLowerCase().trim();
                                setSubdomain(v);
                              }}
                              onBlur={() => checkAvailability(subdomain)}
                            />
                            <span className="px-4 py-3 bg-gray-100 border-t-2 border-b-2 border-r-2 border-gray-200 rounded-r-xl text-gray-600 select-none">.healtara.com</span>
                          </div>
                          {subdomainChecking && <p className="text-sm text-gray-500 mt-2">Checking availability…</p>}
                          {subdomainError && <p className="text-sm text-red-600 mt-2">{subdomainError}</p>}
                          <p className="text-xs text-gray-500 mt-1">Example: hospitalname.healtara.com</p>
                          <p className="text-sm text-amber-600 mt-2 font-medium">
                            ⚠️ Warning: Once saved, this domain cannot be changed!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={saveSubdomain}
                          disabled={!!subdomainError || subdomainChecking || !subdomain}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save Domain
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Numbers */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Contact Numbers</h2>
                    <p className="text-sm text-gray-600 mt-1">Phone numbers for different services</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency/Casualty</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Emergency" 
                        value={profile.general?.contacts?.emergency || ""} 
                        onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), emergency: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Reception</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Reception" 
                        value={profile.general?.contacts?.reception || ""} 
                        onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), reception: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ambulance</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Ambulance" 
                        value={profile.general?.contacts?.ambulance || ""} 
                        onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), ambulance: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Appointment Desk</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Appointments" 
                        value={profile.general?.contacts?.appointment || ""} 
                        onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), appointment: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Health Check-ups</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Health Checkups" 
                        value={profile.general?.contacts?.healthCheckups || ""} 
                        onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), healthCheckups: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Fax</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Fax" 
                        value={profile.general?.contacts?.fax || ""} 
                        onChange={(e) => updateGeneralField("contacts", { ...(profile.general?.contacts || {}), fax: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

                {/* Email Addresses */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Email Addresses</h2>
                    <p className="text-sm text-gray-600 mt-1">Email contacts for different purposes</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Info Email</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="info@hospital.com" 
                        value={profile.general?.emails?.info || ""} 
                        onChange={(e) => updateGeneralField("emails", { ...(profile.general?.emails || {}), info: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Appointments Email</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="appointments@hospital.com" 
                        value={profile.general?.emails?.appointments || ""} 
                        onChange={(e) => updateGeneralField("emails", { ...(profile.general?.emails || {}), appointments: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Feedback Email</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="feedback@hospital.com" 
                        value={profile.general?.emails?.feedback || ""} 
                        onChange={(e) => updateGeneralField("emails", { ...(profile.general?.emails || {}), feedback: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Careers Email</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="hr@hospital.com" 
                        value={profile.general?.emails?.careers || ""} 
                        onChange={(e) => updateGeneralField("emails", { ...(profile.general?.emails || {}), careers: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Social Media</h2>
                    <p className="text-sm text-gray-600 mt-1">Connect with patients on social platforms</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Facebook</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Facebook URL" 
                        value={profile.general?.social?.facebook || ""} 
                        onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), facebook: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Twitter</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Twitter URL" 
                        value={profile.general?.social?.twitter || ""} 
                        onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), twitter: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Instagram</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="Instagram URL" 
                        value={profile.general?.social?.instagram || ""} 
                        onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), instagram: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="LinkedIn URL" 
                        value={profile.general?.social?.linkedin || ""} 
                        onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), linkedin: e.target.value })} 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">YouTube</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all" 
                        placeholder="YouTube URL" 
                        value={profile.general?.social?.youtube || ""} 
                        onChange={(e) => updateGeneralField("social", { ...(profile.general?.social || {}), youtube: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* About Us Section */}
            {activeSection === 'about' && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">About Your Hospital</h2>
                  <p className="text-sm text-gray-600 mt-1">Tell your story and values</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mission Statement</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all min-h-[120px]" 
                      placeholder="Our mission is to..." 
                      value={profile.about?.mission || ""} 
                      onChange={(e) => setProfile((p) => ({ ...p, about: { ...(p.about || {}), mission: e.target.value } }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vision Statement</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all min-h-[120px]" 
                      placeholder="Our vision is to..." 
                      value={profile.about?.vision || ""} 
                      onChange={(e) => setProfile((p) => ({ ...p, about: { ...(p.about || {}), vision: e.target.value } }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Core Values</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all min-h-[120px]" 
                      placeholder="Our values include..." 
                      value={profile.about?.values || ""} 
                      onChange={(e) => setProfile((p) => ({ ...p, about: { ...(p.about || {}), values: e.target.value } }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">History</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all min-h-[120px]" 
                      placeholder="Founded in..." 
                      value={profile.about?.history || ""} 
                      onChange={(e) => setProfile((p) => ({ ...p, about: { ...(p.about || {}), history: e.target.value } }))} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Departments Section */}
            {activeSection === 'departments' && (
              <div className="space-y-6">
                {/* Add New Department */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Add New Department</h2>
                    <p className="text-sm text-gray-600 mt-1">Create a new medical department</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Department Name *</label>
                        <input
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                          placeholder="e.g., Cardiology"
                          value={newDepartment.name}
                          onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                        <input
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                          placeholder="Brief description"
                          value={newDepartment.description || ''}
                          onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                        onClick={() => {
                          const name = (newDepartment.name || '').trim();
                          if (!name) { setMessage('Please enter Department Name'); return; }
                          setProfile((prev) => ({
                            ...prev,
                            departments: [...(prev.departments || []), { name, description: (newDepartment.description || '').trim(), services: [], conditions: [], equipment: [], photos: [], videos: [], associatedDoctorIds: [] }],
                          }));
                          setNewDepartment({ name: '', description: '' });
                        }}
                      >
                        Add Department
                      </button>
                      <button
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                        onClick={saveDepartments}
                        disabled={saving}
                      >
                        Save All Departments
                      </button>
                    </div>
                  </div>
                </div>

                {/* Existing Departments */}
                {(profile.departments || []).length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900">Existing Departments ({profile.departments?.length || 0})</h2>
                      <p className="text-sm text-gray-600 mt-1">Manage your hospital departments</p>
                    </div>
                    <div className="p-6 space-y-4">
                      {(profile.departments || []).map((dept, idx) => (
                        <div key={idx} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between mb-4">
                            <button
                              onClick={() => {
                                const newSet = new Set(expandedDepartments);
                                if (newSet.has(idx)) {
                                  newSet.delete(idx);
                                } else {
                                  newSet.add(idx);
                                }
                                setExpandedDepartments(newSet);
                              }}
                              className="flex-1 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{expandedDepartments.has(idx) ? '▼' : '▶'}</span>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">{dept.name || `Department ${idx + 1}`}</h3>
                                  {dept.description && <p className="text-sm text-gray-600 mt-1">{dept.description}</p>}
                                </div>
                              </div>
                            </button>
                            <button
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                              onClick={() => removeDepartment(idx)}
                            >
                              Remove
                            </button>
                          </div>

                          {expandedDepartments.has(idx) && (
                            <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Department Name</label>
                                  <input
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                                    placeholder="Department Name"
                                    value={dept.name}
                                    onChange={(e) => updateDepartment(idx, "name", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                  <input
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                                    placeholder="Description"
                                    value={dept.description || ""}
                                    onChange={(e) => updateDepartment(idx, "description", e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Services */}
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Services Offered</h4>
                                <div className="flex gap-2 mb-2">
                                  <input
                                    id={`service-${idx}`}
                                    className="flex-1 px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                    placeholder="Add a service"
                                  />
                                  <button
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                    onClick={() => {
                                      const input = document.getElementById(`service-${idx}`) as HTMLInputElement;
                                      if (input?.value) { addListItem(idx, "services", input.value); input.value = ""; }
                                    }}
                                  >
                                    Add
                                  </button>
                                </div>
                                {(dept.services || []).length > 0 && (
                                  <ul className="space-y-1">
                                    {(dept.services || []).map((s, i) => (
                                      <li key={i} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                                        <span className="text-sm text-gray-800">{s}</span>
                                        <button
                                          className="text-red-600 hover:text-red-700 font-semibold text-sm"
                                          onClick={() => removeListItem(idx, "services", i)}
                                        >
                                          Remove
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {/* Conditions */}
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Conditions Treated</h4>
                                <div className="flex gap-2 mb-2">
                                  <input
                                    id={`condition-${idx}`}
                                    className="flex-1 px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                    placeholder="Add a condition"
                                  />
                                  <button
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                    onClick={() => {
                                      const input = document.getElementById(`condition-${idx}`) as HTMLInputElement;
                                      if (input?.value) { addListItem(idx, "conditions", input.value); input.value = ""; }
                                    }}
                                  >
                                    Add
                                  </button>
                                </div>
                                {(dept.conditions || []).length > 0 && (
                                  <ul className="space-y-1">
                                    {(dept.conditions || []).map((s, i) => (
                                      <li key={i} className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg">
                                        <span className="text-sm text-gray-800">{s}</span>
                                        <button
                                          className="text-red-600 hover:text-red-700 font-semibold text-sm"
                                          onClick={() => removeListItem(idx, "conditions", i)}
                                        >
                                          Remove
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {/* Equipment */}
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Key Technology & Equipment</h4>
                                <div className="flex gap-2 mb-2">
                                  <input
                                    id={`equipment-${idx}`}
                                    className="flex-1 px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                    placeholder="Add equipment"
                                  />
                                  <button
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                    onClick={() => {
                                      const input = document.getElementById(`equipment-${idx}`) as HTMLInputElement;
                                      if (input?.value) { addListItem(idx, "equipment", input.value); input.value = ""; }
                                    }}
                                  >
                                    Add
                                  </button>
                                </div>
                                {(dept.equipment || []).length > 0 && (
                                  <ul className="space-y-1">
                                    {(dept.equipment || []).map((s, i) => (
                                      <li key={i} className="flex items-center justify-between bg-purple-50 px-3 py-2 rounded-lg">
                                        <span className="text-sm text-gray-800">{s}</span>
                                        <button
                                          className="text-red-600 hover:text-red-700 font-semibold text-sm"
                                          onClick={() => removeListItem(idx, "equipment", i)}
                                        >
                                          Remove
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Doctors Section */}
            {activeSection === 'doctors' && (
              <div className="space-y-6">
                {/* Add New Doctor */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Add New Doctor</h2>
                    <p className="text-sm text-gray-600 mt-1">Add a doctor to your hospital profile</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor Name *</label>
                        <input
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                          placeholder="Dr. John Doe"
                          value={newDoctor.name}
                          onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Specialty</label>
                        <input
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                          placeholder="e.g., Cardiologist"
                          value={newDoctor.primarySpecialty || ''}
                          onChange={(e) => setNewDoctor({ ...newDoctor, primarySpecialty: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Sub-Specialty</label>
                        <input
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                          placeholder="e.g., Interventional"
                          value={newDoctor.subSpecialty || ''}
                          onChange={(e) => setNewDoctor({ ...newDoctor, subSpecialty: e.target.value })}
                        />
                      </div>
                    </div>
                    {(profile.departments || []).length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Associate with Department</label>
                        <select
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
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
                    <div className="flex gap-3">
                      <button
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                        onClick={() => {
                          const name = (newDoctor.name || '').trim();
                          if (!name) { setMessage('Please enter Doctor Name'); return; }
                          const deptName = (newDoctor.departmentName || '').trim();
                          setProfile((prev) => ({
                            ...prev,
                            doctors: [...(prev.doctors || []), { name, primarySpecialty: (newDoctor.primarySpecialty || '').trim(), subSpecialty: (newDoctor.subSpecialty || '').trim(), departments: deptName ? [deptName] : [] }],
                          } as HospitalProfile));
                          setNewDoctor({ name: '', primarySpecialty: '', subSpecialty: '', departmentName: '' });
                        }}
                      >
                        Add Doctor
                      </button>
                      <button
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                        onClick={saveDoctorsOnly}
                        disabled={saving}
                      >
                        Save All Doctors
                      </button>
                    </div>
                  </div>
                </div>

                {/* Existing Doctors */}
                {(profile.doctors || []).length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900">Existing Doctors ({profile.doctors?.length || 0})</h2>
                      <p className="text-sm text-gray-600 mt-1">Manage your hospital doctors</p>
                    </div>
                    <div className="p-6 space-y-4">
                      {(profile.doctors || []).map((doc, idx) => (
                        <div key={idx} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between mb-4">
                            <button
                              onClick={() => {
                                const newSet = new Set(expandedDoctors);
                                if (newSet.has(idx)) {
                                  newSet.delete(idx);
                                } else {
                                  newSet.add(idx);
                                }
                                setExpandedDoctors(newSet);
                              }}
                              className="flex-1 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{expandedDoctors.has(idx) ? '▼' : '▶'}</span>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">{doc.name || `Doctor ${idx + 1}`}</h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {doc.primarySpecialty && <span>{doc.primarySpecialty}</span>}
                                    {doc.subSpecialty && <span> • {doc.subSpecialty}</span>}
                                  </p>
                                </div>
                              </div>
                            </button>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700 font-medium">Bookable</span>
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={Boolean(doc.doctorId)}
                                    onChange={() => toggleDoctorBookable(idx)}
                                    disabled={saving}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-green-600 transition-colors relative">
                                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                                  </div>
                                  <span className="ml-2 text-sm font-semibold text-gray-800">{Boolean(doc.doctorId) ? 'ON' : 'OFF'}</span>
                                </label>
                              </div>
                              <button
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                                onClick={() => removeDoctor(idx)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {expandedDoctors.has(idx) && (
                            <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor Name</label>
                                  <input
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                                    placeholder="Doctor Name"
                                    value={doc.name || ""}
                                    onChange={(e) => updateDoctor(idx, "name", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Specialty</label>
                                  <input
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                                    placeholder="Primary Specialty"
                                    value={doc.primarySpecialty || ""}
                                    onChange={(e) => updateDoctor(idx, "primarySpecialty", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sub-Specialty</label>
                                  <input
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                                    placeholder="Sub-Specialty"
                                    value={doc.subSpecialty || ""}
                                    onChange={(e) => updateDoctor(idx, "subSpecialty", e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Department Association */}
                              {(profile.departments || []).length > 0 && (
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Associate with Department</label>
                                  <div className="flex gap-3">
                                    <select
                                      className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                                      value={(doc.departments && doc.departments[0]) || ""}
                                      onChange={(e) => setDoctorDepartment(idx, e.target.value)}
                                    >
                                      <option value="">Select a department</option>
                                      {(profile.departments || []).map((d, i) => (
                                        <option key={i} value={d.name}>{d.name || `Dept ${i+1}`}</option>
                                      ))}
                                    </select>
                                    {doc.doctorId && (
                                      <button
                                        type="button"
                                        onClick={() => syncDoctorDepartment(idx)}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
                                      >
                                        Sync
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Doctor Slot Admin */}
                              {doc.doctorId && (
                                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                                  <h4 className="font-semibold text-gray-900 mb-3">Doctor Slot Admin</h4>
                                  <div className="text-sm text-gray-700 mb-3">
                                    Current: {doctorAdmins[doc.doctorId]?.currentEmail ? (
                                      <span className="font-mono font-semibold">{doctorAdmins[doc.doctorId]?.currentEmail}</span>
                                    ) : (
                                      <span className="text-gray-500">None</span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">Slot Admin Email</label>
                                      <input
                                        type="email"
                                        className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                        placeholder="admin@example.com"
                                        value={doctorAdmins[doc.doctorId]?.email || ""}
                                        onChange={(e) => setDoctorAdmins((prev) => ({ ...prev, [doc.doctorId!]: { ...prev[doc.doctorId!], email: e.target.value } }))}
                                        disabled={doctorAdmins[doc.doctorId]?.loading}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                                      <input
                                        type="password"
                                        className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                        placeholder="••••••••"
                                        value={doctorAdmins[doc.doctorId]?.password || ""}
                                        onChange={(e) => setDoctorAdmins((prev) => ({ ...prev, [doc.doctorId!]: { ...prev[doc.doctorId!], password: e.target.value } }))}
                                        disabled={doctorAdmins[doc.doctorId]?.loading}
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                                    onClick={() => saveDoctorSlotAdmin(doc.doctorId)}
                                    disabled={doctorAdmins[doc.doctorId]?.saving || doctorAdmins[doc.doctorId]?.loading}
                                  >
                                    {doctorAdmins[doc.doctorId]?.saving ? 'Saving...' : (doctorAdmins[doc.doctorId]?.currentEmail ? 'Update Slot Admin' : 'Create Slot Admin')}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <button 
                onClick={saveProfile} 
                disabled={saving} 
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save All Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
