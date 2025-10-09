"use client";

import React, { useEffect, useMemo, useState } from "react";
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
    onSubmit?: (payload: { doctorId: number; date: string; reason?: string; time?: string }) => Promise<void>;
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
    type HourAvailabilityData = { periodMinutes: number; hours: { hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }[] };
    const [hourAvailability, setHourAvailability] = useState<HourAvailabilityData | null>(null);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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
            } else {
                await apiClient.bookAppointment(payload);
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

    // Fetch available slot times whenever doctorId or date changes
    useEffect(() => {
        const run = async () => {
            setAvailableTimes([]);
            setTime("");
            if (!effectiveDoctorId || !date) return;
            try {
                const [dateOnly] = date.includes('T') ? date.split('T') : [date];
                // Load published slots (optional slots behavior remains)
                const slots = await apiClient.getSlots({ doctorId: effectiveDoctorId, date: dateOnly });
                const times = slots
                    .filter((s: any) => s.status === 'AVAILABLE')
                    .map((s: any) => String(s.time).slice(0,5));
                const uniqueSorted = Array.from(new Set(times)).sort();
                setAvailableTimes(uniqueSorted);

                // Load hour-level availability for capacity display
                const availability = await apiClient.getAvailability({ doctorId: effectiveDoctorId, date: dateOnly });
                setHourAvailability(availability);
            } catch (e) {
                console.error('Failed to load slots/availability', e);
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
                            {availableTimes.length
                                ? 'Select from published availability. All times are shown in IST.'
                                : 'Pick an hour — we will assign the next available sub‑slot inside that hour based on the doctor’s slot period. All times are in IST.'}
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
        return <div className="text-sm text-gray-500">Loading availability…</div>;
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
