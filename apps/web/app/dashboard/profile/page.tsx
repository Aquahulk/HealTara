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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    if (!user) {
      setMessage('Error: You are not authenticated.');
      return;
    }

    try {
      // Submit form data; slug is auto-generated server-side
      await apiClient.createDoctorProfile(formData);
      setMessage('Success! Your profile has been saved.');
    } catch (error: any) {
      setMessage(`Error: ${error.message || 'Could not connect to the server.'}`);
    }
  };
  
  // If the user is not a doctor, show an error and prevent access.
  if (user?.role !== 'DOCTOR') {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <p>Access Forbidden: This page is for doctors only.</p>
        </div>
      )
  }

  // A helper array to create form fields dynamically
  const formFields = [
  { name: 'specialization', type: 'text' },
  { name: 'qualifications', type: 'text' },
  // ... keep the rest of the fields
  { name: 'experience', type: 'number' },
  { name: 'clinicName', type: 'text' },
  { name: 'clinicAddress', type: 'text' },
  { name: 'city', type: 'text' },
  { name: 'state', type: 'text' },
  { name: 'phone', type: 'tel' },
  { name: 'consultationFee', type: 'number' },
];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white p-6 sm:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 rounded-xl overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold">Doctor Profile</h1>
          <p className="mt-2 opacity-90">Update your specialization, experience, and clinic details.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur p-6 rounded-xl space-y-4">
          {formFields.map(({ name, type }) => (
            <div key={name} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <label className="sm:text-right text-sm font-medium capitalize opacity-90">
                {name.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type={type}
                name={name}
                value={formData[name as keyof typeof formData]}
                onChange={handleChange}
                required
                className="sm:col-span-2 w-full p-3 bg-white/5 rounded border border-white/10 focus:border-white/30 focus:outline-none"
              />
            </div>
          ))}

          <div className="flex justify-end">
            <button type="submit" className="px-5 py-3 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-colors">
              Save Profile
            </button>
          </div>

          {message && (
            <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-300' : 'text-emerald-300'}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}