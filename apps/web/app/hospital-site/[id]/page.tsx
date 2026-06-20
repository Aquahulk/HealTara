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

      {/* ── NAVIGATION BAR ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-8 w-auto rounded-lg" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">🏥</div>
            )}
            <span className="text-sm font-bold text-gray-900 hidden sm:inline">{name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
            <a href="#doctors" className="hover:text-blue-600 transition-colors hidden sm:inline">Doctors</a>
            <a href="#departments" className="hover:text-blue-600 transition-colors hidden sm:inline">Departments</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors hidden sm:inline">Contact</a>
            {doctorsToShow.length > 0 && (
              <a href="#doctors" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">Book Now</a>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <header className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.15),transparent_50%)]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs mb-5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-200">Now accepting appointments online</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight mb-4">
                {name}
              </h1>
              <p className="text-lg md:text-xl text-blue-200 mb-6 max-w-xl">{tagline}</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-8">
                {doctorsToShow.length > 0 && (
                  <a href="#doctors" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 text-sm">
                    📅 Book Appointment
                  </a>
                )}
                {contacts.emergency && (
                  <a href={`tel:${contacts.emergency}`} className="inline-flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-100 font-semibold py-3 px-6 rounded-xl transition-all text-sm">
                    🚑 Emergency: {contacts.emergency}
                  </a>
                )}
              </div>
              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
                {[
                  { value: doctorsToShow.length, label: 'Doctors' },
                  { value: departments.length, label: 'Departments' },
                  { value: '24/7', label: 'Emergency' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl md:text-3xl font-black">{s.value}</div>
                    <div className="text-xs text-blue-300">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 hidden lg:block">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="w-48 h-48 object-contain bg-white/10 backdrop-blur rounded-3xl p-6 border border-white/10 shadow-2xl" />
              ) : (
                <div className="w-48 h-48 rounded-3xl bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center shadow-2xl">
                  <span className="text-7xl">🏥</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white" style={{clipPath:'polygon(0 100%,100% 100%,100% 0,0 60%)'}} />
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-6xl mx-auto px-4 space-y-12 md:space-y-16 pb-20">

        {/* ── TRUST INDICATORS ── */}
        <section className="-mt-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '🏆', title: 'Trusted Care', desc: 'Award-winning healthcare', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-100' },
              { icon: '👨‍⚕️', title: 'Expert Team', desc: `${doctorsToShow.length} specialists`, bg: 'from-emerald-50 to-green-50', border: 'border-emerald-100' },
              { icon: '⚡', title: 'Quick Access', desc: 'Same-day appointments', bg: 'from-amber-50 to-yellow-50', border: 'border-amber-100' },
              { icon: '🔬', title: 'Advanced Tech', desc: 'Modern diagnostics', bg: 'from-violet-50 to-purple-50', border: 'border-violet-100' },
            ].map(item => (
              <div key={item.title} className={`bg-gradient-to-br ${item.bg} rounded-2xl p-4 md:p-5 border ${item.border} shadow-sm hover:shadow-md transition-all`}>
                <div className="text-2xl mb-2">{item.icon}</div>
                <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DEPARTMENTS ── */}
        {departments.length > 0 && (
          <section id="departments">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900">Our Departments</h2>
              <p className="text-sm text-gray-500 mt-1">Specialized care across multiple disciplines</p>
            </div>
            <HospitalDepartments departments={departments} doctors={doctorsToShow as any} hospitalName={name} />
          </section>
        )}

        {/* ── DOCTORS ── */}
        {doctorsToShow.length > 0 && (
          <section id="doctors">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900">Our Doctors</h2>
              <p className="text-sm text-gray-500 mt-1">Book directly with our medical team</p>
            </div>
            <HospitalDoctorsByDepartment doctors={doctorsToShow as any} hospitalName={name} />
          </section>
        )}

        {/* ── ABOUT ── */}
        {(about.mission || about.vision || about.history) && (
          <section className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-6 md:p-10 border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-6">About {name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {about.mission && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="text-2xl mb-2">🎯</div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Our Mission</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{about.mission}</p>
                </div>
              )}
              {about.vision && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="text-2xl mb-2">🔭</div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Our Vision</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{about.vision}</p>
                </div>
              )}
              {about.history && (
                <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="text-2xl mb-2">📖</div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Our Story</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{about.history}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── FEATURED SERVICES ── */}
        {featuredServices.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-5">Services We Offer</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {featuredServices.slice(0, 12).map((service, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
                  <span className="text-emerald-500 text-sm">✓</span>
                  <span className="text-sm text-gray-700">{service}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── EMERGENCY BOOKING ── */}
        {doctorsToShow.length > 0 && (
          <section className="bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl p-6 md:p-8 border border-red-100">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-xl shadow-lg shadow-red-500/20">🚨</div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Emergency Booking</h2>
                <p className="text-sm text-gray-600">Need urgent care? Submit a request and we'll prioritize your case.</p>
              </div>
            </div>
            <EmergencyBookingForm doctors={doctorsToShow.map((link) => ({ id: link.doctor.id, email: link.doctor.email }))} />
          </section>
        )}

        {/* ── PATIENT REVIEWS ── */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-5">Patient Reviews</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <CommentsSection entityType="hospital" entityId={String(details.id)} />
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section id="contact" className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-6 md:p-10 text-white">
          <h2 className="text-2xl font-black mb-6">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {address && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
                <div className="text-xl mb-2">📍</div>
                <h3 className="text-sm font-bold mb-1">Address</h3>
                <p className="text-sm text-blue-200">{address}</p>
              </div>
            )}
            {(contacts.reception || contacts.appointment) && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
                <div className="text-xl mb-2">📞</div>
                <h3 className="text-sm font-bold mb-1">Phone</h3>
                {contacts.reception && <p className="text-sm text-blue-200">Reception: {contacts.reception}</p>}
                {contacts.appointment && <p className="text-sm text-blue-200">Appointments: {contacts.appointment}</p>}
                {contacts.emergency && <p className="text-sm text-red-300 font-bold">Emergency: {contacts.emergency}</p>}
              </div>
            )}
            {(general.emails?.info || general.emails?.appointments) && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
                <div className="text-xl mb-2">✉️</div>
                <h3 className="text-sm font-bold mb-1">Email</h3>
                {general.emails?.info && <p className="text-sm text-blue-200">{general.emails.info}</p>}
                {general.emails?.appointments && <p className="text-sm text-blue-200">{general.emails.appointments}</p>}
              </div>
            )}
          </div>
          {/* Social links */}
          {(social.facebook || social.instagram || social.linkedin || social.twitter || social.youtube) && (
            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/10">
              <span className="text-sm text-blue-300">Follow us:</span>
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">📘</a>}
              {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">📷</a>}
              {social.linkedin && <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">💼</a>}
              {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">🐦</a>}
              {social.youtube && <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">📺</a>}
            </div>
          )}
        </section>

        {/* ── BOOK CTA ── */}
        {doctorsToShow.length > 0 && (
          <section className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white">
            <h2 className="text-2xl md:text-3xl font-black mb-3">Ready to Visit?</h2>
            <p className="text-blue-100 text-sm mb-6 max-w-md mx-auto">Book your appointment online and skip the wait. Our team is ready to care for you.</p>
            <a href="#doctors" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm">
              📅 Book Appointment Now
            </a>
          </section>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-8 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {logoUrl ? <img src={logoUrl} alt={name} className="h-6 w-auto rounded opacity-70" /> : <span className="text-lg">🏥</span>}
            <span className="text-sm font-medium text-gray-300">{name}</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} {name}. Powered by <a href="https://healtara.com" className="text-blue-400 hover:underline">Healtara</a></p>
        </div>
      </footer>

      {/* ── STICKY MOBILE CTA ── */}
      {doctorsToShow.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg z-50">
          <a href="#doctors" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-center text-sm shadow-md">
            📅 Book Appointment
          </a>
        </div>
      )}
      <div className="md:hidden h-16" aria-hidden="true" />

      <MobileBottomNavigation />
    </div>
  );
}
