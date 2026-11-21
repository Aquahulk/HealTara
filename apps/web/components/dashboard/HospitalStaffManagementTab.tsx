// ============================================================================
// 🏥 HOSPITAL STAFF MANAGEMENT TAB - Hospital Admin's Staff Management
// ============================================================================
// Purpose: Allow hospital administrators to manage staff across multiple doctors
// Features:
// - Search and invite staff for hospital or specific doctors
// - View all staff assignments in the hospital
// - Filter by doctor or department
// - Manage permissions
// - Revoke access
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  MagnifyingGlassIcon, 
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOffice2Icon,
  TrashIcon,
  ShieldCheckIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffMember {
  id: number;
  staffCode: string;
  name: string;
  phone?: string;
  status: string;
  user: {
    id: number;
    email: string;
  };
}

interface Assignment {
  id: number;
  scope: 'DOCTOR' | 'HOSPITAL' | 'DOCTOR_HOSPITAL';
  status: string;
  activatedAt: string;
  staff: StaffMember & { user: { email: string } };
  doctor?: {
    id: number;
    email: string;
    doctorCode: string;
    doctorProfile: {
      specialization: string;
      clinicName: string;
    };
  };
  permissions: Array<{
    id: number;
    permission: string;
    granted: boolean;
  }>;
}

interface Doctor {
  id: number;
  email: string;
  doctorCode?: string;
  doctorProfile?: {
    specialization: string;
    clinicName: string;
  };
}

interface HospitalStaffManagementTabProps {
  hospitalId: number;
  hospitalAdminId: number;
  apiBaseUrl: string;
  token: string;
  doctors: Doctor[];
}

