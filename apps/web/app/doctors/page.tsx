"use client";

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient, Doctor } from '@/lib/api';
import DoctorOyoCard from '@/components/DoctorOyoCard';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import Header from '@/components/Header';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';

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
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [sortBy, setSortBy] = useState<'trending' | 'recent' | 'default'>('trending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [hasMore, setHasMore] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  // Suggested specializations/phrases from backend
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        if (debouncedQuery) { return; }
        setLoading(true);
        if (initialQuery) {
          const resp = await apiClient.searchDoctors(initialQuery);
          setDoctors(resp.doctors);
          setSuggestions(resp.suggestions || []);
          // Track initial query from URL to seed learning
          apiClient.trackSearch(initialQuery, {
            matchedSpecialties: resp.matchedSpecialties,
            matchedConditions: resp.matchedConditions,
            topDoctorIds: (resp.doctors || []).slice(0, 5).map((d: any) => d.id),
          });
        } else {
          const doctorsData = await apiClient.getDoctors({ sort: sortBy, page, pageSize });
          setDoctors(doctorsData);
          setHasMore(doctorsData.length === pageSize);
          setSuggestions(apiClient.getSeedSuggestions());
        }
      } catch (error) {
        console.error('Error loading doctors:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, [sortBy, page, pageSize, debouncedQuery, initialQuery]);

  useEffect(() => {
    const fetchSearch = async () => {
      const q = debouncedQuery.trim();
      if (!q) return;
      try {
        setIsSearching(true);
        // Instant cached suggestions if available
        const cached = apiClient.peekCachedSearch(q);
        if (cached) {
          setSuggestions(cached.suggestions || []);
          // Also show cached doctors list while fresh
          if (Array.isArray(cached.doctors)) setDoctors(cached.doctors);
        }
        const resp = await apiClient.searchDoctors(q);
        setDoctors(resp.doctors);
        setSuggestions(resp.suggestions || []);
        // Track typed queries to reinforce learning
        // ... existing code ...
        apiClient.trackSearchDebounced(q, {
          matchedSpecialties: resp.matchedSpecialties,
          matchedConditions: resp.matchedConditions,
          topDoctorIds: (resp.doctors || []).slice(0, 5).map((d: any) => d.id),
        });
      } catch (error) {
        console.error('Search load error:', error);
      } finally {
        setIsSearching(false);
      }
    };
    fetchSearch();
  }, [debouncedQuery]);

  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowBookingModal(true);
  };

  const filteredDoctors = doctors.filter(doctor => {
    const q = searchQuery.trim().toLowerCase();

    const specialization = String(doctor.doctorProfile?.specialization || '').toLowerCase();
    const email = String(doctor.email || '').toLowerCase();
    const nameHandle = email.split('@')[0];

    const matchesText = !q || specialization.includes(q) || email.includes(q) || nameHandle.includes(q);
    const matchesSpecialization = !selectedSpecialization || doctor.doctorProfile?.specialization === selectedSpecialization;
    const matchesCity = !selectedCity || doctor.doctorProfile?.city === selectedCity;

    return matchesText && matchesSpecialization && matchesCity;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Find Doctors</h1>
          <p className="text-base md:text-lg text-gray-600">Search and book appointments with verified healthcare professionals</p>
        </div>

        {/* Search and Filters - Mobile optimized */}
        <div className="bg-white rounded-lg shadow p-3 md:p-6 mb-4 md:mb-8">
          {/* Compact Search Bar with Filter Button */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search doctors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              />
            </div>
            <button
              onClick={() => {
                const filtersDiv = document.getElementById('filters-section');
                if (filtersDiv) {
                  filtersDiv.classList.toggle('hidden');
                }
              }}
              className="px-3 py-2 md:px-4 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm md:text-base whitespace-nowrap"
            >
              🔍 Filters
            </button>
          </div>

          {/* Collapsible Filters Section */}
          <div id="filters-section" className="hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-gray-200">
              <div>
                <select
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 flex-1 text-sm"
                >
                  Prev
                </button>
                <span className="text-xs md:text-sm text-gray-600 whitespace-nowrap">Page {page}</span>
                <button
                  onClick={() => hasMore && setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 flex-1 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            {filteredDoctors.length} doctors found
          </h2>
          {(loading || isSearching) && (
            <div className="mt-2 text-sm text-gray-600">Loading…</div>
          )}
        </div>

        {/* Doctors List - OYO style rows - Mobile optimized */}
        <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">{/* Add bottom padding on mobile for nav */}
          {filteredDoctors.map((doctor: any) => (
            <DoctorOyoCard
              key={doctor.id}
              doctor={doctor}
              onBookAppointment={() => handleBookAppointment(doctor)}
              searchQuery={searchQuery}
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

      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation />
    </div>
  );
}
