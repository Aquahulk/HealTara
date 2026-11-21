// ============================================================================
// 📋 STAFF DASHBOARD - SLOT_ADMIN Role Dashboard
// ============================================================================
// Purpose: Main dashboard for staff members (slot administrators)
// Features:
// - View active assignments (doctors and hospitals)
// - Accept/reject pending invitations
// - View permissions for each assignment
// - Quick access to manage different doctors/hospitals
// - Profile management
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BuildingOffice2Icon,
  UserIcon,
  ShieldCheckIcon,
  CalendarIcon,
  BriefcaseIcon,
  BellAlertIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface DoctorProfile {
  specialization: string;
  clinicName: string;
  city?: string;
}

interface HospitalInfo {
  id: number;
  name: string;
  hospitalCode: string;
  city?: string;
}

interface DoctorInfo {
  id: number;
  email: string;
  doctorCode: string;
  doctorProfile?: DoctorProfile;
}

interface Assignment {
  id: number;
  scope: 'DOCTOR' | 'HOSPITAL' | 'DOCTOR_HOSPITAL';
  status: string;
  activatedAt: string;
  doctor?: DoctorInfo;
  hospital?: HospitalInfo;
  permissions: Array<{
    id: number;
    permission: string;
    granted: boolean;
  }>;
}

interface Invitation {
  id: number;
  scope: 'DOCTOR' | 'HOSPITAL' | 'DOCTOR_HOSPITAL';
  status: string;
  expiresAt: string;
  doctor?: DoctorInfo;
  hospital?: HospitalInfo;
  initiator: {
    id: number;
    email: string;
    role: string;
  };
}

interface StaffProfile {
  id: number;
  staffCode: string;
  name: string;
  phone?: string;
  status: string;
  user: {
    email: string;
    createdAt: string;
  };
}

interface StaffDashboardProps {
  userId: number;
  apiBaseUrl: string;
  token: string;
}

