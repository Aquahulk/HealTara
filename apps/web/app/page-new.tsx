"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import DoctorOyoCard from '@/components/DoctorOyoCard';
import Header from '@/components/Header';

// ============================================================================
// 🚀 FUTURISTIC HOMEPAGE - Revolutionary Healthcare Platform
// ============================================================================
// Unique design with glassmorphism, 3D effects, and never-before-seen animations
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
  cta: {
    title: string;
    description: string;
    icon: string;
  };
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
  const [sortBy, setSortBy] = useState<'trending' | 'recent' | 'default'>('trending');
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const [hasMore, setHasMore] = useState(true);
  
  // Animation refs
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // 📊 HOMEPAGE DATA - Futuristic content
  // ============================================================================
  const defaultHomepageData: HomepageData = {
    hero: {
      title: "DOCPROC",
      subtitle: "The Future of Healthcare is Here",
      searchPlaceholder: "Search doctors, hospitals, or specialties...",
      ctaText: "Start Your Journey",
      backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    stats: {
      doctors: 2500,
      patients: 100000,
      cities: 75,
      reviews: 25000
    },
    features: [
      {
        icon: "🤖",
        title: "AI-Powered Matching",
        description: "Advanced algorithms match you with the perfect healthcare provider",
        color: "from-blue-500 to-cyan-500"
      },
      {
        icon: "⚡",
        title: "Instant Booking",
        description: "Book appointments in seconds with real-time availability",
        color: "from-purple-500 to-pink-500"
      },
      {
        icon: "🏥",
        title: "Hospital Network",
        description: "Access to premium hospitals and specialized departments",
        color: "from-green-500 to-emerald-500"
      },
      {
        icon: "📱",
        title: "Mobile First",
        description: "Seamless experience across all devices and platforms",
        color: "from-orange-500 to-red-500"
      }
    ],
    categories: [
      {
        title: "Cardiology",
        description: "Heart specialists and cardiac care",
        icon: "❤️",
        color: "from-red-500 to-pink-500",
        link: "/doctors?specialty=cardiology"
      },
      {
        title: "Neurology",
        description: "Brain and nervous system experts",
        icon: "🧠",
        color: "from-blue-500 to-indigo-500",
        link: "/doctors?specialty=neurology"
      },
      {
        title: "Orthopedics",
        description: "Bone, joint, and muscle specialists",
        icon: "🦴",
        color: "from-green-500 to-teal-500",
        link: "/doctors?specialty=orthopedics"
      },
      {
        title: "Pediatrics",
        description: "Children's health and development",
        icon: "👶",
        color: "from-yellow-500 to-orange-500",
        link: "/doctors?specialty=pediatrics"
      }
    ],
    howItWorks: [
      {
        step: 1,
        title: "Search & Discover",
        description: "Find the perfect healthcare provider using our AI-powered search",
        icon: "🔍"
      },
      {
        step: 2,
        title: "Book Instantly",
        description: "View real-time availability and book your appointment in seconds",
        icon: "📅"
      },
      {
        step: 3,
        title: "Get Treated",
        description: "Receive world-class healthcare from verified professionals",
        icon: "🏥"
      }
    ],
    testimonials: [
      {
        name: "Sarah Johnson",
        role: "Patient",
        content: "DocProc revolutionized how I find and book healthcare. The AI matching is incredibly accurate!",
        rating: 5,
        avatar: "👩‍🦱"
      },
      {
        name: "Dr. Michael Chen",
        role: "Cardiologist",
        content: "The platform has streamlined my practice and helped me reach more patients efficiently.",
        rating: 5,
        avatar: "👨‍⚕️"
      },
      {
        name: "Emily Rodriguez",
        role: "Patient",
        content: "Finally, a healthcare platform that actually works! Booking is instant and painless.",
        rating: 5,
        avatar: "👩‍🦰"
      }
    ],
    cta: {
      title: "Ready to Transform Your Healthcare Experience?",
      description: "Join thousands of patients and providers who trust DocProc for their healthcare needs.",
      icon: "🚀"
    }
  };

  // ============================================================================
  // 🔄 DATA LOADING - Optimized parallel loading
  // ============================================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch data in parallel for maximum performance
        const [hospitalsRes, homepageRes, doctorsRes] = await Promise.allSettled([
          apiClient.getHospitals(),
          apiClient.getHomepageContent(),
          apiClient.getDoctors({ sort: 'trending', page: 1, pageSize: 12 })
        ]);

        if (hospitalsRes.status === 'fulfilled') {
          setHospitals(hospitalsRes.value || []);
        }

        if (homepageRes.status === 'fulfilled') {
          setHomepageData(homepageRes.value || defaultHomepageData);
        } else {
          setHomepageData(defaultHomepageData);
        }

        if (doctorsRes.status === 'fulfilled') {
          setDoctors(doctorsRes.value || []);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        setHomepageData(defaultHomepageData);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowAppointmentModal(true);
  };

  const filteredDoctors = doctors.filter((doctor: any) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const profile = doctor.doctorProfile;
    return (
      profile?.specialization?.toLowerCase().includes(query) ||
      profile?.clinicName?.toLowerCase().includes(query) ||
      profile?.city?.toLowerCase().includes(query) ||
      doctor.email?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-32 h-32 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-32 h-32 border-4 border-purple-500/20 border-r-purple-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
      </div>
    );
  }

  const data = homepageData || defaultHomepageData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      <Header />
      
      {/* ============================================================================
          🌟 FUTURISTIC HERO SECTION - Glassmorphism & 3D Effects
          ============================================================================ */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-4 py-20"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating orbs */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-32 w-96 h-96 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
          
          {/* Grid pattern (escape inner quotes in data URL to avoid JSX parse issues) */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.1%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          {/* Main Title with 3D Effect */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent mb-6 leading-tight">
              <span className="inline-block transform hover:scale-105 transition-transform duration-300">DOC</span>
              <span className="inline-block transform hover:scale-105 transition-transform duration-300" style={{animationDelay: '0.1s'}}>PROC</span>
            </h1>
            <div className="text-2xl md:text-3xl font-light text-blue-200 mb-4">
              The Future of Healthcare is Here
            </div>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Experience revolutionary healthcare booking with AI-powered matching, 
              instant appointments, and seamless hospital integration.
            </p>
          </div>

          {/* Glassmorphism Search Container */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search doctors, hospitals, or specialties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-6 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                  Find Healthcare
                </button>
              </div>
            </div>
          </div>

          {/* Floating Action Buttons */}
          <div className="flex flex-wrap justify-center gap-6">
            <button className="group backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-8 py-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🏥</div>
                <span className="text-white font-semibold">Find Hospitals</span>
              </div>
            </button>
            <button className="group backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-8 py-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">👨‍⚕️</div>
                <span className="text-white font-semibold">Book Doctor</span>
              </div>
            </button>
            <button className="group backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-8 py-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🚑</div>
                <span className="text-white font-semibold">Emergency</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================================
          📊 STATISTICS SECTION - Animated counters with glassmorphism
          ============================================================================ */}
      <section ref={statsRef} className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Expert Doctors", value: data.stats.doctors, icon: "👨‍⚕️", color: "from-blue-500 to-cyan-500" },
              { label: "Happy Patients", value: data.stats.patients, icon: "😊", color: "from-green-500 to-emerald-500" },
              { label: "Cities Covered", value: data.stats.cities, icon: "🏙️", color: "from-purple-500 to-pink-500" },
              { label: "5-Star Reviews", value: data.stats.reviews, icon: "⭐", color: "from-orange-500 to-red-500" }
            ].map((stat, index) => (
              <div key={index} className="group">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                  <div className={`text-6xl mb-4 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.icon}
                  </div>
                  <div className={`text-4xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
                    {stat.value.toLocaleString()}+
                  </div>
                  <div className="text-gray-300 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================================
          🎯 FEATURED DOCTORS SECTION - 3D Cards with hover effects
          ============================================================================ */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-6">
              Featured Healthcare Providers
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Meet our top-rated doctors and specialists, verified by our AI system for excellence in care.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDoctors.slice(0, 6).map((doctor, index) => (
                <div key={doctor.id} className="group">
                  <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 hover:-rotate-1">
                    <div className="flex items-center mb-6">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl mr-4">
                        {doctor.doctorProfile?.profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={doctor.doctorProfile.profileImage} 
                            alt={doctor.email.split('@')[0]} 
                            className="w-14 h-14 rounded-2xl object-cover"
                          />
                        ) : (
                          <span>👨‍⚕️</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          Dr. {doctor.email.split('@')[0]}
                        </h3>
                        <p className="text-blue-300 font-semibold">
                          {doctor.doctorProfile?.specialization}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-300">
                        <span className="text-blue-400 mr-2">📍</span>
                        <span>{doctor.doctorProfile?.city}, {doctor.doctorProfile?.state}</span>
                      </div>
                      {doctor.doctorProfile?.experience && (
                        <div className="flex items-center text-gray-300">
                          <span className="text-green-400 mr-2">⏰</span>
                          <span>{doctor.doctorProfile.experience}+ Years Experience</span>
                        </div>
                      )}
                      {doctor.doctorProfile?.consultationFee && (
                        <div className="flex items-center text-gray-300">
                          <span className="text-yellow-400 mr-2">💰</span>
                          <span>₹{doctor.doctorProfile.consultationFee}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleBookAppointment(doctor)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================================
          🌟 FEATURES SECTION - Interactive feature cards
          ============================================================================ */}
      <section ref={featuresRef} className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-6">
              Why Choose DocProc?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Experience the future of healthcare with our revolutionary platform features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {data.features.map((feature, index) => (
              <div key={index} className="group">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center hover:bg-white/15 transition-all duration-300 transform hover:scale-105 hover:-rotate-1">
                  <div className={`text-6xl mb-6 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================================
          🎯 CTA SECTION - Final call to action
          ============================================================================ */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12">
            <div className="text-6xl mb-6">{data.cta.icon}</div>
            <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-6">
              {data.cta.title}
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              {data.cta.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-8 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                Get Started Now
              </button>
              <button className="backdrop-blur-xl bg-white/10 border border-white/20 text-white font-bold py-4 px-8 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================================
          📅 BOOKING MODAL
          ============================================================================ */}
      {showAppointmentModal && selectedDoctor && (
        <BookAppointmentModal
          open={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false);
            setSelectedDoctor(null);
          }}
          doctor={selectedDoctor}
          doctorId={selectedDoctor.id}
          doctorName={`Dr. ${selectedDoctor.email.split('@')[0]}`}
          onSubmit={async (appointmentData) => {
            try {
              await apiClient.bookAppointment(appointmentData);
              setShowAppointmentModal(false);
              setSelectedDoctor(null);
              alert('Appointment booked successfully!');
            } catch (error) {
              console.error('Error booking appointment:', error);
              alert('Failed to book appointment. Please try again.');
            }
          }}
          patientLoggedIn={!!user}
          patientRole={user?.role}
        />
      )}
    </div>
  );
}

