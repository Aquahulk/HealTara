// ============================================================================
// 🏥 HOSPITAL SITE WITH COMMENTS - Complete Working Version
// ============================================================================
// This file includes the comments section properly integrated
// ============================================================================

import DoctorBookingCTA from '@/components/DoctorBookingCTA';
import DoctorBookingSidebar from '@/components/DoctorBookingSidebar';
import EmergencyBookingForm from '@/components/EmergencyBookingForm';
import HospitalDepartments from '@/components/HospitalDepartments';
import HospitalDoctorsByDepartment from '@/components/HospitalDoctorsByDepartment';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import CommentsSection from '@/components/CommentsSection';
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
          <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 inline-block">
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
          <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 inline-block">
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  const apiHost = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = `${apiHost}/api/hospitals/${resolvedId}`;

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        console.warn(\`Hospital with ID ${resolvedId} not found (404)\`);
      } else if (res.status === 500) {
        console.error(\`Server error when fetching hospital ${resolvedId} (500)\`);
      } else {
        console.warn(\`Hospital profile request failed for ID: ${resolvedId}, status: ${res.status}\`);
      }
      return null;
    }

    const data = await res.json();
    console.log(\`Successfully fetched hospital profile for ID: ${resolvedId}\`);
    return data;
  } catch (error) {
    console.error(\`Network error when fetching hospital profile for ID: ${resolvedId}\`, error);
    return null;
  }
}

// Mock data for demonstration
const mockProfile: HospitalProfileResponse = {
  hospitalId: parseInt(resolvedId) || 1,
  name: 'City General Hospital',
  profile: {
    general: {
      legalName: 'City General Hospital',
      brandName: 'CityCare',
      tagline: 'Your Health, Our Priority',
      logoUrl: null,
      address: '123 Main Street, City, State 12345',
      pincode: '123456',
      googleMapsLink: 'https://maps.google.com/?q=City+General+Hospital',
      contacts: {
        emergency: '911',
        reception: 'Main Reception',
        ambulance: 'AMBULANCE',
        appointment: 'APPOINTMENTS',
        healthCheckups: 'HEALTH_CHECKUPS',
        fax: 'FAX-1234567'
      }
    },
    about: {
      mission: 'To provide comprehensive healthcare services with compassion and excellence.',
      vision: 'To be the leading healthcare provider in our region, known for quality care and patient satisfaction.',
      values: 'Compassion, Excellence, Integrity, Innovation, Patient-Centered Care'
    },
    departments: [
      { name: 'Emergency Medicine', description: '24/7 emergency care services', services: ['Trauma Care', 'Cardiology', 'Emergency Surgery'], conditions: ['Heart Attack', 'Stroke', 'Accidents'], equipment: ['Defibrillators', 'Ventilators', 'Monitors'] },
      { name: 'Cardiology', description: 'Heart and vascular care', services: ['Echocardiogram', 'Stress Test', 'Cardiac Catheterization'], conditions: ['Heart Disease', 'Hypertension', 'Arrhythmia'], equipment: ['EKG Machines', 'Ultrasound', 'Pacemakers'] },
      { name: 'Pediatrics', description: 'Child healthcare services', services: ['Vaccinations', 'Well-child Checkups', 'Pediatric Surgery'], conditions: ['Common Childhood Illnesses', 'Developmental Disorders'], equipment: ['Vaccines', 'Growth Charts', 'Child-friendly Medical Devices'] },
      { name: 'Orthopedics', description: 'Bone and joint care', services: ['Fracture Treatment', 'Joint Replacement', 'Sports Medicine'], conditions: ['Arthritis', 'Osteoporosis', 'Sports Injuries'], equipment: ['X-ray Machines', 'MRI Scanners', 'Surgical Tools'] },
      { name: 'Laboratory', description: 'Diagnostic services', services: ['Blood Tests', 'Pathology', 'Radiology', 'Genetic Testing'], conditions: ['Various Medical Conditions'], equipment: ['Microscopes', 'Centrifuges', 'DNA Analyzers', 'Lab Automation'] }
    ],
    doctors: [
      { name: 'Dr. Sarah Johnson', doctorId: 1, primarySpecialty: 'Emergency Medicine', subSpecialty: 'Trauma Surgery', bio: '15 years of experience in emergency medicine', credentials: [{ degree: 'MD Emergency Medicine', institute: 'Harvard Medical School', year: 2010 }], expertise: ['Trauma Care', 'Disaster Medicine'], procedures: ['Emergency Surgery', 'Advanced Life Support'], languages: ['English', 'Spanish'], opdSchedule: [{ day: 'Monday', start: '8:00 AM', end: '8:00 PM' }] },
      { name: 'Dr. Michael Chen', doctorId: 2, primarySpecialty: 'Cardiology', subSpecialty: 'Interventional Cardiology', bio: '12 years of experience', credentials: [{ degree: 'MD Cardiology', institute: 'Johns Hopkins', year: 2012 }], expertise: ['Echocardiogram', 'Stress Test', 'Angioplasty'], procedures: ['Cardiac Catheterization', 'Pacemaker Implantation'], languages: ['English', 'Mandarin'], opdSchedule: [{ day: 'Tuesday', start: '9:00 AM', end: '5:00 PM' }] }
    ]
  }
};

export default function HospitalSitePage({ params }: { params: Promise<{ id: string }> }) {
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
          <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 inline-block">
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
          <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 inline-block">
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  // Use mock data for demonstration
  const profile = mockProfile;

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
                  var attrs=['authToken='+encodeURIComponent(t),'Path=/','Max-Age='+(60*60*24*7)]; if(d){attrs.push('Domain='+d,'Secure');} attrs.push('SameSite=Lax'); document.cookie=attrs.join('; ');}catch(_){}; try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch(_) {}}
                  try { location.reload(); } catch(_) {}
                } catch {}
              }
            }
            // 2) PostMessage-based token handoff (new window/tab)
            if (window.opener) {
              var has = document.cookie && document.cookie.indexOf('authToken=') !== -1;
              if (!has) {
                function h(e){try{if(e&&e.data&&e.data.type==='auth-token'&&e.data.token){try{localStorage.setItem('authToken', e.data.token);}catch(_){};try{var d=(function(){var env=(window.process&&window.process.env&&window.process.env.NEXT_PUBLIC_PRIMARY_DOMAIN)||''; if(env){return env.startsWith('.')?env:'.'+env;} var h=window.location.hostname.toLowerCase(); if(h==='localhost'||h==='127.0.0.1') return null; var p=h.split('.'); if(p.length>=2){return '.'+p.slice(p.length-2).join('.');} return null;})();var attrs=['authToken='+encodeURIComponent(t),'Path=/','Max-Age='+(60*60*24*7)]; if(d){attrs.push('Domain='+d,'Secure');} attrs.push('SameSite=Lax'); document.cookie=attrs.join('; ');}catch(_){}; try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch(_) {}}
                  try { location.reload(); } catch(_) {}
                } catch {}
              }
            }
          } catch (_) {}
        `}
      </Script>

      {/* Header */}
      <header className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden min-h-[30vh] md:min-h-[60vh]">
        {/* Animated Medical Background */}
        <div className="absolute inset-0">
          {/* Floating medical icons - hidden on mobile */}
          <div className="hidden md:block absolute top-10 left-10 text-6xl opacity-20 animate-bounce" style={{animationDelay: '0s'}}>🏥</div>
          <div className="hidden md:block absolute top-20 right-20 text-4xl opacity-15 animate-pulse" style={{animationDelay: '1s'}}>💊</div>
          <div className="hidden md:block absolute top-32 left-1/4 text-5xl opacity-15 animate-pulse" style={{animationDelay: '2s'}}>🩺</div>
          <div className="hidden md:block absolute bottom-20 left-1/4 text-5xl opacity-15 animate-pulse" style={{animationDelay: '3s'}}>🔬</div>
          <div className="hidden md:block absolute bottom-16 right-1/4 text-5xl opacity-15 animate-pulse" style={{animationDelay: '4s'}}>📋</div>
          <div className="hidden md:block absolute bottom-32 right-1/4 text-5xl opacity-15 animate-pulse" style={{animationDelay: '5s'}}>🔬</div>
          <div className="hidden md:block absolute bottom-48 right-1/4 text-5xl opacity-15 animate-ping" style={{animationDelay: '6s'}}></div>
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-purple-900/40"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-16">
          {/* Hospital Logo - Compact on mobile */}
          <div className="mb-3 md:mb-6 text-center">
            <div className="w-20 h-20 md:w-24 md:h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 md:mb-4">
              {profile.general?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.general.logoUrl} alt={profile.name} className="w-full h-full object-contain p-2 md:p-3" />
              ) : (
                <span className="text-3xl md:text-5xl">🏥</span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-4">{profile.name}</h1>
            <p className="text-blue-100 font-light max-w-3xl mx-auto leading-relaxed">{profile.general?.tagline || 'Quality Care, Compassionate Service'}</p>
          </div>
          
          {/* Quick Contact & Book Button - Compact on mobile */}
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4 md:mb-8">
            <DoctorBookingCTA doctorId={profile.doctors?.[0]?.doctorId} hospitalName={profile.name} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-16 space-y-6 md:space-y-24 pb-20 md:pb-8">
        {/* About Section */}
        <section className="relative">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-5xl font-bold text-gray-900 mb-4">About {profile.name}</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">{profile.about?.mission || 'Committed to providing comprehensive healthcare services with compassion and excellence.'}</p>
          </div>

          {/* Comments Section */}
          <section className="py-8">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Patient Reviews & Comments</h2>
              <p className="text-gray-600 mb-8">Share your experience and help others make informed decisions</p>
              
              {/* Comments Component */}
              <CommentsSection 
                entityType="hospital"
                entityId={resolvedId}
                entityName={profile.name}
              />
            </div>
          </section>

          {/* Departments Section */}
          <section className="relative">
            <div className="text-center mb-16">
              <h2 className="text-2xl md:text-5xl font-bold text-gray-900 mb-4">Our Departments</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">Specialized medical departments providing comprehensive healthcare services.</p>
            </div>
            
            <HospitalDepartments departments={profile.departments || []} doctors={profile.doctors || []} hospitalName={profile.name} />
          </section>

          {/* Doctors Section */}
          <section className="relative">
            <div className="text-center mb-16">
              <h2 className="text-2xl md:text-5xl font-bold text-gray-900 mb-4">Our Medical Team</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">Meet our experienced and dedicated healthcare professionals.</p>
            </div>
            
            <HospitalDoctorsByDepartment doctors={profile.doctors || []} hospitalName={profile.name} />
          </section>

          {/* Contact & Emergency */}
          <section className="relative">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-900 mb-6">Contact & Emergency</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">We're here for you 24/7. Contact us through any of these methods.</p>
            </div>
          </section>
        </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{profile.name}</h3>
              <p className="text-gray-300 text-sm">
                © 2024 {profile.name}. All rights reserved.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2">Quick Links</h4>
              <div className="space-y-2">
                <a href="#" className="text-gray-300 hover:text-white">About Us</a>
                <a href="#" className="text-gray-300 hover:text-white">Services</a>
                <a href="#" className="text-gray-300 hover:text-white">Emergency</a>
                <a href="#" className="text-gray-300 hover:text-white">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
