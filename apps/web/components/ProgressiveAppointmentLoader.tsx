// ============================================================================
// 🚀 PROGRESSIVE APPOINTMENT LOADING UI - Real-time Experience
// ============================================================================
// Shows appointments immediately with skeleton loading and optimistic updates
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { getAvailableAppointments, onAppointmentBooked } from '@/lib/cache';
import { logPerformance } from '@/lib/cache';

// ============================================================================
// 🎯 APPOINTMENT SKELETON LOADING
// ============================================================================

const AppointmentSkeleton = () => (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-5 animate-pulse shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-200 to-purple-200 rounded-lg"></div>
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded-lg w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="h-10 bg-gray-200 rounded-lg w-28"></div>
    </div>
    <div className="flex items-center space-x-4 pt-3 border-t border-gray-100">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </div>
  </div>
);

// ============================================================================
// 📅 APPOINTMENT CARD COMPONENT - Modern Design
// ============================================================================

interface AppointmentCardProps {
  appointment: any;
  onBook: (appointment: any) => void;
  isLoading?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ 
  appointment, 
  onBook, 
  isLoading = false 
}) => (
  <div className="group bg-gradient-to-br from-white to-blue-50/30 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 p-5 relative overflow-hidden">
    {/* Decorative gradient overlay */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
    
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Time Icon with gradient */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
            <Clock className="w-6 h-6 text-white" />
          </div>
          
          {/* Time Details */}
          <div>
            <div className="font-bold text-gray-900 text-lg">
              {appointment.start_time}
            </div>
            <div className="text-sm text-gray-500 flex items-center space-x-1">
              <span>{appointment.appointment_date}</span>
              <span className="text-gray-300">•</span>
              <span className="text-green-600 font-medium">Available</span>
            </div>
          </div>
        </div>
        
        {/* Book Button */}
        <button
          onClick={() => onBook(appointment)}
          disabled={isLoading}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 shadow-md ${
            isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105 active:scale-95'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Booking...</span>
            </div>
          ) : (
            <span className="flex items-center space-x-1">
              <span>Book</span>
              <span className="text-lg">→</span>
            </span>
          )}
        </button>
      </div>
      
      {/* Additional Info */}
      <div className="flex items-center space-x-6 text-sm text-gray-600 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium">Dr. {appointment.doctor_name || 'Available'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Calendar className="w-4 h-4 text-green-600" />
          </div>
          <span>30 min session</span>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// 🚀 PROGRESSIVE APPOINTMENT LOADER COMPONENT
// ============================================================================

interface ProgressiveAppointmentLoaderProps {
  doctorId: string;
  date: string;
  onAppointmentBooked?: (appointment: any) => void;
}

export const ProgressiveAppointmentLoader: React.FC<ProgressiveAppointmentLoaderProps> = ({
  doctorId,
  date,
  onAppointmentBooked
}) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimisticBookings, setOptimisticBookings] = useState<Set<string>>(new Set());

  // Load appointments with progressive enhancement
  const loadAppointments = useCallback(async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);
    
    try {
      // Show skeleton immediately (0ms)
      // Load from cache or database (1-100ms)
      const data = await getAvailableAppointments(doctorId, date);
      
      setAppointments(data);
      logPerformance('load_appointments_ui', startTime);
      
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Failed to load appointments. Please try again.');
      logPerformance('load_appointments_error', startTime);
    } finally {
      setLoading(false);
    }
  }, [doctorId, date]);

  // Optimistic booking function
  const handleBookAppointment = useCallback(async (appointment: any) => {
    const appointmentId = appointment.id;
    
    // Optimistic UI update (0ms)
    setOptimisticBookings(prev => new Set(prev).add(appointmentId));
    setBookingId(appointmentId);
    
    try {
      // Show booking state immediately
      const bookingResponse = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId,
          userId: 'current_user_id', // Get from auth context
          appointmentDate: date,
          startTime: appointment.start_time,
          endTime: appointment.end_time,
        }),
      });

      if (bookingResponse.ok) {
        const result = await bookingResponse.json();
        
        // Remove from available appointments
        setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
        
        // Callback for parent component
        if (onAppointmentBooked) {
          onAppointmentBooked(result.data);
        }
        
        console.log('✅ Appointment booked successfully:', result);
      } else {
        throw new Error('Booking failed');
      }
      
    } catch (err) {
      console.error('Booking failed:', err);
      
      // Revert optimistic update
      setOptimisticBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
      
      setError('Failed to book appointment. Please try again.');
    } finally {
      setBookingId(null);
    }
  }, [doctorId, date, onAppointmentBooked]);

  // Load appointments on mount
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Real-time updates (optional - would need WebSocket)
  useEffect(() => {
    // Could implement WebSocket for real-time updates here
    // For now, refresh every 30 seconds
    const interval = setInterval(() => {
      if (!loading) {
        loadAppointments();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAppointments, loading]);

  // ============================================================================
  // 🎨 RENDER PROGRESSIVE UI
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between text-white">
          <div>
            <h3 className="text-2xl font-bold mb-1">
              Available Appointments
            </h3>
            <p className="text-blue-100 text-sm">
              Select your preferred time slot
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {loading && (
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Loading...</span>
              </div>
            )}
            {!loading && (
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="text-sm font-bold">{appointments.length}</span>
                <span className="text-sm text-blue-100 ml-1">available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-5 shadow-md">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Booking Error</h4>
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={loadAppointments}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-semibold underline"
              >
                Try again →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <AppointmentSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Appointment List */}
      {!loading && appointments.length > 0 && (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onBook={handleBookAppointment}
              isLoading={bookingId === appointment.id}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && appointments.length === 0 && !error && (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Calendar className="w-10 h-10 text-blue-600" />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-2">
            No appointments available
          </h4>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            All slots are currently booked. Try selecting a different date or check back later for new openings.
          </p>
          <button
            onClick={loadAppointments}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Refresh Availability
          </button>
        </div>
      )}

      {/* Success Message */}
      {optimisticBookings.size > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 border-l-4 border-green-500 rounded-lg p-5 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Booking in Progress</h4>
              <p className="text-green-700 text-sm">
                {optimisticBookings.size} appointment{optimisticBookings.size > 1 ? 's' : ''} being confirmed...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 🎯 USAGE EXAMPLE
// ============================================================================

/*
// Usage in appointment booking component:
import { ProgressiveAppointmentLoader } from '@/components/ProgressiveAppointmentLoader';

const AppointmentBookingPage = () => {
  const [selectedDoctor, setSelectedDoctor] = useState('doctor_123');
  const [selectedDate, setSelectedDate] = useState('2024-01-15');

  return (
    <div>
      <ProgressiveAppointmentLoader
        doctorId={selectedDoctor}
        date={selectedDate}
        onAppointmentBooked={(booking) => {
          console.log('Appointment booked:', booking);
          // Navigate to confirmation page
        }}
      />
    </div>
  );
};
*/
