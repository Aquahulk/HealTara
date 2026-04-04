"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // We'll use this to get the user info
import { apiClient } from '@/lib/api'; // API client for making requests
import { useRouter } from 'next/navigation';

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  // State for all the form fields
  const [formData, setFormData] = useState({
    specialization: '',
    qualifications: '',
    experience: 0,
    clinicName: '',
    clinicAddress: '',
    city: '',
    state: '',
    phone: '',
    consultationFee: 0,
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState({ registrationNumber: '', phone: '' });

  // Redirect hospital admins to their dedicated profile page via effect
  useEffect(() => {
    if (user?.role === 'HOSPITAL_ADMIN') {
      router.replace('/hospital-admin/profile');
    }
  }, [user, router]);

  // While redirecting, render a lightweight placeholder
  if (user?.role === 'HOSPITAL_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Redirecting to Hospital Admin Profile…</p>
      </div>
    );
  }

  // Handler to update state when user types in an input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      // Convert number fields from string to number
      [name]: name === 'experience' || name === 'consultationFee' ? parseInt(value) || 0 : value,
    }));
  };

  // Handler for form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (!user) {
      setMessage('Error: You are not authenticated.');
      setLoading(false);
      return;
    }

    try {
      // Submit form data; slug is auto-generated server-side
      await apiClient.createDoctorProfile(formData);
      setMessage('Success! Your profile has been saved.');
    } catch (error: any) {
      setMessage(`Error: ${error.message || 'Could not connect to the server.'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // If PATIENT, render patient profile editor
  if (user?.role === 'PATIENT') {
    const PatientProfileForm = () => {
      const [patient, setPatient] = useState({
        name: '',
        age: 0,
        gender: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        bloodGroup: '',
        allergies: '',
      });
      const [saving, setSaving] = useState(false);
      const [msg, setMsg] = useState('');
      useEffect(() => {
        const load = async () => {
          try {
            const p = await apiClient.getPatientProfile();
            if (p && typeof p === 'object') {
              setPatient({
                name: p.name || '',
                age: Number(p.age || 0),
                gender: p.gender || '',
                phone: p.phone || '',
                address: p.address || '',
                city: p.city || '',
                state: p.state || '',
                bloodGroup: p.bloodGroup || '',
                allergies: p.allergies || '',
              });
            }
          } catch (_) {}
        };
        load();
      }, []);
      const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setPatient((prev) => ({
          ...prev,
          [name]: name === 'age' ? parseInt(value) || 0 : value,
        }));
      };
      const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg('');
        try {
          await apiClient.savePatientProfile(patient);
          setMsg('Profile saved successfully');
        } catch (err: any) {
          setMsg(`Error: ${err?.message || 'Failed to save profile'}`);
        } finally {
          setSaving(false);
        }
      };
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 p-8 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                  🧑
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">Patient Profile</h1>
                  <p className="mt-2 text-blue-100">Manage your personal information for faster bookings</p>
                </div>
              </div>
            </div>
            {msg && (
              <div className={`mb-6 p-4 rounded-xl ${msg.startsWith('Error') ? 'bg-red-50 border-2 border-red-200 text-red-800' : 'bg-green-50 border-2 border-green-200 text-green-800'}`}>
                <p className="font-medium">{msg}</p>
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-6 bg-white rounded-2xl shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input name="name" value={patient.name} onChange={onChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                  <input name="age" type="number" value={patient.age} onChange={onChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="Age" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                  <select name="gender" value={patient.gender} onChange={onChange} className="w-full border border-gray-300 rounded-lg p-3">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input name="phone" value={patient.phone} onChange={onChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="+91..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <input name="address" value={patient.address} onChange={onChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="Street and locality" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                  <input name="city" value={patient.city} onChange={onChange} className="w-full border border-gray-300 rounded-lg p-3" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                  <input name="state" value={patient.state} onChange={onChange} className="w-full border border-gray-300 rounded-lg p-3" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Group</label>
                  <input name="bloodGroup" value={patient.bloodGroup} onChange={onChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="O+, A-, ..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Allergies</label>
                  <input name="allergies" value={patient.allergies} onChange={onChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="e.g. Peanuts, Dust" />
                </div>
              </div>
              <div className="flex justify-end">
                <button disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200">
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    };
    return <PatientProfileForm />;
  }

  // If user is not a doctor (and not a patient/hospital admin already handled), block access
  if (user?.role !== 'DOCTOR') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Access Forbidden: This page is for doctors only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
              👨‍⚕️
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Doctor Profile</h1>
              <p className="mt-2 text-blue-100">Complete your professional profile to start accepting appointments</p>
            </div>
          </div>
        </div>

        {/* Verification Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              Verification
            </h2>
            <p className="text-sm text-gray-600 mt-1">Submit required verification to enable services</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Registration Number</label>
              <input
                type="text"
                value={verification.registrationNumber}
                onChange={(e) => setVerification((v) => ({ ...v, registrationNumber: e.target.value }))}
                placeholder="e.g., MCI/STATE/12345"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile</label>
              <input
                type="text"
                value={verification.phone}
                onChange={(e) => setVerification((v) => ({ ...v, phone: e.target.value }))}
                placeholder="+91..."
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div className="px-6 pb-6">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  setMessage('');
                  await apiClient.submitDoctorVerification(verification);
                  setMessage('Verification submitted. Waiting for admin confirmation.');
                } catch (e: any) {
                  setMessage(e?.message || 'Failed to submit verification');
                } finally {
                  setLoading(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200"
            >
              {loading ? 'Submitting…' : 'Submit Verification'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.startsWith('Error') ? 'bg-red-50 border-2 border-red-200 text-red-800' : 'bg-green-50 border-2 border-green-200 text-green-800'}`}>
            <p className="font-medium">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Professional Information Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">🩺</span>
                Professional Information
              </h2>
              <p className="text-sm text-gray-600 mt-1">Your medical expertise and qualifications</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Specialization *
                </label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Cardiologist, Pediatrician"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Qualifications *
                </label>
                <input
                  type="text"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  required
                  placeholder="e.g., MBBS, MD"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="e.g., 10"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Consultation Fee (₹) *
                </label>
                <input
                  type="number"
                  name="consultationFee"
                  value={formData.consultationFee}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="e.g., 500"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Clinic Information Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">🏥</span>
                Clinic Information
              </h2>
              <p className="text-sm text-gray-600 mt-1">Where you practice medicine</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clinic Name *
                </label>
                <input
                  type="text"
                  name="clinicName"
                  value={formData.clinicName}
                  onChange={handleChange}
                  required
                  placeholder="e.g., City Health Clinic"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clinic Address *
                </label>
                <input
                  type="text"
                  name="clinicAddress"
                  value={formData.clinicAddress}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 123 Main Street, Building A"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Mumbai"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Maharashtra"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">📞</span>
                Contact Information
              </h2>
              <p className="text-sm text-gray-600 mt-1">How patients can reach you</p>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="e.g., +91 98765 43210"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
