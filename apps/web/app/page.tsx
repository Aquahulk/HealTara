"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useAuth } from '@/context/AuthContext';
import { apiClient, API_BASE_URL } from '@/lib/api';
import { PerformanceMonitor, CacheManager } from '@/lib/performance';
import { useHomepageContent } from '@/hooks/useHomepageContent';
import Header from '@/components/Header';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import DesktopSidebar from '@/components/DesktopSidebar';
import { useRatingUpdates } from '@/context/RealtimeContext';
import {
  Search,
  MapPin,
  Clock,
  Users,
  Building2,
  Shield,
  Heart,
  Stethoscope,
  Activity,
  Star,
  CheckCircle,
  Globe,
  ChevronRight,
  ChevronLeft,
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
  MessageCircle,
  BookOpen,
  ArrowRight,
  MapIcon,
  FileText,
  Pill,
  TrendingUp,
  Zap,
  Smartphone,
  DollarSign,
  ArrowDown,
  Play,
} from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { hospitalMicrositeUrl, doctorMicrositeUrl, hospitalIdMicrositeUrl, shouldUseSubdomainNav, customSubdomainUrl } from '@/lib/subdomain';
import MapDoctors from '@/components/MapDoctors';
import { EnhancedRatingDisplay } from '@/components/SimpleRatingDisplay';
import SaveButton from '@/components/SaveButton';
import EntityInfoPopup from '@/components/EntityInfoPopup';
import MiniSearch from '@/components/MiniSearch';
import { onAppointmentUpdates, onSlotUpdates } from '@/lib/realtime';

// Icon mapping
const getIconComponent = (iconName: string, className: string = "w-5 h-5") => {
  const icons: Record<string, React.ReactNode> = {
    'Heart': <Heart className={className} />,
    'CheckCircle': <CheckCircle className={className} />,
    'Calendar': <Calendar className={className} />,
    'Shield': <Shield className={className} />,
    'Stethoscope': <Stethoscope className={className} />,
    'Search': <Search className={className} />,
    'Users': <Users className={className} />,
    'Star': <Star className={className} />,
    'MessageCircle': <MessageCircle className={className} />,
    'Globe': <Globe className={className} />,
    'Building2': <Building2 className={className} />,
    'Activity': <Activity className={className} />,
    'Phone': <Phone className={className} />,
    'Mail': <Mail className={className} />,
    'MapPin': <MapPin className={className} />,
    'Clock': <Clock className={className} />,
    'Award': <Award className={className} />,
    'TrendingUp': <TrendingUp className={className} />,
    'FileText': <FileText className={className} />,
    'UserCheck': <UserCheck className={className} />,
    'Hospital': <Hospital className={className} />,
    'Microscope': <Microscope className={className} />,
    'Pill': <Pill className={className} />,
    'BookOpen': <BookOpen className={className} />,
    'Video': <Video className={className} />,
    'ArrowRight': <ArrowRight className={className} />,
    'MapIcon': <MapIcon className={className} />,
    'ChevronRight': <ChevronRight className={className} />,
    'ChevronLeft': <ChevronLeft className={className} />,
    'Play': <Play className={className} />,
    'Facebook': <Facebook className={className} />,
    'Twitter': <Twitter className={className} />,
    'Instagram': <Instagram className={className} />,
    'Linkedin': <Linkedin className={className} />,
    'Zap': <Zap className={className} />,
    'Smartphone': <Smartphone className={className} />,
    'DollarSign': <DollarSign className={className} />,
    'ArrowDown': <ArrowDown className={className} />,
  };
  return icons[iconName] || <Heart className={className} />;
};

// ─── Hook: detect if a section overlaps the fixed map panel ─────────────────
// Map panel: fixed top-[48px], height 440px → bottom at 488px from viewport top.
const MAP_PANEL_BOTTOM = 488; // 48px header + 440px map

function useSectionOverlapsMap() {
  const [overlaps, setOverlaps] = useState(false);
  const elRef = useRef<HTMLElement | null>(null);

  const check = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Overlaps map if section top is above map bottom AND section bottom is still visible
    setOverlaps(rect.top < MAP_PANEL_BOTTOM && rect.bottom > 0);
  }, []);

  // Callback ref — fires when the element mounts/unmounts
  const ref = useCallback((node: HTMLElement | null) => {
    elRef.current = node;
    if (node) {
      check(); // run immediately on mount
    }
  }, [check]);

  useEffect(() => {
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [check]);

  return { ref, overlaps };
}

