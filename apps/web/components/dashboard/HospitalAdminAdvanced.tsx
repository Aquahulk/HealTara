'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Building2, TrendingUp, Users, Activity, Calendar, 
  Search, Filter, Download, Plus, Edit2, Trash2,
  ChevronDown, ChevronUp, BarChart3, DollarSign,
  Clock, CheckCircle, XCircle, AlertCircle, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import DoctorProfileSidebar from '@/components/DoctorProfileSidebar';

interface Doctor {
  id: number;
  email: string;
  doctorProfile?: any;
  departmentId?: number | null;
  departmentName?: string | null;
}

interface Appointment {
  id: number;
  doctorId: number;
  patientId: number;
  date: string;
  time?: string;
  status: string;
  reason?: string;
  doctor?: any;
  patient?: any;
}

interface Department {
  id: number;
  name: string;
  doctors: Doctor[];
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  revenue: number;
  avgWaitTime: number;
}

interface HospitalAdminAdvancedProps {
  hospitalProfile: any;
  hospitalDoctors: Doctor[];
  doctorAppointmentsMap: Record<number, Appointment[]>;
  onRefresh?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function HospitalAdminAdvanced({
  hospitalProfile,
  hospitalDoctors,
  doctorAppointmentsMap,
  onRefresh
}: HospitalAdminAdvancedProps) {
  const [activeView, setActiveView] = useState<'overview' | 'departments' | 'doctors' | 'analytics'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Record<number, boolean>>({});
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  
  // Link doctor states
  const [linkDoctorCode, setLinkDoctorCode] = useState('');
  const [linkDoctorDepartment, setLinkDoctorDepartment] = useState('');
  const [linkingDoctor, setLinkingDoctor] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');

  // Process department data
  const departments = useMemo(() => {
    const deptMap = new Map<string, Department>();

    hospitalDoctors.forEach(doctor => {
      const deptName = doctor.departmentName || 'Unassigned';
      const deptId = doctor.departmentId || 0;
      
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, {
          id: deptId,
          name: deptName,
          doctors: [],
          totalAppointments: 0,
          completedAppointments: 0,
          pendingAppointments: 0,
          cancelledAppointments: 0,
          revenue: 0,
          avgWaitTime: 0,
        });
      }

      const dept = deptMap.get(deptName)!;
      dept.doctors.push(doctor);

      // Calculate appointment stats
      const appointments = doctorAppointmentsMap[doctor.id] || [];
      dept.totalAppointments += appointments.length;
      dept.completedAppointments += appointments.filter(a => a.status === 'COMPLETED').length;
      dept.pendingAppointments += appointments.filter(a => a.status === 'PENDING').length;
      dept.cancelledAppointments += appointments.filter(a => a.status === 'CANCELLED').length;
      dept.revenue += appointments.filter(a => a.status === 'COMPLETED').length * (doctor.doctorProfile?.consultationFee || 500);
    });

    return Array.from(deptMap.values()).sort((a, b) => b.totalAppointments - a.totalAppointments);
  }, [hospitalDoctors, doctorAppointmentsMap]);

  // Overall hospital stats
  const hospitalStats = useMemo(() => {
    const allAppointments = Object.values(doctorAppointmentsMap).flat();
    return {
      totalDoctors: hospitalDoctors.length,
      totalDepartments: departments.length,
      totalAppointments: allAppointments.length,
      completedAppointments: allAppointments.filter(a => a.status === 'COMPLETED').length,
      pendingAppointments: allAppointments.filter(a => a.status === 'PENDING').length,
      cancelledAppointments: allAppointments.filter(a => a.status === 'CANCELLED').length,
      totalRevenue: allAppointments.filter(a => a.status === 'COMPLETED').length * 500, // avg fee
      activePatients: new Set(allAppointments.map(a => a.patientId)).size,
    };
  }, [hospitalDoctors, departments, doctorAppointmentsMap]);

  // Department performance comparison
  const deptPerformanceData = departments.map(dept => ({
    name: dept.name.length > 15 ? dept.name.slice(0, 15) + '...' : dept.name,
    appointments: dept.totalAppointments,
    completed: dept.completedAppointments,
    revenue: dept.revenue / 1000, // in thousands
  }));

  // Top performing doctors
  const topDoctors = useMemo(() => {
    return hospitalDoctors
      .map(doctor => ({
        ...doctor,
        appointmentCount: (doctorAppointmentsMap[doctor.id] || []).length,
        completedCount: (doctorAppointmentsMap[doctor.id] || []).filter(a => a.status === 'COMPLETED').length,
      }))
      .sort((a, b) => b.completedCount - a.completedCount)
      .slice(0, 5);
  }, [hospitalDoctors, doctorAppointmentsMap]);

  // Filtered doctors for staff view
  const filteredDoctors = useMemo(() => {
    return hospitalDoctors.filter(doctor => {
      const matchesSearch = 
        doctor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.doctorProfile?.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.doctorProfile?.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = selectedDepartment === null || doctor.departmentId === selectedDepartment;
      
      return matchesSearch && matchesDept;
    });
  }, [hospitalDoctors, searchQuery, selectedDepartment]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white mb-2">🏥 Hospital Management</h2>
            <p className="text-white/90 text-sm">
              {hospitalProfile?.name || 'Hospital'} - Advanced Analytics & Staff Management
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 flex gap-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'doctors', label: 'Doctors', icon: Users },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        ].map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                activeView === view.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-black text-gray-900">{hospitalStats.totalDoctors}</div>
              <div className="text-xs text-gray-500 font-medium">Active Doctors</div>
              <div className="mt-2 text-xs text-blue-600 font-semibold">
                Across {hospitalStats.totalDepartments} departments
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-black text-gray-900">{hospitalStats.totalAppointments}</div>
              <div className="text-xs text-gray-500 font-medium">Total Appointments</div>
              <div className="mt-2 text-xs text-green-600 font-semibold">
                {hospitalStats.completedAppointments} completed
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-black text-gray-900">
                ₹{(hospitalStats.totalRevenue / 1000).toFixed(0)}k
              </div>
              <div className="text-xs text-gray-500 font-medium">Total Revenue</div>
              <div className="mt-2 text-xs text-purple-600 font-semibold">
                Est. from completed bookings
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-black text-gray-900">{hospitalStats.activePatients}</div>
              <div className="text-xs text-gray-500 font-medium">Active Patients</div>
              <div className="mt-2 text-xs text-orange-600 font-semibold">
                Unique patient count
              </div>
            </div>
          </div>

          {/* Top Performing Doctors */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Top Performing Doctors
            </h3>
            <div className="space-y-3">
              {topDoctors.map((doctor, idx) => (
                <div key={doctor.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">
                      Dr. {doctor.doctorProfile?.slug || doctor.email?.split('@')[0]}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {doctor.doctorProfile?.specialization || 'General Medicine'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900">{doctor.completedCount}</div>
                    <div className="text-xs text-gray-500">completed</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-600">{doctor.appointmentCount}</div>
                    <div className="text-xs text-gray-500">total</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Performance Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4">Department Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="appointments" fill="#3b82f6" name="Total Appointments" />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Departments View */}
      {activeView === 'departments' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {departments.map((dept) => {
            const isExpanded = expandedDepts[dept.id];
            const completionRate = dept.totalAppointments > 0
              ? ((dept.completedAppointments / dept.totalAppointments) * 100).toFixed(1)
              : '0';

            return (
              <div key={dept.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Department Header */}
                <div
                  onClick={() => setExpandedDepts(prev => ({ ...prev, [dept.id]: !prev[dept.id] }))}
                  className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl">
                        🏥
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900">{dept.name}</h3>
                        <p className="text-sm text-gray-500">{dept.doctors.length} doctors</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-2xl font-black text-gray-900">{dept.totalAppointments}</div>
                        <div className="text-xs text-gray-500">appointments</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-green-600">{completionRate}%</div>
                        <div className="text-xs text-gray-500">completion</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-purple-600">₹{(dept.revenue / 1000).toFixed(0)}k</div>
                        <div className="text-xs text-gray-500">revenue</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Quick Stats Bar */}
                  <div className="mt-4 flex gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-600">{dept.completedAppointments} completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-gray-600">{dept.pendingAppointments} pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-gray-600">{dept.cancelledAppointments} cancelled</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Department Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-200"
                    >
                      <div className="p-5 bg-gray-50">
                        <h4 className="font-bold text-gray-900 mb-3">Doctors in {dept.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {dept.doctors.map(doctor => {
                            const appointments = doctorAppointmentsMap[doctor.id] || [];
                            return (
                              <div 
                                key={doctor.id} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Doctor card clicked:', doctor.id, 'Type:', typeof doctor.id);
                                  console.log('Setting selectedDoctorId to:', doctor.id);
                                  setSelectedDoctorId(doctor.id);
                                  console.log('selectedDoctorId state should now be:', doctor.id);
                                }}
                                className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-bold">
                                    {(doctor.doctorProfile?.slug || doctor.email)?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-bold text-gray-900 text-sm">
                                      Dr. {doctor.doctorProfile?.slug || doctor.email?.split('@')[0]}
                                    </h5>
                                    <p className="text-xs text-gray-500 mb-2">
                                      {doctor.doctorProfile?.specialization || 'General'}
                                    </p>
                                    <div className="flex gap-3 text-xs">
                                      <span className="text-gray-600">
                                        <strong>{appointments.length}</strong> appointments
                                      </span>
                                      <span className="text-green-600">
                                        <strong>{appointments.filter(a => a.status === 'COMPLETED').length}</strong> completed
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-blue-600">
                                    <Eye className="w-5 h-5" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Doctors View */}
      {activeView === 'doctors' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Link Doctor Section */}
          <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <span className="text-blue-600">🔗</span>
                  Link Existing Doctor by Code
                </h3>
                <p className="text-sm text-gray-600 mt-1">Invite an approved doctor using their unique doctor ID (HLT-DOC-XXXXXX)</p>
              </div>
            </div>
            
            {linkMessage && (
              <div className={`mb-4 p-3 rounded-lg ${linkMessage.includes('successfully') || linkMessage.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {linkMessage}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Doctor Code *</label>
                <input
                  type="text"
                  placeholder="HLT-DOC-XXXXXX"
                  value={linkDoctorCode}
                  onChange={(e) => setLinkDoctorCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Department (Optional)</label>
                {departments.length > 0 ? (
                  <select
                    value={linkDoctorDepartment}
                    onChange={(e) => setLinkDoctorDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g., Cardiology"
                    value={linkDoctorDepartment}
                    onChange={(e) => setLinkDoctorDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
              <div className="flex items-end">
                <button
                  onClick={async () => {
                    if (!hospitalProfile?.id) {
                      setLinkMessage('Hospital ID not found');
                      return;
                    }
                    if (!linkDoctorCode.trim()) {
                      setLinkMessage('Please enter a doctor code');
                      return;
                    }
                    try {
                      setLinkingDoctor(true);
                      setLinkMessage('');
                      const response = await fetch(`/api/hospitals/${hospitalProfile.id}/link-doctor`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify({
                          doctorCode: linkDoctorCode.trim(),
                          departmentName: linkDoctorDepartment.trim() || undefined
                        })
                      });
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data.message || 'Failed to link doctor');
                      }
                      setLinkMessage(`✅ Doctor linked successfully! ${data.link?.doctor?.doctorProfile?.clinicName || 'Doctor'} has been added to your hospital.`);
                      setLinkDoctorCode('');
                      setLinkDoctorDepartment('');
                      // Refresh the data
                      if (onRefresh) onRefresh();
                    } catch (e: any) {
                      setLinkMessage(`Error: ${e?.message || 'Failed to link doctor'}`);
                    } finally {
                      setLinkingDoctor(false);
                    }
                  }}
                  disabled={linkingDoctor || !linkDoctorCode.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {linkingDoctor ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Linking...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Link Doctor
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search doctors by name, email, or specialization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedDepartment || ''}
                  onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Doctors List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Specialization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Appointments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredDoctors.map(doctor => {
                    const appointments = doctorAppointmentsMap[doctor.id] || [];
                    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
                    
                    return (
                      <tr key={doctor.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                              {(doctor.doctorProfile?.slug || doctor.email)?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                Dr. {doctor.doctorProfile?.slug || doctor.email?.split('@')[0]}
                              </div>
                              <div className="text-xs text-gray-500">{doctor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {doctor.departmentName || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {doctor.doctorProfile?.specialization || 'General'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="font-bold text-gray-900">{appointments.length}</span>
                            <span className="text-gray-500"> total</span>
                          </div>
                          <div className="text-xs text-green-600 font-semibold">
                            {completed} completed
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoctorId(doctor.id);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-800 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredDoctors.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No doctors found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Revenue by Department */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4">Revenue by Department</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departments.map((dept, idx) => ({
                    name: dept.name,
                    value: dept.revenue,
                    color: COLORS[idx % COLORS.length]
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => {
                    const name = entry.name || '';
                    const percent = entry.percent || 0;
                    return name + ': ' + (percent * 100).toFixed(0) + '%';
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departments.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    return `₹${numValue.toLocaleString()}`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Appointment Status Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-4">Appointment Status</h3>
              <div className="space-y-4">
                {[
                  { label: 'Completed', count: hospitalStats.completedAppointments, color: 'bg-green-500', percentage: (hospitalStats.completedAppointments / hospitalStats.totalAppointments * 100) || 0 },
                  { label: 'Pending', count: hospitalStats.pendingAppointments, color: 'bg-yellow-500', percentage: (hospitalStats.pendingAppointments / hospitalStats.totalAppointments * 100) || 0 },
                  { label: 'Cancelled', count: hospitalStats.cancelledAppointments, color: 'bg-red-500', percentage: (hospitalStats.cancelledAppointments / hospitalStats.totalAppointments * 100) || 0 },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">{stat.label}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {stat.count} ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${stat.color}`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Efficiency */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-4">Department Efficiency</h3>
              <div className="space-y-3">
                {departments.slice(0, 5).map((dept, idx) => {
                  const efficiency = dept.totalAppointments > 0
                    ? (dept.completedAppointments / dept.totalAppointments * 100)
                    : 0;
                  
                  return (
                    <div key={dept.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{dept.name}</div>
                        <div className="text-xs text-gray-500">{dept.doctors.length} doctors</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-gray-900">{efficiency.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">efficiency</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Doctor Profile Sidebar */}
      <DoctorProfileSidebar 
        doctorId={selectedDoctorId} 
        onClose={() => setSelectedDoctorId(null)} 
      />
    </div>
  );
}
