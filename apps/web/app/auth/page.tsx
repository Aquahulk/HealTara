"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '../../lib/api'; // Import the centralized API client

export default function AuthPage() {
  const searchParams = useSearchParams();
  const initialIsLogin = (searchParams.get('mode') !== 'register');
  const [isLoginMode, setIsLoginMode] = useState(initialIsLogin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Added for better UX

  const router = useRouter();
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    const endpoint = isLoginMode ? '/login' : '/register';
    const body = isLoginMode ? { email, password } : { email, password, role };

    try {
      // --- MODIFIED PART ---
      // Use the AuthContext methods which handle everything automatically
      if (isLoginMode) {
        await login(email, password); // This handles login and redirects automatically
      } else {
        await register(email, password, role); // This handles registration and auto-login
      }
      // --- END MODIFIED PART ---
    } catch (err: any) {
      // apiClient errors have a `response` object, similar to fetch
      setMessage(`Error: ${err.response?.data?.message || 'Could not connect to the server.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-4">
          {isLoginMode ? 'Welcome Back!' : 'Create an Account'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          {!isLoginMode && (
            <div>
              <label className="block mb-2 text-sm font-medium">I am a:</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor</option>
              </select>
            </div>
          )}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-colors disabled:bg-blue-400"
          >
            {isLoading ? 'Processing...' : (isLoginMode ? 'Login' : 'Create Account')}
          </button>
        </form>
        {message && (
          <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
        <div className="text-center mt-6">
          <button onClick={() => { setIsLoginMode(!isLoginMode); setMessage(''); }} className="text-sm text-blue-400 hover:underline">
            {isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}