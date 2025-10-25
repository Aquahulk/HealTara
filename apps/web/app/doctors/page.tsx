"use client";

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient, Doctor } from '@/lib/api';
import DoctorOyoCard from '@/components/DoctorOyoCard';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import Header from '@/components/Header';

export default function DoctorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div></div>}>
      <DoctorsPageContent />
    </Suspense>
  );
}

function DoctorsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialQuery = (searchParams?.get('search') || '').trim();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [sortBy, setSortBy] = useState<'trending' | 'recent' | 'default'>('trending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [hasMore, setHasMore] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        setLoading(true);
        const doctorsData = await apiClient.getDoctors({ sort: sortBy, page, pageSize });
        setDoctors(doctorsData);
        setHasMore(doctorsData.length === pageSize);
      } catch (error) {
        console.error('Error loading doctors:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, [sortBy, page, pageSize]);

  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowBookingModal(true);
  };

  // Smart disease/symptom to specialization mapping
  const diseaseToSpecializations: Record<string, string[]> = {
    dengue: ['Infectious Disease', 'Internal Medicine', 'General Physician'],
    malaria: ['Infectious Disease', 'Internal Medicine', 'General Physician'],
    typhoid: ['Infectious Disease', 'Internal Medicine', 'General Physician'],
    fever: ['General Physician', 'Internal Medicine', 'Pediatrics'],
    cough: ['Pulmonology', 'General Physician'],
    cold: ['General Physician', 'Internal Medicine'],
    flu: ['General Physician', 'Internal Medicine'],
    covid: ['Pulmonology', 'Internal Medicine'],
    asthma: ['Pulmonology'],
    allergy: ['Allergy & Immunology', 'Dermatology'],
    diabetes: ['Endocrinology', 'Internal Medicine'],
    heart: ['Cardiology'],
    chest: ['Pulmonology'],
    stomach: ['Gastroenterology'],
    liver: ['Hepatology', 'Gastroenterology'],
    kidney: ['Nephrology'],
    skin: ['Dermatology'],
    eye: ['Ophthalmology'],
    bone: ['Orthopedics'],
    pregnancy: ['Gynecology', 'Obstetrics'],
  };

  const filteredDoctors = doctors.filter(doctor => {
    const q = searchQuery.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const mappedSpecs = new Set<string>(tokens.flatMap(t => diseaseToSpecializations[t] || []));

    const specialization = String(doctor.doctorProfile?.specialization || '').toLowerCase();
    const email = String(doctor.email || '').toLowerCase();
    const nameHandle = email.split('@')[0];

    const matchesText = specialization.includes(q) || email.includes(q) || nameHandle.includes(q);
    const matchesMapped = mappedSpecs.size > 0 && Array.from(mappedSpecs).some(spec => specialization.includes(spec.toLowerCase()));

    const matchesSpecialization = !selectedSpecialization || doctor.doctorProfile?.specialization === selectedSpecialization;
    const matchesCity = !selectedCity || doctor.doctorProfile?.city === selectedCity;

    return (matchesText || matchesMapped) && matchesSpecialization && matchesCity;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="w-full px-2 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Doctors</h1>
          <p className="text-lg text-gray-600">Search and book appointments with verified healthcare professionals</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by doctor name or specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Specializations</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Pediatrics">Pediatrics</option>
              </select>
            </div>
            <div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cities</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Chennai">Chennai</option>
              </select>
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="trending">Popularity</option>
                <option value="recent">Recently Updated</option>
                <option value="default">Default</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">Page {page}</span>
              <button
                onClick={() => hasMore && setPage((p) => p + 1)}
                disabled={!hasMore}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {filteredDoctors.length} doctors found
          </h2>
        </div>

        {/* Doctors List - OYO style rows */}
        <div className="space-y-6">
          {filteredDoctors.map((doctor: any) => (
            <DoctorOyoCard
              key={doctor.id}
              doctor={doctor}
              onBookAppointment={() => handleBookAppointment(doctor)}
            />
          ))}
        </div>

        {filteredDoctors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No doctors found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedDoctor && (
        <BookAppointmentModal
          doctor={selectedDoctor}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  );
}