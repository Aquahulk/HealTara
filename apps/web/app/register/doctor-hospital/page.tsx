"use client";

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';

export default function DoctorHospitalRegisterPage() {
  const { register } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedRole = useMemo(() => {
    const role = (searchParams.get('role') || '').toLowerCase();
    return role === 'hospital' ? 'hospital' : 'doctor';
  }, [searchParams]);

  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorMessage, setDoctorMessage] = useState('');

  const [hospitalEmail, setHospitalEmail] = useState('');
  const [hospitalPassword, setHospitalPassword] = useState('');
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [hospitalMessage, setHospitalMessage] = useState('');

  const handleDoctorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorMessage('');
    setDoctorLoading(true);
    try {
      await register(doctorEmail, doctorPassword, 'DOCTOR');
      setDoctorMessage('Doctor registration successful. Redirecting...');
    } catch (err: any) {
      setDoctorMessage(err?.message || 'Registration failed.');
    } finally {
      setDoctorLoading(false);
    }
  };

  const handleHospitalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setHospitalMessage('');
    setHospitalLoading(true);
    try {
      await register(hospitalEmail, hospitalPassword, 'HOSPITAL_ADMIN');
      setHospitalMessage('Hospital admin registration successful. Redirecting...');
    } catch (err: any) {
      setHospitalMessage(err?.message || 'Registration failed.');
    } finally {
      setHospitalLoading(false);
    }
  };

  const switchRole = (role: 'doctor' | 'hospital') => {
    const url = `/register/doctor-hospital?role=${role}`;
    router.replace(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Register as Doctor or Hospital Admin</h1>

          {/* Role Switcher */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              onClick={() => switchRole('doctor')}
              className={`px-4 py-2 rounded-md border ${selectedRole === 'doctor' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300'}`}
            >
              Doctor
            </button>
            <button
              onClick={() => switchRole('hospital')}
              className={`px-4 py-2 rounded-md border ${selectedRole === 'hospital' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-800 border-gray-300'}`}
            >
              Hospital Admin
            </button>
          </div>

          {/* Selected Registration Form */}
          {selectedRole === 'doctor' && (
            <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Doctor Registration</h2>
              <form onSubmit={handleDoctorRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={doctorEmail}
                    onChange={(e) => setDoctorEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={doctorPassword}
                    onChange={(e) => setDoctorPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  disabled={doctorLoading}
                >
                  {doctorLoading ? 'Registering...' : 'Register as Doctor'}
                </button>
                {doctorMessage && (
                  <p className="text-sm text-gray-600 mt-2">{doctorMessage}</p>
                )}
              </form>
            </div>
          )}

          {selectedRole === 'hospital' && (
            <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Hospital Admin Registration</h2>
              <form onSubmit={handleHospitalRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={hospitalEmail}
                    onChange={(e) => setHospitalEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={hospitalPassword}
                    onChange={(e) => setHospitalPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  disabled={hospitalLoading}
                >
                  {hospitalLoading ? 'Registering...' : 'Register as Hospital Admin'}
                </button>
                {hospitalMessage && (
                  <p className="text-sm text-gray-600 mt-2">{hospitalMessage}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}