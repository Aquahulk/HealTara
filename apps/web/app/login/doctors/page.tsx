"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function DoctorLoginPage() {
  const { login, register } = useAuth();
  const [role, setRole] = useState<'doctor' | 'hospital'>('doctor');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        // Redirect handled in AuthContext
      } else {
        if (password !== confirm) {
          throw new Error('Passwords do not match.');
        }
        const registerRole = role === 'doctor' ? 'DOCTOR' : 'HOSPITAL_ADMIN';
        await register(email, password, registerRole);
      }
    } catch (err: any) {
      setMessage(err?.message || 'Request failed. Please check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">👨‍⚕️</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {role === 'doctor'
              ? (mode === 'login' ? 'Doctor Login' : 'Doctor Registration')
              : (mode === 'login' ? 'Hospital Admin Login' : 'Hospital Admin Registration')}
          </h1>
          <p className="text-gray-600 text-sm">
            {mode === 'login'
              ? 'Sign in to access your dashboard and manage operations.'
              : 'Create an account to manage your practice or hospital.'}
          </p>
        </div>
        {/* Role Switcher (Doctor/Hospital) */}
        <div className="mb-4">
          <div className="flex items-center justify-center bg-gray-100 rounded-full p-1 text-sm font-medium">
            <button
              onClick={() => setRole('doctor')}
              className={`px-3 py-1 rounded-full ${role === 'doctor' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Doctor
            </button>
            <button
              onClick={() => setRole('hospital')}
              className={`px-3 py-1 rounded-full ${role === 'hospital' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Hospital Admin
            </button>
          </div>
        </div>

        {/* Mode Switcher (Login/Register) */}
        <div className="mb-6">
          <div className="flex items-center justify-center bg-gray-100 rounded-full p-1 text-sm font-medium">
            <button
              onClick={() => setMode('login')}
              className={`px-3 py-1 rounded-full ${mode === 'login' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`px-3 py-1 rounded-full ${mode === 'register' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Register
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={role === 'doctor' ? 'doctor@example.com' : 'admin@hospital.com'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {message && <p className="text-red-600 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition-colors"
          >
            {isLoading ? (mode === 'login' ? 'Signing in...' : 'Registering...') : (mode === 'login' ? 'Login' : 'Register')}
          </button>
        </form>
      </div>
    </div>
  );
}