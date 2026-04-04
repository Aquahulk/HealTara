"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPageClient() {
  const searchParams = useSearchParams();
  const initialIsLogin = (searchParams.get('mode') !== 'register');
  const [isLoginMode, setIsLoginMode] = useState(initialIsLogin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await register(email, password, role, name.trim() || undefined);
      }
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      const localMsg = err?.message;
      setMessage(`Error: ${serverMsg || localMsg || 'Could not connect to the server.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 md:mb-6">
          {isLoginMode ? 'Welcome Back!' : 'Create an Account'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none min-h-[48px] text-base"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 pr-12 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none min-h-[48px] text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {!isLoginMode && (
            <>
              <div>
                <label className="block mb-2 text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Jane Doe"
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none min-h-[48px] text-base"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">I am a:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none min-h-[48px] text-base"
                >
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                </select>
              </div>
            </>
          )}
          {isLoginMode && (
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer min-h-[44px] touch-manipulation">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 mr-2"
                />
                <span className="text-sm text-gray-300">Remember me</span>
              </label>
            </div>
          )}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded transition-colors disabled:bg-blue-400 min-h-[48px] touch-manipulation"
          >
            {isLoading ? 'Processing...' : (isLoginMode ? 'Login' : 'Create Account')}
          </button>
        </form>
        {message && (
          <div className={`mt-4 p-3 rounded text-center text-sm ${message.startsWith('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
            {message}
          </div>
        )}
        <div className="text-center mt-4 md:mt-6">
          <button 
            onClick={() => { setIsLoginMode(!isLoginMode); setMessage(''); }} 
            className="text-sm text-blue-400 hover:underline min-h-[44px] px-4 py-2 touch-manipulation inline-flex items-center"
          >
            {isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}