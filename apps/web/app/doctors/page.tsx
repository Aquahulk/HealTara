"use client";

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient, Doctor } from '@/lib/api';
import DoctorOyoCard from '@/components/DoctorOyoCard';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import Header from '@/components/Header';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import DesktopSidebar from '@/components/DesktopSidebar';
import SearchBar from '@/components/SearchBar';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MapSidebar = dynamic(() => import('@/components/MapSidebar'), { ssr: false });

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
  const initialAvailabilityOnly = searchParams?.get('availabilityOnly') === 'true';
  const initialTime = searchParams?.get('time') || '';
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availabilityOnly, setAvailabilityOnly] = useState(initialAvailabilityOnly);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(initialTime);
  const [sortBy, setSortBy] = useState<'trending' | 'recent' | 'default'>('trending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [hasMore, setHasMore] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  // Suggested specializations/phrases from backend
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Auto-open booking modal if bookDoctorId is in URL (post-login redirect)
  useEffect(() => {
    const bookDoctorId = searchParams?.get('bookDoctorId');
    if (bookDoctorId && doctors.length > 0) {
      const doc = doctors.find(d => String(d.id) === bookDoctorId);
      if (doc) {
        setSelectedDoctor(doc);
        setShowBookingModal(true);
        // Clean up URL to avoid re-opening on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('bookDoctorId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, doctors]);

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
          const resp = await apiClient.searchDoctors(initialQuery, { time: selectedTimeSlot, availabilityOnly });
          setDoctors(resp.doctors);
          setSuggestions(resp.suggestions || []);
          // Track initial query from URL to seed learning
          apiClient.trackSearch(initialQuery, {
            matchedSpecialties: resp.matchedSpecialties,
            matchedConditions: resp.matchedConditions,
            topDoctorIds: (resp.doctors || []).slice(0, 5).map((d: any) => d.id),
          });
        } else {
          const doctorsData = await apiClient.getDoctors({ 
            sort: sortBy, 
            page, 
            pageSize, 
            time: selectedTimeSlot, 
            availabilityOnly 
          });
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
  }, [sortBy, page, pageSize, debouncedQuery, initialQuery, selectedTimeSlot, availabilityOnly]);

  useEffect(() => {
    const fetchSearch = async () => {
      const q = debouncedQuery.trim();
      if (!q) return;
      try {
        setIsSearching(true);
        // Instant cached suggestions if available
        const cached = apiClient.peekCachedSearch(`${q}:${selectedTimeSlot}:${availabilityOnly}`);
        if (cached) {
          setSuggestions(cached.suggestions || []);
          // Also show cached doctors list while fresh
          if (Array.isArray(cached.doctors)) setDoctors(cached.doctors);
        }
        const resp = await apiClient.searchDoctors(q, { time: selectedTimeSlot, availabilityOnly });
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
  }, [debouncedQuery, selectedTimeSlot, availabilityOnly]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Header />
      <DesktopSidebar />
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 md:ml-[var(--sidebar-width,16rem)] lg:mr-[390px] transition-all duration-300">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Find Doctors</h1>
          <p className="text-base md:text-lg text-gray-600">Search and book appointments with verified healthcare professionals</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 max-w-2xl">
          <SearchBar
            initialQuery={initialQuery}
            variant="doctors"
            onSearch={(q, filters) => {
              setSearchQuery(q);
              setSelectedSpecialization(filters.specialization);
              setSelectedCity(filters.city);
              setAvailabilityOnly(filters.availabilityOnly);
              setPage(1);
            }}
          />
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

        {/* Two-column layout: Doctor list + Map Sidebar */}
        <div className="pb-20 md:pb-0">
          {/* Doctors List (constrained width) */}
          <div className="max-w-2xl">
            <div className="space-y-4 md:space-y-6">
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

          {/* Right: Map Sidebar (fixed top-right, hidden on mobile) */}
          <div className="hidden lg:block">
            <MapSidebar
              variant="doctors"
              title="Doctors Near You"
              emptyMessage="No doctor locations available. Doctors with set coordinates will appear here."
              pins={filteredDoctors
                .filter((d: any) => d.doctorProfile?.latitude && d.doctorProfile?.longitude)
                .map((d: any) => ({
                  id: d.id,
                  lat: d.doctorProfile.latitude,
                  lon: d.doctorProfile.longitude,
                  title: `Dr. ${(d.email || '').split('@')[0].replace(/[._-]/g,' ').replace(/\d{5,}/g,'').trim()}`,
                  subtitle: d.doctorProfile?.specialization || '',
                  extra: { fee: d.doctorProfile?.consultationFee, experience: d.doctorProfile?.experience, slug: d.doctorProfile?.slug, city: d.doctorProfile?.city },
                }))}
            />
          </div>
        </div>
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
