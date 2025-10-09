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
  doctors?: Array<{ name: string; doctorId?: number; primarySpecialty?: string; subSpecialty?: string; departments?: string[] }>;
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
  const social = general.social || {};
  const departments = (profile?.departments && profile?.departments.length > 0) ? profile.departments : (details.departments || []);
  const about = profile?.about || {};
  // Use doctors explicitly linked to this hospital; do not fall back to global list
  const doctorsToShow = details.doctors || [];
  const profileDoctors = Array.isArray(profile?.doctors) ? profile!.doctors! : [];
  const featuredServices = Array.from(new Set((departments || []).flatMap(d => d.services || []))).slice(0, 12);

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
                <div className="text-2xl font-bold">{doctorsToShow.length}</div>
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

            {/* Social Links */}
            {(social.facebook || social.instagram || social.linkedin || social.twitter || social.youtube) && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                {social.facebook && (
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition text-sm">Facebook</a>
                )}
                {social.instagram && (
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition text-sm">Instagram</a>
                )}
                {social.linkedin && (
                  <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition text-sm">LinkedIn</a>
                )}
                {social.twitter && (
                  <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition text-sm">Twitter</a>
                )}
                {social.youtube && (
                  <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition text-sm">YouTube</a>
                )}
              </div>
            )}
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

        {/* Featured Services */}
        {featuredServices.length > 0 && (
          <section>
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Featured Services</h2>
              <p className="text-gray-600 mt-2">Top procedures and care offerings across departments</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {featuredServices.map((svc, i) => (
                <span key={i} className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm px-3 py-1 rounded-full border border-gray-200">
                  {svc}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Doctors */}
        {doctorsToShow.length > 0 && (
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Doctors</h2>
              <p className="text-lg text-gray-600">Experienced specialists providing compassionate care</p>
            </div>
            {/* Client-side roster with booking actions */}
            {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
            {(() => {
              const HospitalDoctorsRoster = require("@/components/HospitalDoctorsRoster").default;
              return <HospitalDoctorsRoster doctors={doctorsToShow} profileDoctors={profileDoctors} />;
            })()}
          </section>
        )}

        {doctorsToShow.length === 0 && (
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Doctors</h2>
              <p className="text-lg text-gray-600">No doctors linked to this hospital yet.</p>
              <p className="text-sm text-gray-500">Hospital admins can add doctors in their dashboard to display and enable bookings here.</p>
            </div>
          </section>
        )}

        {/* Doctors added via Hospital Profile (informational list) */}
        {profileDoctors.length > 0 && (
          <section>
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Doctors (from Hospital Profile)</h2>
              <p className="text-sm text-gray-600">These entries are informational. Link real doctor accounts to enable booking.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profileDoctors.map((d, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                  <div className="text-5xl mb-4">👨‍⚕️</div>
                  <h3 className="text-xl font-semibold text-gray-900">Dr. {d.name || 'Unnamed'}</h3>
                  {d.primarySpecialty && (<p className="text-gray-600 mt-1">{d.primarySpecialty}</p>)}
                  {d.subSpecialty && (<p className="text-gray-500 mt-1">{d.subSpecialty}</p>)}
                  {Array.isArray(d.departments) && d.departments.length > 0 && (
                    <div className="mt-3 text-sm text-gray-700">
                      <span className="font-semibold">Departments:</span> {d.departments.join(', ')}
                    </div>
                  )}
                  <div className="mt-4">
                    <button disabled className="bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg cursor-not-allowed">Booking not yet enabled</button>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Sticky Contact Bar */}
      {(contacts.emergency || contacts.appointment || general.googleMapsLink) && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
            <div className="bg-indigo-700 text-white rounded-xl shadow-lg flex flex-wrap items-center justify-center gap-4 p-3">
              {contacts.emergency && (
                <a href={`tel:${contacts.emergency}`} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg">
                  <span>🚑</span>
                  <span className="font-semibold">Emergency</span>
                  <span className="opacity-90">{contacts.emergency}</span>
                </a>
              )}
              {contacts.appointment && (
                <a href={`tel:${contacts.appointment}`} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg">
                  <span>📅</span>
                  <span className="font-semibold">Book</span>
                  <span className="opacity-90">{contacts.appointment}</span>
                </a>
              )}
              {general.googleMapsLink && (
                <a href={general.googleMapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg">
                  <span>📍</span>
                  <span className="font-semibold">Directions</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEO: Structured Data */}
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
        return (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        );
      })()}
    </div>
  );
}