"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function PatientLoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);
    try {
      await login(email, password);
      // Redirect handled in AuthContext (patients -> home)
    } catch (err: any) {
      setMessage('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🧑‍⚕️</div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Login</h1>
          <p className="text-gray-600 text-sm">Sign in to book appointments and manage your visits.</p>
        </div>

        {/* Role Switcher */}
        <div className="mb-6">
          <div className="flex items-center justify-center bg-gray-100 rounded-full p-1 text-sm font-medium">
            <Link href="/login" className="px-3 py-1 rounded-full bg-white text-gray-900 shadow">Patient</Link>
            <Link href="/login/doctors" className="px-3 py-1 rounded-full text-gray-600 hover:text-gray-900">Doctor</Link>
            <Link href="/auth?mode=login&role=HOSPITAL_ADMIN" className="px-3 py-1 rounded-full text-gray-600 hover:text-gray-900">Hospital Admin</Link>
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
              placeholder="you@example.com"
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

          {message && <p className="text-red-600 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-gray-600">
          New here?{' '}
          <Link href="/auth?mode=register" className="text-blue-600 hover:text-blue-700 font-semibold">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}