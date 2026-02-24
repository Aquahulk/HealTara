"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { loadWithCache, PerformanceMonitor, CacheManager } from '@/lib/performance';
import Header from '@/components/Header';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import DesktopSidebar from '@/components/DesktopSidebar';
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
import { EnhancedRatingDisplay } from '@/components/SimpleRatingDisplay';

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

  useEffect(() => {
    const loadData = async () => {
      const startTime = performance.now();
      
      try {
        setLoading(true);

        // Check cache first for instant loading
        const cachedHospitals = localStorage.getItem('hospitals_cache');
        const cachedDoctors = localStorage.getItem('doctors_cache');
        const cacheTimestamp = localStorage.getItem('cache_timestamp');
        const now = Date.now();
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        // Use cached data if available and fresh
        if (cachedHospitals && cachedDoctors && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
          console.log('⚡ Loading from cache for instant display');
          setHospitals(JSON.parse(cachedHospitals));
          setDoctors(JSON.parse(cachedDoctors));
          setLoading(false);
          
          // Still fetch fresh data in background
          setTimeout(() => fetchFreshData(), 100);
        } else {
          await fetchFreshData();
        }

        async function fetchFreshData() {
          PerformanceMonitor.startTiming('homepage-data-load');
          try {
            // Fetch hospitals and homepage content in parallel to reduce TTFB
            const [hospitalsRes, doctorsRes] = await Promise.allSettled([
              apiClient.getHospitals(),
              loadWithCache('homepage_doctors_v2', () => apiClient.getDoctors({ sort: 'trending', page: 1, pageSize: 12 })),
            ]);

            if (hospitalsRes.status === 'fulfilled') {
              setHospitals(hospitalsRes.value || []);
              localStorage.setItem('hospitals_cache', JSON.stringify(hospitalsRes.value || []));
            } else {
              console.warn('Failed to load hospitals:', (hospitalsRes as any)?.reason);
              setHospitals([]);
            }

            if (doctorsRes.status === 'fulfilled') {
              const list = Array.isArray(doctorsRes.value) ? doctorsRes.value : [];
              setDoctors(list);
              localStorage.setItem('doctors_cache', JSON.stringify(list));
            } else {
              console.warn('Failed to load doctors:', (doctorsRes as any)?.reason);
              setDoctors([]);
            }

            // Update cache timestamp
            localStorage.setItem('cache_timestamp', Date.now().toString());
            setLoading(false);
            
            const loadTime = performance.now() - startTime;
            console.log(`📊 Homepage loaded in ${loadTime.toFixed(2)}ms`);
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
            const duration = PerformanceMonitor.endTiming('homepage-data-load');
            PerformanceMonitor.logTiming('homepage-data-load', duration);
          }
        }

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

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    const refreshHospitals = async () => {
      try { CacheManager.clear('homepage_hospitals'); } catch {}
      try {
        const items = await apiClient.getHospitals();
        setHospitals(items || []);
      } catch {}
    };
    const onCustom = (e: any) => {
      const d = e?.detail;
      if (d?.entityType === 'hospital') {
        refreshHospitals();
      }
    };
    window.addEventListener('rating:updated', onCustom as EventListener);
    const onMsg = (msg: MessageEvent) => {
      const d = msg?.data || {};
      if (d.type === 'rating:updated' && d.entityType === 'hospital') {
        refreshHospitals();
      }
    };
    try {
      bc = new BroadcastChannel('entity_updates');
      bc.addEventListener('message', onMsg as EventListener);
    } catch {}
    const onStorage = (ev: StorageEvent) => {
      try {
        if (ev.key === 'entity_updated' && ev.newValue) {
          const d = JSON.parse(ev.newValue);
          if (d.type === 'rating:updated' && d.entityType === 'hospital') {
            refreshHospitals();
          }
        }
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('rating:updated', onCustom as EventListener);
      window.removeEventListener('storage', onStorage);
      try { bc && bc.removeEventListener('message', onMsg as EventListener); } catch {}
      try { bc && bc.close && bc.close(); } catch {}
    };
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
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      
      {/* Desktop Sidebar - Fixed position */}
      <DesktopSidebar />
      
      {/* Main content area - Adjusts margin based on sidebar using CSS variable */}
      <main className="overflow-x-hidden transition-all duration-300 md:ml-[var(--sidebar-width,16rem)]">
        {/* ============================================================================
            🌟 HERO SECTION - Modern glassmorphism design
            ============================================================================ */}
        <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
            </div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-4 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 leading-tight">
                Your Health,
                <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                  Our Priority
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto font-medium">
                Connect with verified doctors instantly. Book appointments in 60 seconds.
              </p>
            </motion.div>

            {/* Modern Search Card with Glassmorphism */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-4xl mx-auto"
            >
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl">
                <div className="space-y-4">
                  {/* Main Search */}
                  <div className="relative z-30">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70" />
                    <input
                      type="text"
                      placeholder="Search doctors, specialties, or conditions..."
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
                      className="w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-lg"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 backdrop-blur-xl bg-white/95 border border-white/20 rounded-2xl shadow-2xl z-50 max-h-60 overflow-auto">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            className="w-full text-left px-4 py-3 text-gray-900 hover:bg-blue-50 transition-colors"
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <select
                      value={selectedSpecialization}
                      onChange={(e) => setSelectedSpecialization(e.target.value)}
                      className="px-3 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                    >
                      <option value="" className="text-gray-900">Specialization</option>
                      <option value="cardiology" className="text-gray-900">Cardiology</option>
                      <option value="dermatology" className="text-gray-900">Dermatology</option>
                      <option value="neurology" className="text-gray-900">Neurology</option>
                      <option value="orthopedics" className="text-gray-900">Orthopedics</option>
                    </select>

                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="px-3 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                    >
                      <option value="" className="text-gray-900">City/Town</option>
                      <option value="mumbai" className="text-gray-900">Mumbai</option>
                      <option value="delhi" className="text-gray-900">Delhi</option>
                      <option value="bangalore" className="text-gray-900">Bangalore</option>
                      <option value="chennai" className="text-gray-900">Chennai</option>
                    </select>

                    <select
                      value={selectedAvailability}
                      onChange={(e) => setSelectedAvailability(e.target.value)}
                      className="px-3 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                    >
                      <option value="" className="text-gray-900">Availability</option>
                      <option value="today" className="text-gray-900">Today</option>
                      <option value="tomorrow" className="text-gray-900">Tomorrow</option>
                      <option value="week" className="text-gray-900">This Week</option>
                    </select>

                    <label className="flex items-center justify-center px-3 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl cursor-pointer hover:bg-white/30 transition-all">
                      <input
                        type="checkbox"
                        checked={isOnline}
                        onChange={(e) => setIsOnline(e.target.checked)}
                        className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-white font-medium">Online</span>
                    </label>
                  </div>

                  <button className="w-full bg-gradient-to-r from-yellow-400 to-pink-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-yellow-500 hover:to-pink-600 transition-all transform hover:scale-[1.02] shadow-2xl text-lg">
                    Find a Doctor Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============================================================================
            🎯 QUICK ACCESS SECTION - Modern card grid
            ============================================================================ */}
        <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
                Explore Healthcare Services
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Everything you need for your health, all in one place
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((category, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group cursor-pointer"
                >
                  <a href={category.link} className="block">
                    <div className="relative bg-white rounded-2xl p-6 text-center shadow-lg hover:shadow-2xl transition-all border border-gray-100 overflow-hidden">
                      {/* Gradient overlay on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                      
                      <div className={`relative w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                        <category.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{category.title}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================================
            🔀 TOGGLE SECTION - Modern tab switcher
            ============================================================================ */}
        <section className="py-12 px-4 bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setActiveGrid('doctors')}
                className={`relative px-8 py-4 rounded-2xl font-bold shadow-lg transition-all overflow-hidden ${
                  activeGrid === 'doctors'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105'
                    : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-400 hover:scale-105'
                }`}
              >
                <span className="relative z-10">Featured Doctors</span>
                {activeGrid === 'doctors' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
              <button
                onClick={() => setActiveGrid('hospitals')}
                className={`relative px-8 py-4 rounded-2xl font-bold shadow-lg transition-all overflow-hidden ${
                  activeGrid === 'hospitals'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white scale-105'
                    : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-purple-400 hover:scale-105'
                }`}
              >
                <span className="relative z-10">Partner Hospitals</span>
                {activeGrid === 'hospitals' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================================
            👨‍⚕️ FEATURED DOCTORS SECTION - Top-rated doctors
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

            {/* OYO-Style Doctor Cards - Visually engaging design */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDoctors.map((doctor, index) => (
                <motion.div 
                  key={doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="group"
                >
                  <div className="relative bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                    {/* Background Gradient Overlay - Medical colors: light green, blue, white */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Content Container - More compact on mobile */}
                    <div className="relative p-3 md:p-4">
                      {/* Top Section: Doctor Info with Image */}
                      <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
                        {/* Doctor Avatar with Badge - Smaller on mobile */}
                        <div className="relative flex-shrink-0">
                          <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden shadow-md ring-2 ring-white group-hover:ring-emerald-400 transition-all duration-300">
                            {doctor.doctorProfile?.profileImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={doctor.doctorProfile.profileImage}
                                alt={doctor.email.split('@')[0]}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-400 flex items-center justify-center text-xl md:text-2xl">
                                👨‍⚕️
                              </div>
                            )}
                          </div>
                          {/* Verified Badge */}
                          <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full p-1 shadow-md">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        </div>
                        
                        {/* Doctor Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1 truncate group-hover:text-emerald-600 transition-colors">
                            Dr. {doctor.email.split('@')[0]}
                          </h3>
                          <div className="inline-flex items-center bg-gradient-to-r from-emerald-50 to-cyan-50 text-emerald-700 px-2 py-0.5 md:py-1 rounded-lg mb-1 md:mb-2 border border-emerald-200">
                            <Stethoscope className="w-3 h-3 mr-1" />
                            <span className="text-xs font-semibold truncate">
                              {doctor.doctorProfile?.specialization || 'General Practitioner'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-0.5">
                            <EnhancedRatingDisplay entityType="doctor" entityId={String(doctor.id)} size="sm" />
                          </div>
                        </div>
                      </div>

                      {/* Info Grid - More compact on mobile */}
                      <div className="grid grid-cols-3 gap-1.5 md:gap-2 mb-2 md:mb-3">
                        {doctor.doctorProfile?.city && (
                          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-1.5 md:p-2 text-center border border-cyan-200">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 text-cyan-600 mx-auto mb-0.5 md:mb-1" />
                            <p className="text-xs font-medium text-gray-700 truncate">{doctor.doctorProfile.city}</p>
                          </div>
                        )}
                        
                        {doctor.doctorProfile?.experience && (
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-1.5 md:p-2 text-center border border-emerald-200">
                            <Award className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 mx-auto mb-0.5 md:mb-1" />
                            <p className="text-xs font-medium text-gray-700">{doctor.doctorProfile.experience}+ Yrs</p>
                          </div>
                        )}
                        
                        {doctor.doctorProfile?.consultationFee && (
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-1.5 md:p-2 text-center border border-green-200">
                            <p className="text-xs text-gray-600">Fee</p>
                            <p className="text-xs md:text-sm font-bold text-green-600">₹{doctor.doctorProfile.consultationFee}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons - More compact on mobile */}
                      <div className="flex gap-1.5 md:gap-2">
                        {doctor.doctorProfile?.slug ? (
                          <Link
                            href={`/doctor-site/${doctor.doctorProfile.slug}`}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 md:py-2.5 px-2 md:px-3 rounded-lg md:rounded-xl transition-all text-center text-xs md:text-sm min-h-[40px] md:min-h-[44px] flex items-center justify-center"
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
                            <Globe className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            <span className="hidden sm:inline">Visit</span>
                          </Link>
                        ) : doctor.managedHospitalId != null ? (
                          <button
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 md:py-2.5 px-2 md:px-3 rounded-lg md:rounded-xl transition-all text-xs md:text-sm min-h-[40px] md:min-h-[44px] flex items-center justify-center"
                            onClick={() => {
                              import('@/lib/api').then(({ apiClient }) => {
                                apiClient
                                  .getHospitalByDoctorId(doctor.id)
                                  .then((resp) => {
                                    const hId = (resp as any)?.id ?? (resp as any)?.hospitalId;
                                    if (Number.isFinite(hId)) {
                                      router.push(`/hospital-site/${String(hId)}`);
                                    }
                                  })
                                  .catch(() => {});
                              });
                            }}
                          >
                            <Building2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            <span className="hidden sm:inline">Hospital</span>
                          </button>
                        ) : null}
                        <button 
                          onClick={() => handleBookAppointment(doctor)}
                          className="flex-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 hover:from-emerald-600 hover:via-cyan-600 hover:to-blue-600 text-white font-bold py-2 md:py-2.5 px-2 md:px-3 rounded-lg md:rounded-xl transition-all text-xs md:text-sm min-h-[40px] md:min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg"
                        >
                          <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" />
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

            {/* OYO-Style Hospital Cards - Visually engaging design */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hospitals.map((hospital, index) => {
                const name = hospital.name || '';
                const location = hospital.address ? `${hospital.city || ''}, ${hospital.state || ''}`.trim() : 'Location';
                
                return (
                  <motion.div 
                    key={hospital.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className="group"
                  >
                    <div className="relative bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Content Container - More compact on mobile */}
                      <div className="relative p-3 md:p-4">
                        {/* Top Section: Hospital Info with Logo */}
                        <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
                          {/* Hospital Logo with Badge - Smaller on mobile */}
                          <div className="relative flex-shrink-0">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden shadow-md ring-2 ring-white group-hover:ring-blue-400 transition-all duration-300 bg-gradient-to-br from-blue-400 to-purple-500">
                              {(() => {
                                const logoUrl = (hospital as any).profile?.general?.logoUrl || (hospital as any).logoUrl || (hospital as any).general?.logoUrl || null;
                                if (logoUrl) {
                                  return (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={logoUrl} alt={name} className="w-full h-full object-contain p-2 bg-white" />
                                  );
                                }
                                return (
                                  <div className="w-full h-full flex items-center justify-center text-xl md:text-2xl">
                                    🏥
                                  </div>
                                );
                              })()}
                            </div>
                            {/* Verified Badge */}
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 shadow-md">
                              <Shield className="w-3 h-3 md:w-4 md:h-4 text-white" />
                            </div>
                          </div>
                          
                          {/* Hospital Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                              {name}
                            </h3>
                            <div className="inline-flex items-center bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 px-2 py-0.5 md:py-1 rounded-lg mb-1 md:mb-2 border border-blue-200">
                              <Hospital className="w-3 h-3 mr-1" />
                              <span className="text-xs font-semibold">Multi-Specialty</span>
                            </div>
                            
                            {/* Location */}
                            {location && (
                              <div className="flex items-center text-gray-600 text-xs">
                                <MapPin className="w-3 h-3 text-blue-500 mr-1 flex-shrink-0" />
                                <span className="truncate">{location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stats Grid - More compact on mobile */}
                        <div className="grid grid-cols-3 gap-1.5 md:gap-2 mb-2 md:mb-3">
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-1.5 md:p-2 text-center border border-emerald-200">
                            <Building2 className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 mx-auto mb-0.5 md:mb-1" />
                            <p className="text-xs font-bold text-emerald-700">{hospital._count?.departments || 0}</p>
                            <p className="text-xs text-gray-600">Depts</p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-1.5 md:p-2 text-center border border-blue-200">
                            <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-600 mx-auto mb-0.5 md:mb-1" />
                            <p className="text-xs font-bold text-blue-700">{hospital._count?.doctors || 0}</p>
                            <p className="text-xs text-gray-600">Doctors</p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-1.5 md:p-2 text-center border border-yellow-200">
                            <div className="flex items-center justify-center">
                              <EnhancedRatingDisplay entityType="hospital" entityId={String(hospital.id)} size="sm" />
                            </div>
                          </div>
                        </div>

                        {/* Features Tags - Smaller on mobile */}
                        <div className="flex flex-wrap gap-1 md:gap-1.5 mb-2 md:mb-3">
                          <span className="inline-flex items-center bg-purple-50 text-purple-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-xs font-medium border border-purple-200">
                            <Activity className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                            24/7
                          </span>
                          <span className="inline-flex items-center bg-green-50 text-green-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-xs font-medium border border-green-200">
                            <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                            ICU
                          </span>
                        </div>

                        {/* Visit Button - More compact on mobile */}
                        <a
                          href={`/hospital-site/${hospital.id}`}
                          className="block w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-2 md:py-2.5 px-3 md:px-4 rounded-lg md:rounded-xl transition-all text-center text-xs md:text-sm min-h-[40px] md:min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg"
                          onClick={(e) => {
                            try {
                              if (shouldUseSubdomainNav()) {
                                e.preventDefault();
                                const sub = (hospital as any).subdomain as string | undefined;
                                if (sub && sub.length > 1) {
                                  window.location.href = customSubdomainUrl(sub);
                                } else {
                                  router.push(`/hospital-site/${hospital.id}`);
                                }
                              } else {
                                router.push(`/hospital-site/${hospital.id}`);
                              }
                            } catch {}
                          }}
                        >
                          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                          Visit Hospital
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
        )}

        {/* ============================================================================
            🛡️ TRUSTED HEALTHCARE PROVIDERS SECTION - Modern stats showcase
            ============================================================================ */}
        <section className="py-16 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
                Trusted by Thousands
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Join our growing community of healthcare providers and satisfied patients
              </p>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="relative group"
                >
                  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all border border-gray-100 text-center overflow-hidden">
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <stat.icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
                        {stat.value.toLocaleString()}+
                      </div>
                      <div className="text-sm font-medium text-gray-600">{stat.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Verified Doctors Only</h3>
                <p className="text-sm text-gray-600">All doctors verified by license ID</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Real Reviews</h3>
                <p className="text-sm text-gray-600">10,000+ verified patient reviews</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Quality Assured</h3>
                <p className="text-sm text-gray-600">Premium healthcare standards</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            📋 HOW IT WORKS SECTION - Modern step-by-step
            ============================================================================ */}
        <section className="py-16 px-4 bg-gradient-to-br from-blue-900 to-blue-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
                How It Works
              </h2>
              <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                Get started in 3 simple steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorks.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="relative"
                >
                  <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100 text-center group">
                    {/* Step number badge */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-black text-xl">{step.step}</span>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform">
                        <step.icon className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                  
                  {/* Connector Arrow */}
                  {index < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ChevronRight className="w-8 h-8 text-purple-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================================
            ✅ WHY CHOOSE US SECTION - Modern feature grid
            ============================================================================ */}
        <section className="py-16 px-4 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
                Why Choose Us
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Experience healthcare reimagined for the digital age
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {whyChooseUs.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <div className="relative bg-white rounded-3xl p-6 text-center shadow-lg hover:shadow-2xl transition-all border border-gray-100 h-full overflow-hidden group">
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================================
            💬 REVIEWS & TESTIMONIALS SECTION - Modern carousel
            ============================================================================ */}
        <section className="py-16 px-4 bg-gradient-to-br from-blue-900 to-indigo-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
                What Our Users Say
              </h2>
              <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                Real stories from real people
              </p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-10 shadow-2xl border border-gray-100 text-center overflow-hidden"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-200 rounded-full filter blur-3xl opacity-20"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-200 rounded-full filter blur-3xl opacity-20"></div>
                
                <div className="relative">
                  <div className="text-6xl mb-4">{testimonials[currentTestimonial].avatar}</div>
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="w-6 h-6 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-lg text-gray-700 mb-6 leading-relaxed font-medium">
                    "{testimonials[currentTestimonial].content}"
                  </blockquote>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{testimonials[currentTestimonial].name}</div>
                    <div className="text-sm text-purple-600 font-semibold">{testimonials[currentTestimonial].role}</div>
                  </div>
                </div>
              </motion.div>

              {/* Testimonial Navigation Dots */}
              <div className="flex justify-center mt-6 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentTestimonial 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 w-8' 
                        : 'bg-gray-300 w-2 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            📍 FIND DOCTORS IN YOUR AREA SECTION
            ============================================================================ */}
        <section className="py-12 px-4 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Find Doctors in Your Area
              </h2>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                Interactive map view showing available doctors in your city
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div>
                <div className="bg-white rounded-xl p-8 h-64 flex items-center justify-center border border-gray-200 shadow-md">
                  <div className="text-center">
                    <MapIcon className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Interactive Map</h3>
                    <p className="text-sm text-gray-600">Coming Soon - View doctors on map</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-3">Auto-detect Location</h3>
                  <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:from-blue-700 hover:to-indigo-700 shadow-md">
                    Find Nearby Doctors
                  </button>
                </div>
                
                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-3">Search by City</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Enter your city name"
                      className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-all hover:from-blue-700 hover:to-indigo-700 shadow-md">
                      Search City
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            📚 HEALTH AWARENESS BLOG SECTION
            ============================================================================ */}
        <section className="py-12 px-4 bg-gradient-to-br from-blue-900 to-indigo-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Health Tips from Our Doctors
              </h2>
              <p className="text-base text-blue-100 max-w-2xl mx-auto">
                Expert advice and health awareness articles
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all border border-gray-100">
                    <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-semibold inline-block mb-3">
                      {article.category}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{article.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{article.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">By {article.author}</div>
                        <div className="text-xs text-gray-400">{article.readTime}</div>
                      </div>
                      <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-all hover:from-blue-700 hover:to-indigo-700 shadow-md text-xs">
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
            🎯 CALL TO ACTION BANNERS - Conversion focused
            ============================================================================ */}
        <section className="py-12 px-4 bg-gradient-to-br from-blue-600 to-indigo-700">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* For Doctors */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-xl p-6 text-center shadow-lg"
              >
                <div className="text-3xl mb-3">👨‍⚕️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Join 200+ Verified Doctors</h3>
                <p className="text-sm text-gray-600 mb-4">Expand your practice and reach more patients</p>
                <a
                  href="/register/doctor-hospital?role=doctor"
                  className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md text-sm"
                >
                  Register as Doctor
                </a>
              </motion.div>

              {/* For Users */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-xl p-6 text-center shadow-lg"
              >
                <div className="text-3xl mb-3">👩‍💼</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Find Your Doctor Today</h3>
                <p className="text-sm text-gray-600 mb-4">Get the healthcare you deserve, when you need it</p>
                <a
                  href="/doctors"
                  className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md text-sm"
                >
                  Find a Doctor
                </a>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <MobileBottomNavigation />

      <footer className="bg-gray-900 text-white py-10 px-4 md:ml-[var(--sidebar-width,16rem)] transition-all duration-300">
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
                <a href="#" className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center hover:bg-sky-700 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors">
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
