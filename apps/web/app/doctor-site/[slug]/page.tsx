// ============================================================================
// 👨‍⚕️ DOCTOR MICROSITE - Simple professional landing for individual doctors
// ============================================================================

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

export default async function DoctorSitePage({ params }: { params: { slug: string } }) {
  const { slug } = params;
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
      <header className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="mb-4">
            {p.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.profileImage} alt={name} className="w-20 h-20 rounded-full mx-auto object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                <span className="text-3xl">👨‍⚕️</span>
              </div>
            )}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">{name}</h1>
          <p className="text-lg text-indigo-100">{sub}</p>
          {addr && <p className="text-sm text-indigo-100 mt-1">{addr}</p>}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {(p.about || p.services) && (
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">About</h2>
            {p.about && <p className="text-gray-700 leading-relaxed">{p.about}</p>}
            {Array.isArray(p.services) && p.services.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Services</h3>
                <div className="flex flex-wrap gap-2">
                  {p.services.slice(0, 12).map((s, i) => (
                    <span key={i} className="text-xs bg-gray-100 px-3 py-1 rounded-full border border-gray-200">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Consultation</h2>
          <div className="flex items-center gap-4 text-gray-700">
            {typeof fee === 'number' && <div>Fee: ₹{fee}</div>}
            {p.phone && <div>Phone: {p.phone}</div>}
            {p.workingHours && <div>Hours: {p.workingHours}</div>}
          </div>
          <div className="mt-6">
            {/* Inline CTA without importing client components in server file */}
            <a href={`/book?doctorId=${data.id}`} className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg">Book Appointment</a>
          </div>
        </section>
      </main>
    </div>
  );
}
