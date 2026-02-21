// ============================================================================
// 🏥 HOSPITAL WEBSITE TEMPLATE - Modern Professional Hospital Website
// ============================================================================
// This is the template for all hospital microsites
// Mirrors the doctor site structure with hospital-specific sections
// Content is sourced from the hospital profile API
// ============================================================================

import DoctorBookingCTA from '@/components/DoctorBookingCTA';
import DoctorBookingSidebar from '@/components/DoctorBookingSidebar';
import EmergencyBookingForm from '@/components/EmergencyBookingForm';
import HospitalDepartments from '@/components/HospitalDepartments';
import HospitalDoctorsByDepartment from '@/components/HospitalDoctorsByDepartment';
import Script from 'next/script';

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

interface HospitalProfileResponse {
  hospitalId: number;
  name: string;
  profile: HospitalProfile | null;
}

async function getHospitalProfileById(id: string): Promise<HospitalProfileResponse | null> {
  try {
    // Validate ID before making request
    if (!id || id === 'null' || id === 'undefined' || id.trim() === '') {
      console.warn('Invalid hospital ID provided:', id);
      return null;
    }

    // Additional validation: ensure ID is a valid number
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) {
      console.warn('Hospital ID must be a positive number:', id);
      return null;
    }

    const apiHost = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = `${apiHost}/api/hospitals/${id}/profile`;
    
    console.log(`Attempting to fetch hospital profile from: ${url}`);
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`Hospital with ID ${id} not found (404)`);
      } else if (res.status === 500) {
        console.error(`Server error when fetching hospital ${id} (500)`);
      } else {
        console.warn(`Hospital profile request failed for ID: ${id}, status: ${res.status}`);
      }
      return null;
    }
    
    const data = await res.json();
    console.log(`Successfully fetched hospital profile for ID: ${id}`);
    return data;
  } catch (error) {
    console.error(`Network error when fetching hospital profile for ID: ${id}`, error);
    return null;
  }
}

// Fetch rich hospital details including linked doctors and departments
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

interface HospitalDetailsResponse {
  id: number;
  name: string;
  departments: HospitalDepartment[];
  doctors: HospitalDoctorLink[];
}

async function getHospitalDetailsById(id: string): Promise<HospitalDetailsResponse | null> {
  try {
    // Validate ID before making request
    if (!id || id === 'null' || id === 'undefined' || id.trim() === '') {
      console.warn('Invalid hospital ID provided:', id);
      return null;
    }

    // Additional validation: ensure ID is a valid number
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) {
      console.warn('Hospital ID must be a positive number:', id);
      return null;
    }

    const apiHost = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = `${apiHost}/api/hospitals/${id}`;
    
    console.log(`Attempting to fetch hospital details from: ${url}`);
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`Hospital with ID ${id} not found (404)`);
      } else if (res.status === 500) {
        console.error(`Server error when fetching hospital ${id} (500)`);
      } else {
        console.warn(`Hospital details request failed for ID: ${id}, status: ${res.status}`);
      }
      return null;
    }
    
    const data = await res.json();
    console.log(`Successfully fetched hospital details for ID: ${id}`);
    return data;
  } catch (error) {
    console.error(`Network error when fetching hospital details for ID: ${id}`, error);
    return null;
  }
}

// Removed slug-to-ID resolution to avoid extra SSR fetches;
// rely on middleware/path structure to pass the correct id.