export default function StaffDashboard({ userId, apiBaseUrl, token }: StaffDashboardProps) {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [activeAssignments, setActiveAssignments] = useState<Assignment[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/staff/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      const data = await response.json();
      setProfile(data.profile);
      setActiveAssignments(data.activeAssignments.assignments || []);
      setPendingInvitations(data.pendingInvitations.invitations || []);
    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async (requestId: number) => {
    try {
      setProcessing(requestId);
      const response = await fetch(
        `${apiBaseUrl}/api/staff/assignments/${requestId}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }

      alert('✅ Assignment accepted! You can now manage this doctor/hospital.');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      alert('❌ ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const rejectInvitation = async (requestId: number) => {
    if (!confirm('Are you sure you want to reject this invitation?')) return;

    try {
      setProcessing(requestId);
      const response = await fetch(
        `${apiBaseUrl}/api/staff/assignments/${requestId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason: 'Declined by staff member'
          })
        }
      );

      if (!response.ok) throw new Error('Failed to reject invitation');

      alert('✅ Invitation rejected');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error rejecting invitation:', err);
      alert('❌ ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'DOCTOR': return 'All Contexts';
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

  const getDoctorLabel = (doctor: DoctorInfo) => {
    return doctor.doctorProfile?.clinicName || doctor.email.split('@')[0];
  };

  const getPermissionLabel = (permission: string) => {
    return permission.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    return 'Expiring soon';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Staff ID Banner - Always Visible */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold">Your Staff ID</p>
              <p className="text-white text-lg md:text-xl font-mono font-bold tracking-wider">
                {profile?.staffCode}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(profile?.staffCode || '');
              alert('✅ Staff ID copied to clipboard!');
            }}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-lg transition-all"
            title="Copy Staff ID"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Header with Profile Info */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 md:p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 border-2 border-white/30">
              {profile?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{profile?.name}</h2>
              <p className="text-sm text-white/80">{profile?.user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-green-500/80 text-white text-xs font-semibold px-2 py-1 rounded">
                  Active Staff Member
                </span>
              </div>
            </div>
          </div>
          <UserCircleIcon className="w-10 h-10 md:w-12 md:h-12 text-white/30" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <p className="text-white/70 text-xs font-semibold">Active Assignments</p>
            <p className="text-2xl font-bold">{activeAssignments.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <p className="text-white/70 text-xs font-semibold">Pending Invitations</p>
            <p className="text-2xl font-bold">{pendingInvitations.length}</p>
          </div>
        </div>
      </div>

      {/* No Assignments Yet - Waiting State */}
      {activeAssignments.length === 0 && pendingInvitations.length === 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 md:p-8 border-2 border-amber-200 shadow-sm">
          <div className="text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Waiting for Assignment</h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Your account is active! You'll be able to work once a doctor or hospital admin invites you to join their team.
            </p>
            <div className="bg-white/60 rounded-lg p-4 max-w-lg mx-auto">
              <p className="text-sm text-gray-700 mb-2">
                <strong>What's next?</strong>
              </p>
              <ul className="text-sm text-gray-600 text-left space-y-1">
                <li>✓ Your Staff ID is active and ready</li>
                <li>✓ Share your Staff ID with doctors or hospital admins</li>
                <li>✓ Wait for an invitation to appear in this dashboard</li>
                <li>✓ Accept the invitation to start working</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BellAlertIcon className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900">Pending Invitations</h3>
          </div>

          {pendingInvitations.map((invitation) => (
            <motion.div
              key={invitation.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl p-4 shadow-sm border-2 border-orange-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${getScopeBadgeColor(invitation.scope)}`}>
                      {getScopeLabel(invitation.scope)}
                    </span>
                    <span className="bg-orange-50 text-orange-700 text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {getTimeRemaining(invitation.expiresAt)}
                    </span>
                  </div>
                  
                  {invitation.doctor && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Dr. {getDoctorLabel(invitation.doctor)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {invitation.doctor.doctorProfile?.specialization}
                        {invitation.doctor.doctorProfile?.city && ` • ${invitation.doctor.doctorProfile.city}`}
                      </p>
                    </div>
                  )}
                  
                  {invitation.hospital && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <BuildingOffice2Icon className="w-4 h-4" />
                        {invitation.hospital.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {invitation.hospital.city}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Invited by: {invitation.initiator.email} ({invitation.initiator.role.replace('_', ' ')})
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => rejectInvitation(invitation.id)}
                  disabled={processing === invitation.id}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <XCircleIcon className="w-4 h-4" />
                  Decline
                </button>
                <button
                  onClick={() => acceptInvitation(invitation.id)}
                  disabled={processing === invitation.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {processing === invitation.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Accept
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Active Assignments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">My Assignments</h3>
          <span className="text-sm text-gray-500">{activeAssignments.length} active</span>
        </div>

        {activeAssignments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
            <BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Assignments</h3>
            <p className="text-gray-500 mb-4">
              {pendingInvitations.length > 0
                ? 'Accept pending invitations above to start managing doctors and hospitals.'
                : 'You don\'t have any active assignments yet. Wait for doctors or hospitals to invite you.'}
            </p>
          </div>
        ) : (
          activeAssignments.map((assignment) => (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${getScopeBadgeColor(assignment.scope)}`}>
                      {getScopeLabel(assignment.scope)}
                    </span>
                    <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                      Active
                    </span>
                  </div>

                  {assignment.doctor && (
                    <div className="mb-2">
                      <p className="font-bold text-gray-900">
                        Dr. {getDoctorLabel(assignment.doctor)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {assignment.doctor.doctorProfile?.specialization}
                        {assignment.doctor.doctorProfile?.city && ` • ${assignment.doctor.doctorProfile.city}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {assignment.doctor.doctorCode}
                      </p>
                    </div>
                  )}

                  {assignment.hospital && (
                    <div className="mb-2">
                      <p className="font-bold text-gray-900 flex items-center gap-1">
                        <BuildingOffice2Icon className="w-4 h-4" />
                        {assignment.hospital.name}
                      </p>
                      <p className="text-sm text-gray-600">{assignment.hospital.city}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {assignment.hospital.hospitalCode}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <CalendarIcon className="w-3 h-3" />
                    Active since {new Date(assignment.activatedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded">
                    {assignment.permissions.filter(p => p.granted).length} Permissions
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <details className="mt-3 pt-3 border-t border-gray-100">
                <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900 flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4" />
                  View My Permissions
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {assignment.permissions.filter(p => p.granted).map((perm) => (
                    <div key={perm.id} className="flex items-center gap-2 text-xs">
                      <CheckCircleIcon className="w-3 h-3 text-green-500" />
                      <span className="text-gray-700">{getPermissionLabel(perm.permission)}</span>
                    </div>
                  ))}
                </div>
              </details>

              {/* Quick Actions */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">Quick Actions:</p>
                <div className="flex gap-2">
                  <Link
                    href="/dashboard?tab=appointments"
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg text-xs font-semibold text-center transition-colors"
                  >
                    📅 Manage Appointments
                  </Link>
                  <Link
                    href="/dashboard?tab=slots"
                    className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 px-3 rounded-lg text-xs font-semibold text-center transition-colors"
                  >
                    ⏰ Manage Slots
                  </Link>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h4 className="font-bold text-blue-900 mb-2">💡 How it works</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Doctors and hospitals can invite you to help manage their practice</li>
          <li>• You can accept or decline invitations</li>
          <li>• Each assignment has specific permissions</li>
          <li>• Changes you make are visible to everyone (single source of truth)</li>
          <li>• Your staff ID ({profile?.staffCode}) is permanent and never changes</li>
        </ul>
      </div>
    </div>
  );
}
