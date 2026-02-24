// ============================================================================
// 🏥 HOSPITAL MICROSITE TEMPLATE - Modern Professional Hospital Website
// ============================================================================
// This is the template for all hospital microsites and subdomains
// Features a modern, professional design with comprehensive sections
// Hospitals can customize content through their admin dashboard
// 
// IMPORTANT: This template provides a complete online presence for hospitals
// ============================================================================

// ============================================================================
// 🏗️ INTERFACE DEFINITIONS - TypeScript types for our data
// ============================================================================
import DoctorBookingCTA from "@/components/DoctorBookingCTA";
import HospitalDoctorsByDepartment from "@/components/HospitalDoctorsByDepartment";
import EmergencyBookingForm from "@/components/EmergencyBookingForm";
import HospitalDepartments from "@/components/HospitalDepartments";
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import Script from 'next/script';
import { CommentsSection } from '@/components/CommentsSection';

interface HospitalProfileGeneral {
  legalName?: string;
  brandName?: string;
  tagline?: string;
  logoUrl?: string;
  address?: string;
  pincode?: string;
  googleMapsLink?: string;
  contacts?: {
    emergency?: string;
    reception?: string;
    ambulance?: string;
    appointment?: string;
    healthCheckups?: string;
    fax?: string;
  };
  emails?: {
    info?: string;
    appointments?: string;
    feedback?: string;
    careers?: string;
  };
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
}

interface HospitalDepartment {
  name: string;
  description?: string;
  services?: string[];
  conditions?: string[];
  equipment?: string[];
  photos?: string[];
}

interface HospitalProfile {
  general?: HospitalProfileGeneral;
  about?: {
    mission?: string;
    vision?: string;
    values?: string;
    history?: string;
    leadership?: Array<{ name: string; title: string; photoUrl?: string; message?: string }>;
    accreditations?: Array<{ name: string; logoUrl?: string }>;
    awards?: Array<{ title: string; year?: string }>;
    media?: Array<{ title: string; url: string }>;
    csr?: string;
  };
  departments?: HospitalDepartment[];
  doctors?: Array<{ 
    name: string; 
    doctorId?: number; 
    primarySpecialty?: string; 
    subSpecialty?: string; 
    departments?: string[];
    bio?: string;
    credentials?: Array<{ degree: string; institute?: string; year?: string }>;
    experienceYears?: number;
    expertise?: string[];
    procedures?: string[];
    languages?: string[];
    opdSchedule?: Array<{ day: string; start: string; end: string }>;
    testimonials?: Array<{ author: string; content: string }>;
    publications?: Array<{ title: string; link?: string }>;
    awards?: string[];
  }>;
}

interface HospitalDoctorLink {
  doctor: {
  id: number;
    email: string;
    doctorProfile?: {
      slug?: string;
      specialization?: string;
      clinicName?: string;
      profileImage?: string;
      qualifications?: string;
      experience?: number;
      consultationFee?: number;
      about?: string;
      services?: string[];
      workingHours?: string;
    } | null;
  };
  department?: { id: number; name: string } | null;
}

interface HospitalProfileResponse {
  hospitalId: number;
  name: string;
  profile: HospitalProfile | null;
}

interface HospitalDetailsResponse {
  id: number;
  name: string;
  departments: HospitalDepartment[];
  doctors: HospitalDoctorLink[];
}

// ============================================================================
// 🌐 DATA FETCHING - Functions to get hospital data from API
// ============================================================================
async function getHospitalProfileBySlug(slug: string): Promise<HospitalProfileResponse | null> {
  try {
    const apiHost = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    // First try to get hospital by slug, if that doesn't work, try by ID
    const res = await fetch(`${apiHost}/api/hospitals/slug/${slug}/profile`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      // Fallback: try to get by slug as ID
      const resById = await fetch(`${apiHost}/api/hospitals/${slug}/profile`, {
        cache: 'no-store',
      });
      if (!resById.ok) {
        return null;
      }
      return resById.json();
    }
    return res.json();
  } catch (error) {
    console.error('Failed to fetch hospital profile by slug:', error);
    return null;
  }
}

