"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiClient, Doctor } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface BookAppointmentModalProps {
    // Optional: if omitted, modal shows when a doctor/doctorId is provided
    open?: boolean;
    onClose: () => void;
    // Support both direct doctor object and plain doctorId
    doctor?: Doctor | null;
    doctorId?: number | null;
    doctorName?: string;
    // Optional: if not provided, booking can be handled externally or we skip
    onSubmit?: (payload: { doctorId: number; date: string; time: string; reason?: string }) => Promise<void>;
    // Deprecated: the modal reads auth internally now; props kept for compatibility
    patientLoggedIn?: boolean;
    patientRole?: string | null;
}

export default function BookAppointmentModal({
    open,
    onClose,
    doctor,
    doctorId,
    doctorName,
    onSubmit,
    patientLoggedIn,
    patientRole,
}: BookAppointmentModalProps) {
    const { user } = useAuth();
    const effectivePatientLoggedIn = patientLoggedIn ?? !!user;
    const effectivePatientRole = patientRole ?? user?.role ?? null;
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    const [loadingAvail, setLoadingAvail] = useState<boolean>(false);
    type HourAvailabilityData = { periodMinutes: number; hours: { hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }[] };
    const [hourAvailability, setHourAvailability] = useState<HourAvailabilityData | null>(null);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Local caches to avoid re-fetching for the same doctor/date
    const cacheRef = useRef<{ slots: Map<string, any[]>; availability: Map<string, HourAvailabilityData> }>({
        slots: new Map(),
        availability: new Map(),
    });
    const fetchSeqRef = useRef(0);
    const bcRef = useRef<BroadcastChannel | null>(null);
    useEffect(() => {
        const bc = new BroadcastChannel('appointments-updates');
        bcRef.current = bc;
        return () => bc.close();
    }, []);

    const effectiveDoctorId = (doctorId ?? doctor?.id) ?? null;
    const effectiveDoctorName = doctorName ?? doctor?.doctorProfile?.clinicName ?? undefined;
    const isOpen = open ?? Boolean(effectiveDoctorId);

    if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);
        if (!effectiveDoctorId) {
            setError("Doctor not specified for booking.");
            return;
        }
		
		// Debug information
		console.log('Booking attempt:', {
			patientLoggedIn: effectivePatientLoggedIn,
			patientRole: effectivePatientRole,
			doctorId: effectiveDoctorId,
			date,
			reason
		});

		if (!effectivePatientLoggedIn) {
			setError("Please login to book an appointment.");
			return;
		}

		if (effectivePatientRole !== "PATIENT") {
			setError(`Only patients can book appointments. You are logged in as: ${effectivePatientRole || 'Unknown role'}`);
			return;
		}

        // Prevent booking in the past
        const selectedDate = new Date(date);
        if (isNaN(selectedDate.getTime())) {
            setError("Please select a valid date and time.");
            return;
        }
        if (selectedDate.getTime() < Date.now()) {
            setError("Cannot book a past time slot. Please choose a future time.");
            return;
        }

        try {
            setSubmitting(true);
            // Extract date and time from inputs to match backend expectations
            // date: YYYY-MM-DD, time: HH:mm
            const [dateOnly, timeHM] = date.includes('T') ? date.split('T') : [date, undefined];
            const payload = { 
                doctorId: effectiveDoctorId, 
                date: dateOnly, 
                time: (time || timeHM || selectedDate.toTimeString().slice(0,5)),
                reason: reason || undefined 
            };

            if (onSubmit) {
                await onSubmit(payload);
                // We may not have the appointment ID here; still broadcast minimal payload
                try {
                    bcRef.current?.postMessage({
                        type: 'appointment-booked',
                        payload: {
                            doctorId: effectiveDoctorId,
                            date: dateOnly,
                            time: (time || timeHM || selectedDate.toTimeString().slice(0,5)),
                            reason: reason || undefined,
                        },
                    });
                } catch {}
            } else {
                const result = await apiClient.bookAppointment(payload);
                try {
                    bcRef.current?.postMessage({
                        type: 'appointment-booked',
                        id: result?.appointmentId,
                        payload: {
                            doctorId: effectiveDoctorId,
                            date: dateOnly,
                            time: (time || timeHM || selectedDate.toTimeString().slice(0,5)),
                            reason: reason || undefined,
                        },
                    });
                } catch {}
            }
            setSuccess("Appointment booked successfully");
            setDate("");
            setReason("");
            setTimeout(() => {
                setSuccess(null);
                onClose();
            }, 900);
		} catch (err: any) {
			setError(err.message || "Failed to book appointment");
		} finally {
			setSubmitting(false);
		}
	};

    // Fetch available slot times whenever doctorId or date changes (with caching + parallel fetch)
    useEffect(() => {
        const run = async () => {
            setAvailableTimes([]);
            setHourAvailability(null);
            setTime("");
            if (!effectiveDoctorId || !date) return;
            const [dateOnly] = date.includes('T') ? date.split('T') : [date];
            const key = `${effectiveDoctorId}:${dateOnly}`;

            // Serve cached data instantly if available
            const cachedSlots = cacheRef.current.slots.get(key);
            const cachedAvail = cacheRef.current.availability.get(key);
            if (cachedSlots || cachedAvail) {
                if (cachedSlots) {
                    const times = cachedSlots
                        .filter((s: any) => s.status === 'AVAILABLE')
                        .map((s: any) => String(s.time).slice(0,5));
                    setAvailableTimes(Array.from(new Set(times)).sort());
                }
                if (cachedAvail) setHourAvailability(cachedAvail);
            }

            setLoadingAvail(true);
            const mySeq = ++fetchSeqRef.current;
            try {
                // Use the new optimized combined endpoint
                const combinedData = await apiClient.getSlotsAndAvailability({ 
                    doctorId: effectiveDoctorId, 
                    date: dateOnly 
                });
                if (mySeq !== fetchSeqRef.current) return; // ignore stale responses
                
                // Cache the data
                cacheRef.current.slots.set(key, Array.isArray(combinedData.slots) ? combinedData.slots : []);
                cacheRef.current.availability.set(key, combinedData.availability as HourAvailabilityData);
                
                // Set the data directly from the combined response
                setAvailableTimes(combinedData.availableTimes || []);
                setHourAvailability(combinedData.availability as HourAvailabilityData);
            } catch (e) {
                console.error('Failed to load slots/availability', e);
            } finally {
                setLoadingAvail(false);
            }
        };
        run();
    }, [effectiveDoctorId, date]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
			<div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-white text-gray-900 shadow-xl">
				<div className="sticky top-0 bg-white px-6 py-4 border-b">
					<h2 className="text-lg font-semibold">Book Appointment{effectiveDoctorName ? ` with ${effectiveDoctorName}` : ""}</h2>
				</div>
				<form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
					<div>
					<label className="block text-sm font-medium mb-1">Date</label>
					<input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						required
					/>

                    <div className="mt-3">
                        <label className="block text-sm font-medium mb-1">Time (IST)</label>
                        {availableTimes.length ? (
                            <select
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="" disabled>
                                    Select an available time
                                </option>
                                {availableTimes.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        ) : (
                            <HourAvailabilityGrid
                                availability={hourAvailability}
                                date={date}
                                selectedTime={time}
                                onSelect={(hour) => setTime(`${hour}:00`)}
                            />
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                            {loadingAvail
                                ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                                        <span>Loading available slots...</span>
                                    </div>
                                )
                                : availableTimes.length
                                    ? 'Select from published availability. All times are shown in IST.'
                                    : 'Pick an hour — we will assign the next available sub‑slot inside that hour based on the doctor\'s slot period. All times are in IST.'}
                        </div>
                    </div>
					</div>
					<div>
						<label className="block text-sm font-medium mb-1">Reason (optional)</label>
						<textarea
							className="w-full min-h-[90px] rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Describe your concern briefly"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
						/>
					</div>

			{/* Debug info - remove in production */}
			{process.env.NODE_ENV === 'development' && (
				<div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
					Debug: Logged in: {effectivePatientLoggedIn ? 'Yes' : 'No'}, Role: {effectivePatientRole || 'None'}
				</div>
			)}

					{error && <div className="text-sm text-red-600">{error}</div>}
					{success && <div className="text-sm text-green-600">{success}</div>}

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
						>
							Cancel
						</button>
					<button
						type="submit"
						disabled={submitting || !time || !date}
						className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{submitting ? "Booking..." : "Book Appointment"}
					</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// Grid of hour cards showing availability and allowing selection
function HourAvailabilityGrid({ availability, date, selectedTime, onSelect }: { availability: { periodMinutes: number; hours: { hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }[] } | null; date: string; selectedTime?: string | null; onSelect: (hour: string) => void }) {
    if (!date) {
        return <div className="text-sm text-gray-500">Select a date to see available slots.</div>;
    }
    if (!availability) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Loading availability...</span>
                </div>
            </div>
        );
    }
    const { hours } = availability;
    if (!hours?.length) {
        return <div className="text-sm text-gray-500">No availability published for this date.</div>;
    }

    return (
        <div className="grid grid-cols-2 gap-3">
            {hours.map(h => {
                const disabled = h.isFull;
                const isSelected = selectedTime ? String(selectedTime).slice(0,2) === h.hour : false;
                return (
                    <button
                        key={h.hour}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelect(h.hour)}
                        aria-pressed={isSelected}
                        className={`text-left px-3 py-2 rounded-lg border ${disabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : isSelected ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-200' : 'hover:bg-blue-50 border-gray-300'}`}
                    >
                        <div className="font-semibold">{h.labelFrom} - {h.labelTo}</div>
                        <div className={`text-sm ${disabled ? 'text-gray-500' : isSelected ? 'text-blue-700' : 'text-green-700'}`}>
                            {disabled ? 'Unavailable' : isSelected ? 'Selected' : 'Available'}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
