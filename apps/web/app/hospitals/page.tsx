"use client";

import Header from '@/components/Header';

export default function HospitalsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Partner Hospitals</h1>
          <p className="text-xl text-gray-600 mb-8">Find trusted hospitals with full facilities</p>
          
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-gray-400 text-6xl mb-4">🏥</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Coming Soon</h2>
            <p className="text-gray-600">
              We're working on bringing you a comprehensive list of partner hospitals.
              This feature will include hospital profiles, facilities, and direct booking options.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
