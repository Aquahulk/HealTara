import React from "react";
import Script from "next/script";
import DoctorBookingCTA from "@/components/DoctorBookingCTA";
import MobileBottomNavigation from "@/components/MobileBottomNavigation";

interface DoctorProfileResponse {
  id: number;
  email: string;
  status: string;
  doctorProfile?: {
    specialization?: string; qualifications?: string; experience?: number;
    clinicName?: string; clinicAddress?: string; city?: string; state?: string;
    phone?: string; consultationFee?: number; slug?: string; profileImage?: string;
    about?: string; services?: string[]; workingHours?: string;
  };
  rating?: number; totalReviews?: number;
  _count?: { appointments?: number };
}

async function getDoctorBySlug(slug: string): Promise<DoctorProfileResponse | null> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${base}/api/doctors/slug/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
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
  const name = p.clinicName || `Dr. ${emailHandle.charAt(0).toUpperCase() + emailHandle.slice(1).replace(/[._-]/g, ' ')}`;
  const specialization = p.specialization || 'General Physician';
  const addr = [p.clinicAddress, p.city, p.state].filter(Boolean).join(', ');
  const fee = p.consultationFee;
  const rating = data.rating || 0;
  const reviews = data.totalReviews || 0;
  const apptCount = data._count?.appointments || 0;

  return (
    <div className="min-h-screen bg-white">
      <Script id="auth-bridge-doctor" strategy="afterInteractive">{`
        try{if(typeof window!=='undefined'){var hash=window.location.hash||'';var m=/authToken=([^&]+)/.exec(hash);if(m&&m[1]){var t=decodeURIComponent(m[1]);try{localStorage.setItem('authToken',t)}catch(_){}try{history.replaceState(null,'',window.location.pathname+window.location.search)}catch(_){}try{location.reload()}catch(_){}}if(window.opener){function h(e){try{if(e&&e.data&&e.data.type==='auth-token'&&e.data.token){try{localStorage.setItem('authToken',e.data.token)}catch(_){};window.removeEventListener('message',h);location.reload()}}catch(_){}}window.addEventListener('message',h);window.opener.postMessage({type:'request-auth-token'},'*')}}}catch(_){}
      `}</Script>

      {/* ── HERO SECTION ── */}
      <header className="relative bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 text-white overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="relative max-w-5xl mx-auto px-4 py-10 md:py-16">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* Profile image */}
            <div className="flex-shrink-0">
              {p.profileImage ? (
                <img src={p.profileImage} alt={name} className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover shadow-2xl border-4 border-white/20" />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-white/10 flex items-center justify-center border-4 border-white/20">
                  <span className="text-5xl md:text-6xl">👨‍⚕️</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight">{name}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">{specialization}</span>
                {p.qualifications && <span className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full">{p.qualifications}</span>}
              </div>
              {addr && <p className="text-blue-200 text-sm mt-3">📍 {addr}</p>}

              {/* Quick stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                {p.experience && (
                  <div className="text-center">
                    <div className="text-xl font-black">{p.experience}+</div>
                    <div className="text-[10px] text-blue-200">Yrs Exp</div>
                  </div>
                )}
                {apptCount > 0 && (
                  <div className="text-center">
                    <div className="text-xl font-black">{apptCount}</div>
                    <div className="text-[10px] text-blue-200">Patients</div>
                  </div>
                )}
                {rating > 0 && (
                  <div className="text-center">
                    <div className="text-xl font-black">{rating.toFixed(1)}<span className="text-yellow-300 text-sm">★</span></div>
                    <div className="text-[10px] text-blue-200">{reviews} reviews</div>
                  </div>
                )}
                {typeof fee === 'number' && (
                  <div className="text-center">
                    <div className="text-xl font-black">₹{fee}</div>
                    <div className="text-[10px] text-blue-200">Consult</div>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="mt-5">
                <DoctorBookingCTA
                  doctorId={data.id}
                  clinicName={name}
                  label="📅 Book Appointment"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm md:text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8 md:space-y-12">

        {/* ── CONSULTATION DETAILS CARD ── */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 md:p-8 border border-blue-100">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Consultation Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {typeof fee === 'number' && (
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-2xl font-black text-emerald-600">₹{fee}</div>
                <div className="text-xs text-gray-500 mt-1">Consultation Fee</div>
              </div>
            )}
            {p.experience && (
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-2xl font-black text-blue-600">{p.experience}</div>
                <div className="text-xs text-gray-500 mt-1">Years Experience</div>
              </div>
            )}
            {p.phone && (
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <a href={`tel:${p.phone}`} className="text-lg font-bold text-indigo-600 hover:underline">📞 Call</a>
                <div className="text-xs text-gray-500 mt-1">{p.phone}</div>
              </div>
            )}
            {p.workingHours && (
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-lg font-bold text-violet-600">🕐</div>
                <div className="text-xs text-gray-500 mt-1">{p.workingHours}</div>
              </div>
            )}
          </div>
        </section>

        {/* ── ABOUT SECTION ── */}
        {p.about && (
          <section>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">About the Doctor</h2>
            <div className="text-gray-700 leading-relaxed text-sm md:text-base whitespace-pre-wrap">{p.about}</div>
          </section>
        )}

        {/* ── SERVICES ── */}
        {Array.isArray(p.services) && p.services.length > 0 && (
          <section>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Services Offered</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {p.services.map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <span className="text-emerald-500">✓</span>
                  <span className="text-sm text-gray-700">{s}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── LOCATION ── */}
        {addr && (
          <section>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">Location</h2>
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="font-semibold text-gray-900">{p.clinicName || name}</p>
                  <p className="text-sm text-gray-600 mt-1">{addr}</p>
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2">📞 {p.phone}</a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── BOOKING CTA SECTION ── */}
        <section className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 md:p-10 text-center text-white">
          <h2 className="text-xl md:text-2xl font-black mb-2">Ready to Book?</h2>
          <p className="text-emerald-100 text-sm mb-5">Schedule your appointment online in just a few taps.</p>
          <DoctorBookingCTA
            doctorId={data.id}
            clinicName={name}
            label="Book Appointment Now"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm md:text-base"
          />
        </section>

        {/* ── WHY CHOOSE US ── */}
        <section>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🏥', title: 'Modern Clinic', desc: 'State-of-the-art facilities' },
              { icon: '⏱️', title: 'On-Time', desc: 'Minimal wait times' },
              { icon: '💊', title: 'Expert Care', desc: 'Evidence-based treatment' },
              { icon: '🤝', title: 'Patient First', desc: 'Compassionate approach' },
            ].map(item => (
              <div key={item.title} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-bold text-gray-900">{item.title}</div>
                <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm">© {new Date().getFullYear()} {name}. All rights reserved.</p>
          <p className="text-xs mt-2">Powered by <a href="https://healtara.com" className="text-blue-400 hover:underline">Healtara</a></p>
        </div>
      </footer>

      {/* ── STICKY MOBILE CTA ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg z-50">
        <DoctorBookingCTA
          doctorId={data.id}
          clinicName={name}
          label="📅 Book Appointment"
          className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-center text-sm shadow-md"
        />
      </div>
      <div className="md:hidden h-16" aria-hidden="true" />

      <MobileBottomNavigation currentPath="/doctors" />
    </div>
  );
}
