// ============================================================================
// 🏥 DOCTOR WEBSITE TEMPLATE - Modern Professional Medical Website
// ============================================================================
// This is the template for all doctor microsites
// Features a modern, professional design with comprehensive sections
// Doctors can customize content through their dashboard
// 
// IMPORTANT: This template provides a professional online presence for doctors
// ============================================================================

// ============================================================================
// 🏗️ INTERFACE DEFINITIONS - TypeScript types for our data
// ============================================================================
import DoctorBookingCTA from "@/components/DoctorBookingCTA";
interface DoctorProfile {
  id: number;
  slug: string;
  specialization: string;
  qualifications: string;
  experience: number;
  clinicName: string;
  clinicAddress: string;
  city: string;
  state: string;
  phone: string;
  consultationFee: number;
  about: string;
  services: string[];
  workingHours: string;
  websiteTheme: string;
  profileImage: string;
}

interface Doctor {
  email: string;
  doctorProfile: DoctorProfile | null;
}

// ============================================================================
// 🌐 DATA FETCHING - Function to get doctor data from API
// ============================================================================
async function getDoctorBySlug(slug: string): Promise<Doctor | null> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const res = await fetch(`${API_BASE_URL}/api/doctors/slug/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Failed to fetch doctor by slug:', error);
    return null;
  }
}

// ============================================================================
// 🏥 DOCTOR WEBSITE COMPONENT - Main website component
// ============================================================================
export default async function DoctorSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doctor = await getDoctorBySlug(slug);

  // ============================================================================
  // 🚫 NOT FOUND STATE - Show error if doctor doesn't exist
  // ============================================================================
  if (!doctor || !doctor.doctorProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏥</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Doctor Not Found</h1>
          <p className="text-gray-600 mb-6">The requested doctor profile could not be found.</p>
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

  const { 
    clinicName, 
    specialization, 
    clinicAddress, 
    city, 
    state, 
    phone, 
    consultationFee,
    about,
    services,
    workingHours,
    experience,
    qualifications
  } = doctor.doctorProfile;

  // ============================================================================
  // 🎯 MAIN RENDER - Display the modern doctor website
  // ============================================================================
  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================================
          🎨 HERO SECTION - Main header with doctor information
          ============================================================================ */}
      <header className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="text-6xl mb-6">👨‍⚕️</div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">{clinicName}</h1>
            <p className="text-2xl md:text-3xl mb-6 text-blue-100">{specialization}</p>
            <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8">
              <div className="flex items-center">
                <span className="text-2xl mr-2">📍</span>
                <span className="text-lg">{city}, {state}</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">📞</span>
                <span className="text-lg">{phone}</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">💰</span>
                <span className="text-lg">₹{consultationFee} Consultation</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================================
          📋 MAIN CONTENT - Website sections
          ============================================================================ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* ============================================================================
            👨‍⚕️ ABOUT SECTION - Doctor information and credentials
            ============================================================================ */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">About Dr. {doctor.email.split('@')[0]}</h2>
              <div className="space-y-4 text-lg text-gray-700">
                {about ? (
                  <p>{about}</p>
                ) : (
                  <p>Experienced medical professional dedicated to providing exceptional healthcare services. With years of experience in {specialization}, I am committed to delivering personalized care and treatment plans for all patients.</p>
                )}
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">Credentials</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-2">🎓</span>
                      <span className="text-blue-800">{qualifications || 'Medical Degree'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-2">⏰</span>
                      <span className="text-blue-800">{experience || 5}+ Years of Experience</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-2">🏥</span>
                      <span className="text-blue-800">Specialized in {specialization}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-8 rounded-2xl">
              <div className="text-center">
                <div className="text-8xl mb-4">👨‍⚕️</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Professional Care</h3>
                <p className="text-gray-700 mb-6">Committed to providing the highest quality medical care with a patient-centered approach.</p>
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <p className="text-3xl font-bold text-blue-600">₹{consultationFee}</p>
                  <p className="text-gray-600">Consultation Fee</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            🏥 SERVICES SECTION - Medical services offered
            ============================================================================ */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600">Comprehensive medical care tailored to your needs</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services && services.length > 0 ? (
              services.map((service, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="text-4xl mb-4">🏥</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{service}</h3>
                  <p className="text-gray-600">Professional medical care and treatment for {service.toLowerCase()}.</p>
                </div>
              ))
            ) : (
              <>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="text-4xl mb-4">💊</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">General Consultation</h3>
                  <p className="text-gray-600">Comprehensive health check-ups and medical consultations.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="text-4xl mb-4">🔬</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Diagnostic Services</h3>
                  <p className="text-gray-600">Advanced diagnostic testing and medical examinations.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Treatment Plans</h3>
                  <p className="text-gray-600">Personalized treatment plans and follow-up care.</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ============================================================================
            📍 LOCATION & HOURS SECTION - Clinic information
            ============================================================================ */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Location & Hours</h2>
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">📍 Clinic Address</h3>
                  <p className="text-lg text-gray-700">{clinicAddress}</p>
                  <p className="text-lg text-gray-700">{city}, {state}</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">⏰ Working Hours</h3>
                  <p className="text-lg text-gray-700">{workingHours || 'Monday - Friday: 9:00 AM - 6:00 PM'}</p>
                  <p className="text-lg text-gray-700">Saturday: 9:00 AM - 2:00 PM</p>
                  <p className="text-lg text-gray-700">Sunday: Closed</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">📞 Contact Information</h3>
                  <p className="text-lg text-gray-700">Phone: {phone}</p>
                  <p className="text-lg text-gray-700">Email: {doctor.email}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-blue-100 p-8 rounded-2xl">
              <div className="text-center">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Book an Appointment</h3>
                <p className="text-gray-700 mb-6">Schedule your consultation today and take the first step towards better health.</p>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    <p className="text-2xl font-bold text-green-600">Easy Booking</p>
                    <p className="text-gray-600">Online appointment scheduling available</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    <p className="text-2xl font-bold text-blue-600">Quick Response</p>
                    <p className="text-gray-600">Appointments confirmed within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            💰 PRICING SECTION - Consultation fees and services
            ============================================================================ */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Consultation Fees</h2>
            <p className="text-xl text-gray-600">Transparent pricing for quality healthcare</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-8 rounded-2xl shadow-2xl">
              <div className="text-center">
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-3xl font-bold mb-4">Initial Consultation</h3>
                <div className="text-5xl font-bold mb-4">₹{consultationFee}</div>
                <p className="text-xl mb-6 text-blue-100">Comprehensive medical evaluation and treatment plan</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <div className="text-2xl mb-2">⏱️</div>
                    <p className="font-semibold">30-45 Minutes</p>
                    <p className="text-sm text-blue-100">Consultation Duration</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <div className="text-2xl mb-2">📋</div>
                    <p className="font-semibold">Full Assessment</p>
                    <p className="text-sm text-blue-100">Medical History & Examination</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <div className="text-2xl mb-2">💊</div>
                    <p className="font-semibold">Treatment Plan</p>
                    <p className="text-sm text-blue-100">Personalized Care Strategy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================
            📞 CTA SECTION - Call to action for booking
            ============================================================================ */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-12 rounded-2xl shadow-2xl">
            <div className="text-6xl mb-6">📞</div>
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 text-green-100">Book your appointment today and take the first step towards better health.</p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <DoctorBookingCTA doctorId={doctor.doctorProfile.id} clinicName={clinicName} />
              <a 
                href={`tel:${phone}`}
                className="bg-transparent border-2 border-white text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-white hover:text-green-600 transition-all duration-200"
              >
                Call Now
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================================
          🦶 FOOTER SECTION - Website footer
          ============================================================================ */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">{clinicName}</h3>
              <p className="text-gray-400 mb-4">Professional healthcare services in {city}, {state}.</p>
              <div className="flex space-x-4">
                <span className="text-2xl">📞</span>
                <span className="text-2xl">📧</span>
                <span className="text-2xl">📍</span>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
                <li><a href="#location" className="hover:text-white transition-colors">Location</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2 text-gray-400">
                <p>📍 {clinicAddress}</p>
                <p>📞 {phone}</p>
                <p>📧 {doctor.email}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 {clinicName}. All rights reserved. | Powered by DocProc</p>
          </div>
        </div>
      </footer>
    </div>
  );
}