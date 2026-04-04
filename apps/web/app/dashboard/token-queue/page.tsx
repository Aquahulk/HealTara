"use client";

import { useAuth } from '@/context/AuthContext';
import DoctorTokenPanel from '@/components/DoctorTokenPanel';

export default function TokenQueuePage() {
  const { user } = useAuth();
  if (!user) {
    return <div className="p-6">Please log in.</div>;
  }
  if (user.role !== 'DOCTOR') {
    return <div className="p-6">Only doctors can manage the token queue.</div>;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Daily Token Queue</h1>
        <DoctorTokenPanel doctorId={user.id} />
      </div>
    </div>
  );
}
