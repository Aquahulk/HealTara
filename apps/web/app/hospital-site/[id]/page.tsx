// ============================================================================
// 🏥 HOSPITAL WEBSITE TEMPLATE - Modern Professional Hospital Website
// ============================================================================
// This is the template for all hospital microsites
// Mirrors the doctor site structure with hospital-specific sections
// Content is sourced from the hospital profile API
// ============================================================================

import DoctorBookingCTA from '@/components/DoctorBookingCTA';

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
  };
  emails?: {
    info?: string;
    appointments?: string;
    feedback?: string;
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
}

interface HospitalProfileResponse {
  hospitalId: number;
  name: string;
  profile: HospitalProfile | null;
}

async function getHospitalProfileById(id: string): Promise<HospitalProfileResponse | null> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const res = await fetch(`${API_BASE_URL}/api/hospitals/${id}/profile`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Failed to fetch hospital profile by id:', error);
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
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const res = await fetch(`${API_BASE_URL}/api/hospitals/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Failed to fetch hospital details by id:', error);
    return null;
  }
}

// Helper to derive an ID from a slug-like param using hospital list
async function resolveHospitalId(idOrSlug: string): Promise<string | null> {
  // If numeric, return as-is
  if (/^\d+$/.test(idOrSlug)) return idOrSlug;
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const res = await fetch(`${API_BASE_URL}/api/hospitals`, { cache: 'no-store' });
    if (!res.ok) return null;
    const hospitals: Array<{ id: number; name: string } & Record<string, any>> = await res.json();
    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const match = hospitals.find(h => slugify(h.name) === idOrSlug.toLowerCase());
    return match ? String(match.id) : null;
  } catch (e) {
    console.error('Failed to resolve hospital by slug:', e);
    return null;
  }
}

export default async function HospitalSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolvedId = await resolveHospitalId(id) || id;
  const [profileResponse, details] = await Promise.all([
    getHospitalProfileById(resolvedId),
    getHospitalDetailsById(resolvedId),
  ]);

  if (!profileResponse || !details) {
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

  const profile = profileResponse.profile || undefined;
  const general = profile?.general || {};
  const name = general.brandName || general.legalName || details.name || profileResponse.name || 'Hospital';
  const tagline = general.tagline || 'Quality Care, Compassionate Service';
  const address = general.address || '';
  const logoUrl = general.logoUrl;
  const contacts = general.contacts || {};
  const departments = (profile?.departments && profile?.departments.length > 0) ? profile.departments : (details.departments || []);
  const about = profile?.about || {};
  const doctorLinks = details.doctors || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header className="relative bg-gradient-to-r from-indigo-600 to-blue-700 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center mb-6 overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={name} className="h-16 object-contain" />
              ) : (
                <span className="text-5xl">🏥</span>
              )}
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">{name}</h1>
            <p className="text-2xl md:text-3xl text-indigo-100 mb-6">{tagline}</p>
            {address && (
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-2xl">📍</span>
                <span className="text-lg">{address}</span>
              </div>
            )}

            {/* Highlight Stats */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/20 backdrop-blur rounded-xl p-6">
                <div className="text-3xl">👩‍⚕️</div>
                <div className="text-indigo-100 mt-2">Doctors</div>
                <div className="text-2xl font-bold">{doctorLinks.length}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl p-6">
                <div className="text-3xl">🏬</div>
                <div className="text-indigo-100 mt-2">Departments</div>
                <div className="text-2xl font-bold">{departments.length}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl p-6">
                <div className="text-3xl">⭐</div>
                <div className="text-indigo-100 mt-2">Care Quality</div>
                <div className="text-2xl font-bold">Premium</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Contacts */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contacts.reception && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-2xl">☎️</div>
                <div className="mt-2 text-sm text-gray-600">Reception</div>
                <div className="text-lg font-semibold text-gray-900">{contacts.reception}</div>
              </div>
            )}
            {contacts.appointment && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-2xl">📅</div>
                <div className="mt-2 text-sm text-gray-600">Appointments</div>
                <div className="text-lg font-semibold text-gray-900">{contacts.appointment}</div>
              </div>
            )}
            {contacts.emergency && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-2xl">🚑</div>
                <div className="mt-2 text-sm text-gray-600">Emergency</div>
                <div className="text-lg font-semibold text-gray-900">{contacts.emergency}</div>
              </div>
            )}
            {contacts.ambulance && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-2xl">🚐</div>
                <div className="mt-2 text-sm text-gray-600">Ambulance</div>
                <div className="text-lg font-semibold text-gray-900">{contacts.ambulance}</div>
              </div>
            )}
          </div>
        </section>

        {/* Doctors */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Doctors</h2>
          {doctorLinks.length === 0 ? (
            <p className="text-gray-600">No doctors linked yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctorLinks.map((link, idx) => {
                const dp = link.doctor.doctorProfile || {};
                const nameOrClinic = dp.clinicName || link.doctor.email;
                const specialization = dp.specialization || 'Doctor';
                return (
                  <div key={idx} className="bg-gray-50 rounded-lg p-6 flex flex-col justify-between">
                    <div>
                      <div className="text-xl font-semibold text-gray-900">{nameOrClinic}</div>
                      <div className="text-sm text-gray-600 mt-1">{specialization}</div>
                      {dp.slug && (
                        <a href={`/site/${dp.slug}`} className="text-blue-600 hover:underline mt-2 inline-block">View profile</a>
                      )}
                    </div>
                    <div className="mt-4">
                      <DoctorBookingCTA doctorId={link.doctor.id} clinicName={nameOrClinic} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Doctors */}
        {doctorLinks.length > 0 && (
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Doctors</h2>
              <p className="text-lg text-gray-600">Experienced specialists providing compassionate care</p>
            </div>
            {/* Client-side roster with booking actions */}
            {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
            {(() => {
              const HospitalDoctorsRoster = require("@/components/HospitalDoctorsRoster").default;
              return <HospitalDoctorsRoster doctors={doctorLinks} />;
            })()}
          </section>
        )}

        {/* Departments */}
        {departments.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Departments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                  <h3 className="text-xl font-semibold text-gray-900">{dept.name}</h3>
                  {dept.description && (
                    <p className="text-gray-600 mt-2">{dept.description}</p>
                  )}
                  {dept.services && dept.services.length > 0 && (
                    <ul className="mt-3 list-disc list-inside text-gray-700 text-sm">
                      {dept.services.slice(0,5).map((svc, i) => (
                        <li key={i}>{svc}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* About */}
        {(about.mission || about.vision || about.values || about.history) && (
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">About Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {about.mission && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Mission</h3>
                  <p className="text-gray-700">{about.mission}</p>
                </div>
              )}
              {about.vision && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Vision</h3>
                  <p className="text-gray-700">{about.vision}</p>
                </div>
              )}
              {about.values && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Values</h3>
                  <p className="text-gray-700 whitespace-pre-line">{about.values}</p>
                </div>
              )}
              {about.history && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Story</h3>
                  <p className="text-gray-700 whitespace-pre-line">{about.history}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Map */}
        {general.googleMapsLink && (
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Find Us</h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <a href={general.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                View on Google Maps
              </a>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center">
          <a
            href="/doctors"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow"
          >
            Find a Doctor
          </a>
        </section>
      </main>
    </div>
  );
}