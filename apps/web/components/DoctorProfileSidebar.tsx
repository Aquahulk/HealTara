'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Award,
  Briefcase,
  GraduationCap,
  DollarSign,
  Users,
  CheckCircle,
  Star,
  TrendingUp,
  Activity,
  Building2,
  Globe
} from 'lucide-react';
import { apiClient } from '@/lib/api';

console.log('🚀 DoctorProfileSidebar.tsx file loaded!');

interface DoctorProfileSidebarProps {
  doctorId: number | null;
  onClose: () => void;
}

interface DoctorProfileData {
  id: number;
  email: string;
  role: string;
  hospitalId?: number | null;
  departmentId?: number | null;
  departmentName?: string | null;
  doctorProfile?: {
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
    profileImage?: string;
    websiteTheme?: string;
    verificationStatus?: string;
    micrositeEnabled?: boolean;
  };
  appointmentStats?: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    confirmed: number;
  };
}

export default function DoctorProfileSidebar({ doctorId, onClose }: DoctorProfileSidebarProps) {
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'schedule'>('overview');

  console.log('🔥🔥🔥 DoctorProfileSidebar COMPONENT RENDERED - doctorId:', doctorId, 'Type:', typeof doctorId);

  const fetchDoctorDetails = async () => {
    if (!doctorId) return;
    
    try {
      setLoading(true);
      console.log('Fetching doctor details for ID:', doctorId);
      
      // Fetch doctor details and their appointments
      const [doctorData, appointments] = await Promise.all([
        apiClient.getDoctorDetails(doctorId).catch((err) => {
          console.error('Error fetching doctor details:', err);
          return null;
        }),
        apiClient.getDoctorAppointments(doctorId).catch((err) => {
          console.error('Error fetching doctor appointments:', err);
          return [];
        })
      ]);

      console.log('Doctor data received:', doctorData);
      console.log('Appointments received:', appointments);

      if (doctorData) {
        // Calculate appointment stats
        const stats = {
          total: appointments.length,
          completed: appointments.filter((a: any) => a.status === 'COMPLETED').length,
          pending: appointments.filter((a: any) => a.status === 'PENDING').length,
          cancelled: appointments.filter((a: any) => a.status === 'CANCELLED').length,
          confirmed: appointments.filter((a: any) => a.status === 'CONFIRMED').length,
        };

        setDoctor({ ...doctorData, appointmentStats: stats });
        console.log('Doctor state updated successfully');
      } else {
        console.error('No doctor data received');
      }
    } catch (error) {
      console.error('Failed to fetch doctor details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🎯 useEffect triggered! doctorId changed to:', doctorId, 'Type:', typeof doctorId);
    if (doctorId) {
      console.log('📞 Calling fetchDoctorDetails...');
      fetchDoctorDetails();
    } else {
      console.log('⏭️ Skipping fetch - doctorId is:', doctorId);
    }
  }, [doctorId]);

  const profile = doctor?.doctorProfile;
  const stats = doctor?.appointmentStats;

  return (
    <AnimatePresence>
      {doctorId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[500px] lg:w-[600px] bg-white shadow-2xl z-[9999] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  {profile?.profileImage ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${profile.profileImage}`}
                      alt="Doctor"
                      className="w-16 h-16 rounded-full border-4 border-white/30 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-2xl font-bold">
                      {(profile?.slug || doctor?.email)?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-black">
                      Dr. {profile?.slug || doctor?.email?.split('@')[0]}
                    </h2>
                    <p className="text-white/90 text-sm font-medium">
                      {profile?.specialization || 'General Practitioner'}
                    </p>
                    {doctor?.departmentName && (
                      <p className="text-white/80 text-xs mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {doctor.departmentName}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/90 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Verification Badge */}
              {profile?.verificationStatus === 'APPROVED' && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  Verified Professional
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'stats', label: 'Statistics', icon: TrendingUp },
                { id: 'schedule', label: 'Schedule', icon: Calendar }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Loading doctor details...</p>
                  </div>
                </div>
              ) : !doctor ? (
                <div className="flex items-center justify-center h-full p-6">
                  <div className="text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <p className="text-sm text-gray-600 font-medium">Failed to load doctor details</p>
                    <p className="text-xs text-gray-400 mt-2">Doctor ID: {doctorId}</p>
                    <button 
                      onClick={fetchDoctorDetails}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-5 h-5 text-green-600" />
                            <span className="text-xs font-semibold text-green-700">Experience</span>
                          </div>
                          <div className="text-2xl font-black text-green-900">
                            {profile?.experience || 0} <span className="text-sm font-medium">years</span>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-700">Fee</span>
                          </div>
                          <div className="text-2xl font-black text-blue-900">
                            ₹{profile?.consultationFee || 0}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            <span className="text-xs font-semibold text-purple-700">Patients</span>
                          </div>
                          <div className="text-2xl font-black text-purple-900">
                            {stats?.total || 0}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-orange-600" />
                            <span className="text-xs font-semibold text-orange-700">Completed</span>
                          </div>
                          <div className="text-2xl font-black text-orange-900">
                            {stats?.completed || 0}
                          </div>
                        </div>
                      </div>

                      {/* About */}
                      {profile?.about && (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                          <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-gray-600" />
                            About
                          </h3>
                          <p className="text-sm text-gray-700 leading-relaxed">{profile.about}</p>
                        </div>
                      )}

                      {/* Qualifications */}
                      {profile?.qualifications && (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                          <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-gray-600" />
                            Qualifications
                          </h3>
                          <p className="text-sm text-gray-700">{profile.qualifications}</p>
                        </div>
                      )}

                      {/* Services */}
                      {profile?.services && profile.services.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                          <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-gray-600" />
                            Services Offered
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.services.map((service, idx) => (
                              <span
                                key={idx}
                                className="bg-white px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 border border-gray-200"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact Information */}
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-600" />
                          Contact Information
                        </h3>
                        <div className="space-y-3">
                          {profile?.phone && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Phone className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 font-medium">Phone</div>
                                <div className="text-sm font-semibold text-gray-900">{profile.phone}</div>
                              </div>
                            </div>
                          )}

                          {doctor?.email && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Mail className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 font-medium">Email</div>
                                <div className="text-sm font-semibold text-gray-900">{doctor.email}</div>
                              </div>
                            </div>
                          )}

                          {profile?.clinicAddress && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 font-medium">Clinic</div>
                                <div className="text-sm font-semibold text-gray-900">{profile.clinicName}</div>
                                <div className="text-xs text-gray-600 mt-0.5">
                                  {profile.clinicAddress}, {profile.city}, {profile.state}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Working Hours */}
                      {profile?.workingHours && (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                          <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-600" />
                            Working Hours
                          </h3>
                          <p className="text-sm text-gray-700">{profile.workingHours}</p>
                        </div>
                      )}

                      {/* Microsite Link */}
                      {profile?.micrositeEnabled && (
                        <a
                          href={`/doctors/${profile.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-4 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-black text-lg mb-1">View Public Profile</div>
                              <div className="text-white/90 text-sm">Visit doctor's microsite</div>
                            </div>
                            <Globe className="w-6 h-6" />
                          </div>
                        </a>
                      )}
                    </motion.div>
                  )}

                  {/* Statistics Tab */}
                  {activeTab === 'stats' && stats && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Appointment Overview */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                        <h3 className="text-lg font-black text-gray-900 mb-4">Appointment Overview</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-3xl font-black text-blue-900">{stats.total}</div>
                            <div className="text-sm text-blue-700 font-medium">Total Appointments</div>
                          </div>
                          <div>
                            <div className="text-3xl font-black text-green-900">{stats.completed}</div>
                            <div className="text-sm text-green-700 font-medium">Completed</div>
                          </div>
                          <div>
                            <div className="text-3xl font-black text-yellow-900">{stats.pending}</div>
                            <div className="text-sm text-yellow-700 font-medium">Pending</div>
                          </div>
                          <div>
                            <div className="text-3xl font-black text-purple-900">{stats.confirmed}</div>
                            <div className="text-sm text-purple-700 font-medium">Confirmed</div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-black text-gray-900">Performance Metrics</h3>
                        
                        {/* Completion Rate */}
                        <div className="bg-white rounded-xl p-5 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700">Completion Rate</span>
                            <span className="text-lg font-black text-gray-900">
                              {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                              style={{
                                width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Cancellation Rate */}
                        <div className="bg-white rounded-xl p-5 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700">Cancellation Rate</span>
                            <span className="text-lg font-black text-gray-900">
                              {stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-red-500 to-pink-500 h-3 rounded-full transition-all"
                              style={{
                                width: `${stats.total > 0 ? (stats.cancelled / stats.total) * 100 : 0}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Total Revenue */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                          <div className="text-sm font-semibold text-green-700 mb-2">Estimated Revenue</div>
                          <div className="text-3xl font-black text-green-900">
                            ₹{((stats.completed || 0) * (profile?.consultationFee || 0)).toLocaleString()}
                          </div>
                          <div className="text-xs text-green-600 mt-2">
                            Based on {stats.completed} completed appointments
                          </div>
                        </div>
                      </div>

                      {/* Status Distribution */}
                      <div className="bg-white rounded-xl p-5 border border-gray-200">
                        <h3 className="text-sm font-black text-gray-900 mb-4">Status Distribution</h3>
                        <div className="space-y-3">
                          {[
                            { label: 'Completed', count: stats.completed, color: 'bg-green-500', textColor: 'text-green-700' },
                            { label: 'Confirmed', count: stats.confirmed, color: 'bg-purple-500', textColor: 'text-purple-700' },
                            { label: 'Pending', count: stats.pending, color: 'bg-yellow-500', textColor: 'text-yellow-700' },
                            { label: 'Cancelled', count: stats.cancelled, color: 'bg-red-500', textColor: 'text-red-700' }
                          ].map(item => (
                            <div key={item.label} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                              </div>
                              <span className={`text-sm font-black ${item.textColor}`}>{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Schedule Tab */}
                  {activeTab === 'schedule' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {profile?.workingHours ? (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                          <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-600" />
                            Working Schedule
                          </h3>
                          <div className="bg-white rounded-lg p-4 border border-purple-200">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                              {profile.workingHours}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-12 text-center">
                          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 font-medium">No schedule information available</p>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-black text-gray-900">Quick Actions</h3>
                        
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 font-semibold transition-colors flex items-center justify-between">
                          <span>View All Appointments</span>
                          <Calendar className="w-5 h-5" />
                        </button>

                        <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl p-4 font-semibold transition-colors flex items-center justify-between">
                          <span>Contact Doctor</span>
                          <Mail className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
