"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { loadWithCache, PerformanceMonitor, CacheManager } from '@/lib/performance';
import Header from '@/components/Header';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import { 
  Search, 
  ArrowDown, 
  MapPin, 
  Clock, 
  DollarSign,
  Users,
  Building2,
  Shield,
  Zap,
  Heart,
  Smartphone,
  Stethoscope,
  Pill,
  Activity,
  Star,
  CheckCircle,
  Globe,
  ChevronRight,
  ChevronLeft,
  Play,
  Award,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Calendar,
  Video,
  Microscope,
  Hospital,
  UserCheck,
  TrendingUp,
  MessageCircle,
  BookOpen,
  ArrowRight,
  MapIcon
} from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { hospitalMicrositeUrl, doctorMicrositeUrl, hospitalIdMicrositeUrl, shouldUseSubdomainNav, slugifyName, customSubdomainUrl } from '@/lib/subdomain';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [activeGrid, setActiveGrid] = useState<'doctors' | 'hospitals'>('hospitals');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ultra-optimized data loading with performance monitoring
  useEffect(() => {
    const loadData = async () => {
      PerformanceMonitor.startTiming('homepage-data-load');
      try {
        setLoading(true);
        
        // Load data with intelligent caching
        const [hospitalsData, doctorsData] = await Promise.allSettled([
          loadWithCache('homepage_hospitals', () => apiClient.getHospitals()),
          loadWithCache('homepage_doctors_v2', () => apiClient.getDoctors({ sort: 'trending', page: 1, pageSize: 12 }))
        ]);

        // Update state with results
        if (hospitalsData.status === 'fulfilled') {
          setHospitals(hospitalsData.value || []);
        } else {
          // Fallback: ensure hospitals array is never empty
          setHospitals([]);
        }
        if (doctorsData.status === 'fulfilled') {
          const list = doctorsData.value || [];
          setDoctors(list);
          try { sessionStorage.setItem('last_doctors', JSON.stringify(list)); } catch {}
        } else {
          try {
            const raw = sessionStorage.getItem('last_doctors');
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list) && list.length) setDoctors(list);
            }
          } catch {}
        }

        const duration = PerformanceMonitor.endTiming('homepage-data-load');
        PerformanceMonitor.logTiming('homepage-data-load', duration);

      } catch (error) {
        console.error('Error loading data:', error);
        // Final fallback: try last session doctors to avoid empty UI
        try {
          const raw = sessionStorage.getItem('last_doctors');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length) setDoctors(list);
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowAppointmentModal(true);
  };

  // Smart mapping from diseases/symptoms to relevant specializations
  const diseaseToSpecializations: Record<string, string[]> = {
    dengue: ['Infectious Disease', 'Internal Medicine', 'General Practitioner'],
    malaria: ['Infectious Disease', 'Internal Medicine', 'General Practitioner'],
    typhoid: ['Infectious Disease', 'Internal Medicine', 'General Practitioner'],
    fever: ['General Practitioner', 'Internal Medicine', 'Pediatrics'],
    cough: ['Pulmonology', 'General Practitioner'],
    cold: ['General Practitioner', 'Internal Medicine'],
    flu: ['General Practitioner', 'Internal Medicine'],
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

  const filteredDoctors = doctors.filter((doctor: any) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const tokens = query.split(/\s+/).filter(Boolean);
    const mappedSpecs = new Set<string>(tokens.flatMap((t) => diseaseToSpecializations[t] || []));

    const profile = doctor.doctorProfile || {};
    const specialization = String(profile.specialization || '').toLowerCase();
    const clinicName = String(profile.clinicName || '').toLowerCase();
    const city = String(profile.city || '').toLowerCase();
    const email = String(doctor.email || '').toLowerCase();

    const matchesText = (
      specialization.includes(query) ||
      clinicName.includes(query) ||
      city.includes(query) ||
      email.includes(query)
    );

    const matchesMapped = mappedSpecs.size > 0 && Array.from(mappedSpecs).some((spec) =>
      specialization.includes(spec.toLowerCase())
    );

    return matchesText || matchesMapped;
  });

  // Quick Categories Data
  const categories = [
    {
      title: "Hospitals",
      description: "Multi-specialty hospitals",
      icon: Hospital,
      color: "from-blue-500 to-cyan-500",
      link: "/hospitals"
    },
    {
      title: "Single Doctors",
      description: "Individual practitioners",
      icon: UserCheck,
      color: "from-emerald-500 to-teal-500",
      link: "/doctors"
    },
    {
      title: "Multi-Doctor Clinics",
      description: "Group practices",
      icon: Building2,
      color: "from-purple-500 to-pink-500",
      link: "/clinics"
    },
    {
      title: "Online Consultation",
      description: "Virtual appointments",
      icon: Video,
      color: "from-orange-500 to-red-500",
      link: "/online-consultation"
    },
    {
      title: "Labs & Diagnostics",
      description: "Medical testing",
      icon: Microscope,
      color: "from-indigo-500 to-purple-500",
      link: "/labs"
    }
  ];

  // How It Works Data
  const howItWorks = [
    {
      step: 1,
      title: "Search",
      description: "Find the right doctor/clinic",
      icon: Search
    },
    {
      step: 2,
      title: "Book",
      description: "Select time & pay booking fee",
      icon: Calendar
    },
    {
      step: 3,
      title: "Visit",
      description: "Confirmed appointment + rating system",
      icon: CheckCircle
    }
  ];

  // Why Choose Us Data
  const whyChooseUs = [
    {
      title: "Verified Doctors",
      description: "All doctors are verified by license ID",
      icon: Shield
    },
    {
      title: "Transparent Reviews",
      description: "1 booking = 1 review system",
      icon: MessageCircle
    },
    {
      title: "Multi-language Support",
      description: "Available in multiple languages",
      icon: Globe
    },
    {
      title: "One-stop Healthcare",
      description: "Doctors, clinics, hospitals, labs, insurance",
      icon: Building2
    }
  ];

  // Testimonials Data
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Patient",
      content: "Found my perfect cardiologist within minutes. The booking process was seamless!",
      rating: 5,
      avatar: "👩‍💼"
    },
    {
      name: "Dr. Michael Chen",
      role: "Cardiologist",
      content: "This platform has increased my patient base by 40%. Highly recommended!",
      rating: 5,
      avatar: "👨‍⚕️"
    },
    {
      name: "Priya Sharma",
      role: "Patient",
      content: "The online consultation feature saved me during lockdown. Amazing service!",
      rating: 5,
      avatar: "👩‍🎓"
    }
  ];

  // Stats Data
  const stats = [
    { label: "Verified Doctors", value: 2500, icon: Users },
    { label: "Patients Served", value: 100000, icon: Heart },
    { label: "Cities Covered", value: 75, icon: MapPin },
    { label: "Partner Hospitals", value: 150, icon: Building2 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-500 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading healthcare providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-blue-50 overflow-x-hidden">
      <Header />
      
      <main className="pt-10 overflow-x-hidden">
        {/* ============================================================================
            🌟 HERO SECTION - Main landing area with search (BLUE GRADIENT)
            ============================================================================ */}
        <section className="relative py-8 md:py-16 px-4 overflow-visible bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 max-h-[60vh] md:max-h-none">
          {/* Enhanced Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-500/95 to-cyan-500/90" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
          
          {/* Floating Medical Icons - Hidden on mobile */}
          <motion.div
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="hidden md:block absolute top-20 left-20 text-4xl opacity-30"
          >
            <Stethoscope className="text-white" />
          </motion.div>
          
          <motion.div
            animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="hidden md:block absolute top-32 right-32 text-3xl opacity-25"
          >
            <Pill className="text-white" />
          </motion.div>

          <div className="relative z-10 max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-2xl md:text-4xl lg:text-6xl font-black text-white mb-4 md:mb-6 leading-tight drop-shadow-lg">
                Find Trusted Doctors
                <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                  Near You
                </span>
              </h1>
              
              <p className="text-base md:text-lg lg:text-xl text-blue-100 mb-4 md:mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
                Book in seconds. Get the best healthcare with our verified network of doctors and hospitals.
              </p>
            </motion.div>

            {/* Advanced Search Container */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-4xl mx-auto mb-4 md:mb-8"
            >
              <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl">
                <div className="space-y-4 md:space-y-6">
                  {/* Main Search */}
                  <div className="relative z-30">
                    <Search className="absolute left-4 md:left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by Doctor / Specialty / Location"
                      value={searchQuery}
                      onChange={async (e) => {
                        const raw = e.target.value;
                        setSearchQuery(raw);
                        const q = raw.trim();
                        const caret = (e.target as HTMLInputElement).selectionStart ?? raw.length;
                        const start = Math.max(0, raw.lastIndexOf(' ', Math.max(0, caret - 1)) + 1);
                        const nextSpace = raw.indexOf(' ', caret);
                        const end = nextSpace === -1 ? raw.length : nextSpace;
                        const active = raw.substring(start, end).trim();

                        if (!q) {
                          const seeds = apiClient.getSeedSuggestions();
                          setSuggestions(seeds);
                          setShowSuggestions(seeds.length > 0);
                          return;
                        }

                        // Instant suggestions based on active token (cursor-focused)
                        let quick: string[] = [];
                        if (active) {
                          const cachedTok = apiClient.peekCachedSearch(active);
                          if (cachedTok && Array.isArray(cachedTok.suggestions)) {
                            quick = cachedTok.suggestions.slice(0, 8);
                          } else {
                            quick = apiClient.getLocalSuggestions(active).slice(0, 8);
                          }
                        } else {
                          quick = apiClient.getSeedSuggestions().slice(0, 8);
                        }
                        setSuggestions(quick);
                        setShowSuggestions(quick.length > 0);

                        try {
                          const resp = await apiClient.searchDoctors(q);
                          const combined = resp.suggestions.slice(0, 8);
                          setSuggestions(combined);
                          setShowSuggestions(combined.length > 0);
                          apiClient.trackSearchDebounced(q, {
                            matchedSpecialties: resp.matchedSpecialties,
                            matchedConditions: resp.matchedConditions,
                            topDoctorIds: (resp.doctors || []).slice(0, 5).map((d: any) => d.id),
                          });
                        } catch {
                          // Keep quick suggestions; still record minimal analytics
                          apiClient.trackSearchDebounced(q);
                        }
                      }}
                      onFocus={() => setShowSuggestions(suggestions.length > 0)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const raw = searchQuery;
                          const q = raw.trim();
                          const caret = (e.target as HTMLInputElement).selectionStart ?? raw.length;
                          const start = Math.max(0, raw.lastIndexOf(' ', Math.max(0, caret - 1)) + 1);
                          const nextSpace = raw.indexOf(' ', caret);
                          const end = nextSpace === -1 ? raw.length : nextSpace;
                          const active = raw.substring(start, end).trim();
                          if (q) {
                            if (active && suggestions.length === 0 && active.length >= 3) {
                              apiClient.addLocalSuggestion(active, active);
                            }
                            apiClient.trackSearch(q, { source: 'enter' });
                            setShowSuggestions(false);
                            router.push(`/doctors?search=${encodeURIComponent(q)}`);
                          }
                        }
                      }}
                      className="w-full pl-12 md:pl-16 pr-4 md:pr-6 py-2.5 md:py-3 bg-white border-2 border-gray-200 rounded-xl md:rounded-2xl text-sm md:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500 transition-all duration-300"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl md:rounded-2xl shadow-lg z-50 max-h-60 overflow-auto">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            className="w-full text-left px-3 md:px-4 py-2 text-sm md:text-base text-gray-900 hover:bg-gray-50"
                            onMouseDown={(ev) => {
                              const raw = searchQuery;
                              const inputEl = ev.currentTarget.ownerDocument.querySelector('input[type="text"]') as HTMLInputElement | null;
                              const caret = inputEl?.selectionStart ?? raw.length;
                              const start = Math.max(0, raw.lastIndexOf(' ', Math.max(0, (caret ?? raw.length) - 1)) + 1);
                              const nextSpace = raw.indexOf(' ', caret ?? raw.length);
                              const end = nextSpace === -1 ? raw.length : nextSpace;
                              const active = raw.substring(start, end).trim();
                              const picked = s.replace(/ \((specialization)\)$/i, '');
                              const newRaw = raw.slice(0, start) + picked + (end < raw.length ? raw.slice(end) : '');
                              const newQ = newRaw.trim();
                              setSearchQuery(newRaw);
                              setShowSuggestions(false);
                              if (active) apiClient.addLocalSuggestion(active, picked);
                              apiClient.trackSearch(newQ, { source: 'suggestion_click', selectedSuggestion: picked });
                              router.push(`/doctors?search=${encodeURIComponent(newQ)}`);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                    <select
                      value={selectedSpecialization}
                      onChange={(e) => setSelectedSpecialization(e.target.value)}
                      className="px-3 md:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg md:rounded-xl text-sm md:text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all duration-300"
                    >
                      <option value="">Specialization</option>
                      <option value="cardiology">Cardiology</option>
                      <option value="dermatology">Dermatology</option>
                      <option value="neurology">Neurology</option>
                      <option value="orthopedics">Orthopedics</option>
                    </select>

                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="px-3 md:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg md:rounded-xl text-sm md:text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all duration-300"
                    >
                      <option value="">City/Town</option>
                      <option value="mumbai">Mumbai</option>
                      <option value="delhi">Delhi</option>
                      <option value="bangalore">Bangalore</option>
                      <option value="chennai">Chennai</option>
                    </select>

                    <select
                      value={selectedAvailability}
                      onChange={(e) => setSelectedAvailability(e.target.value)}
                      className="px-3 md:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg md:rounded-xl text-sm md:text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all duration-300"
                    >
                      <option value="">Availability</option>
                      <option value="today">Today</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="week">This Week</option>
                    </select>

                    <label className="flex items-center justify-center px-3 md:px-4 py-2.5 md:py-3 bg-white border-2 border-gray-200 rounded-lg md:rounded-xl cursor-pointer hover:bg-emerald-50 transition-all duration-300">
                      <input
                        type="checkbox"
                        checked={isOnline}
                        onChange={(e) => setIsOnline(e.target.checked)}
                        className="mr-2 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm md:text-base text-gray-700 font-medium">Online</span>
                    </label>
                  </div>

                  <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3 md:py-4 px-6 md:px-8 rounded-xl md:rounded-2xl hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg text-base md:text-lg">
                    Find a Doctor Now
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Scroll Indicator - Hidden on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-white/80"
              >
                <ArrowDown className="w-8 h-8" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ============================================================================
            🎯 QUICK ACCESS SECTION - Easy navigation tiles (ENHANCED GREEN GRADIENT)
            ============================================================================ */}
        <section className="py-16 px-4" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)'
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-lg">
                Quick Access
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-white to-pink-200 mx-auto mb-4"></div>
              <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                Choose from our comprehensive healthcare categories
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {categories.map((category, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="group cursor-pointer"
                >
                  <a href={category.link} className="block">
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl md:rounded-3xl p-4 md:p-6 text-center shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/30 hover:border-white/50">
                      <div className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r ${category.color} rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <category.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                      </div>
                      <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{category.title}</h3>
                      <p className="text-xs md:text-base text-gray-600">{category.description}</p>
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================================
            🔀 TOGGLE SECTION - Switch between Doctors and Hospitals grids (ENHANCED BLUE GRADIENT)
            ============================================================================ */}
        <section className="py-8 px-4" style={{
          background:  'linear-gradient(90deg, rgba(90, 89, 181, 1) 0%, rgb(99, 99, 224) 27%, rgba(0, 212, 255, 1) 100%)'
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setActiveGrid('doctors')}
                className={`px-6 py-3 rounded-2xl font-bold shadow-sm transition-all duration-300 border ${
                  activeGrid === 'doctors'
                    ? 'btn-brand text-white'
                    : 'bg-white text-gray-800 hover:text-brand-primary hover:border-brand-300'
                }`}
              >
                Featured Doctors
              </button>
              <button
                onClick={() => setActiveGrid('hospitals')}
                className={`px-6 py-3 rounded-2xl font-bold shadow-sm transition-all duration-300 border ${
                  activeGrid === 'hospitals'
                    ? 'btn-brand text-white'
                    : 'bg-white text-gray-800 hover:text-brand-primary hover:border-brand-300'
                }`}
              >
                Partner Hospitals
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================================
            👨‍⚕️ FEATURED DOCTORS SECTION - Top-rated doctors (CUSTOM PURPLE-BLUE GRADIENT)
            ============================================================================ */}
        {activeGrid === 'doctors' && (
        <section className="py-16 px-4" style={{
          background: 'linear-gradient(90deg, rgba(90, 89, 181, 1) 0%, rgba(48, 48, 150, 1) 27%, rgba(0, 212, 255, 1) 100%)'
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-lg">
                Featured Doctors
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-white to-cyan-200 mx-auto mb-4"></div>
              <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                Top-rated doctors near you, verified by our AI system for excellence in care
              </p>

              {/* Smart match hint */}
              {(() => {
                const q = searchQuery.trim().toLowerCase();
                if (!q) return null;
                const tokens = q.split(/\s+/).filter(Boolean);
                const mapped = Array.from(new Set(tokens.flatMap(t => (diseaseToSpecializations as any)[t] || [])));
                if (mapped.length === 0) return null;
                return (
                  <div className="mt-4 inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-2xl border border-white/30">
                    <span className="text-sm opacity-90">Smart matches:</span>
                    <span className="text-sm font-semibold">{tokens.join(' ')}</span>
                    <span className="text-sm opacity-90">→ {mapped.join(', ')}</span>
                  </div>
                );
              })()}
            </div>

            {/* Vertical Doctor Cards - Compact mobile-friendly design */}
            <div className="space-y-4">
              {filteredDoctors.map((doctor, index) => (
                <motion.div 
                  key={doctor.id}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="group bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 border border-white/30 w-full">
                    {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Doctor Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Avatar - Smaller on mobile */}
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                          {doctor.doctorProfile?.profileImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={doctor.doctorProfile.profileImage}
                              alt={doctor.email.split('@')[0]}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span role="img" aria-label="doctor" className="text-xl">👨‍⚕️</span>
                          )}
                        </div>
                        
                        {/* Doctor Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 truncate">
                            Dr. {doctor.email.split('@')[0]}
                          </h3>
                          <p className="text-emerald-600 font-semibold text-sm md:text-base mb-2 truncate">
                            {doctor.doctorProfile?.specialization || 'General Practitioner'}
                          </p>
                          
                          {/* Info badges - Wrap on mobile */}
                          <div className="flex flex-wrap gap-3 text-xs md:text-sm">
                            {doctor.doctorProfile?.city && (
                              <div className="flex items-center text-gray-600">
                                <MapPin className="w-4 h-4 text-emerald-500 mr-1" />
                                <span className="truncate">{doctor.doctorProfile.city}</span>
                              </div>
                            )}
                            
                            {doctor.doctorProfile?.experience && (
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 text-blue-500 mr-1" />
                                <span>{doctor.doctorProfile.experience}+ Yrs</span>
                              </div>
                            )}
                            
                            {doctor.doctorProfile?.consultationFee && (
                              <div className="flex items-center text-gray-600">
                                <DollarSign className="w-4 h-4 text-green-500 mr-1" />
                                <span>₹{doctor.doctorProfile.consultationFee}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - Stack on mobile, horizontal on desktop */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:ml-4">
                        {doctor.doctorProfile?.slug ? (
                          <Link
                            href={`/doctor-site/${doctor.doctorProfile.slug}`}
                            className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-xl transition-all text-center text-sm md:text-base min-h-[44px] flex items-center justify-center whitespace-nowrap"
                            onClick={(e) => {
                              if (shouldUseSubdomainNav()) {
                                e.preventDefault();
                                window.location.href = doctorMicrositeUrl(String(doctor.doctorProfile?.slug || ''));
                              }
                              import('@/lib/api').then(({ apiClient }) => {
                                apiClient.trackDoctorClick(doctor.id, 'site').catch(() => {});
                              });
                            }}
                          >
                            Visit Website
                          </Link>
                        ) : doctor.managedHospitalId != null ? (
                          <button
                            className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-xl transition-all text-sm md:text-base min-h-[44px] whitespace-nowrap"
                            onClick={() => {
                              import('@/lib/api').then(({ apiClient }) => {
                                apiClient
                                  .getHospitalByDoctorId(doctor.id)
                                  .then((resp) => {
                                    const hName = (resp as any)?.name || '';
                                    const hId = (resp as any)?.id ?? (resp as any)?.hospitalId;
                                    if (hName) {
                                      if (shouldUseSubdomainNav()) {
                                        window.location.href = hospitalMicrositeUrl(hName);
                                      } else {
                                        router.push(`/hospital-site/${slugifyName(hName)}`);
                                      }
                                    } else if (Number.isFinite(hId)) {
                                      if (shouldUseSubdomainNav()) {
                                        window.location.href = hospitalIdMicrositeUrl(hId);
                                      } else {
                                        router.push(`/hospital-site/${String(hId)}`);
                                      }
                                    }
                                  })
                                  .catch(() => {});
                              });
                            }}
                          >
                            Visit Hospital
                          </button>
                        ) : null}
                        <button 
                          onClick={() => handleBookAppointment(doctor)}
                          className="btn-brand font-bold py-2 px-4 rounded-xl transition-all text-sm md:text-base min-h-[44px] whitespace-nowrap"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* ============================================================================
            🏥 HOSPITALS SECTION - Partner hospitals (ENHANCED BLUE-PURPLE GRADIENT)
            ============================================================================ */}
        {activeGrid === 'hospitals' && (
        <section className="py-16 px-4" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-lg">
                Partner Hospitals
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-white to-purple-200 mx-auto mb-4"></div>
              <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                Discover our partner hospitals offering world-class healthcare services and specialized treatments
              </p>
            </div>

            {/* Compact Hospital Cards */}
            <div className="grid grid-cols-2 gap-4">
              {hospitals.map((hospital, index) => {
                const name = hospital.name || '';
                const location = hospital.address ? `${hospital.city || ''}, ${hospital.state || ''}`.trim() : 'Location';
                
                return (
                  <motion.div 
                    key={hospital.id}
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="group bg-white/95 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 border border-white/30 w-full">
                      <div className="flex items-center gap-3 mb-3">
                        {/* Hospital Logo - Compact */}
                        <div className="w-12 h-12 gradient-brand rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                          {(() => {
                            const logoUrl = (hospital as any).profile?.general?.logoUrl || (hospital as any).logoUrl || (hospital as any).general?.logoUrl || null;
                            if (logoUrl) {
                              return (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={logoUrl} alt={name} className="w-full h-full object-contain" />
                              );
                            }
                            return <span role="img" aria-label="hospital" className="text-xl">🏥</span>;
                          })()}
                        </div>
                        
                        {/* Hospital Info - Compact */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1 truncate">{name}</h3>
                          <p className="text-blue-600 font-semibold text-xs md:text-sm mb-1 truncate">Multi-Specialty Hospital</p>
                          
                          {/* Location */}
                          {location && (
                            <div className="flex items-center text-gray-600 text-xs">
                              <MapPin className="w-3 h-3 text-blue-500 mr-1 flex-shrink-0" />
                              <span className="truncate">{location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Stats - Compact */}
                      <div className="flex gap-3 mb-3 text-xs">
                        <div className="flex items-center text-gray-600">
                          <Building2 className="w-4 h-4 text-emerald-500 mr-1" />
                          <span>{hospital._count?.departments || 0} Depts</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <Users className="w-4 h-4 text-green-500 mr-1" />
                          <span>{hospital._count?.doctors || 0} Doctors</span>
                        </div>
                      </div>

                      {/* Visit Button - Full width */}
                      <a
                        href={`/hospital-site/${hospital.id}`}
                        className="btn-brand font-bold py-2 px-4 rounded-lg block text-center text-sm min-h-[44px] flex items-center justify-center"
                        onClick={(e) => {
                          try {
                            if (shouldUseSubdomainNav()) {
                              e.preventDefault();
                              const sub = (hospital as any).subdomain as string | undefined;
                              if (sub && sub.length > 1) {
                                window.location.href = customSubdomainUrl(sub);
                              } else {
                                const hospitalSlug = slugifyName(hospital.name);
                                window.location.href = hospitalMicrositeUrl(hospitalSlug);
                              }
                            } else {
                              router.push(`/hospital-site/${hospital.id}`);
                            }
                          } catch {}
                        }}
                      >
                        Visit Hospital
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
        )}

        {/* ============================================================================
            🛡️ TRUSTED HEALTHCARE PROVIDERS SECTION - Social proof and verification (GREEN GRADIENT)
            ============================================================================ */}
        <section className="py-16 px-4 bg-gradient-to-br from-green-300 via-emerald-300 to-teal-300">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-lg">
                Trusted Healthcare Providers
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-white to-green-100 mx-auto mb-4"></div>
              <p className="text-xl text-green-100 max-w-2xl mx-auto drop-shadow-md">
                Join thousands of verified healthcare providers and satisfied patients
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Verified Doctors Only</h3>
                <p className="text-green-100">All doctors are verified by license ID</p>
              </div>
              
              <div className="text-center bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Real Reviews</h3>
                <p className="text-green-100">10,000+ verified patient reviews</p>
              </div>
              
              <div className="text-center bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Quality Assured</h3>
                <p className="text-green-100">Premium healthcare standards maintained</p>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30"
                >
                  <div className="w-14 h-14 bg-white/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-3xl font-black text-white mb-2">
                    {stat.value.toLocaleString()}+
                  </div>
                  <div className="text-green-100 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================================
            📋 HOW IT WORKS SECTION - 3-step process (BLUE GRADIENT)
            ============================================================================ */}
        <section className="py-16 px-4 bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-lg">
                How It Works
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-white to-blue-100 mx-auto mb-4"></div>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto drop-shadow-md">
                Simple 3-step process to get the healthcare you need
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorks.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="text-center relative"
                >
                  <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/30">
                    <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <step.icon className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-5xl font-black text-white mb-4">{step.step}</div>
                    <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                    <p className="text-blue-100 text-base">{step.description}</p>
                  </div>
                  
                  {/* Connector Arrow */}
                  {index < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ChevronRight className="w-8 h-8 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================================
            ✅ WHY CHOOSE US SECTION - USP highlights (ENHANCED TEAL GRADIENT)
            ============================================================================ */}
        <section className="py-16 px-4" style={{
          background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)'
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-lg">
                Why Choose Us
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-white to-teal-200 mx-auto mb-4"></div>
              <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                Experience the future of healthcare with our revolutionary platform
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {whyChooseUs.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 text-center shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/30 hover:border-white/50">
                    <div className="w-14 h-14 gradient-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-base">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================================
            💬 REVIEWS & TESTIMONIALS SECTION - Social proof (ENHANCED CORAL GRADIENT)
            ============================================================================ */}
        <section className="py-16 px-4" style={{
          background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-lg">
                What Our Users Say
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-white to-orange-200 mx-auto mb-4"></div>
              <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                Real stories from real patients and healthcare providers
              </p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/30 text-center"
              >
                <div className="text-4xl mb-4">{testimonials[currentTestimonial].avatar}</div>
                <div className="flex justify-center mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-yellow-500 fill-current" />
                  ))}
                </div>
                <blockquote className="text-xl text-gray-700 mb-4 leading-relaxed">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>
                <div>
                  <div className="text-lg font-bold text-gray-900">{testimonials[currentTestimonial].name}</div>
                  <div className="text-brand-600 font-medium">{testimonials[currentTestimonial].role}</div>
                </div>
              </motion.div>

              {/* Testimonial Navigation Dots */}
              <div className="flex justify-center mt-6 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentTestimonial ? 'bg-brand-primary' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            📍 FIND DOCTORS IN YOUR AREA SECTION - Map and location-based search (CUSTOM GREEN GRADIENT)
            ============================================================================ */}
        <section className="py-16 px-4" style={{
          background: 'linear-gradient(to bottom, #99f2c8, #1f4037)'
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-lg">
                Find Doctors in Your Area
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-white to-green-100 mx-auto mb-4"></div>
              <p className="text-xl text-green-100 max-w-2xl mx-auto drop-shadow-md">
                Interactive map view showing available doctors in your city
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 h-80 flex items-center justify-center border border-white/30">
                  <div className="text-center">
                    <MapIcon className="w-20 h-20 text-white mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-3">Interactive Map</h3>
                    <p className="text-green-100 text-lg">Coming Soon - View doctors on map</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/30">
                  <h3 className="text-xl font-bold text-white mb-4">Auto-detect Location</h3>
                  <button className="w-full bg-white/30 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg border border-white/30">
                    Find Nearby Doctors
                  </button>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/30">
                  <h3 className="text-xl font-bold text-white mb-4">Search by City</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Enter your city name"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-green-100 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/50 transition-all duration-300"
                    />
                    <button className="w-full bg-white/30 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg border border-white/30">
                      Search City
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            📚 HEALTH AWARENESS BLOG SECTION - SEO and trust building (ENHANCED LAVENDER GRADIENT)
            ============================================================================ */}
        <section className="py-16 px-4" style={{
          background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-lg">
                Health Tips from Our Doctors
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-white to-pink-200 mx-auto mb-4"></div>
              <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                Expert advice and health awareness articles
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Dengue Prevention Tips",
                  excerpt: "Essential precautions to protect yourself from dengue fever",
                  author: "Dr. Sarah Johnson",
                  category: "Preventive Care",
                  readTime: "5 min read"
                },
                {
                  title: "Diabetes Management Guide",
                  excerpt: "Comprehensive guide to managing diabetes effectively",
                  author: "Dr. Michael Chen",
                  category: "Chronic Conditions",
                  readTime: "8 min read"
                },
                {
                  title: "Mental Health Awareness",
                  excerpt: "Understanding and supporting mental health in daily life",
                  author: "Dr. Priya Sharma",
                  category: "Mental Health",
                  readTime: "6 min read"
                }
              ].map((article, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/30">
                    <div className="gradient-brand-accent text-white px-4 py-2 rounded-full text-sm font-medium inline-block mb-4">
                      {article.category}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{article.title}</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed text-base">{article.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">By {article.author}</div>
                        <div className="text-sm text-gray-400">{article.readTime}</div>
                      </div>
                      <button className="btn-brand text-white font-bold py-2 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm">
                        Read More
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================================
            🎯 CALL TO ACTION BANNERS - Conversion focused (ENHANCED SUNSET GRADIENT)
            ============================================================================ */}
        <section className="py-16 px-4" style={{
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)'
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* For Doctors */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="gradient-brand-accent rounded-3xl p-8 text-white text-center"
              >
                <div className="text-4xl mb-4">👨‍⚕️</div>
                <h3 className="text-2xl font-black mb-3">Join 200+ Verified Doctors Already Onboard!</h3>
                <p className="text-lg mb-6 opacity-90">Expand your practice and reach more patients</p>
                <a
                  href="/register/doctor-hospital?role=doctor"
                  className="bg-white text-brand-600 font-bold py-3 px-6 rounded-2xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg inline-block text-base"
                >
                  Register as Doctor
                </a>
              </motion.div>

              {/* For Users */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="gradient-brand rounded-3xl p-8 text-white text-center"
              >
                <div className="text-4xl mb-4">👩‍💼</div>
                <h3 className="text-2xl font-black mb-3">Find Your Doctor Today. Book in 2 Minutes.</h3>
                <p className="text-lg mb-6 opacity-90">Get the healthcare you deserve, when you need it</p>
                <a
                  href="/doctors"
                  className="bg-white text-brand-600 font-bold py-3 px-6 rounded-2xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg inline-block text-base"
                >
                  Find a Doctor
                </a>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <MobileBottomNavigation />

      <footer className="bg-gray-900 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <div className="text-2xl">🏥</div>
                <span className="text-xl font-bold">Healtara</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Your trusted healthcare platform connecting patients with verified doctors and hospitals.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center hover-bg-brand-hover transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center hover-bg-brand-hover transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-brand-secondary rounded-full flex items-center justify-center hover:opacity-90 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-bold mb-6">Quick Links</h3>
              <ul className="space-y-3">
                <li><a href="/" className="text-gray-400 hover:text-white transition-colors">🏠 Home</a></li>
                <li><a href="/doctors" className="text-gray-400 hover:text-white transition-colors">👨‍⚕️ Find Doctors</a></li>
                <li><a href="/hospitals" className="text-gray-400 hover:text-white transition-colors">🏥 Hospitals</a></li>
                <li><a href="/clinics" className="text-gray-400 hover:text-white transition-colors">🏥 Clinics</a></li>
                <li><a href="/reviews" className="text-gray-400 hover:text-white transition-colors">⭐ Reviews</a></li>
              </ul>
            </div>

            {/* For Providers */}
            <div>
              <h3 className="text-xl font-bold mb-6">For Providers</h3>
              <ul className="space-y-3">
                <li><a href="/register/doctor-hospital?role=doctor" className="text-gray-400 hover:text-white transition-colors">👨‍⚕️ Doctor Sign-up</a></li>
                <li><a href="/register/doctor-hospital?role=hospital" className="text-gray-400 hover:text-white transition-colors">🏥 Hospital Sign-up</a></li>
                <li><a href="/login/doctors" className="text-gray-400 hover:text-white transition-colors">🔑 Doctor Login</a></li>
                <li><a href="/slot-admin/login" className="text-gray-400 hover:text-white transition-colors">🧑‍⚕️ Doctors Management</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-xl font-bold mb-6">Support</h3>
              <ul className="space-y-3">
                <li><a href="/about" className="text-gray-400 hover:text-white transition-colors">📖 About</a></li>
                <li><a href="/contact" className="text-gray-400 hover:text-white transition-colors">📞 Contact</a></li>
                <li><a href="/terms" className="text-gray-400 hover:text-white transition-colors">📋 Terms</a></li>
                <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors">🔒 Privacy</a></li>
                <li><a href="/careers" className="text-gray-400 hover:text-white transition-colors">💼 Careers</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              Made with ❤️ by Healtara Team | © 2024 All rights reserved
            </p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      {showAppointmentModal && selectedDoctor && (
        <BookAppointmentModal
          open={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false);
            setSelectedDoctor(null);
          }}
          doctor={selectedDoctor}
          doctorId={selectedDoctor.id}
          doctorName={`Dr. ${selectedDoctor.email.split('@')[0]}`}
          onSubmit={async (appointmentData) => {
            try {
              if (appointmentData.time) {
                await apiClient.bookAppointment({
                  ...appointmentData,
                  time: appointmentData.time
                });
                setShowAppointmentModal(false);
                setSelectedDoctor(null);
                // Success handled by global status bar (no blocking alert)
              }
            } catch (error) {
              console.error('Error booking appointment:', error);
              // Failure handled by global status bar (no blocking alert)
            }
          }}
          patientLoggedIn={!!user}
          patientRole={user?.role}
        />
      )}
    </div>
  );
}
