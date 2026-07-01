"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import Header from '@/components/Header';
import DesktopSidebar from '@/components/DesktopSidebar';

type Mode = 'login' | 'register';
type RegStep = 'form' | 'otp' | 'done';

export default function PatientLoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  // ── Shared fields ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'error' | 'success'>('error');

  // ── Register-only fields ──
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirm, setConfirm] = useState('');
  const [regStep, setRegStep] = useState<RegStep>('form');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaVerifierRef = useRef<any>(null);

  const showMsg = (msg: string, type: 'error' | 'success' = 'error') => {
    setMessage(msg);
    setMsgType(type);
  };

  // Reset state when switching mode
  const switchMode = (m: Mode) => {
    setMode(m);
    setMessage('');
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setConfirm('');
    setRegStep('form');
    setOtp(['', '', '', '', '', '']);
  };

  // Set up invisible reCAPTCHA once when component mounts
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { auth } = await import('@/lib/firebase');
        const { RecaptchaVerifier } = await import('firebase/auth');
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear?.();
          recaptchaVerifierRef.current = null;
        }
        const v = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
        });
        await v.render();
        if (mounted) recaptchaVerifierRef.current = v;
      } catch (e) {
        console.warn('reCAPTCHA init:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Login submit ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      showMsg(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 1: Send OTP to phone ──
  const handleSendOtp = async () => {
    if (!name.trim()) return showMsg('Full name is required.');
    if (!email.trim()) return showMsg('Email is required.');
    if (!phone || phone.replace(/\D/g, '').length < 10) return showMsg('Enter a valid 10-digit phone number.');
    if (!password) return showMsg('Password is required.');
    if (password !== confirm) return showMsg('Passwords do not match.');

    const formatted = `+91${phone.replace(/\D/g, '')}`;
    setMessage('');
    setIsLoading(true);
    try {
      const { auth } = await import('@/lib/firebase');
      const { signInWithPhoneNumber } = await import('firebase/auth');
      const result = await signInWithPhoneNumber(auth, formatted, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setRegStep('otp');
      showMsg(`OTP sent to +91 ${phone}`, 'success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      showMsg(err?.message || 'Failed to send OTP. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP then register ──
  const handleVerifyAndRegister = async () => {
    const code = otp.join('');
    if (code.length !== 6) return showMsg('Enter the full 6-digit OTP.');
    setMessage('');
    setIsLoading(true);
    try {
      // Verify OTP with Firebase
      await confirmationResult.confirm(code);

      // OTP verified — now create the account
      await register(email, password, 'PATIENT', name.trim(), `+91${phone.replace(/\D/g, '')}`);
      setRegStep('done');
    } catch (err: any) {
      if (err?.code === 'auth/invalid-verification-code') {
        showMsg('Invalid OTP. Please check and try again.');
      } else {
        showMsg(err?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP input handlers ──
  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <DesktopSidebar />
      <div className="flex items-center justify-center px-4 py-8 md:ml-[var(--sidebar-width,14rem)] min-h-[calc(100vh-64px)]">
      {/* Invisible reCAPTCHA */}
      <div id="recaptcha-container" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🧑‍⚕️</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Patient Login' : regStep === 'otp' ? 'Verify Phone' : regStep === 'done' ? 'Account Created' : 'Patient Registration'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login'
              ? 'Sign in to book appointments and manage your visits.'
              : regStep === 'otp'
              ? `Enter the OTP sent to +91 ${phone}`
              : regStep === 'done'
              ? 'Your account is ready. You can now log in.'
              : 'Create your account with phone verification.'}
          </p>
        </div>

        {/* Mode switcher — only show on form step */}
        {regStep === 'form' && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5 text-sm font-medium">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${mode === 'login' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Login
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${mode === 'register' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Register
            </button>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {mode === 'login' && regStep === 'form' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••" required />
            </div>
            {message && <p className={`text-sm ${msgType === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
            <button type="submit" disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
              {isLoading ? 'Signing in…' : 'Login'}
            </button>
          </form>
        )}

        {/* ── REGISTER FORM (Step 1) ── */}
        {mode === 'register' && regStep === 'form' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 font-medium whitespace-nowrap">+91</span>
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="9876543210" maxLength={10} />
              </div>
              <p className="text-xs text-gray-400 mt-1">OTP will be sent to verify this number</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••" />
            </div>
            {message && <p className={`text-sm ${msgType === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
            <button onClick={handleSendOtp} disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
              {isLoading ? 'Sending OTP…' : 'Send OTP to Verify Phone →'}
            </button>
          </div>
        )}

        {/* ── OTP STEP (Step 2) ── */}
        {mode === 'register' && regStep === 'otp' && (
          <div className="space-y-5">
            {/* OTP boxes */}
            <div className="flex gap-2 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  className="w-11 h-12 border-2 border-gray-300 rounded-xl text-center text-xl font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {message && <p className={`text-sm text-center ${msgType === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}

            <button onClick={handleVerifyAndRegister}
              disabled={isLoading || otp.join('').length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
              {isLoading ? 'Verifying & Creating Account…' : 'Verify & Create Account'}
            </button>

            <button onClick={() => { setRegStep('form'); setOtp(['','','','','','']); setMessage(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1">
              ← Back to form
            </button>

            <p className="text-xs text-center text-gray-400">
              Didn't receive OTP?{' '}
              <button onClick={handleSendOtp} disabled={isLoading} className="text-blue-600 hover:underline disabled:opacity-50">Resend</button>
            </p>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {regStep === 'done' && (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <p className="text-gray-600 text-sm">Your phone number has been verified and your account is ready.</p>
            <button onClick={() => switchMode('login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
              Go to Login
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-5">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link> and{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
        </p>
      </div>
      </div>
    </div>
  );
}
