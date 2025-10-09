"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import DoctorCard from '@/components/DoctorCard';
import Header from '@/components/Header';

// ============================================================================
// 🏠 ADVANCED HOMEPAGE - Modern Healthcare Platform Landing Page
// ============================================================================
// This is the main landing page with advanced UI and content management
// All content can be edited from the admin panel
// ============================================================================

interface HomepageData {
  hero: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    ctaText: string;
    backgroundImage: string;
  };
  stats: {
    doctors: number;
    patients: number;
    cities: number;
    reviews: number;
  };
  features: Array<{
    icon: string;
    title: string;
    description: string;
    color: string;
  }>;
  testimonials: Array<{
    name: string;
    role: string;
    content: string;
    rating: number;
    avatar: string;
  }>;
  categories: Array<{
    title: string;
    description: string;
    icon: string;
    color: string;
    link: string;
  }>;
  howItWorks: Array<{
    step: number;
    title: string;
    description: string;
    icon: string;
  }>;
  whyChooseUs: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [homepageData, setHomepageData] = useState<HomepageData | null>(null);

  // ============================================================================
  // 📊 HOMEPAGE DATA - Default content (can be managed from admin panel)
  // ============================================================================
  const defaultHomepageData: HomepageData = {
    hero: {
      title: "Find Trusted Healthcare Providers Near You",
      subtitle: "Book appointments with verified doctors, clinics, and hospitals in seconds. Quality healthcare made simple.",
      searchPlaceholder: "Search by doctor, specialty, or location...",
      ctaText: "Find a Doctor Now",
      backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    stats: {
      doctors: 1250,
      patients: 50000,
      cities: 45,
      reviews: 12000
    },
    features: [
      {
        icon: "🏥",
        title: "Verified Doctors",
        description: "All doctors are verified with valid medical licenses",
        color: "bg-blue-500"
      },
      {
        icon: "⭐",
        title: "Real Reviews",
        description: "10,000+ verified patient reviews and ratings",
        color: "bg-yellow-500"
      },
      {
        icon: "🌐",
        title: "Multi-language Support",
        description: "Available in multiple languages for better accessibility",
        color: "bg-green-500"
      },
      {
        icon: "🔒",
        title: "Secure & Private",
        description: "Your health data is protected with enterprise-grade security",
        color: "bg-purple-500"
      }
    ],
    categories: [
      {
        title: "Hospitals",
        description: "Find top-rated hospitals near you",
        icon: "🏥",
        color: "bg-red-500",
        link: "/hospitals"
      },
      {
        title: "Single Doctors",
        description: "Connect with individual practitioners",
        icon: "👨‍⚕️",
        color: "bg-blue-500",
        link: "/doctors"
      },
      {
        title: "Multi-Doctor Clinics",
        description: "Access comprehensive clinic services",
        icon: "👩‍⚕️",
        color: "bg-green-500",
        link: "/clinics"
      },
      {
        title: "Online Consultation",
        description: "Get medical advice from home",
        icon: "💻",
        color: "bg-purple-500",
        link: "/online"
      },
      {
        title: "Labs & Diagnostics",
        description: "Book lab tests and diagnostics",
        icon: "🧪",
        color: "bg-orange-500",
        link: "/labs"
      },
      {
        title: "Emergency Care",
        description: "24/7 emergency medical services",
        icon: "🚨",
        color: "bg-red-600",
        link: "/emergency"
      }
    ],
    howItWorks: [
      {
        step: 1,
        title: "Search & Find",
        description: "Search by doctor, specialty, or location to find the right healthcare provider",
        icon: "🔍"
      },
      {
        step: 2,
        title: "Book & Pay",
        description: "Select your preferred time slot and complete the booking with secure payment",
        icon: "📅"
      },
      {
        step: 3,
        title: "Visit & Rate",
        description: "Attend your appointment and share your experience to help others",
        icon: "⭐"
      }
    ],
    whyChooseUs: [
      {
        title: "Verified Doctors Only",
        description: "No scammers - all doctors are verified with valid medical licenses and credentials",
        icon: "✅"
      },
      {
        title: "Transparent Reviews",
        description: "One booking equals one review - ensuring authentic patient feedback",
        icon: "📝"
      },
      {
        title: "Multi-language Support",
        description: "Breaking language barriers to make healthcare accessible to everyone",
        icon: "🌍"
      },
      {
        title: "One-stop Healthcare",
        description: "Complete ecosystem with doctors, clinics, hospitals, labs, and insurance",
        icon: "🏥"
      }
    ],
    testimonials: [
      {
        name: "Sarah Johnson",
        role: "Patient",
        content: "Amazing platform! Found my perfect doctor in just 2 minutes. The booking process was so smooth.",
        rating: 5,
        avatar: "👩"
      },
      {
        name: "Dr. Michael Chen",
        role: "Cardiologist",
        content: "This platform has helped me reach more patients and manage my appointments efficiently.",
        rating: 5,
        avatar: "👨‍⚕️"
      },
      {
        name: "Emily Rodriguez",
        role: "Patient",
        content: "The reviews helped me choose the right doctor. The consultation was excellent!",
        rating: 5,
        avatar: "👩‍🦱"
      }
    ]
  };

  // ============================================================================
  // 🔄 DATA LOADING - Load doctors and homepage content
  // ============================================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load doctors
        const doctorsData = await apiClient.getDoctors();
        setDoctors(doctorsData || []);
        
        // Load hospitals
        const hospitalsData = await apiClient.getHospitals();
        setHospitals(hospitalsData || []);
        
        // Load homepage content (from admin panel)
        const homepageContent = await apiClient.getHomepageContent();
        setHomepageData(homepageContent);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setHomepageData(defaultHomepageData);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ============================================================================
  // 🔍 SEARCH FUNCTIONALITY - Filter doctors based on search query
  // ============================================================================
  const filteredDoctors = doctors.filter((doctor: any) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true; // Show all doctors when search is empty
    const profile = doctor.doctorProfile;
    return (
      profile?.specialization?.toLowerCase().includes(query) ||
      profile?.clinicName?.toLowerCase().includes(query) ||
      profile?.city?.toLowerCase().includes(query) ||
      doctor.email?.toLowerCase().includes(query)
    );
  });

  // ============================================================================
  // 📅 APPOINTMENT BOOKING - Handle appointment booking
  // ============================================================================
  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowAppointmentModal(true);
  };

  const handleAppointmentSubmit = async (appointmentData: any) => {
    try {
      await apiClient.bookAppointment(appointmentData);
      setShowAppointmentModal(false);
      setSelectedDoctor(null);
      // Show success message
      alert('Appointment booked successfully!');
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const data = homepageData || defaultHomepageData;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Header />
      
      {/* ============================================================================ */}
      {/* 🎯 HERO SECTION - Main landing area with search */}
      {/* ============================================================================ */}
      <section 
        className="relative py-20 px-4 text-white"
        style={{ background: data.hero.backgroundImage }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            {data.hero.title}
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            {data.hero.subtitle}
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder={data.hero.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 text-lg rounded-full text-gray-800 focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50 shadow-2xl"
              />
              <button className="absolute right-2 top-2 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors">
                Search
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAppointmentModal(true)}
            className="bg-white text-blue-600 px-8 py-4 text-xl font-semibold rounded-full hover:bg-gray-100 transition-colors shadow-2xl"
          >
            {data.hero.ctaText}
          </button>

          {/* Auth CTAs: Patient Login and Doctor/Hospital Registration */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors shadow-lg"
            >
              Patient Login
            </a>
            <a
              href="/register/doctor-hospital"
              className="bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition-colors shadow-lg"
            >
              Register as Doctor/Hospital
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================================ */}
      {/* 📊 STATS SECTION - Trust indicators */}
      {/* ============================================================================ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">{data.stats.doctors.toLocaleString()}+</div>
              <div className="text-gray-600">Verified Doctors</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-green-600 mb-2">{data.stats.patients.toLocaleString()}+</div>
              <div className="text-gray-600">Patients Served</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-purple-600 mb-2">{data.stats.cities}+</div>
              <div className="text-gray-600">Cities Covered</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-yellow-600 mb-2">{data.stats.reviews.toLocaleString()}+</div>
              <div className="text-gray-600">Reviews</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================================ */}
      {/* 🏷️ QUICK CATEGORIES - Navigation tiles */}
      {/* ============================================================================ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Find the Right Care for You
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {data.categories.map((category, index) => (
              <a
                key={index}
                href={category.link}
                className="group bg-white rounded-2xl p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className={`w-16 h-16 ${category.color} rounded-full flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{category.title}</h3>
                <p className="text-sm text-gray-600">{category.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================================ */}
      {/* 👨‍⚕️ FEATURED DOCTORS - Top doctors carousel */}
      {/* ============================================================================ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Featured Healthcare Providers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDoctors.slice(0, 6).map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onBookAppointment={() => handleBookAppointment(doctor)}
              />
            ))}
          </div>
          {filteredDoctors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No doctors found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================================ */}
      {/* 🏨 PARTNER HOSPITALS - OYO-style grid */}
      {/* ============================================================================ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Partner Hospitals
          </h2>
          {hospitals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {hospitals.slice(0, 9).map((hospital: any) => {
                const name = hospital.name || hospital.brandName || 'Hospital';
                const city = hospital.city || '';
                const state = hospital.state || '';
                const location = [city, state].filter(Boolean).join(', ');
                const logoUrl = hospital.logoUrl || hospital.general?.logoUrl;
                return (
                  <div key={hospital.id} className="bg-white rounded-2xl shadow hover:shadow-xl transition-all overflow-hidden border border-gray-200">
                    <div className="h-40 bg-gray-100 flex items-center justify-center">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt={name} className="h-20 object-contain" />
                      ) : (
                        <div className="text-5xl">🏥</div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{location}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <a href={`/hospital-site/${hospital.id}`} className="text-blue-600 hover:text-blue-700 font-medium">View Site</a>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Partner</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Hospitals listing coming soon.</p>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================================ */}
      {/* ⭐ TRUST FEATURES - Why choose us */}
      {/* ============================================================================ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Why Choose Our Platform
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {data.features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className={`w-20 h-20 ${feature.color} rounded-full flex items-center justify-center text-3xl mx-auto mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================================ */}
      {/* 🔄 HOW IT WORKS - Process explanation */}
      {/* ============================================================================ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.howItWorks.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                  {step.icon}
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-4">Step {step.step}</div>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================================ */}
      {/* 💬 TESTIMONIALS - Patient reviews */}
      {/* ============================================================================ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            What Our Patients Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">{testimonial.avatar}</div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{testimonial.name}</h4>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">⭐</span>
                  ))}
                </div>
                <p className="text-gray-700 italic">"{testimonial.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================================ */}
      {/* 📍 LOCATION SECTION - Map and location search */}
      {/* ============================================================================ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Find Healthcare Near You
          </h2>
          <div className="bg-gray-100 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Interactive Location Search</h3>
            <p className="text-gray-600 mb-6">Discover healthcare providers in your area with our interactive map</p>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition-colors">
              Find Doctors in My Area
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================================ */}
      {/* 🎯 CALL TO ACTION - Final conversion section */}
      {/* ============================================================================ */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Find Your Perfect Healthcare Provider?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of patients who trust our platform for their healthcare needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowAppointmentModal(true)}
              className="bg-white text-blue-600 px-8 py-4 text-xl font-semibold rounded-full hover:bg-gray-100 transition-colors"
            >
              Book Appointment Now
            </button>
            <a
              href="/doctors"
              className="border-2 border-white text-white px-8 py-4 text-xl font-semibold rounded-full hover:bg-white hover:text-blue-600 transition-colors"
            >
              Browse Doctors
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================================ */}
      {/* 📅 APPOINTMENT MODAL - Booking interface */}
      {/* ============================================================================ */}
      {showAppointmentModal && (
        <BookAppointmentModal
          doctor={selectedDoctor}
          onClose={() => setShowAppointmentModal(false)}
          onSubmit={handleAppointmentSubmit}
        />
      )}
    </div>
  );
}