export default function HospitalStaffManagementTab({ 
  hospitalId, 
  hospitalAdminId, 
  apiBaseUrl, 
  token,
  doctors 
}: HospitalStaffManagementTabProps) {
  const [view, setView] = useState<'current' | 'invite'>('current');
  const [activeStaff, setActiveStaff] = useState<Assignment[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Assignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StaffMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [inviteScope, setInviteScope] = useState<'HOSPITAL' | 'DOCTOR_HOSPITAL'>('HOSPITAL');
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [inviting, setInviting] = useState(false);
  const [filterDoctor, setFilterDoctor] = useState<number | null>(null);

  // Fetch active staff assignments
  useEffect(() => {
    fetchActiveStaff();
  }, []);

  // Filter staff by doctor
  useEffect(() => {
    if (!filterDoctor) {
      setFilteredStaff(activeStaff);
    } else {
      setFilteredStaff(activeStaff.filter(a => a.doctor?.id === filterDoctor));
    }
  }, [filterDoctor, activeStaff]);

  const fetchActiveStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/staff/assignments/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch staff');
      
      const data = await response.json();
      setActiveStaff(data.assignments || []);
      setFilteredStaff(data.assignments || []);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchStaff = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `${apiBaseUrl}/api/staff/search?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err: any) {
      console.error('Error searching staff:', err);
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const inviteStaff = async () => {
    if (!selectedStaff) return;
    if (inviteScope === 'DOCTOR_HOSPITAL' && !selectedDoctor) {
      alert('Please select a doctor for this assignment');
      return;
    }

    try {
      setInviting(true);
      const response = await fetch(`${apiBaseUrl}/api/staff/assignments/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          staffCode: selectedStaff.staffCode,
          doctorId: inviteScope === 'DOCTOR_HOSPITAL' ? selectedDoctor : null,
          hospitalId: hospitalId,
          scope: inviteScope,
          permissions: [
            { permission: 'APPOINTMENT_VIEW', granted: true },
            { permission: 'APPOINTMENT_MANAGE', granted: true },
            { permission: 'SLOT_VIEW', granted: true },
            { permission: 'SLOT_MANAGE', granted: true },
            { permission: 'WALKIN_CREATE', granted: true },
            { permission: 'TOKEN_VIEW', granted: true },
            { permission: 'TOKEN_MANAGE', granted: true },
            { permission: 'PATIENT_BASIC_INFO_VIEW', granted: true }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invitation');
      }

      alert('✅ Invitation sent successfully! The doctor and staff member will receive notifications.');
      setSelectedStaff(null);
      setSelectedDoctor(null);
      setSearchQuery('');
      setSearchResults([]);
      setView('current');
      fetchActiveStaff();
    } catch (err: any) {
      console.error('Error inviting staff:', err);
      alert('❌ ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const revokeAccess = async (assignmentId: number, staffName: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${staffName}?`)) return;

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/staff/assignments/${assignmentId}/revoke`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason: 'Access revoked by hospital administrator'
          })
        }
      );

      if (!response.ok) throw new Error('Failed to revoke access');

      alert('✅ Access revoked successfully');
      fetchActiveStaff();
    } catch (err: any) {
      console.error('Error revoking access:', err);
      alert('❌ ' + err.message);
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'DOCTOR': return 'All Doctor Contexts';
      case 'HOSPITAL': return 'Hospital-Wide';
      case 'DOCTOR_HOSPITAL': return 'Hospital + Doctor';
      default: return scope;
    }
  };

  const getScopeBadgeColor = (scope: string) => {
    switch (scope) {
      case 'DOCTOR': return 'bg-purple-50 text-purple-700';
      case 'HOSPITAL': return 'bg-blue-50 text-blue-700';
      case 'DOCTOR_HOSPITAL': return 'bg-green-50 text-green-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getPermissionLabel = (permission: string) => {
    return permission.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  const getDoctorLabel = (doctor: Doctor) => {
    return doctor.doctorProfile?.clinicName || doctor.email.split('@')[0];
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 md:p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold">Hospital Staff Management</h2>
            <p className="text-sm text-white/80 mt-1">
              Manage staff for your hospital and doctors
            </p>
          </div>
          <BuildingOffice2Icon className="w-10 h-10 md:w-12 md:h-12 text-white/30" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <p className="text-white/70 text-xs font-semibold">Total Staff</p>
            <p className="text-2xl font-bold">{activeStaff.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <p className="text-white/70 text-xs font-semibold">Active Doctors</p>
            <p className="text-2xl font-bold">{doctors.length}</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setView('current')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
              view === 'current'
                ? 'bg-white text-indigo-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Current Staff ({filteredStaff.length})
          </button>
          <button
            onClick={() => setView('invite')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
              view === 'invite'
                ? 'bg-white text-indigo-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            + Invite New
          </button>
        </div>
      </div>

      {/* Current Staff View */}
      {view === 'current' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          {doctors.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <FunnelIcon className="w-5 h-5 text-gray-500" />
                <label className="text-sm font-bold text-gray-900">Filter by Doctor</label>
              </div>
              <select
                value={filterDoctor || ''}
                onChange={(e) => setFilterDoctor(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Staff (Hospital-wide + Doctor-specific)</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {getDoctorLabel(doc)} - {doc.doctorProfile?.specialization || 'Doctor'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading staff...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
              <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {filterDoctor ? 'No Staff for This Doctor' : 'No Staff Yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {filterDoctor 
                  ? 'This doctor does not have any assigned staff members yet.'
                  : 'You haven\'t assigned any staff members to help manage your hospital.'}
              </p>
              <button
                onClick={() => setView('invite')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold inline-flex items-center gap-2"
              >
                <UserPlusIcon className="w-5 h-5" />
                Invite Staff Member
              </button>
            </div>
          ) : (
            filteredStaff.map((assignment) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {assignment.staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900">{assignment.staff.name}</h3>
                      <p className="text-sm text-gray-500">{assignment.staff.user.email}</p>
                      
                      {/* Doctor Assignment */}
                      {assignment.doctor && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-600">
                            <span className="font-semibold">Assigned to:</span>{' '}
                            Dr. {getDoctorLabel(assignment.doctor)} ({assignment.doctor.doctorProfile?.specialization})
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-1 rounded">
                          <ShieldCheckIcon className="w-3 h-3" />
                          {assignment.staff.staffCode}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${getScopeBadgeColor(assignment.scope)}`}>
                          {getScopeLabel(assignment.scope)}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-semibold px-2 py-1 rounded">
                          {assignment.permissions.filter(p => p.granted).length} Permissions
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeAccess(assignment.id, assignment.staff.name)}
                    className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Revoke Access"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Permissions List */}
                <details className="mt-3 pt-3 border-t border-gray-100">
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
                    View Permissions
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {assignment.permissions.filter(p => p.granted).map((perm) => (
                      <div key={perm.id} className="flex items-center gap-2 text-xs">
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">{getPermissionLabel(perm.permission)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Invite New Staff View */}
      {view === 'invite' && (
        <div className="space-y-4">
          {/* Search Box */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Search Staff Member
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchStaff()}
                  placeholder="Enter staff code (HLT-STA-XXXXXX) or name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={searchStaff}
                disabled={!searchQuery.trim() || searching}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Staff members must create an account first before you can invite them.
            </p>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map((staff) => (
                  <div
                    key={staff.id}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedStaff?.id === staff.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setSelectedStaff(staff)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{staff.name}</h4>
                        <p className="text-sm text-gray-500">{staff.user.email}</p>
                      </div>
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-mono font-bold px-2 py-1 rounded">
                        {staff.staffCode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invitation Form */}
          {selectedStaff && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
            >
              <h3 className="font-bold text-gray-900 mb-4">Send Invitation</h3>
              
              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-sm font-semibold text-indigo-900">Selected Staff:</p>
                  <p className="text-lg font-bold text-indigo-700">{selectedStaff.name}</p>
                  <p className="text-sm text-indigo-600">{selectedStaff.staffCode}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Access Scope
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors"
                      style={{ borderColor: inviteScope === 'HOSPITAL' ? '#4f46e5' : '#e5e7eb', backgroundColor: inviteScope === 'HOSPITAL' ? '#eef2ff' : 'transparent' }}>
                      <input
                        type="radio"
                        name="scope"
                        value="HOSPITAL"
                        checked={inviteScope === 'HOSPITAL'}
                        onChange={(e) => setInviteScope(e.target.value as 'HOSPITAL')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-semibold text-gray-900">Hospital-Wide Access</span>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Staff can assist all doctors in the hospital
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors"
                      style={{ borderColor: inviteScope === 'DOCTOR_HOSPITAL' ? '#4f46e5' : '#e5e7eb', backgroundColor: inviteScope === 'DOCTOR_HOSPITAL' ? '#eef2ff' : 'transparent' }}>
                      <input
                        type="radio"
                        name="scope"
                        value="DOCTOR_HOSPITAL"
                        checked={inviteScope === 'DOCTOR_HOSPITAL'}
                        onChange={(e) => setInviteScope(e.target.value as 'DOCTOR_HOSPITAL')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-semibold text-gray-900">Specific Doctor at Hospital</span>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Staff works only for a specific doctor at this hospital
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {inviteScope === 'DOCTOR_HOSPITAL' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Select Doctor
                    </label>
                    <select
                      value={selectedDoctor || ''}
                      onChange={(e) => setSelectedDoctor(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">-- Select a doctor --</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          Dr. {getDoctorLabel(doc)} - {doc.doctorProfile?.specialization || 'Doctor'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Default Permissions:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3 text-green-500" />
                      View Appointments
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3 text-green-500" />
                      Manage Appointments
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3 text-green-500" />
                      Manage Slots
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3 text-green-500" />
                      Create Walk-ins
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3 text-green-500" />
                      Manage Token Queue
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3 text-green-500" />
                      View Patient Info
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedStaff(null);
                      setSelectedDoctor(null);
                      setSearchResults([]);
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={inviteStaff}
                    disabled={inviting || (inviteScope === 'DOCTOR_HOSPITAL' && !selectedDoctor)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inviting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="w-5 h-5" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
