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
    subdomain_slug: '',
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
      // Transform the form data to match API expectations
      const { subdomain_slug, ...rest } = formData;
      const apiData = {
        ...rest,
        slug: subdomain_slug, // Map subdomain_slug to slug
      };

      await apiClient.createDoctorProfile(apiData);
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
  { name: 'subdomain_slug', type: 'text' }, // Add this line
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
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center">Manage Your Profile</h1>
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4 max-w-2xl mx-auto">
        {formFields.map(({ name, type }) => (
          <div key={name}>
            <label className="block mb-2 text-sm font-medium capitalize">
              {name.replace(/([A-Z])/g, ' $1')} {/* Adds a space before capital letters for readability */}
            </label>
            <input
              type={type}
              name={name}
              value={formData[name as keyof typeof formData]}
              onChange={handleChange}
              required
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        ))}

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-colors">
          Save Profile
        </button>

        {message && (
          <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}