export default async function HospitalSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolvedId = id;
  
  // Early validation of ID
  if (!resolvedId || resolvedId === 'null' || resolvedId === 'undefined' || resolvedId.trim() === '') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Invalid Hospital ID</h1>
          <p className="text-gray-600 mb-6">The hospital ID provided is invalid or missing.</p>
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

  // Additional numeric validation
  const numId = Number(resolvedId);
  if (!Number.isFinite(numId) || numId <= 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔢</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Invalid Hospital ID</h1>
          <p className="text-gray-600 mb-6">Hospital ID must be a positive number. Received: {resolvedId}</p>
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

  // Only make API calls if ID is valid
  const [profileResponse, details] = await Promise.allSettled([
    getHospitalProfileById(resolvedId),
    getHospitalDetailsById(resolvedId),
  ]).then(results => [
    results[0].status === 'fulfilled' ? results[0].value : null,
    results[1].status === 'fulfilled' ? results[1].value : null
  ]);

  // Handle cases where hospital data is missing
  if (!profileResponse && !details) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏥</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Hospital Not Found</h1>
          <p className="text-gray-600 mb-6">
            The requested hospital (ID: {resolvedId}) could not be found. 
            This hospital may not exist or may have been removed.
          </p>
          <div className="space-y-4">
            <a
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 inline-block"
            >
              Return to Homepage
            </a>
            <div className="text-sm text-gray-500">
              <p>If you believe this is an error, please contact support.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If we have some data but not all, we can still show a partial page
  if (!profileResponse || !details) {
    console.warn(`Partial hospital data available for ID: ${resolvedId}. Profile: ${!!profileResponse}, Details: ${!!details}`);
  }

  const profile = (profileResponse as HospitalProfileResponse)?.profile || undefined;
  const general = profile?.general || {};
  const name = general.brandName || general.legalName || (details as HospitalDetailsResponse)?.name || (profileResponse as HospitalProfileResponse)?.name || 'Hospital';
  const tagline = general.tagline || 'Quality Care, Compassionate Service';
  const address = general.address || '';
  const logoUrl = general.logoUrl;
  const contacts = general.contacts || {};
  const social = general.social || {};
  let departments = (profile?.departments && profile?.departments.length > 0) ? profile.departments : ((details as HospitalDetailsResponse)?.departments || []);
  const about = profile?.about || {};
  // Use doctors explicitly linked to this hospital; do not fall back to global list
  const doctorsToShow = (details as HospitalDetailsResponse)?.doctors || [];
  // Ensure departments include any department referenced by doctor links
  try {
    const presentNames = new Set<string>((departments || []).map((d: any) => String(d?.name || '').trim().toLowerCase()).filter(Boolean));
    const toAdd: any[] = [];
    for (const link of doctorsToShow) {
      const nm = String(link?.department?.name || '').trim();
      if (nm && !presentNames.has(nm.toLowerCase())) {
        presentNames.add(nm.toLowerCase());
        toAdd.push({ name: nm });
      }
    }
    if (toAdd.length > 0) {
      departments = [...(departments || []), ...toAdd] as any;
    }
  } catch {}
  const profileDoctors = Array.isArray(profile?.doctors) ? profile!.doctors! : [];
  const featuredServices = Array.from(new Set((departments || []).flatMap((d: any) => d.services || []))).slice(0, 12);

  return (
    <div className="min-h-screen bg-white">
      <Script id="auth-bridge-hospital" strategy="afterInteractive">
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
          🎨 HERO SECTION - Compact hospital header with animated background
          ============================================================================ */}
      <header className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden min-h-[60vh]">
        {/* Animated Medical Background */}
        <div className="absolute inset-0">
          {/* Floating medical icons */}
          <div className="absolute top-10 left-10 text-6xl opacity-20 animate-bounce" style={{animationDelay: '0s'}}>🏥</div>
          <div className="absolute top-20 right-20 text-4xl opacity-15 animate-pulse" style={{animationDelay: '1s'}}>💊</div>
          <div className="absolute top-32 left-1/4 text-5xl opacity-20 animate-bounce" style={{animationDelay: '2s'}}>🩺</div>
          <div className="absolute top-40 right-1/3 text-3xl opacity-15 animate-pulse" style={{animationDelay: '3s'}}>💉</div>
          <div className="absolute bottom-20 left-1/5 text-4xl opacity-20 animate-bounce" style={{animationDelay: '4s'}}>🧬</div>
          <div className="absolute bottom-32 right-1/4 text-5xl opacity-15 animate-pulse" style={{animationDelay: '5s'}}>🔬</div>
          <div className="absolute bottom-10 left-1/3 text-3xl opacity-20 animate-bounce" style={{animationDelay: '6s'}}>📋</div>
          
          {/* Animated geometric shapes */}
          <div className="absolute top-16 left-1/2 w-4 h-4 bg-white opacity-10 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute top-24 right-1/4 w-6 h-6 bg-white opacity-15 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute bottom-24 left-1/6 w-3 h-3 bg-white opacity-10 rounded-full animate-ping" style={{animationDelay: '2.5s'}}></div>
          <div className="absolute bottom-16 right-1/3 w-5 h-5 bg-white opacity-15 rounded-full animate-ping" style={{animationDelay: '3.5s'}}></div>
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-purple-900/40"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="text-center">
            {/* Hospital Logo */}
            <div className="mb-6">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={logoUrl} 
                  alt={name} 
                  className="h-16 w-auto mx-auto mb-4 rounded-xl shadow-2xl bg-white p-3" 
                />
              ) : (
                <div className="h-16 w-16 mx-auto mb-4 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-3xl">🏥</span>
                </div>
              )}
            </div>
            
            {/* Hospital Name & Tagline */}
            <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              {name}
            </h1>
            <p className="text-lg md:text-xl mb-6 text-blue-100 font-light max-w-3xl mx-auto leading-relaxed">
              {tagline}
            </p>
            
            {/* Quick Contact & Book Button */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
              {contacts.emergency && (
                <div className="flex items-center bg-red-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-red-400/30">
                  <span className="text-xl mr-2">🚑</span>
                  <span className="text-sm font-semibold">Emergency: {contacts.emergency}</span>
                </div>
              )}
              
              {doctorsToShow.length > 0 && (
                <DoctorBookingSidebar 
                  doctors={doctorsToShow} 
                  hospitalName={name} 
                  contacts={contacts} 
                />
              )}
            </div>

            {/* Compact Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="text-2xl mb-1">👩‍⚕️</div>
                <div className="text-xl font-bold">{doctorsToShow.length}</div>
                <div className="text-blue-100 text-xs">Doctors</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="text-2xl mb-1">🏬</div>
                <div className="text-xl font-bold">{departments.length}</div>
                <div className="text-blue-100 text-xs">Departments</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="text-2xl mb-1">⭐</div>
                <div className="text-xl font-bold">24/7</div>
                <div className="text-blue-100 text-xs">Emergency</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-xl font-bold">Premium</div>
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


      {/* Main sections */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        {/* About */}
        {(about.mission || about.vision || about.values || about.history) && (
          <section className="relative">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-900 mb-6">About {name}</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">Committed to excellence in healthcare, innovation in treatment, and compassion in patient care.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
              {about.mission && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-3xl shadow-lg">
                  <div className="text-6xl mb-6 text-center">🎯</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center">Our Mission</h3>
                  <p className="text-lg text-gray-700 leading-relaxed text-center">{about.mission}</p>
                </div>
              )}
              {about.vision && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-3xl shadow-lg">
                  <div className="text-6xl mb-6 text-center">👁️</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center">Our Vision</h3>
                  <p className="text-lg text-gray-700 leading-relaxed text-center">{about.vision}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {about.values && (
                <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-8 rounded-3xl shadow-lg">
                  <div className="text-6xl mb-6 text-center">💎</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Values</h3>
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">{about.values}</div>
                </div>
              )}
              {about.history && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-8 rounded-3xl shadow-lg">
                  <div className="text-6xl mb-6 text-center">📖</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Story</h3>
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">{about.history}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Departments */}
        {departments.length > 0 && (
          <section className="relative">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-900 mb-6">Our Departments</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">Specialized medical departments providing comprehensive healthcare services.</p>
            </div>
            <HospitalDepartments departments={departments as any} doctors={doctorsToShow as any} hospitalName={name} />
          </section>
        )}

        {/* Featured Services Grid */}
        {featuredServices.length > 0 && (
          <section className="gradient-brand-soft py-16 rounded-3xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Services</h2>
              <p className="text-xl text-gray-600">Comprehensive medical care across all specialties</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredServices.map((service: any, index: number) => (
                <div key={index} className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 text-center">
                  <div className="text-3xl mb-3">{index % 8 === 0 ? '💊' : index % 8 === 1 ? '🔬' : index % 8 === 2 ? '📋' : index % 8 === 3 ? '🩺' : index % 8 === 4 ? '💉' : index % 8 === 5 ? '🏥' : index % 8 === 6 ? '🦠' : '❤️'}</div>
                  <h3 className="font-semibold text-gray-900 text-sm">{service}</h3>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Doctors */}
        {doctorsToShow.length > 0 && (
          <section className="relative">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-900 mb-6">Our Medical Team</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">Meet our experienced and dedicated healthcare professionals.</p>
            </div>
            <HospitalDoctorsByDepartment doctors={doctorsToShow as any} hospitalName={name} />
          </section>
        )}

        {/* Informational doctors */}
        {profileDoctors.length > 0 && (
          <section className="relative">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Additional Medical Staff</h2>
              <p className="text-lg text-gray-600">These entries are informational. Link real doctor accounts to enable booking.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profileDoctors.map((d: any, idx: number) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                  <div className="text-center mb-4">
                    <div className="text-5xl mb-4">👨‍⚕️</div>
                    <h3 className="text-xl font-semibold text-gray-900">Dr. {d.name || 'Unnamed'}</h3>
                    {d.primarySpecialty && <p className="text-blue-600 font-medium mt-1">{d.primarySpecialty}</p>}
                    {d.subSpecialty && <p className="text-gray-500 text-sm mt-1">{d.subSpecialty}</p>}
                  </div>
                  {Array.isArray(d.departments) && d.departments.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm font-semibold text-gray-700">Departments:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {d.departments.slice(0,2).map((dept: any, deptIndex: number) => (
                          <span key={deptIndex} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">{dept}</span>
                        ))}
                        {d.departments.length > 2 && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">+{d.departments.length - 2}</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    {d.doctorId ? (
                      <DoctorBookingCTA doctorId={d.doctorId} clinicName={d.name || name} />
                    ) : (
                      <button disabled className="bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg cursor-not-allowed text-sm">Booking not yet enabled</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact & Emergency */}
        <section className="relative">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Contact & Emergency</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">We're here for you 24/7. Contact us through any of these methods.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div className="bg-gradient-to-br from-red-50 to-pink-100 p-8 rounded-3xl shadow-lg border-l-4 border-red-500">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🚑</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Emergency Services</h3>
                <p className="text-lg text-gray-700 mb-6">24/7 emergency care when you need it most</p>
              </div>
              <div className="space-y-4">
                {contacts.emergency && (
                  <div className="bg-white p-6 rounded-2xl shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-red-600 mb-2">Emergency Hotline</h4>
                        <p className="text-gray-700">Call immediately for life-threatening emergencies</p>
                      </div>
                      <a href={`tel:${contacts.emergency}`} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-lg">{contacts.emergency}</a>
                    </div>
                  </div>
                )}
                {contacts.ambulance && (
                  <div className="bg-white p-6 rounded-2xl shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-orange-600 mb-2">Ambulance Service</h4>
                        <p className="text-gray-700">Fast response medical transport</p>
                      </div>
                      <a href={`tel:${contacts.ambulance}`} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold text-lg">{contacts.ambulance}</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-3xl shadow-lg border-l-4 border-blue-500">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📞</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">General Contact</h3>
                <p className="text-lg text-gray-700 mb-6">Get in touch for appointments and inquiries</p>
              </div>
              <div className="space-y-4">
                {contacts.reception && (
                  <div className="bg-white p-6 rounded-2xl shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-blue-600 mb-2">Reception</h4>
                        <p className="text-gray-700">General inquiries and information</p>
                      </div>
                      <a href={`tel:${contacts.reception}`} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-lg">{contacts.reception}</a>
                    </div>
                  </div>
                )}
                {contacts.appointment && (
                  <div className="bg-white p-6 rounded-2xl shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-green-600 mb-2">Appointments</h4>
                        <p className="text-gray-700">Schedule your consultation</p>
                      </div>
                      <a href={`tel:${contacts.appointment}`} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-lg">{contacts.appointment}</a>
                    </div>
                  </div>
                )}
                {contacts.healthCheckups && (
                  <div className="bg-white p-6 rounded-2xl shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-purple-600 mb-2">Health Checkups</h4>
                        <p className="text-gray-700">Preventive care and screenings</p>
                      </div>
                      <a href={`tel:${contacts.healthCheckups}`} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold text-lg">{contacts.healthCheckups}</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location & Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-3xl shadow-lg">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📍</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Visit Us</h3>
              </div>
              <div className="space-y-6">
                {address && (
                  <div className="bg-white p-6 rounded-2xl shadow-md">
                    <h4 className="text-xl font-bold text-gray-900 mb-3">Address</h4>
                    <p className="text-gray-700 text-lg leading-relaxed">{address}</p>
                    {general.pincode && (<p className="text-gray-600 mt-2">Pincode: {general.pincode}</p>)}
                  </div>
                )}
                {general.googleMapsLink && (
                  <div className="text-center">
                    <a href={general.googleMapsLink} target="_blank" rel="noopener noreferrer" className="inline-block btn-brand text-white px-8 py-4 rounded-2xl font-bold text-lg">📍 Get Directions</a>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-8 rounded-3xl shadow-lg">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">⏰</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Operating Hours</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-md">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100"><span className="font-semibold text-gray-900">Monday - Friday</span><span className="text-gray-700">9:00 AM - 9:00 PM</span></div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100"><span className="font-semibold text-gray-900">Saturday</span><span className="text-gray-700">9:00 AM - 5:00 PM</span></div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100"><span className="font-semibold text-gray-900">Sunday</span><span className="text-gray-700">10:00 AM - 4:00 PM</span></div>
                  <div className="flex justify-between items-center py-2"><span className="font-bold text-red-600">Emergency</span><span className="text-red-600 font-bold">24/7 Available</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative">
          <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-800 text-white p-16 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-10 right-10 w-32 h-32 bg-white opacity-5 rounded-full"></div>
              <div className="absolute bottom-10 left-10 w-24 h-24 bg-white opacity-10 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white opacity-5 rounded-full"></div>
            </div>
            <div className="relative text-center">
              <div className="text-8xl mb-8">🏥</div>
              <h2 className="text-5xl font-bold mb-6">Your Health is Our Priority</h2>
              <p className="text-2xl mb-12 text-blue-100 max-w-3xl mx-auto leading-relaxed">Experience world-class healthcare with our expert medical team.</p>
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-6 sm:space-y-0 sm:space-x-8">
                {contacts.appointment && (<a href={`tel:${contacts.appointment}`} className="bg-white text-blue-700 font-bold py-6 px-12 rounded-2xl text-xl">📞 Book Appointment</a>)}
                {general.googleMapsLink && (<a href={general.googleMapsLink} target="_blank" rel="noopener noreferrer" className="bg-transparent border-2 border-white text-white font-bold py-6 px-12 rounded-2xl text-xl">📍 Visit Us</a>)}
                <a href="/doctors" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-6 px-12 rounded-2xl text-xl">👩‍⚕️ Find Doctors</a>
                {/* Inline booking sidebar trigger for quick scheduling */}
                {doctorsToShow && doctorsToShow.length > 0 && (
                  <div className="mt-6">
                    <DoctorBookingSidebar doctors={doctorsToShow} hospitalName={name} contacts={contacts} />
                    <div className="mt-6">
                      <EmergencyBookingForm doctors={(doctorsToShow || []).map((l: any) => l?.doctor).filter((d: any) => d && typeof d.id === 'number')} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-1">
              <div className="mb-6">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={name} className="h-16 w-auto mb-4" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4"><span className="text-3xl">🏥</span></div>
                )}
                <h3 className="text-2xl font-bold mb-4">{name}</h3>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">{tagline || 'Committed to providing exceptional healthcare services.'}</p>
              {(social.facebook || social.instagram || social.linkedin || social.twitter || social.youtube) && (
                <div className="flex space-x-4">
                  {social.facebook && (<a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-blue-400">📘</a>)}
                  {social.instagram && (<a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-pink-400">📷</a>)}
                  {social.linkedin && (<a href={social.linkedin} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-blue-400">💼</a>)}
                  {social.twitter && (<a href={social.twitter} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-blue-400">🐦</a>)}
                  {social.youtube && (<a href={social.youtube} target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-red-400">📺</a>)}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xl font-bold mb-6">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#about" className="hover:text-white transition-colors flex items-center"><span className="mr-2">🏥</span> About Us</a></li>
                <li><a href="#departments" className="hover:text-white transition-colors flex items-center"><span className="mr-2">🏬</span> Departments</a></li>
                <li><a href="#doctors" className="hover:text-white transition-colors flex items-center"><span className="mr-2">👩‍⚕️</span> Our Doctors</a></li>
                <li><a href="#services" className="hover:text-white transition-colors flex items-center"><span className="mr-2">💊</span> Services</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors flex items-center"><span className="mr-2">📞</span> Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-6">Contact Info</h4>
              <div className="space-y-4 text-gray-400">
                {address && (
                  <div className="flex items-start"><span className="text-xl mr-3 mt-1">📍</span><div><p className="leading-relaxed">{address}</p>{general.pincode && <p className="text-sm mt-1">Pincode: {general.pincode}</p>}</div></div>
                )}
                {contacts.reception && (
                  <div className="flex items-center"><span className="text-xl mr-3">📞</span><div><p className="font-semibold text-white">Reception</p><p>{contacts.reception}</p></div></div>
                )}
                {contacts.emergency && (
                  <div className="flex items-center"><span className="text-xl mr-3">🚑</span><div><p className="font-semibold text-red-400">Emergency</p><p>{contacts.emergency}</p></div></div>
                )}
                {general.emails?.info && (
                  <div className="flex items-center"><span className="text-xl mr-3">📧</span><div><p className="font-semibold text-white">Email</p><p>{general.emails.info}</p></div></div>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-6">Emergency & Hours</h4>
              <div className="space-y-4 text-gray-400">
                <div>
                  <h5 className="font-semibold text-white mb-2">Operating Hours</h5>
                  <div className="text-sm space-y-1"><p>Mon - Fri: 9:00 AM - 9:00 PM</p><p>Sat: 9:00 AM - 5:00 PM</p><p>Sun: 10:00 AM - 4:00 PM</p></div>
                </div>
                <div>
                  <h5 className="font-semibold text-red-400 mb-2">Emergency Services</h5>
                  <div className="text-sm"><p className="font-semibold">24/7 Available</p>{contacts.emergency && <p>Call: {contacts.emergency}</p>}</div>
                </div>
                {contacts.ambulance && (
                  <div>
                    <h5 className="font-semibold text-orange-400 mb-2">Ambulance</h5>
                    <div className="text-sm"><p>{contacts.ambulance}</p></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm mb-4 md:mb-0">&copy; 2024 {name}. All rights reserved. | Powered by Healtara</p>
              <div className="flex space-x-6 text-sm text-gray-400"><a href="/privacy" className="hover:text-white">Privacy Policy</a><a href="/terms" className="hover:text-white">Terms of Service</a><a href="/accessibility" className="hover:text-white">Accessibility</a></div>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky Contact Bar */}
      {(contacts.emergency || contacts.appointment || general.googleMapsLink) && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
            <div className="bg-indigo-700 text-white rounded-xl shadow-lg flex flex-wrap items-center justify-center gap-4 p-3">
              {contacts.emergency && (<a href={`tel:${contacts.emergency}`} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"><span>🚑</span><span className="font-semibold">Emergency</span><span className="opacity-90">{contacts.emergency}</span></a>)}
              {contacts.appointment && (<a href={`tel:${contacts.appointment}`} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"><span>📅</span><span className="font-semibold">Book</span><span className="opacity-90">{contacts.appointment}</span></a>)}
              {general.googleMapsLink && (<a href={general.googleMapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg"><span>📍</span><span className="font-semibold">Directions</span></a>)}
            </div>
          </div>
        </div>
      )}

      {/* SEO */}
      {(() => {
        const sameAs = [social.facebook, social.instagram, social.linkedin, social.twitter, social.youtube].filter(Boolean);
        const orgJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Hospital',
          name,
          slogan: tagline,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          address: address ? { '@type': 'PostalAddress', streetAddress: address } : undefined,
          telephone: contacts.reception || contacts.appointment || undefined,
          sameAs,
        };
        return (<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />);
      })()}
    </div>
  );
}
