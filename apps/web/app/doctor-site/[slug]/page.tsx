// ============================================================================
// 👨‍⚕️ DOCTOR MICROSITE - Simple professional landing for individual doctors
// ============================================================================

import React from 'react';
import Script from 'next/script';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';

interface DoctorProfileResponse {
  id: number;
  email: string;
  doctorProfile: {
    slug?: string;
    specialization?: string;
    clinicName?: string;
    clinicAddress?: string;
    city?: string;
    state?: string;
    phone?: string;
    consultationFee?: number;
    workingHours?: string | null;
    profileImage?: string | null;
    about?: string | null;
    services?: string[] | null;
  };
}

async function getDoctorBySlug(slug: string): Promise<DoctorProfileResponse | null> {
  try {
    const apiHost = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const res = await fetch(`${apiHost}/api/doctors/slug/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (_) {
    return null;
  }
}

export default async function DoctorSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getDoctorBySlug(slug);
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Doctor Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find a doctor website for "{slug}".</p>
          <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Go Home</a>
        </div>
      </div>
    );
  }

  const emailHandle = (data.email || '').split('@')[0] || 'Doctor';
  const p = data.doctorProfile || {};
  const name = p.clinicName || `Dr. ${emailHandle}`;
  const sub = p.specialization || 'General Physician';
  const addr = p.clinicAddress || [p.city, p.state].filter(Boolean).join(', ');
  const fee = p.consultationFee;

  return (
    <div className="min-h-screen bg-white">
      <Script id="auth-bridge-doctor" strategy="afterInteractive">
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
      
      {/* Mobile-optimized header with reduced height and single-column layout */}
      <header className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white py-8 md:py-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          {/* Single-column layout on mobile, centered content */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div>
              {p.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={p.profileImage} 
                  alt={name} 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-lg" 
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-3xl md:text-4xl">👨‍⚕️</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{name}</h1>
              <p className="text-base md:text-lg text-indigo-100">{sub}</p>
              {addr && <p className="text-sm text-indigo-100">{addr}</p>}
            </div>

            {/* Prominent booking button near top on mobile - minimum 44px touch target, compact text */}
            <a 
              href={`/book?doctorId=${data.id}`} 
              className="inline-block bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-2 px-4 md:py-3 md:px-8 rounded-lg shadow-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation text-sm md:text-base"
            >
              Book Now
            </a>
          </div>
        </div>
      </header>

      {/* Single-column layout on mobile with responsive padding */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-12 space-y-6 md:space-y-10">
        {/* Consultation info section - prominent on mobile */}
        <section className="bg-gray-50 rounded-lg p-4 md:p-6 border border-gray-200">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Consultation Details</h2>
          
          {/* Single-column stack on mobile, responsive grid on larger screens */}
          <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:flex-wrap md:gap-4 text-gray-700">
            {typeof fee === 'number' && (
              <div className="flex items-center gap-2 min-h-[44px]">
                <span className="font-semibold">Fee:</span>
                <span className="text-lg">₹{fee}</span>
              </div>
            )}
            
            {p.phone && (
              <div className="flex items-center gap-2 min-h-[44px]">
                <span className="font-semibold">Phone:</span>
                {/* Tappable phone link with minimum touch target */}
                <a 
                  href={`tel:${p.phone}`} 
                  className="text-indigo-600 hover:text-indigo-800 underline min-h-[44px] flex items-center touch-manipulation"
                >
                  {p.phone}
                </a>
              </div>
            )}
            
            {p.workingHours && (
              <div className="flex items-center gap-2 min-h-[44px]">
                <span className="font-semibold">Hours:</span>
                <span>{p.workingHours}</span>
              </div>
            )}
          </div>
        </section>

        {/* About section with progressive disclosure for lengthy content */}
        {(p.about || p.services) && (
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">About</h2>
            
            {p.about && (
              <DoctorAboutSection about={p.about} />
            )}
            
            {Array.isArray(p.services) && p.services.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-2">Services</h3>
                <div className="flex flex-wrap gap-2">
                  {p.services.slice(0, 12).map((s, i) => (
                    <span 
                      key={i} 
                      className="text-xs md:text-sm bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Sticky booking button at bottom on mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-10">
          <a 
            href={`/book?doctorId=${data.id}`} 
            className="block w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors min-h-[44px] flex items-center justify-center touch-manipulation text-sm"
          >
            Book Now
          </a>
        </div>
        
        {/* Add bottom padding on mobile to prevent content from being hidden by sticky button */}
        <div className="md:hidden h-20" aria-hidden="true"></div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation currentPath="/doctors" />
    </div>
  );
}

/**
 * Client component for progressive disclosure of lengthy about text
 */
function DoctorAboutSection({ about }: { about: string }) {
  'use client';
  
  const [isExpanded, setIsExpanded] = React.useState(false);
  const shouldTruncate = about.length > 300;
  const displayText = shouldTruncate && !isExpanded ? about.slice(0, 300) + '...' : about;
  
  return (
    <div>
      <p className="text-gray-700 leading-relaxed text-base">{displayText}</p>
      
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm min-h-[44px] min-w-[44px] px-4 py-2 touch-manipulation"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
}
