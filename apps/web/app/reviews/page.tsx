"use client";

import Header from '@/components/Header';

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Patient Reviews</h1>
          <p className="text-xl text-gray-600 mb-8">Read authentic reviews from our patients</p>
          
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-gray-400 text-6xl mb-4">⭐</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Coming Soon</h2>
            <p className="text-gray-600">
              We're building a comprehensive review system where patients can share their experiences
              and help others make informed decisions about their healthcare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