// ─── Hero Carousel (slide content only, no search) ───────────────────────────
function HeroCarousel() {
  const { content } = useHomepageContent();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = content?.hero?.slides || [
    { title: "Your Health, Our Priority", subtitle: "Connect with verified doctors instantly", gradient: "from-blue-600 via-purple-600 to-pink-500", icon: "Heart", showSteps: false },
    { title: "How to Book an Appointment", subtitle: "Simple 3-step process", gradient: "from-green-500 via-teal-500 to-blue-500", icon: "CheckCircle", showSteps: true },
    { title: "Book Appointments Easily", subtitle: "24/7 online booking", gradient: "from-purple-600 via-pink-500 to-red-500", icon: "Calendar", showSteps: false },
    { title: "Trusted Healthcare Network", subtitle: "Verified doctors & hospitals", gradient: "from-orange-500 via-red-500 to-pink-600", icon: "Shield", showSteps: false },
    { title: "Quality Healthcare Services", subtitle: "Comprehensive medical care", gradient: "from-indigo-600 via-purple-500 to-pink-500", icon: "Stethoscope", showSteps: false },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.4 }}
          className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].gradient}`}
        >
          {/* Blob bg */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 -left-4 w-32 h-32 bg-white rounded-full mix-blend-multiply filter blur-2xl animate-blob" />
            <div className="absolute top-0 -right-4 w-32 h-32 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000" />
            <div className="absolute -bottom-4 left-12 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-4000" />
          </div>

          {/* Slide text — upper portion only, leaves room for search cutout */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full pb-16 px-4 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.35, delay: 0.1 }} className="mb-2 text-white">
              {getIconComponent(slides[currentSlide].icon, "w-10 h-10")}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
              className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight drop-shadow">
              {slides[currentSlide].title}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
              className="text-sm md:text-base text-white/90 font-semibold">
              {slides[currentSlide].subtitle}
            </motion.p>

            {slides[currentSlide].showSteps && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
                className="grid grid-cols-3 gap-2 max-w-sm mx-auto mt-4">
                {[
                  { step: "1", title: "Search", icon: <Search className="w-4 h-4 text-white" />, color: "from-blue-500 to-cyan-500" },
                  { step: "2", title: "Book", icon: <Calendar className="w-4 h-4 text-white" />, color: "from-green-500 to-emerald-500" },
                  { step: "3", title: "Visit", icon: <CheckCircle className="w-4 h-4 text-white" />, color: "from-purple-500 to-pink-500" },
                ].map((s) => (
                  <div key={s.step} className="bg-white/90 rounded-lg p-2.5 shadow border border-white/50 flex items-center gap-2">
                    <div className={`bg-gradient-to-br ${s.color} w-6 h-6 rounded flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                    <span className="text-gray-800 font-bold text-xs">{s.step}. {s.title}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {!slides[currentSlide].showSteps && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
                className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  { icon: <Shield className="w-3.5 h-3.5 text-blue-600" />, label: "Verified" },
                  { icon: <Clock className="w-3.5 h-3.5 text-green-600" />, label: "24/7" },
                  { icon: <Star className="w-3.5 h-3.5 text-yellow-500" />, label: "Top Rated" },
                  { icon: <Video className="w-3.5 h-3.5 text-purple-600" />, label: "Online" },
                ].map((b) => (
                  <div key={b.label} className="bg-white/85 backdrop-blur-sm rounded-md px-3 py-1.5 shadow-sm border border-white/40 flex items-center gap-1.5">
                    {b.icon}
                    <span className="text-gray-900 font-semibold text-xs">{b.label}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrentSlide(i)} aria-label={`Slide ${i + 1}`}
            className={`h-1 rounded-full transition-all duration-300 ${i === currentSlide ? 'bg-white w-4' : 'bg-white/45 w-1 hover:bg-white/70'}`} />
        ))}
      </div>

      {/* Arrows */}
      <button onClick={() => setCurrentSlide((p) => (p - 1 + slides.length) % slides.length)} aria-label="Previous"
        className="absolute left-2 top-[40%] -translate-y-1/2 z-20 bg-white/20 hover:bg-white/35 backdrop-blur-sm p-1 rounded-full transition-all">
        <ChevronLeft className="w-3 h-3 text-white" />
      </button>
      <button onClick={() => setCurrentSlide((p) => (p + 1) % slides.length)} aria-label="Next"
        className="absolute right-2 top-[40%] -translate-y-1/2 z-20 bg-white/20 hover:bg-white/35 backdrop-blur-sm p-1 rounded-full transition-all">
        <ChevronRight className="w-3 h-3 text-white" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const { content: homepageContent, loading: contentLoading, error: contentError } = useHomepageContent();
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
  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<'doctor' | 'hospital' | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [activeGrid, setActiveGrid] = useState<'doctors' | 'hospitals' | 'coming-soon'>('hospitals');
  const [activeCategory, setActiveCategory] = useState(0); // index of selected category
  const [isMobile, setIsMobile] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [mapPins, setMapPins] = useState<Array<{ id: number; lat: number; lon: number; title: string; subtitle?: string }>>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Per-section overlap detection — MUST be before any early returns (Rules of Hooks)
  const heroSection = useSectionOverlapsMap();
  const quickAccessSection = useSectionOverlapsMap();
  const discoverySection = useSectionOverlapsMap();
  const statsSection = useSectionOverlapsMap();
  const howItWorksSection = useSectionOverlapsMap();
  const whyChooseSection = useSectionOverlapsMap();
  const testimonialsSection = useSectionOverlapsMap();
  const healthTipsSection = useSectionOverlapsMap();
  const ctaSection = useSectionOverlapsMap();

  const isPopupOpen = !!selectedEntity;
  const mapHeight = isPopupOpen ? 320 : 440;
  const innerMapHeight = isPopupOpen ? 200 : 320;
  const popupTop = 48 + mapHeight;

  // Auto-open booking modal if bookDoctorId is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('bookDoctorId');
    if (bookId && doctors.length > 0) {
      const doc = doctors.find((d) => String(d.id) === bookId);
      if (doc) {
        setSelectedDoctor(doc);
        setShowAppointmentModal(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('bookDoctorId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [doctors]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchNearbyDoctors = async (lat: number, lon: number, radiusKm = 10) => {
    try {
      setMapLoading(true); setMapError(null);
      const resp = await fetch(`/api/doctors/near?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`, { cache: 'no-store' });
      const data = await resp.json().catch(() => ({} as any));
      const docs = Array.isArray(data?.doctors) ? data.doctors : [];
      setMapCenter({ lat, lon });
      setMapPins(docs.map((d: any) => ({ id: d.id, lat: Number(d.lat), lon: Number(d.lon), title: d?.profile?.clinicName || d.email?.split('@')[0] || `Doctor ${d.id}`, subtitle: `${d?.profile?.specialization || 'General'} • ${d.distanceKm} km` })));
    } catch (e: any) { setMapError(e?.message || 'Failed to load nearby doctors'); }
    finally { setMapLoading(false); }
  };

  // Load ALL doctors + hospitals on map from their stored coordinates or city data
  const loadAllOnMap = async () => {
    try {
      setMapLoading(true); setMapError(null);
      const allPins: typeof mapPins = [];

      // Build a set of doctor IDs that belong to hospitals (from hospitals._count or doctor list)
      // Hospitals already represent grouped locations — show hospitals as primary pins
      const hospitalCities = new Set<string>();
      const citiesToGeocode = new Set<string>();

      // Add hospital pins first (they represent groups of doctors)
      hospitals.forEach((h: any) => {
        const lat = h.latitude;
        const lon = h.longitude;
        const city = ((h.city) || '').toLowerCase().trim();
        if (city) hospitalCities.add(city);
        const doctorCount = h._count?.doctors || h.doc_count || 0;

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          allPins.push({
            id: h.id + 100000,
            lat: lat,
            lon: lon,
            title: `🏥 ${h.name || 'Hospital'}`,
            subtitle: `${h.city || ''}${doctorCount > 0 ? ` • ${doctorCount} doctors` : ''}`
          });
        } else if (city) {
          citiesToGeocode.add(city);
        }
      });

      // Only add independent doctors (those NOT in a hospital city)
      doctors.forEach((d: any) => {
        const dCity = ((d.doctorProfile?.city || d.city) || '').toLowerCase().trim();
        // Skip if this doctor's city has a hospital (they'll be covered by the hospital pin)
        if (dCity && hospitalCities.has(dCity)) return;

        const lat = d.doctorProfile?.latitude;
        const lon = d.doctorProfile?.longitude;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          allPins.push({
            id: d.id,
            lat: lat,
            lon: lon,
            title: `Dr. ${(d.email || '').split('@')[0].replace(/[._-]/g,' ').replace(/\d{5,}/g,'').trim()}`,
            subtitle: d.doctorProfile?.specialization || 'Doctor'
          });
        } else if (dCity) {
          citiesToGeocode.add(dCity);
        }
      });

      // Geocode remaining cities
      const cityCoords = new Map<string, {lat:number;lon:number}>();
      for (const city of Array.from(citiesToGeocode).slice(0, 8)) {
        try {
          const g = await fetch(`/api/geo/geocode?query=${encodeURIComponent(city)}`, { cache: 'no-store' });
          const gj = await g.json().catch(() => null);
          if (gj && Number.isFinite(gj.lat) && Number.isFinite(gj.lon)) {
            cityCoords.set(city, { lat: gj.lat, lon: gj.lon });
          }
        } catch {}
      }

      // Add hospitals without stored coordinates
      hospitals.forEach((h: any) => {
        if (Number.isFinite(h.latitude)) return;
        const city = ((h.city) || '').toLowerCase().trim();
        const coords = cityCoords.get(city);
        if (coords) {
          const doctorCount = h._count?.doctors || h.doc_count || 0;
          allPins.push({
            id: h.id + 100000,
            lat: coords.lat + (Math.random() - 0.5) * 0.003,
            lon: coords.lon + (Math.random() - 0.5) * 0.003,
            title: `🏥 ${h.name || 'Hospital'}`,
            subtitle: `${h.city || ''}${doctorCount > 0 ? ` • ${doctorCount} doctors` : ''}`
          });
        }
      });

      // Add independent doctors without stored coordinates
      doctors.forEach((d: any) => {
        const dCity = ((d.doctorProfile?.city || d.city) || '').toLowerCase().trim();
        if (dCity && hospitalCities.has(dCity)) return; // skip hospital-grouped
        if (Number.isFinite(d.doctorProfile?.latitude)) return; // already added
        const coords = cityCoords.get(dCity);
        if (coords) {
          allPins.push({
            id: d.id,
            lat: coords.lat + (Math.random() - 0.5) * 0.005,
            lon: coords.lon + (Math.random() - 0.5) * 0.005,
            title: `Dr. ${(d.email || '').split('@')[0].replace(/[._-]/g,' ').replace(/\d{5,}/g,'').trim()}`,
            subtitle: d.doctorProfile?.specialization || 'Doctor'
          });
        }
      });

      if (allPins.length > 0) {
        const avgLat = allPins.reduce((s, p) => s + p.lat, 0) / allPins.length;
        const avgLon = allPins.reduce((s, p) => s + p.lon, 0) / allPins.length;
        setMapCenter({ lat: avgLat, lon: avgLon });
        setMapPins(allPins);
      } else {
        setMapCenter({ lat: 20.5937, lon: 78.9629 });
        setMapPins([]);
      }
    } catch (e: any) { setMapError(e?.message || 'Failed to load map data'); }
    finally { setMapLoading(false); }
  };

  // Auto-load all pins when doctors/hospitals are loaded
  useEffect(() => {
    if ((doctors.length > 0 || hospitals.length > 0) && !mapCenter) {
      loadAllOnMap();
    }
  }, [doctors.length, hospitals.length]);

  const detectLocation = async () => {
    try {
      setMapLoading(true); setMapError(null);
      await new Promise<void>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(
          (pos) => fetchNearbyDoctors(pos.coords.latitude, pos.coords.longitude, 10).then(resolve).catch(reject),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    } catch (e: any) { setMapError(e?.message || 'Unable to detect location'); }
    finally { setMapLoading(false); }
  };

  const searchByCity = async (city: string) => {
    try {
      if (!city.trim()) {
        // Clear search → reload all pins
        await loadAllOnMap();
        return;
      }
      setMapLoading(true); setMapError(null);
      const g = await fetch(`/api/geo/geocode?query=${encodeURIComponent(city)}`, { cache: 'no-store' });
      const gj = await g.json().catch(() => ({} as any));
      if (!Number.isFinite(gj?.lat) || !Number.isFinite(gj?.lon)) throw new Error('City not found');

      const lat = Number(gj.lat);
      const lon = Number(gj.lon);
      setMapCenter({ lat, lon });

      // Filter loaded hospitals by city name match first
      const cityLower = city.trim().toLowerCase();
      const pins: typeof mapPins = [];
      const hospitalCitiesMatched = new Set<string>();

      hospitals.forEach((h: any) => {
        const hCity = ((h.city) || '').toLowerCase();
        if (hCity.includes(cityLower) || cityLower.includes(hCity)) {
          hospitalCitiesMatched.add(hCity);
          const hLat = h.latitude;
          const hLon = h.longitude;
          const doctorCount = h._count?.doctors || h.doc_count || 0;
          pins.push({
            id: h.id + 100000,
            lat: Number.isFinite(hLat) ? hLat : lat + (Math.random() - 0.5) * 0.008,
            lon: Number.isFinite(hLon) ? hLon : lon + (Math.random() - 0.5) * 0.008,
            title: `🏥 ${h.name || 'Hospital'}`,
            subtitle: `${h.city || ''}${doctorCount > 0 ? ` • ${doctorCount} doctors` : ''}`
          });
        }
      });

      // Only add independent doctors (not in a matched hospital city)
      doctors.forEach((d: any) => {
        const dCity = ((d.doctorProfile?.city || d.city) || '').toLowerCase();
        if (hospitalCitiesMatched.has(dCity)) return; // covered by hospital pin
        if (dCity.includes(cityLower) || cityLower.includes(dCity)) {
          const dLat = d.doctorProfile?.latitude;
          const dLon = d.doctorProfile?.longitude;
          pins.push({
            id: d.id,
            lat: Number.isFinite(dLat) ? dLat : lat + (Math.random() - 0.5) * 0.01,
            lon: Number.isFinite(dLon) ? dLon : lon + (Math.random() - 0.5) * 0.01,
            title: `Dr. ${(d.email || '').split('@')[0].replace(/[._-]/g,' ').replace(/\d{5,}/g,'').trim()}`,
            subtitle: d.doctorProfile?.specialization || 'Doctor'
          });
        }
      });

      // Also try nearby API for radius-based results
      try {
        const resp = await fetch(`/api/doctors/near?lat=${lat}&lon=${lon}&radiusKm=15`, { cache: 'no-store' });
        const data = await resp.json().catch(() => ({} as any));
        const nearbyDocs = Array.isArray(data?.doctors) ? data.doctors : [];
        nearbyDocs.forEach((d: any) => {
          if (!pins.find(p => p.id === d.id)) {
            pins.push({ id: d.id, lat: Number(d.lat), lon: Number(d.lon), title: d?.profile?.clinicName || `Doctor ${d.id}`, subtitle: `${d?.profile?.specialization || 'General'} • ${d.distanceKm}km` });
          }
        });
      } catch {} // Non-critical

      setMapPins(pins);
    } catch (e: any) { setMapError(e?.message || 'Search failed'); }
    finally { setMapLoading(false); }
  };

  useEffect(() => {
    const loadData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        const cachedData = typeof window !== 'undefined' ? localStorage.getItem('homepage_cache') : null;
        const cacheTimestamp = typeof window !== 'undefined' ? localStorage.getItem('homepage_cache_timestamp') : null;
        const CACHE_DURATION = 30 * 1000; // 30 seconds — keeps homepage fast but shows approvals quickly
        if (cachedData && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < CACHE_DURATION) {
          const parsed = JSON.parse(cachedData);
          const ch = Array.isArray(parsed?.hospitals) ? parsed.hospitals : [];
          const cd = Array.isArray(parsed?.doctors) ? parsed.doctors : [];
          if (ch.length > 0 || cd.length > 0) {
            setHospitals(ch); setDoctors(cd); setLoading(false);
            setTimeout(() => fetchFreshData(), 500);
            return;
          }
        }
        await fetchFreshData();

        async function fetchFreshData() {
          PerformanceMonitor.startTiming('homepage-data-load');
          try {
            const [hospitalsRes, doctorsRes] = await Promise.allSettled([
              apiClient.getHospitals({ limit: 50 }),
              apiClient.getDoctors({ sort: 'trending', page: 1, pageSize: 20 }),
            ]);
            const h = hospitalsRes.status === 'fulfilled' ? (Array.isArray(hospitalsRes.value) ? hospitalsRes.value : []) : [];
            const d = doctorsRes.status === 'fulfilled' ? (Array.isArray(doctorsRes.value) ? doctorsRes.value : []) : [];
            setHospitals(h); setDoctors(d);
            if (typeof window !== 'undefined' && (h.length > 0 || d.length > 0)) {
              localStorage.setItem('homepage_cache', JSON.stringify({ hospitals: h, doctors: d }));
              localStorage.setItem('homepage_cache_timestamp', Date.now().toString());
            }
            setLoading(false);
            console.log(`📊 Homepage loaded in ${(performance.now() - startTime).toFixed(2)}ms`);
          } catch (error) { console.error('Error loading data:', error); }
          finally { const dur = PerformanceMonitor.endTiming('homepage-data-load'); PerformanceMonitor.logTiming('homepage-data-load', dur); }
        }
      } catch (error) { console.error('Error loading data:', error); }
      finally { setLoading(false); }
      setTimeout(() => setLoading(false), 10000);
    };

    loadData();
    const unbindAppt = onAppointmentUpdates(() => loadData());
    const unbindSlot = onSlotUpdates(() => loadData());
    return () => { unbindAppt(); unbindSlot(); };
  }, []);

  useRatingUpdates(() => {
    setTimeout(() => {
      (async () => { try { const items = await apiClient.getHospitals({ limit: 50 }); setHospitals(items || []); } catch {} })();
    }, 100);
  });

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    const refreshHospitals = async () => {
      try { CacheManager.clear('homepage_hospitals'); } catch {}
      try { const items = await apiClient.getHospitals(); setHospitals(items || []); } catch {}
    };
    const onCustom = (e: any) => { if (e?.detail?.entityType === 'hospital') refreshHospitals(); };
    window.addEventListener('rating:updated', onCustom as EventListener);
    const onMsg = (msg: MessageEvent) => { const d = msg?.data || {}; if (d.type === 'rating:updated' && d.entityType === 'hospital') refreshHospitals(); };
    try { bc = new BroadcastChannel('entity_updates'); bc.addEventListener('message', onMsg as EventListener); } catch {}
    const onStorage = (ev: StorageEvent) => {
      try { if (ev.key === 'entity_updated' && ev.newValue) { const d = JSON.parse(ev.newValue); if (d.type === 'rating:updated' && d.entityType === 'hospital') refreshHospitals(); } } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('rating:updated', onCustom as EventListener);
      window.removeEventListener('storage', onStorage);
      try { bc && bc.removeEventListener('message', onMsg as EventListener); } catch {}
      try { bc && bc.close && bc.close(); } catch {}
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTestimonial((p) => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleBookAppointment = (doctor: any) => { setSelectedDoctor(doctor); setShowAppointmentModal(true); };

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
    const matchesText = specialization.includes(query) || clinicName.includes(query) || city.includes(query) || email.includes(query);
    const matchesMapped = mappedSpecs.size > 0 && Array.from(mappedSpecs).some((spec) => specialization.includes(spec.toLowerCase()));
    return matchesText || matchesMapped;
  });

  const categories = [
    { title: "Hospitals", description: "Multi-specialty hospitals", icon: Hospital, color: "from-blue-500 to-cyan-500", link: "/hospitals" },
    { title: "Doctors", description: "Individual practitioners", icon: UserCheck, color: "from-emerald-500 to-teal-500", link: "/doctors" },
    { title: "Multi-Doctor Clinics", description: "Group practices", icon: Building2, color: "from-purple-500 to-pink-500", link: "/clinics" },
    { title: "Online Consultation", description: "Virtual appointments", icon: Video, color: "from-orange-500 to-red-500", link: "/online-consultation" },
    { title: "Labs & Diagnostics", description: "Medical testing", icon: Microscope, color: "from-indigo-500 to-purple-500", link: "/labs" },
  ];

  const howItWorks = [
    { step: 1, title: "Search", description: "Find the right doctor or clinic", icon: "Search" },
    { step: 2, title: "Book", description: "Select time & pay booking fee", icon: "Calendar" },
    { step: 3, title: "Visit", description: "Confirmed appointment + rating", icon: "CheckCircle" },
  ];

  const whyChooseUs = [
    { title: "Verified Doctors", description: "All doctors verified by license ID", icon: "Shield" },
    { title: "Transparent Reviews", description: "1 booking = 1 review system", icon: "MessageCircle" },
    { title: "Multi-language Support", description: "Available in multiple languages", icon: "Globe" },
    { title: "One-stop Healthcare", description: "Hospitals, clinics & doctors", icon: "Building2" },
  ];

  const testimonials = [
    { name: "Sarah Johnson", role: "Patient", content: "Found my perfect cardiologist within minutes. The booking process was seamless!", rating: 5, avatar: "👩‍💼" },
    { name: "Dr. Michael Chen", role: "Cardiologist", content: "This platform has increased my patient base by 40%. Highly recommended!", rating: 5, avatar: "👨‍⚕️" },
    { name: "Priya Sharma", role: "Patient", content: "The online consultation feature saved me during lockdown. Amazing service!", rating: 5, avatar: "👩‍🎓" },
  ];

  const stats = [
    { label: "Verified Doctors", value: homepageContent?.trustedBy?.stats?.doctors || 2500, icon: Users },
    { label: "Patients Served", value: homepageContent?.trustedBy?.stats?.patients || 100000, icon: Heart },
    { label: "Cities Covered", value: homepageContent?.trustedBy?.stats?.cities || 75, icon: MapPin },
    { label: "Reviews", value: homepageContent?.trustedBy?.stats?.reviews || 10000, icon: Star },
  ];

  if (loading || contentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading healthcare providers…</p>
        </div>
      </div>
    );
  }

  if (contentError) console.error('Homepage content error:', contentError);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      <DesktopSidebar />

      <main className="overflow-x-hidden transition-all duration-300 md:ml-[var(--sidebar-width,14rem)]">

        {/* ── HERO + SEARCH ────────────────────────────────────────────── */}
        <section ref={heroSection.ref} className={`relative bg-gray-50 transition-all duration-500 ease-in-out ${heroSection.overlaps ? 'lg:mr-[26rem]' : 'lg:mr-0'}`}>
          <div className="relative">
            {/* Hero */}
            <div className="relative h-[180px] md:h-[260px] overflow-hidden">
              <HeroCarousel />
            </div>

              {/* Search cutout — overlaps hero bottom */}
              <div className="relative z-30 -mt-6 md:-mt-9 px-3 pb-2 md:pb-3">
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
                  <div className="bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl border border-gray-100 p-2 md:p-3">
                    <div className="space-y-1.5 md:space-y-2">

                      {/* Search input */}
                      <div className="relative z-30">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search doctors, specialties…"
                          value={searchQuery}
                          onChange={async (e) => {
                            const raw = e.target.value;
                            setSearchQuery(raw);
                            const q = raw.trim();
                            if (!q) { const seeds = apiClient.getSeedSuggestions(); setSuggestions(seeds); setShowSuggestions(seeds.length > 0); return; }
                            const cached = apiClient.peekCachedSearch(q);
                            if (cached) {
                              if (Array.isArray(cached.suggestions)) { setSuggestions(cached.suggestions.slice(0, 8)); setShowSuggestions(true); }
                              if (Array.isArray(cached.doctors)) setDoctors(cached.doctors);
                            } else {
                              const local = apiClient.getLocalSuggestions(q).slice(0, 8);
                              if (local.length > 0) { setSuggestions(local); setShowSuggestions(true); }
                            }
                            try {
                              const resp = await apiClient.searchDoctors(q);
                              const combined = resp.suggestions.slice(0, 8);
                              setSuggestions(combined); setShowSuggestions(combined.length > 0);
                              apiClient.trackSearchDebounced(q, { matchedSpecialties: resp.matchedSpecialties, matchedConditions: resp.matchedConditions, topDoctorIds: (resp.doctors || []).slice(0, 5).map((d: any) => d.id) });
                            } catch { apiClient.trackSearchDebounced(q); }
                          }}
                          onFocus={() => setShowSuggestions(suggestions.length > 0)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const q = searchQuery.trim();
                              if (q) { apiClient.trackSearch(q, { source: 'enter' }); setShowSuggestions(false); router.push(`/doctors?search=${encodeURIComponent(q)}`); }
                            }
                          }}
                          className="w-full pl-8 pr-3 py-2 md:py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs md:text-sm transition-all"
                        />
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-auto">
                            {suggestions.map((s, i) => (
                              <button key={i} className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 transition-colors"
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
                                  setSearchQuery(newRaw); setShowSuggestions(false);
                                  if (active) apiClient.addLocalSuggestion(active, picked);
                                  apiClient.trackSearch(newQ, { source: 'suggestion_click', selectedSuggestion: picked });
                                  router.push(`/doctors?search=${encodeURIComponent(newQ)}`);
                                }}>{s}</button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Filters */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                        <select value={selectedSpecialization} onChange={(e) => setSelectedSpecialization(e.target.value)}
                          className="px-2 py-1.5 md:py-2 text-[11px] bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all">
                          <option value="">Specialization</option>
                          <option value="cardiology">Cardiology</option>
                          <option value="dermatology">Dermatology</option>
                          <option value="neurology">Neurology</option>
                          <option value="orthopedics">Orthopedics</option>
                        </select>
                        <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}
                          className="px-2 py-1.5 md:py-2 text-[11px] bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all">
                          <option value="">City / Town</option>
                          <option value="mumbai">Mumbai</option>
                          <option value="delhi">Delhi</option>
                          <option value="bangalore">Bangalore</option>
                          <option value="chennai">Chennai</option>
                        </select>
                        <select value={selectedAvailability} onChange={(e) => setSelectedAvailability(e.target.value)}
                          className="px-2 py-1.5 md:py-2 text-[11px] bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all">
                          <option value="">Availability</option>
                          <option value="today">Today</option>
                          <option value="tomorrow">Tomorrow</option>
                          <option value="week">This Week</option>
                        </select>
                        <label className="flex items-center justify-center px-2.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-all gap-1.5">
                          <input type="checkbox" checked={availabilityOnly} onChange={(e) => setAvailabilityOnly(e.target.checked)} className="w-3 h-3 text-blue-600 focus:ring-blue-500" />
                          <span className="text-gray-700 font-medium">Available Only</span>
                        </label>
                      </div>

                      <AnimatePresence>
                        {availabilityOnly && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="pt-1.5 border-t border-gray-100">
                              <p className="text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Preferred Time</p>
                              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                {["09:00 AM","10:00 AM","11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM","07:00 PM","08:00 PM"].map((slot) => (
                                  <button key={slot} onClick={() => setSelectedTimeSlot(selectedTimeSlot === slot ? '' : slot)}
                                    className={`flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${selectedTimeSlot === slot ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (searchQuery) params.set('search', searchQuery);
                          if (selectedSpecialization) params.set('specialization', selectedSpecialization);
                          if (selectedCity) params.set('city', selectedCity);
                          if (selectedAvailability) params.set('availability', selectedAvailability);
                          if (availabilityOnly) params.set('availabilityOnly', 'true');
                          if (selectedTimeSlot) params.set('time', selectedTimeSlot);
                          router.push(`/doctors?${params.toString()}`);
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm text-sm"
                      >
                        Find a Doctor Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
          </div>
        </section>

        {/* ── FIXED MAP PANEL — right side, fixed height, like sidebar ── */}
        <div className="hidden lg:flex fixed right-0 top-[48px] w-[26rem] z-30 flex-col bg-gradient-to-br from-emerald-50 to-teal-50 border-l border-gray-200 shadow-lg rounded-bl-2xl overflow-hidden transition-all duration-500 ease-in-out" style={{ height: `${mapHeight}px` }}>
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-gray-200/60 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Doctors Near You
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Find available doctors on the map</p>
              </div>
              <button onClick={detectLocation} disabled={mapLoading}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm">
                <MapPin className="w-3.5 h-3.5" />
                {mapLoading ? 'Finding…' : 'Detect'}
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 px-3 pt-2 pb-1 min-h-0">
            {mapError && <div className="text-xs text-red-500 mb-1 px-1">{mapError}</div>}
            {mapCenter ? (
              <div className="h-full rounded-xl overflow-hidden shadow-sm">
                <MapDoctors center={mapCenter} pins={mapPins} height={innerMapHeight} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white/70 rounded-xl border border-dashed border-emerald-200 text-center px-4">
                <MapPin className="w-8 h-8 text-emerald-300 mb-2" />
                <p className="text-sm font-semibold text-gray-500 mb-1">No location set</p>
                <p className="text-xs text-gray-400">Click Detect or search a city below</p>
              </div>
            )}
          </div>

          {/* City search */}
          <div className="px-3 pb-3 pt-1 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchByCity(selectedCity); }}
                placeholder="Search city (e.g. Mumbai)"
                className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
              />
              <button onClick={() => searchByCity(selectedCity)} disabled={mapLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm whitespace-nowrap">
                {mapLoading ? '…' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* ── MOBILE MAP SECTION (visible only on small screens) ── */}
        <section className="lg:hidden py-4 px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Doctors Near You
                </h3>
                <p className="text-[10px] text-gray-400">Find healthcare providers on the map</p>
              </div>
              <button onClick={detectLocation} disabled={mapLoading}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all">
                <MapPin className="w-3 h-3" />
                {mapLoading ? '…' : 'Detect'}
              </button>
            </div>
            {mapError && <p className="text-xs text-red-500 mb-2">{mapError}</p>}
            {mapCenter ? (
              <div className="h-[200px] rounded-xl overflow-hidden shadow-sm border border-emerald-200">
                <MapDoctors center={mapCenter} pins={mapPins} height={200} />
              </div>
            ) : (
              <div className="h-[140px] flex flex-col items-center justify-center bg-white/70 rounded-xl border border-dashed border-emerald-200 text-center">
                <MapPin className="w-6 h-6 text-emerald-300 mb-1" />
                <p className="text-xs font-medium text-gray-500">Tap "Detect" to find nearby doctors</p>
              </div>
            )}
            {/* City search */}
            <div className="flex gap-2 mt-3">
              <input type="text" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchByCity(selectedCity); }}
                placeholder="Search city..."
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              <button onClick={() => searchByCity(selectedCity)} disabled={mapLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap">
                {mapLoading ? '…' : 'Search'}
              </button>
            </div>
          </div>
        </section>

        {/* ── EXPLORE + CARDS (seamless tab-switch) ──────────────────── */}
        <section ref={quickAccessSection.ref} className={`transition-all duration-500 ease-in-out ${quickAccessSection.overlaps ? 'lg:mr-[26rem]' : 'lg:mr-0'}`}>

          {/* Category boxes — white background, original grid */}
          <div className="px-3 md:px-4 pt-4 md:pt-5 pb-0 bg-white">
            <div className="max-w-5xl mx-auto">
              {/* Section heading — centered */}
              <div className="mb-3 md:mb-4 text-center">
                <h2 className="text-base md:text-lg font-bold text-gray-900">Browse Healthcare Services</h2>
                <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">Choose a category to explore</p>
              </div>
              {/* Category grid — compact clickable buttons */}
              <div className="grid grid-cols-5 gap-1.5 md:gap-2 transition-all duration-500">
                {categories.map((cat, i) => {
                  const isActive = activeCategory === i;
                  const comingSoon = cat.title !== 'Hospitals' && cat.title !== 'Doctors';
                  // Solid colors for seamless connection with cards below
                  const activeBg = cat.title === 'Hospitals'
                    ? '#5b4fcf'
                    : cat.title === 'Doctors'
                      ? '#2a2a9e'
                      : '#d97706';
                  return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -2 }} className="cursor-pointer">
                    <button onClick={() => {
                      setActiveCategory(i);
                      if (cat.title === 'Hospitals') setActiveGrid('hospitals');
                      else if (cat.title === 'Doctors') setActiveGrid('doctors');
                      else setActiveGrid('coming-soon');
                    }}
                      className={`relative w-full flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-center transition-all border overflow-hidden ${
                        isActive
                          ? 'rounded-t-lg rounded-b-none border-transparent shadow-lg z-10'
                          : 'bg-white rounded-lg border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 active:scale-95'
                      }`}
                      style={isActive ? { background: activeBg } : undefined}>
                      <div className={`w-7 h-7 bg-gradient-to-br ${cat.color} rounded-md flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <cat.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className={`text-[10px] md:text-xs font-bold leading-tight text-center ${isActive ? 'text-white' : 'text-gray-800'}`}>{cat.title}</span>
                    </button>
                  </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cards content — colored gradient, directly touching boxes above */}
          <div ref={discoverySection.ref} className="px-3 md:px-4 pt-3 pb-4 md:pb-5"
            style={{ background: activeGrid === 'doctors' ? 'linear-gradient(180deg, #2a2a9e 0%, #1e1e96 30%, #00c4e8 100%)' : activeGrid === 'hospitals' ? 'linear-gradient(180deg, #5b4fcf 0%, #764ba2 50%, #667eea 100%)' : 'linear-gradient(180deg, #d97706 0%, #b45309 100%)' }}>
            <div className="max-w-5xl mx-auto">

            {/* ── COMING SOON ── */}
            {activeGrid === 'coming-soon' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Coming Soon</h3>
                <p className="text-sm text-white/80 max-w-md">We&apos;re working hard to bring this feature to you. Stay tuned for updates!</p>
              </motion.div>
            )}

            {/* ── DOCTOR CARDS ── */}
            {activeGrid === 'doctors' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 transition-all duration-500 ease-in-out">
                  {filteredDoctors.map((doctor, index) => (
                    <motion.div 
                      key={doctor.id} 
                      initial={{ opacity: 0, scale: 0.97 }} 
                      whileInView={{ opacity: 1, scale: 1 }} 
                      transition={{ delay: index * 0.04 }} 
                      whileHover={{ y: -4 }} 
                      className="group cursor-pointer"
                      onClick={() => {
                        setSelectedEntity(doctor);
                        setSelectedEntityType('doctor');
                      }}
                    >
                      <div className="relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                        <div className="absolute top-2.5 right-2.5 z-20"><SaveButton entityType="doctor" entityId={doctor.id} /></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative p-4">
                          {/* Doctor header */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="relative flex-shrink-0">
                              <div className="w-14 h-14 rounded-xl overflow-hidden shadow-md ring-2 ring-white group-hover:ring-emerald-300 transition-all">
                                {doctor.doctorProfile?.profileImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={doctor.doctorProfile.profileImage} alt={doctor.email.split('@')[0]} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-blue-400 flex items-center justify-center text-xl">👨‍⚕️</div>
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 shadow border-2 border-white">
                                <CheckCircle className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                                Dr. {doctor.email.split('@')[0]}
                              </h3>
                              <div className="inline-flex items-center bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md mt-1 border border-emerald-100">
                                <Stethoscope className="w-3 h-3 mr-1" />
                                <span className="text-[11px] font-semibold truncate">{doctor.doctorProfile?.specialization || 'General Practitioner'}</span>
                              </div>
                              <div className="mt-1"><EnhancedRatingDisplay entityType="doctor" entityId={String(doctor.id)} size="sm" /></div>
                            </div>
                          </div>

                          {/* Info chips */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {doctor.doctorProfile?.city && (
                              <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md text-[11px] border border-gray-100">
                                <MapPin className="w-3 h-3 text-blue-400" />{doctor.doctorProfile.city}
                              </span>
                            )}
                            {doctor.doctorProfile?.experience && (
                              <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md text-[11px] border border-gray-100">
                                <Award className="w-3 h-3 text-emerald-400" />{doctor.doctorProfile.experience}+ yrs
                              </span>
                            )}
                            {doctor.doctorProfile?.consultationFee && (
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-[11px] border border-green-100 font-semibold">
                                ₹{doctor.doctorProfile.consultationFee}
                              </span>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            {doctor.doctorProfile?.slug ? (
                              <Link href={`/doctor-site/${doctor.doctorProfile.slug}`}
                                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-2 px-3 rounded-lg transition-all text-center text-xs flex items-center justify-center border border-gray-200"
                                onMouseEnter={() => router.prefetch(`/doctor-site/${doctor.doctorProfile.slug}`)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (shouldUseSubdomainNav()) { e.preventDefault(); window.location.href = doctorMicrositeUrl(doctor.doctorProfile.slug); }
                                  import('@/lib/api').then(({ apiClient }) => apiClient.trackDoctorClick(doctor.id, 'site').catch(() => {}));
                                }}>
                                <Globe className="w-3 h-3 mr-1" />Profile
                              </Link>
                            ) : (
                              <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-2 px-3 rounded-lg transition-all text-xs flex items-center justify-center border border-gray-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  import('@/lib/api').then(({ apiClient }) => {
                                    apiClient.getHospitalByDoctorId(doctor.id).then((resp) => {
                                      const hId = (resp as any)?.id ?? (resp as any)?.hospitalId;
                                      if (Number.isFinite(hId)) router.push(`/hospital-site/${String(hId)}`);
                                    }).catch(() => {});
                                  });
                                }}>
                                <Building2 className="w-3 h-3 mr-1" />Hospital
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleBookAppointment(doctor); }}
                              onMouseEnter={() => { try { import('@/lib/slotsPrefetch').then((m) => m.prefetchDoctorToday(doctor.id).catch(() => {})); } catch {} }}
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition-all text-xs flex items-center justify-center shadow">
                              <Calendar className="w-3 h-3 mr-1" />Book Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── HOSPITAL CARDS ── */}
            {activeGrid === 'hospitals' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 transition-all duration-500 ease-in-out">
                  {hospitals.map((hospital, index) => {
                    const name = hospital.name || '';
                    const location = [hospital.city, hospital.state].filter(Boolean).join(', ') || 'Location';
                    return (
                      <motion.div 
                        key={hospital.id} 
                        initial={{ opacity: 0, scale: 0.97 }} 
                        whileInView={{ opacity: 1, scale: 1 }} 
                        transition={{ delay: index * 0.04 }} 
                        whileHover={{ y: -4 }} 
                        className="group cursor-pointer"
                        onClick={() => {
                          setSelectedEntity(hospital);
                          setSelectedEntityType('hospital');
                        }}
                      >
                        <div className="relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                          <div className="absolute top-2.5 right-2.5 z-20"><SaveButton entityType="hospital" entityId={hospital.id} /></div>
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative p-4">
                            {/* Hospital header */}
                            <div className="flex items-start gap-3 mb-3">
                              <div className="relative flex-shrink-0">
                                <div className="w-14 h-14 rounded-xl overflow-hidden shadow-md ring-2 ring-white group-hover:ring-blue-300 transition-all bg-gradient-to-br from-blue-400 to-purple-500">
                                  {(() => {
                                    let logoUrl = (hospital as any).profile?.general?.logoUrl || (hospital as any).logoUrl || null;
                                    if (logoUrl && logoUrl.startsWith('/')) logoUrl = `${API_BASE_URL}${logoUrl}`;
                                    if (logoUrl && logoUrl.startsWith('http')) {
                                      return <Image src={logoUrl} alt={name} width={56} height={56} className="w-full h-full object-contain p-1.5 bg-white" loading="lazy" />;
                                    }
                                    return <div className="w-full h-full flex items-center justify-center text-xl">🏥</div>;
                                  })()}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 shadow border-2 border-white">
                                  <Shield className="w-2.5 h-2.5 text-white" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{name}</h3>
                                <div className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md mt-1 border border-blue-100">
                                  <Hospital className="w-3 h-3 mr-1" />
                                  <span className="text-[11px] font-semibold">Multi-Specialty</span>
                                </div>
                                {location && (
                                  <div className="flex items-center text-gray-500 text-[11px] mt-1">
                                    <MapPin className="w-3 h-3 text-blue-400 mr-1 flex-shrink-0" />
                                    <span className="truncate">{location}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Stats chips */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] border border-emerald-100">
                                <Building2 className="w-3 h-3" />{hospital._count?.departments || 0} Depts
                              </span>
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[11px] border border-blue-100">
                                <Users className="w-3 h-3" />{hospital._count?.doctors || 0} Doctors
                              </span>
                              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[11px] border border-purple-100">
                                <Activity className="w-3 h-3" />24/7
                              </span>
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-[11px] border border-green-100">
                                <CheckCircle className="w-3 h-3" />ICU
                              </span>
                            </div>

                            {/* Rating */}
                            <div className="mb-3">
                              <EnhancedRatingDisplay entityType="hospital" entityId={String(hospital.id)} size="sm" />
                            </div>

                            {/* Visit button */}
                            <a href={`/hospital-site/${hospital.id}`}
                              className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all text-center text-xs flex items-center justify-center shadow"
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  if (shouldUseSubdomainNav()) {
                                    e.preventDefault();
                                    const sub = (hospital as any).subdomain;
                                    if (sub && sub.trim()) { window.location.href = customSubdomainUrl(sub); return; }
                                    if (hospital.name) { window.location.href = hospitalMicrositeUrl(hospital.name); return; }
                                  }
                                  router.push(`/hospital-site/${hospital.id}`);
                                } catch { router.push(`/hospital-site/${hospital.id}`); }
                              }}>
                              <ArrowRight className="w-3.5 h-3.5 mr-1.5" />Visit Hospital
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
          </div>
        </section>

        {/* ── STATS ─────────────────────────────────────────────────────── */}
        <section ref={statsSection.ref} className="py-4 md:py-8 px-3 md:px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 transition-all duration-500 ease-in-out lg:mr-[26rem]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-3 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{homepageContent?.trustedBy?.title || "Trusted by Thousands"}</h2>
              <p className="text-sm text-gray-500">{homepageContent?.trustedBy?.subtitle || "Join our growing community of healthcare providers and patients"}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {stats.map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }} whileHover={{ scale: 1.03 }} className="relative group">
                  <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    <div className="relative">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow">
                        <stat.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-lg md:text-2xl font-black text-gray-900 mb-0.5">{stat.value.toLocaleString()}+</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { icon: Shield, color: "from-blue-500 to-blue-600", title: "Verified Doctors Only", desc: "All doctors verified by license ID" },
                { icon: Star, color: "from-yellow-500 to-orange-500", title: "Real Reviews", desc: "10,000+ verified patient reviews" },
                { icon: Award, color: "from-green-500 to-emerald-600", title: "Quality Assured", desc: "Premium healthcare standards" },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center shadow flex-shrink-0`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section ref={howItWorksSection.ref} className="py-4 md:py-8 px-3 md:px-4 bg-gradient-to-br from-blue-900 to-blue-800 transition-all duration-500 ease-in-out lg:mr-[26rem]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-3 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{homepageContent?.howItWorks?.title || "How It Works"}</h2>
              <p className="text-sm text-blue-200">{homepageContent?.howItWorks?.subtitle || "Get started in 3 simple steps"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(homepageContent?.howItWorks?.steps || howItWorks).map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="relative">
                  <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-5 shadow hover:shadow-lg transition-all border border-gray-100 text-center group">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow">
                        <span className="text-white font-black text-sm">{step.step}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow group-hover:scale-110 transition-transform">
                        {getIconComponent(step.icon, "w-6 h-6 text-white")}
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{step.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                  {i < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 -translate-y-1/2 z-10">
                      <ChevronRight className="w-5 h-5 text-purple-300" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY CHOOSE US ─────────────────────────────────────────────── */}
        <section ref={whyChooseSection.ref} className="py-4 md:py-8 px-3 md:px-4 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 transition-all duration-500 ease-in-out lg:mr-[26rem]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-3 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{homepageContent?.whyChooseUs?.title || "Why Choose Us"}</h2>
              <p className="text-sm text-gray-500">{homepageContent?.whyChooseUs?.subtitle || "Healthcare reimagined for the digital age"}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(homepageContent?.whyChooseUs?.features || whyChooseUs).map((feature, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4, scale: 1.02 }}>
                  <div className="relative bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all border border-gray-100 h-full overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-2.5 shadow group-hover:scale-110 transition-transform">
                        {getIconComponent(feature.icon, "w-5 h-5 text-white")}
                      </div>
                      <h3 className="text-xs font-bold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-[11px] text-gray-500 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
        <section ref={testimonialsSection.ref} className="py-4 md:py-8 px-3 md:px-4 bg-gradient-to-br from-blue-900 to-indigo-900 transition-all duration-500 ease-in-out lg:mr-[26rem]">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-3 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{homepageContent?.testimonials?.title || "What Our Users Say"}</h2>
              <p className="text-sm text-blue-200">{homepageContent?.testimonials?.subtitle || "Real stories from real people"}</p>
            </div>
            <div className="relative">
              <motion.div key={currentTestimonial} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.35 }}
                className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg border border-gray-100 text-center">
                <div className="text-4xl mb-3">{(homepageContent?.testimonials?.reviews || testimonials)[currentTestimonial].avatar}</div>
                <div className="flex justify-center mb-3">
                  {[...Array((homepageContent?.testimonials?.reviews || testimonials)[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                  ))}
                </div>
                <blockquote className="text-sm text-gray-700 mb-4 leading-relaxed font-medium">
                  "{(homepageContent?.testimonials?.reviews || testimonials)[currentTestimonial].content}"
                </blockquote>
                <div className="text-sm font-bold text-gray-900">{(homepageContent?.testimonials?.reviews || testimonials)[currentTestimonial].name}</div>
                <div className="text-xs text-purple-600 font-semibold">{(homepageContent?.testimonials?.reviews || testimonials)[currentTestimonial].role}</div>
              </motion.div>
              <div className="flex justify-center mt-4 gap-1.5">
                {(homepageContent?.testimonials?.reviews || testimonials).map((_, i) => (
                  <button key={i} onClick={() => setCurrentTestimonial(i)}
                    className={`h-1.5 rounded-full transition-all ${i === currentTestimonial ? 'bg-white w-6' : 'bg-white/40 w-1.5 hover:bg-white/60'}`} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── HEALTH TIPS ───────────────────────────────────────────────── */}
        <section ref={healthTipsSection.ref} className="py-4 md:py-8 px-3 md:px-4 bg-gradient-to-br from-blue-900 to-indigo-900 transition-all duration-500 ease-in-out lg:mr-[26rem]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-3 md:mb-5">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{homepageContent?.healthTips?.title || "Health Tips from Our Doctors"}</h2>
              <p className="text-sm text-blue-200">{homepageContent?.healthTips?.subtitle || "Expert advice and health awareness articles"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(homepageContent?.healthTips?.tips || [
                { title: "Dengue Prevention Tips", description: "Essential precautions to protect yourself from dengue fever", icon: "Shield", category: "Preventive Care" },
                { title: "Diabetes Management Guide", description: "Comprehensive guide to managing diabetes effectively", icon: "Activity", category: "Chronic Conditions" },
                { title: "Mental Health Awareness", description: "Understanding and supporting mental health in daily life", icon: "Heart", category: "Mental Health" },
              ]).map((article, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ scale: 1.02 }}>
                  <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {getIconComponent(article.icon, "w-4 h-4 text-blue-600")}
                      </div>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold">{article.category}</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">{article.title}</h3>
                    <p className="text-xs text-gray-500 mb-3 leading-relaxed">{article.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">5 min read</span>
                      <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-1 px-3 rounded-lg text-[11px] hover:from-blue-700 hover:to-indigo-700 transition-all">
                        Read More
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNERS ───────────────────────────────────────────────── */}
        <section ref={ctaSection.ref} className="py-4 md:py-8 px-3 md:px-4 bg-gradient-to-br from-blue-600 to-indigo-700 transition-all duration-500 ease-in-out lg:mr-[26rem]">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div className="bg-white rounded-xl p-5 text-center shadow-md">
                <div className="text-3xl mb-2">👨‍⚕️</div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Join 200+ Verified Doctors</h3>
                <p className="text-xs text-gray-500 mb-3">Expand your practice and reach more patients</p>
                <Link href="/register/doctor-hospital?role=doctor" prefetch
                  className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow text-sm">
                  Register as Doctor
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div className="bg-white rounded-xl p-5 text-center shadow-md">
                <div className="text-3xl mb-2">👩‍💼</div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Find Your Doctor Today</h3>
                <p className="text-xs text-gray-500 mb-3">Get the healthcare you deserve, when you need it</p>
                <Link href="/doctors" prefetch
                  className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow text-sm">
                  Find a Doctor
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </main>
      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <MobileBottomNavigation />

      {/* Entity Info Popup */}
      <EntityInfoPopup 
        entity={selectedEntity}
        type={selectedEntityType}
        top={popupTop}
        onClose={() => {
          setSelectedEntity(null);
          setSelectedEntityType(null);
        }}
        onBook={(doctor) => {
          setSelectedDoctor(doctor);
          setShowAppointmentModal(true);
        }}
      />

      {/* Mini Search - Appears when hero is off-screen and no entity is selected */}
      <AnimatePresence>
        {!heroSection.overlaps && !selectedEntity && (
          <MiniSearch initialQuery={searchQuery} />
        )}
      </AnimatePresence>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white py-4 md:py-8 px-3 md:px-4 md:ml-[var(--sidebar-width,14rem)] transition-all duration-300">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🏥</span>
                <span className="text-base font-bold">Healtara</span>
              </div>
              <p className="text-gray-400 text-xs mb-4 leading-relaxed">Your trusted healthcare platform connecting patients with verified doctors and hospitals.</p>
              <div className="flex gap-2">
                {[{ icon: Facebook, bg: "bg-blue-600 hover:bg-blue-700" }, { icon: Twitter, bg: "bg-sky-600 hover:bg-sky-700" }, { icon: Instagram, bg: "bg-pink-600 hover:bg-pink-700" }, { icon: Linkedin, bg: "bg-blue-700 hover:bg-blue-800" }].map(({ icon: Icon, bg }, i) => (
                  <a key={i} href="#" className={`w-7 h-7 ${bg} rounded-full flex items-center justify-center transition-colors`}><Icon className="w-3.5 h-3.5" /></a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-3">Quick Links</h3>
              <ul className="space-y-2">
                {[{ href: "/", label: "🏠 Home" }, { href: "/doctors", label: "👨‍⚕️ Find Doctors" }, { href: "/hospitals", label: "🏥 Hospitals" }, { href: "/clinics", label: "🏥 Clinics" }, { href: "/reviews", label: "⭐ Reviews" }].map((l) => (
                  <li key={l.href}><Link href={l.href} prefetch className="text-gray-400 hover:text-white transition-colors text-xs">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-3">For Providers</h3>
              <ul className="space-y-2">
                {[{ href: "/register/doctor-hospital?role=doctor", label: "👨‍⚕️ Doctor Sign-up" }, { href: "/register/doctor-hospital?role=hospital", label: "🏥 Hospital Sign-up" }, { href: "/login/doctors", label: "🔑 Doctor Login" }, { href: "/slot-admin/login", label: "🧑‍⚕️ Management" }].map((l) => (
                  <li key={l.href}><Link href={l.href} prefetch className="text-gray-400 hover:text-white transition-colors text-xs">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-3">Support</h3>
              <ul className="space-y-2">
                {[{ href: "/about", label: "📖 About" }, { href: "/contact", label: "📞 Contact" }, { href: "/terms", label: "📋 Terms" }, { href: "/privacy", label: "🔒 Privacy" }, { href: "/careers", label: "💼 Careers" }].map((l) => (
                  <li key={l.href}><Link href={l.href} prefetch className="text-gray-400 hover:text-white transition-colors text-xs">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-5 text-center">
            <p className="text-gray-500 text-xs">Made with ❤️ by Healtara Team · © 2024 All rights reserved</p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      {showAppointmentModal && selectedDoctor && (
        <BookAppointmentModal
          open={showAppointmentModal}
          onClose={() => { setShowAppointmentModal(false); setSelectedDoctor(null); }}
          doctor={selectedDoctor}
          doctorId={selectedDoctor.id}
          doctorName={`Dr. ${selectedDoctor.email.split('@')[0]}`}
          onSubmit={async (appointmentData) => {
            try {
              if (appointmentData.time) {
                await apiClient.bookAppointment({ ...appointmentData, time: appointmentData.time });
                setShowAppointmentModal(false);
                setSelectedDoctor(null);
              }
            } catch (error) { console.error('Error booking appointment:', error); }
          }}
          patientLoggedIn={!!user}
          patientRole={user?.role}
        />
      )}
    </div>
  );
}