async function getHospitalDetailsBySlug(slug: string): Promise<HospitalDetailsResponse | null> {
  try {
    const apiHost = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    // First try to get hospital by slug, if that doesn't work, try by ID
    const res = await fetch(`${apiHost}/api/hospitals/slug/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      // Fallback: try to get by slug as ID
      const resById = await fetch(`${apiHost}/api/hospitals/${slug}`, {
        cache: 'no-store',
      });
      if (!resById.ok) {
      return null;
      }
      return resById.json();
    }
    return res.json();
  } catch (error) {
    console.error('Failed to fetch hospital details by slug:', error);
    return null;
  }
}

// ============================================================================
// 🏥 HOSPITAL WEBSITE COMPONENT - Main website component
// ============================================================================
export default async function HospitalSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Combine fetching into a single optimized request
  const details = await getHospitalDetailsBySlug(id);

  // ============================================================================
  // 🚫 NOT FOUND STATE - Show error if hospital doesn't exist
  // ============================================================================
  if (!details) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏥</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Hospital Not Found</h1>
          <p className="text-gray-600 mb-6">The requested hospital could not be found.</p>
          <a 
            href="/" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  const profile = (details as any).profile || {};
  const general = profile.general || {};
  const name = general.brandName || general.legalName || details.name || 'Hospital';
  const tagline = general.tagline || 'Quality Care, Compassionate Service';
  const address = general.address || '';
  const logoUrl = general.logoUrl;
  const contacts = general.contacts || {};
  const social = general.social || {};
  let departments = (profile.departments && profile.departments.length > 0) ? profile.departments : (details.departments || []);
  const about = profile.about || {};
  const doctorsToShow = details.doctors || [];
  const profileDoctors = Array.isArray(profile.doctors) ? profile.doctors : [];
  try {
    const present = new Set<string>((departments || []).map((d: any) => String(d?.name || '').trim().toLowerCase()).filter(Boolean));
    const extra: any[] = [];
    for (const link of (doctorsToShow || [])) {
      const nm = String(link?.department?.name || '').trim();
      if (nm && !present.has(nm.toLowerCase())) {
        present.add(nm.toLowerCase());
        extra.push({ name: nm });
      }
    }
    if (extra.length > 0) departments = [...(departments || []), ...extra] as any;
  } catch {}
  const featuredServices = Array.from(new Set((departments || []).flatMap((d: any) => d.services || []))) as string[];

  // ============================================================================
  // 🎯 MAIN RENDER - Display the modern hospital website
  // ============================================================================
  return (
    <div className="min-h-screen bg-white">
      <Script id="auth-bridge-site" strategy="afterInteractive">
        {`
        try {
          if (typeof window !== 'undefined') {
            // 1) Hash-based token handoff (same-window navigation)
            var hash = window.location.hash || '';
            var m = /authToken=([^&]+)/.exec(hash);
            if (m && m[1]) {
              var t = decodeURIComponent(m[1]);
              try { localStorage.setItem('authToken', t); } catch(_) {}
              try {
                var d=(function(){var env=(window.process&&window.process.env&&window.process.env.NEXT_PUBLIC_PRIMARY_DOMAIN)||''; if(env){return env.startsWith('.')?env:'.'+env;} var h=window.location.hostname.toLowerCase(); if(h==='localhost'||h==='127.0.0.1') return null; var p=h.split('.'); if(p.length>=2){return '.'+p.slice(p.length-2).join('.');} return null;})();
                var attrs=['authToken='+encodeURIComponent(t),'Path=/','Max-Age='+(60*60*24*7)]; if(d){attrs.push('Domain='+d,'Secure');} attrs.push('SameSite=Lax'); document.cookie=attrs.join('; ');
              } catch(_) {}
              try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch(_) {}
              try { location.reload(); } catch(_) {}
            }

            // 2) PostMessage-based token handoff (new window/tab)
            if (window.opener) {
              var has = document.cookie && document.cookie.indexOf('authToken=') !== -1;
              if (!has) {
                function h(e){try{if(e&&e.data&&e.data.type==='auth-token'&&e.data.token){try{localStorage.setItem('authToken', e.data.token);}catch(_){};try{var d=(function(){var env=(window.process&&window.process.env&&window.process.env.NEXT_PUBLIC_PRIMARY_DOMAIN)||''; if(env){return env.startsWith('.')?env:'.'+env;} var h=window.location.hostname.toLowerCase(); if(h==='localhost'||h==='127.0.0.1') return null; var p=h.split('.'); if(p.length>=2){return '.'+p.slice(p.length-2).join('.');} return null;})(); var attrs=['authToken='+encodeURIComponent(e.data.token),'Path=/','Max-Age='+(60*60*24*7)]; if(d){attrs.push('Domain='+d,'Secure');} attrs.push('SameSite=Lax'); document.cookie=attrs.join('; ');}catch(_){}; window.removeEventListener('message', h); location.reload();}}
                catch(_){} }
                window.addEventListener('message', h);
                window.opener.postMessage({ type: 'request-auth-token' }, '*');
              }
            }
          }
        } catch(_) {}
        `}
      </Script>
      {/* ============================================================================
          🎨 PREMIUM HERO SECTION - Modern hospital header with advanced animations
          ============================================================================ */}
      <header className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden min-h-[35vh] md:min-h-[65vh]">
        {/* Animated Medical Background with Particles */}
        <div className="absolute inset-0">
          {/* Floating medical icons - responsive sizing */}
          <div className="absolute top-10 left-10 text-3xl md:text-6xl opacity-20 animate-bounce" style={{animationDelay: '0s'}}>🏥</div>
          <div className="absolute top-20 right-20 text-2xl md:text-4xl opacity-15 animate-pulse" style={{animationDelay: '1s'}}>💊</div>
          <div className="hidden md:block absolute top-32 left-1/4 text-5xl opacity-20 animate-bounce" style={{animationDelay: '2s'}}>🩺</div>
          <div className="hidden md:block absolute top-40 right-1/3 text-3xl opacity-15 animate-pulse" style={{animationDelay: '3s'}}>💉</div>
          <div className="hidden md:block absolute bottom-20 left-1/5 text-4xl opacity-20 animate-bounce" style={{animationDelay: '4s'}}>🧬</div>
          <div className="hidden md:block absolute bottom-32 right-1/4 text-5xl opacity-15 animate-pulse" style={{animationDelay: '5s'}}>🔬</div>
          <div className="absolute bottom-10 left-1/3 text-2xl md:text-3xl opacity-20 animate-bounce" style={{animationDelay: '6s'}}>📋</div>
          
          {/* Animated geometric shapes - more visible on mobile */}
          <div className="absolute top-16 left-1/2 w-3 h-3 md:w-4 md:h-4 bg-white opacity-10 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute top-24 right-1/4 w-4 h-4 md:w-6 md:h-6 bg-white opacity-15 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute bottom-24 left-1/6 w-2 h-2 md:w-3 md:h-3 bg-white opacity-10 rounded-full animate-ping" style={{animationDelay: '2.5s'}}></div>
          <div className="absolute bottom-16 right-1/3 w-3 h-3 md:w-5 md:h-5 bg-white opacity-15 rounded-full animate-ping" style={{animationDelay: '3.5s'}}></div>
          
          {/* Gradient overlay with pulse effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-purple-900/40 animate-pulse" style={{animationDuration: '3s'}}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 lg:py-16">
          <div className="text-center">
            {/* Hospital Logo - Compact on mobile */}
            <div className="mb-3 md:mb-6">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={logoUrl} 
                  alt={name} 
                  className="h-12 md:h-16 w-auto mx-auto mb-2 md:mb-4 rounded-xl shadow-2xl bg-white p-2 md:p-3" 
                />
              ) : (
                <div className="h-12 md:h-16 w-12 md:w-16 mx-auto mb-2 md:mb-4 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl md:text-3xl">🏥</span>
                </div>
              )}
            </div>
            
            {/* Hospital Name & Tagline - Compact on mobile */}
            <h1 className="text-xl md:text-5xl font-bold mb-2 md:mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              {name}
            </h1>
            <p className="text-sm md:text-xl mb-4 md:mb-6 text-blue-100 font-light max-w-3xl mx-auto leading-relaxed">
              {tagline}
            </p>
            
            {/* Quick Contact & Book Button - Compact on mobile */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4 md:mb-8">
              {contacts.emergency && (
                <div className="flex items-center bg-red-500/20 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-red-400/30">
                  <span className="text-base md:text-xl mr-2">🚑</span>
                  <span className="text-xs md:text-sm font-semibold">Emergency: {contacts.emergency}</span>
                </div>
              )}
              
              {doctorsToShow.length > 0 && (
                <a 
                  href="#doctors"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-2 px-4 md:py-3 md:px-8 rounded-full hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm md:text-base"
                >
                  📅 Book Now
                </a>
              )}
            </div>

            {/* Compact Statistics - Smaller on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="text-lg md:text-2xl mb-1">👩‍⚕️</div>
                <div className="text-base md:text-xl font-bold">{doctorsToShow.length}</div>
                <div className="text-blue-100 text-xs">Doctors</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="text-lg md:text-2xl mb-1">🏬</div>
                <div className="text-base md:text-xl font-bold">{departments.length}</div>
                <div className="text-blue-100 text-xs">Departments</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="text-lg md:text-2xl mb-1">⭐</div>
                <div className="text-base md:text-xl font-bold">24/7</div>
                <div className="text-blue-100 text-xs">Emergency</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="text-lg md:text-2xl mb-1">🏆</div>
                <div className="text-base md:text-xl font-bold">Premium</div>
                <div className="text-blue-100 text-xs">Quality</div>
              </div>
            </div>

            {/* Social Media Links */}
            {(social.facebook || social.instagram || social.linkedin || social.twitter || social.youtube) && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <span className="text-blue-100 text-sm font-medium mr-2">Follow:</span>
                {social.facebook && (
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-2xl hover:scale-110 transition-transform duration-200">
                    📘
                  </a>
                )}
                {social.instagram && (
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-2xl hover:scale-110 transition-transform duration-200">
                    📷
                  </a>
                )}
                {social.linkedin && (
                  <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className="text-2xl hover:scale-110 transition-transform duration-200">
                    💼
                  </a>
                )}
                {social.twitter && (
                  <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="text-2xl hover:scale-110 transition-transform duration-200">
                    🐦
                  </a>
                )}
                {social.youtube && (
                  <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="text-2xl hover:scale-110 transition-transform duration-200">
                    📺
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================================
          📋 MAIN CONTENT - Website sections - Compact on mobile
          ============================================================================ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-16 space-y-6 md:space-y-24 pb-20 md:pb-8">
        
        {/* ============================================================================
            ✨ WHY CHOOSE US SECTION - Key differentiators and trust signals
            ============================================================================ */}
        <section className="relative -mt-20 md:-mt-32 z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-6 shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-blue-500 group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Award Winning</h3>
              <p className="text-gray-600 text-sm">Recognized for excellence in patient care and medical innovation</p>
            </div>
            <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl p-6 shadow-2xl hover:shadow-green-500/30 transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-green-500 group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔬</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced Technology</h3>
              <p className="text-gray-600 text-sm">State-of-the-art medical equipment and diagnostic facilities</p>
            </div>
            <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-purple-500 group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">👨‍⚕️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Expert Doctors</h3>
              <p className="text-gray-600 text-sm">Highly qualified specialists with years of experience</p>
            </div>
            <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl p-6 shadow-2xl hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-red-500 group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">❤️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Patient First</h3>
              <p className="text-gray-600 text-sm">Compassionate care focused on your comfort and recovery</p>
            </div>
          </div>
        </section>
        
        {/* ============================================================================
            🚀 QUICK ACTIONS SECTION - Fast access to key services
            ============================================================================ */}
        <section className="relative">
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 shadow-xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">How Can We Help You Today?</h2>
              <p className="text-gray-600">Quick access to our most popular services</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group border border-gray-100">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📅</div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">Book Appointment</h3>
                <p className="text-gray-500 text-xs mt-1">Schedule a visit</p>
              </button>
              
              <button className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group border border-gray-100">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🚑</div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">Emergency</h3>
                <p className="text-gray-500 text-xs mt-1">24/7 available</p>
              </button>
              
              <button className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group border border-gray-100">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📋</div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">Health Records</h3>
                <p className="text-gray-500 text-xs mt-1">Access reports</p>
              </button>
              
              <button className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group border border-gray-100">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">💬</div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">Consult Online</h3>
                <p className="text-gray-500 text-xs mt-1">Video call</p>
              </button>
            </div>
          </div>
        </section>
        
        {/* ============================================================================
            🏥 ABOUT SECTION - Hospital information and mission - Compact on mobile
            ============================================================================ */}
        {(about.mission || about.vision || about.values || about.history) && (
          <section className="relative">
            <div className="text-center mb-4 md:mb-16">
              <h2 className="text-2xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-6">About {name}</h2>
              <p className="text-sm md:text-xl text-gray-600 max-w-3xl mx-auto">
                Committed to excellence in healthcare, innovation in treatment, and compassion in patient care.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-12 mb-4 md:mb-16">
              {/* Mission */}
              {about.mission && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-blue-200 group">
                  <div className="text-3xl md:text-6xl mb-3 md:mb-6 text-center group-hover:scale-110 transition-transform">🎯</div>
                  <h3 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 md:mb-4 text-center">Our Mission</h3>
                  <p className="text-sm md:text-lg text-gray-700 leading-relaxed text-center">{about.mission}</p>
                </div>
              )}
              
              {/* Vision */}
              {about.vision && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-green-200 group">
                  <div className="text-3xl md:text-6xl mb-3 md:mb-6 text-center group-hover:scale-110 transition-transform">👁️</div>
                  <h3 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2 md:mb-4 text-center">Our Vision</h3>
                  <p className="text-sm md:text-lg text-gray-700 leading-relaxed text-center">{about.vision}</p>
                </div>
              )}
            </div>
            
            {/* Values & History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-12">
              {about.values && (
                <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-xl border border-purple-200 group">
                  <div className="text-3xl md:text-6xl mb-3 md:mb-6 text-center group-hover:scale-110 transition-transform">💎</div>
                  <h3 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-3 md:mb-6 text-center">Our Values</h3>
                  <div className="text-sm md:text-base text-gray-700 whitespace-pre-line leading-relaxed">{about.values}</div>
                    </div>
              )}
              
              {about.history && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-xl border border-orange-200 group">
                  <div className="text-3xl md:text-6xl mb-3 md:mb-6 text-center group-hover:scale-110 transition-transform">📖</div>
                  <h3 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-3 md:mb-6 text-center">Our Story</h3>
                  <div className="text-sm md:text-base text-gray-700 whitespace-pre-line leading-relaxed">{about.history}</div>
                    </div>
              )}
                    </div>
            
            {/* Accreditations & Awards */}
            {(about.accreditations || about.awards) && (
              <div className="mt-16">
                <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Recognition & Excellence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {about.accreditations && about.accreditations.length > 0 && (
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                      <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">🏆 Accreditations</h4>
                      <div className="space-y-4">
                        {about.accreditations.map((acc: any, index: number) => (
                          <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
                            {acc.logoUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={acc.logoUrl} alt={acc.name} className="h-12 w-auto mr-4" />
                            )}
                            <span className="font-semibold text-gray-900">{acc.name}</span>
                  </div>
                        ))}
                </div>
              </div>
                  )}
                  
                  {about.awards && about.awards.length > 0 && (
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                      <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">🏅 Awards</h4>
                      <div className="space-y-4">
                        {about.awards.map((award: any, index: number) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <div className="font-semibold text-gray-900">{award.title}</div>
                            {award.year && <div className="text-gray-600 text-sm">{award.year}</div>}
            </div>
                        ))}
                </div>
              </div>
                  )}
            </div>
          </div>
            )}
        </section>
        )}

        {/* ============================================================================
            🏥 DEPARTMENTS & SERVICES SECTION - Specialized departments and services - Compact on mobile
            ============================================================================ */}
        {departments.length > 0 && (
          <section className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 md:py-12 rounded-3xl shadow-xl border border-blue-100">
            <div className="text-center mb-6 md:mb-10">
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 md:mb-3">Our Departments</h2>
              <p className="text-sm md:text-lg text-gray-600 max-w-2xl mx-auto">
                Specialized medical departments with state-of-the-art facilities
              </p>
            </div>
            <HospitalDepartments departments={departments as any} doctors={doctorsToShow as any} hospitalName={name} />
          </section>
        )}
        
        {/* Featured Services Grid - Compact on mobile */}
        {featuredServices.length > 0 && (
          <section className="relative bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-6 md:py-10 rounded-3xl shadow-xl border border-purple-100">
            <div className="text-center mb-5 md:mb-8">
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 md:mb-3">Featured Services</h2>
              <p className="text-sm md:text-lg text-gray-600">Comprehensive medical care across all specialties</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {featuredServices.map((service: string, index: number) => (
                <div key={index} className="bg-white p-4 md:p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 text-center group border border-gray-100 hover:border-purple-200 transform hover:-translate-y-1">
                  <div className="text-3xl md:text-4xl mb-2 md:mb-3 group-hover:scale-125 transition-transform duration-300">
                    {index % 8 === 0 ? '💊' : index % 8 === 1 ? '🔬' : index % 8 === 2 ? '📋' : index % 8 === 3 ? '🩺' : index % 8 === 4 ? '💉' : index % 8 === 5 ? '🏥' : index % 8 === 6 ? '🦠' : '❤️'}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xs md:text-sm group-hover:text-purple-600 transition-colors">{service}</h3>
                </div>
              ))}
          </div>
        </section>
        )}

        {doctorsToShow.length > 0 && (
          <section id="doctors" className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 md:py-12 rounded-3xl shadow-xl border border-green-100">
            <div className="text-center mb-6 md:mb-10">
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2 md:mb-3">Our Medical Team</h2>
              <p className="text-sm md:text-lg text-gray-600 max-w-2xl mx-auto">
                Experienced healthcare professionals dedicated to your care
              </p>
            </div>
            <HospitalDoctorsByDepartment doctors={doctorsToShow as any} hospitalName={name} />
          </section>
        )}
        
        {/* Doctors added via Hospital Profile (informational list) */}
        {profileDoctors.length > 0 && (
          <section className="relative">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Additional Medical Staff</h2>
              <p className="text-lg text-gray-600">These entries are informational. Link real doctor accounts to enable booking.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profileDoctors.map((d: any, idx: number) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-300">
                  <div className="text-center mb-4">
                    <div className="text-5xl mb-4">👨‍⚕️</div>
                    <h3 className="text-xl font-semibold text-gray-900">Dr. {d.name || 'Unnamed'}</h3>
                    {d.primarySpecialty && <p className="text-blue-600 font-medium mt-1">{d.primarySpecialty}</p>}
                    {d.subSpecialty && <p className="text-gray-500 text-sm mt-1">{d.subSpecialty}</p>}
                  </div>
                  
                  {d.bio && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{d.bio}</p>
                  )}
                  
                  {Array.isArray(d.departments) && d.departments.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm font-semibold text-gray-700">Departments:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {d.departments.slice(0, 2).map((dept: string, deptIndex: number) => (
                          <span key={deptIndex} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                            {dept}
                          </span>
                        ))}
                        {d.departments.length > 2 && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            +{d.departments.length - 2}
                          </span>
                        )}
                  </div>
                </div>
                  )}
                  
                  <div className="text-center">
                    {d.doctorId ? (
                      <DoctorBookingCTA doctorId={d.doctorId} clinicName={d.name || name} />
                    ) : (
                      <button disabled className="bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg cursor-not-allowed text-sm">
                        Booking not yet enabled
                      </button>
                    )}
              </div>
            </div>
              ))}
          </div>
        </section>
        )}

        {/* Comments Section - Compact like Amazon */}
        <section className="relative">
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
            <div className="mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Patient Reviews</h2>
            </div>
            <CommentsSection 
              entityType="hospital" 
              entityId={String(details.id)} 
              entityName={name} 
            />
          </div>
        </section>

        {/* ============================================================================
            ⭐ PATIENT TESTIMONIALS CAROUSEL - Success stories
            ============================================================================ */}
        <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-16 rounded-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">What Our Patients Say</h2>
            <p className="text-xl text-gray-600">Real stories from real people</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mr-4">
                  RS
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Rajesh Sharma</h4>
                  <div className="flex text-yellow-400">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>
              </div>
              <p className="text-gray-600 italic leading-relaxed">
                "Excellent care and professional staff. The doctors took time to explain everything clearly. Highly recommended!"
              </p>
              <div className="mt-4 text-sm text-gray-500">Cardiology Department</div>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mr-4">
                  PK
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Priya Kumar</h4>
                  <div className="flex text-yellow-400">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>
              </div>
              <p className="text-gray-600 italic leading-relaxed">
                "State-of-the-art facilities and compassionate care. My surgery was successful and recovery was smooth."
              </p>
              <div className="mt-4 text-sm text-gray-500">Orthopedics Department</div>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold mr-4">
                  AM
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Amit Mehta</h4>
                  <div className="flex text-yellow-400">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>
              </div>
              <p className="text-gray-600 italic leading-relaxed">
                "Best hospital in the city! Clean environment, modern equipment, and caring staff. Thank you for everything."
              </p>
              <div className="mt-4 text-sm text-gray-500">General Medicine</div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            📞 CTA SECTION - Compact call to action
            ============================================================================ */}
        <section className="relative">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 md:p-12 rounded-2xl shadow-xl">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-4xl md:text-5xl mb-4">🏥</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Your Health is Our Priority</h2>
              <p className="text-sm md:text-base mb-6 text-blue-100">
                Experience world-class healthcare with our expert medical team. Book your appointment today and take the first step towards better health.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                {contacts.appointment && (
                  <a 
                    href={`tel:${contacts.appointment}`}
                    className="bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg text-sm hover:bg-gray-50 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    📞 Book Appointment
                  </a>
                )}
                
                {general.googleMapsLink && (
                  <a 
                    href={general.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-transparent border-2 border-white text-white font-semibold py-3 px-6 rounded-lg text-sm hover:bg-white hover:text-blue-600 transition-all duration-200"
                  >
                    📍 Visit Us
                  </a>
                )}
                
                <a 
                  href="/doctors"
                  className="bg-green-500 text-white font-semibold py-3 px-6 rounded-lg text-sm hover:bg-green-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  👩‍⚕️ Find Doctors
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            🚨 EMERGENCY BOOKING - Compact and Modern
            ============================================================================ */}
        {doctorsToShow.length > 0 && (
          <section className="relative bg-gradient-to-br from-red-50 to-orange-50 py-6 md:py-10 rounded-3xl">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
              <div className="lg:col-span-4">
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border-l-4 border-red-500">
                  <div className="flex items-center mb-3">
                    <div className="text-2xl md:text-3xl mr-3">🚑</div>
                    <h2 className="text-lg md:text-2xl font-bold text-gray-900">Emergency Appointments</h2>
                  </div>
                  <p className="text-gray-700 text-xs md:text-sm mb-3">
                    Need urgent care? Submit an emergency booking and we'll prioritize your case.
                  </p>
                  <EmergencyBookingForm doctors={doctorsToShow.map((link) => ({ id: link.doctor.id, email: link.doctor.email }))} />
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-red-600 text-white rounded-2xl p-4 shadow-lg text-center">
                  <div className="text-3xl mb-2">📞</div>
                  <h3 className="text-base font-bold mb-2">24/7 Emergency</h3>
                  {contacts.emergency ? (
                    <a href={`tel:${contacts.emergency}`} className="block bg-white text-red-600 font-bold px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors mt-3 text-sm">
                      {contacts.emergency}
                    </a>
                  ) : (
                    <p className="text-xs text-red-100">Available 24/7</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================================
            🏥 INSURANCE PARTNERS SECTION - Accepted insurance providers
            ============================================================================ */}
        <section className="relative bg-white py-16 rounded-3xl border-2 border-gray-100">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Insurance Partners</h2>
            <p className="text-gray-600">We accept all major insurance providers</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center">
            {['ICICI Lombard', 'Star Health', 'HDFC ERGO', 'Max Bupa', 'Care Health', 'Bajaj Allianz'].map((insurance, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 flex items-center justify-center hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="text-center">
                  <div className="text-3xl mb-2">🏥</div>
                  <p className="font-semibold text-gray-700 text-sm">{insurance}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <button className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
              View All Insurance Partners →
            </button>
          </div>
        </section>

        {/* ============================================================================
            ❓ FAQ SECTION - Frequently asked questions
            ============================================================================ */}
        <section className="relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Find answers to common questions</p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-4">
            <details className="bg-white rounded-2xl p-6 shadow-lg group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                What are your visiting hours?
                <span className="text-2xl group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Our general visiting hours are from 4:00 PM to 7:00 PM daily. ICU visiting hours are from 11:00 AM to 12:00 PM and 5:00 PM to 6:00 PM. Please check with specific departments for any variations.
              </p>
            </details>
            
            <details className="bg-white rounded-2xl p-6 shadow-lg group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                Do you accept insurance?
                <span className="text-2xl group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Yes, we accept all major insurance providers including ICICI Lombard, Star Health, HDFC ERGO, Max Bupa, and many more. Please bring your insurance card and policy documents during admission.
              </p>
            </details>
            
            <details className="bg-white rounded-2xl p-6 shadow-lg group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                How do I book an appointment?
                <span className="text-2xl group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                You can book an appointment online through our website, call our appointment desk, or visit the hospital reception. Online booking is available 24/7 for your convenience.
              </p>
            </details>
            
            <details className="bg-white rounded-2xl p-6 shadow-lg group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                What should I bring for my first visit?
                <span className="text-2xl group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Please bring a valid ID proof, insurance card (if applicable), previous medical records, list of current medications, and any relevant test reports. Arriving 15 minutes early is recommended.
              </p>
            </details>
            
            <details className="bg-white rounded-2xl p-6 shadow-lg group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                Do you have parking facilities?
                <span className="text-2xl group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Yes, we have ample parking space for both two-wheelers and four-wheelers. Valet parking service is also available at the main entrance for your convenience.
              </p>
            </details>
          </div>
        </section>
      </main>

      {/* ============================================================================
          🦶 FOOTER SECTION - Comprehensive hospital footer
          ============================================================================ */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Hospital Info */}
            <div className="lg:col-span-1">
              <div className="mb-6">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={name} className="h-16 w-auto mb-4" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
                    <span className="text-3xl">🏥</span>
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-4">{name}</h3>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                {tagline || 'Committed to providing exceptional healthcare services with compassion, innovation, and excellence.'}
              </p>
              
              {/* Social Media */}
              {(social.facebook || social.instagram || social.linkedin || social.twitter || social.youtube) && (
              <div className="flex space-x-4">
                  {social.facebook && (
                    <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-blue-400 transition-colors">
                      📘
                    </a>
                  )}
                  {social.instagram && (
                    <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-pink-400 transition-colors">
                      📷
                    </a>
                  )}
                  {social.linkedin && (
                      <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className="text-2xl hover-text-brand-accent transition-colors">
                      💼
                    </a>
                  )}
                  {social.twitter && (
                    <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="text-2xl hover-text-brand-accent transition-colors">
                      🐦
                    </a>
                  )}
                  {social.youtube && (
                    <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-red-400 transition-colors">
                      📺
                    </a>
                  )}
              </div>
              )}
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-xl font-bold mb-6">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#about" className="hover:text-white transition-colors flex items-center">
                  <span className="mr-2">🏥</span> About Us
                </a></li>
                <li><a href="#departments" className="hover:text-white transition-colors flex items-center">
                  <span className="mr-2">🏬</span> Departments
                </a></li>
                <li><a href="#doctors" className="hover:text-white transition-colors flex items-center">
                  <span className="mr-2">👩‍⚕️</span> Our Doctors
                </a></li>
                <li><a href="#services" className="hover:text-white transition-colors flex items-center">
                  <span className="mr-2">💊</span> Services
                </a></li>
                <li><a href="#contact" className="hover:text-white transition-colors flex items-center">
                  <span className="mr-2">📞</span> Contact
                </a></li>
              </ul>
            </div>
            
            {/* Contact Information */}
            <div>
              <h4 className="text-xl font-bold mb-6">Contact Info</h4>
              <div className="space-y-4 text-gray-400">
                {address && (
                  <div className="flex items-start">
                    <span className="text-xl mr-3 mt-1">📍</span>
                    <div>
                      <p className="leading-relaxed">{address}</p>
                      {general.pincode && <p className="text-sm mt-1">Pincode: {general.pincode}</p>}
                    </div>
                  </div>
                )}
                
                {contacts.reception && (
                  <div className="flex items-center">
                    <span className="text-xl mr-3">📞</span>
                    <div>
                      <p className="font-semibold text-white">Reception</p>
                      <p>{contacts.reception}</p>
                    </div>
                  </div>
                )}
                
                {contacts.emergency && (
                  <div className="flex items-center">
                    <span className="text-xl mr-3">🚑</span>
                    <div>
                      <p className="font-semibold text-red-400">Emergency</p>
                      <p>{contacts.emergency}</p>
                    </div>
                  </div>
                )}
                
                {general.emails?.info && (
                  <div className="flex items-center">
                    <span className="text-xl mr-3">📧</span>
                    <div>
                      <p className="font-semibold text-white">Email</p>
                      <p>{general.emails.info}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Emergency & Hours */}
            <div>
              <h4 className="text-xl font-bold mb-6">Emergency & Hours</h4>
              <div className="space-y-4 text-gray-400">
                <div>
                  <h5 className="font-semibold text-white mb-2">Operating Hours</h5>
                  <div className="text-sm space-y-1">
                    <p>Mon - Fri: 9:00 AM - 9:00 PM</p>
                    <p>Sat: 9:00 AM - 5:00 PM</p>
                    <p>Sun: 10:00 AM - 4:00 PM</p>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-semibold text-red-400 mb-2">Emergency Services</h5>
                  <div className="text-sm">
                    <p className="font-semibold">24/7 Available</p>
                    {contacts.emergency && <p>Call: {contacts.emergency}</p>}
                  </div>
                </div>
                
                {contacts.ambulance && (
            <div>
                    <h5 className="font-semibold text-orange-400 mb-2">Ambulance</h5>
                    <div className="text-sm">
                      <p>{contacts.ambulance}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom Footer */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm mb-4 md:mb-0">
                &copy; 2024 {name}. All rights reserved. | Powered by Healtara
              </p>
              <div className="flex space-x-6 text-sm text-gray-400">
                <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="/accessibility" className="hover:text-white transition-colors">Accessibility</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation currentPath="/hospitals" />
    </div>
  );
}
