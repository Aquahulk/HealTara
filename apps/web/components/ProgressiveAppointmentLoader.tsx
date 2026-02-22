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
  <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
      <div className="h-8 bg-gray-200 rounded w-20"></div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full"></div>
      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
    </div>
  </div>
);

// ============================================================================
// 📅 APPOINTMENT CARD COMPONENT
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
  <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Clock className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div className="font-semibold text-gray-900">
            {appointment.start_time} - {appointment.end_time}
          </div>
          <div className="text-sm text-gray-500">
            {appointment.appointment_date}
          </div>
        </div>
      </div>
      <button
        onClick={() => onBook(appointment)}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          isLoading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Booking...</span>
          </div>
        ) : (
          'Book Now'
        )}
      </button>
    </div>
    
    <div className="flex items-center space-x-4 text-sm text-gray-600">
      <div className="flex items-center space-x-1">
        <Calendar className="w-4 h-4" />
        <span>Available</span>
      </div>
      <div className="flex items-center space-x-1">
        <User className="w-4 h-4" />
        <span>Dr. {appointment.doctor_name || 'Available'}</span>
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
        
        // Invalidate cache
        onAppointmentBooked(doctorId, date);
        
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Available Appointments
        </h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          {loading && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading...</span>
            </div>
          )}
          {!loading && (
            <span>{appointments.length} available</span>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadAppointments}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <AppointmentSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Appointment List */}
      {!loading && appointments.length > 0 && (
        <div className="space-y-3">
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
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            No appointments available
          </h4>
          <p className="text-gray-600 mb-4">
            Try selecting a different date or check back later.
          </p>
          <button
            onClick={loadAppointments}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Success Message */}
      {optimisticBookings.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span>
              {optimisticBookings.size} appointment{optimisticBookings.size > 1 ? 's' : ''} being booked...
            </span>
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
