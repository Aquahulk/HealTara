"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiClient, Doctor } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { io } from "socket.io-client";

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
    const [workingHoursForDay, setWorkingHoursForDay] = useState<{ start: string; end: string } | null>(null);
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
    const socketRef = useRef<any>(null);
    useEffect(() => {
        const bc = new BroadcastChannel('appointments-updates');
        bcRef.current = bc;
        return () => bc.close();
    }, []);

    const effectiveDoctorId = (doctorId ?? doctor?.id) ?? null;
    const effectiveDoctorName = doctorName ?? doctor?.doctorProfile?.clinicName ?? undefined;
    const isOpen = open ?? Boolean(effectiveDoctorId);

    if (!isOpen) return null;

    // Lightweight realtime: listen for bookings and refresh availability
    useEffect(() => {
        if (!effectiveDoctorId || !date) return;
        const refresh = async () => {
            try {
                const [dateOnly] = date.includes('T') ? date.split('T') : [date];
                const key = `${effectiveDoctorId}:${dateOnly}`;
                const [combined, insights] = await Promise.all([
                    apiClient.getSlotsAndAvailability({ doctorId: effectiveDoctorId, date: dateOnly }).catch(() => null),
                    apiClient.getSlotInsights({ doctorId: effectiveDoctorId, date: dateOnly }).catch(() => null),
                ]);
                const slots = Array.isArray((combined as any).slots) ? (combined as any).slots : [];
                const times = slots
                    .filter((s: any) => s.status === 'AVAILABLE')
                    .map((s: any) => String(s.time).slice(0,5));
                cacheRef.current.slots.set(key, slots);
                const avail = (insights as any)?.availability || (combined as any)?.availability;
                if (avail) cacheRef.current.availability.set(key, avail);
                setAvailableTimes(Array.from(new Set(times)).sort());
                setHourAvailability(avail as any);
            } catch {}
        };

        const bc = bcRef.current;
        const onMsg = (ev: MessageEvent) => {
            try {
                const msg: any = ev.data;
                const t = msg?.type;
                const did = Number(msg?.payload?.doctorId);
                const dt = String(msg?.payload?.date || '');
                if (!did || did !== effectiveDoctorId) return;
                const [dateOnly] = date.includes('T') ? date.split('T') : [date];
                if (dt && dt !== dateOnly) return;
                refresh();
            } catch {}
        };
        bc?.addEventListener('message', onMsg as any);

        // Socket.io for cross-client realtime
        try {
            const { io } = require('socket.io-client');
            const socket = io(process.env.NEXT_PUBLIC_API_URL || undefined, { transports: ['websocket'] });
            socketRef.current = socket;
            socket.on('connect', () => {
                try { socket.emit('join-doctor', effectiveDoctorId); } catch {}
            });
            const onAny = (payload: any) => {
                try {
                    const did = Number(payload?.doctorId ?? payload?.appointment?.doctorId ?? payload?.appointment?.doctor?.id);
                    // Some events send nested appointment
                    const appt = (payload?.appointment || payload) as any;
                    const dt = appt?.date;
                    const [dateOnly] = date.includes('T') ? date.split('T') : [date];
                    if (did === effectiveDoctorId && (!dt || dt === dateOnly)) refresh();
                } catch {}
            };
            socket.on('appointment-booked', onAny);
            socket.on('appointment-updated', onAny);
            socket.on('appointment-cancelled', onAny);
        } catch {}

        return () => {
            try { bc?.removeEventListener('message', onMsg as any); } catch {}
            try { socketRef.current?.disconnect?.(); socketRef.current = null; } catch {}
        };
    }, [effectiveDoctorId, date]);

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
    
        // Prevent booking in the past (include hour/minute if selected)
        const selectedDateOnly = date;
        if (!selectedDateOnly) {
            setError("Please select a valid date and time.");
            return;
        }
        const selectedDateTimeStr = time ? `${selectedDateOnly}T${time}:00` : `${selectedDateOnly}T00:00:00`;
        const selectedDateTime = new Date(selectedDateTimeStr);
        if (isNaN(selectedDateTime.getTime())) {
            setError("Please select a valid date and time.");
            return;
        }
        if (selectedDateTime.getTime() < Date.now()) {
            setError("Cannot book a past time slot. Please choose a future time.");
            return;
        }
    
        setSubmitting(true);
        try {
            // Extract date and time from inputs to match backend expectations
            // date: YYYY-MM-DD, time: HH:mm
            const [dateOnly] = selectedDateOnly.includes('T') ? selectedDateOnly.split('T') : [selectedDateOnly];
            const payload = {
                doctorId: effectiveDoctorId,
                date: dateOnly,
                time: (time || selectedDateTime.toTimeString().slice(0,5)),
                reason: reason || undefined
            };
    
            const bc = bcRef.current;
            const bookingPromise = onSubmit ? onSubmit(payload) : apiClient.bookAppointment(payload);
            const timeoutMs = 2000; // fast confirm within 2s
    
            const outcome: any = await Promise.race([
                bookingPromise.then((res: any) => ({ kind: 'ok', res })).catch((err: any) => ({ kind: 'err', err })),
                new Promise((resolve) => setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs)),
            ]);
    
            if (outcome.kind === 'ok') {
                try {
                    bc?.postMessage({
                        type: 'appointment-booked',
                        id: outcome?.res?.appointmentId,
                        payload: {
                            doctorId: effectiveDoctorId,
                            doctorName: effectiveDoctorName,
                            date: dateOnly,
                            time: (time || selectedDateTime.toTimeString().slice(0,5)),
                            reason: reason || undefined,
                        },
                    });
                } catch {}
                try {
                    const key = `${effectiveDoctorId}:${dateOnly}`;
                    const localStorageKey = `slots_${key}`;
                    localStorage.removeItem(localStorageKey);
                    localStorage.removeItem(`${localStorageKey}_timestamp`);
                } catch {}
                // Removed inline success text; close quickly after broadcast
                setDate("");
                setReason("");
                onClose();
            } else if (outcome.kind === 'timeout') {
                // Optimistic quick close; keep booking in background
                try {
                    bc?.postMessage({
                        type: 'appointment-pending',
                        payload: {
                            doctorId: effectiveDoctorId,
                            doctorName: effectiveDoctorName,
                            date: dateOnly,
                            time: (time || selectedDateTime.toTimeString().slice(0,5)),
                            reason: reason || undefined,
                        },
                    });
                } catch {}
                // Removed inline "confirming" text; close and rely on status bar
                setDate("");
                setReason("");
                setTimeout(() => onClose(), 300);
                bookingPromise
                    .then((res: any) => {
                        try {
                            bc?.postMessage({
                                type: 'appointment-booked',
                                id: res?.appointmentId,
                                payload: {
                                    doctorId: effectiveDoctorId,
                                    date: dateOnly,
                                    time: (time || selectedDateTime.toTimeString().slice(0,5)),
                                    reason: reason || undefined,
                                },
                            });
                        } catch {}
                        try {
                            const key = `${effectiveDoctorId}:${dateOnly}`;
                            const localStorageKey = `slots_${key}`;
                            localStorage.removeItem(localStorageKey);
                            localStorage.removeItem(`${localStorageKey}_timestamp`);
                        } catch {}
                    })
                    .catch((err: any) => {
                        try {
                            bc?.postMessage({
                                type: 'appointment-failed',
                                error: err?.message || 'Booking failed',
                                payload: {
                                    doctorId: effectiveDoctorId,
                                    date: dateOnly,
                                    time: (time || selectedDateTime.toTimeString().slice(0,5)),
                                    reason: reason || undefined,
                                },
                            });
                        } catch {}
                    });
            } else {
                const raw = outcome?.err?.message || "Failed to book appointment";
                const friendly = raw === 'You do not have permission to perform this action.'
                    ? 'This doctor’s scheduling is managed by hospital staff. Please contact the hospital or choose a different doctor.'
                    : raw;
                setError(friendly);
            }
        } catch (err: any) {
            const raw = err?.message || "Failed to book appointment";
            const friendly = raw === 'You do not have permission to perform this action.'
                ? 'This doctor’s scheduling is managed by hospital staff. Please contact the hospital or choose a different doctor.'
                : raw;
            setError(friendly);
        } finally {
            setSubmitting(false);
        }
    };

    // Optimized time slot loading with aggressive caching and parallel requests
    useEffect(() => {
        const run = async () => {
            setAvailableTimes([]);
            setHourAvailability(null);
            setTime("");
            if (!effectiveDoctorId || !date) return;
            const [dateOnly] = date.includes('T') ? date.split('T') : [date];
            const key = `${effectiveDoctorId}:${dateOnly}`;

            // Check localStorage cache first (persistent across sessions)
            const localStorageKey = `slots_${key}`;
            const cachedData = localStorage.getItem(localStorageKey);
            const cacheTimestamp = localStorage.getItem(`${localStorageKey}_timestamp`);
            const isCacheValid = cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < 10 * 60 * 1000; // 10 minutes cache

            if (isCacheValid && cachedData) {
                try {
                    const parsedData = JSON.parse(cachedData);
                    if (parsedData.slots) {
                        const times = parsedData.slots
                            .filter((s: any) => s.status === 'AVAILABLE')
                            .map((s: any) => String(s.time).slice(0,5));
                        setAvailableTimes(Array.from(new Set(times)).sort() as string[]);
                    }
                    if (parsedData.availability) {
                        setHourAvailability(parsedData.availability);
                    }
                    // Show cached instantly, but continue to fetch fresh in background
                } catch (e) {
                    console.warn('Invalid cached slot data, fetching fresh');
                }
            }

            // Serve in-memory cached data instantly if available
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

            // Instant fallback: show a generic hour grid so users can pick quickly
            if (!hourAvailability) {
                const mkLabel = (h: number) => ({
                    hour: String(h).padStart(2, '0'),
                    capacity: -1,
                    bookedCount: 0,
                    isFull: false,
                    labelFrom: `${String(h).padStart(2, '0')}:00`,
                    labelTo: `${String(h + 1).padStart(2, '0')}:00`,
                });
                const fallbackHours = Array.from({ length: 8 }, (_, i) => mkLabel(10 + i)); // 10:00–18:00
                setHourAvailability({ periodMinutes: 60, hours: fallbackHours });
            }
            
            // Retry mechanism for failed requests
            const fetchWithRetry = async (retries = 2) => {
                for (let attempt = 0; attempt <= retries; attempt++) {
                    try {
                        const combinedData = await Promise.race([
                            Promise.all([
                                apiClient.getSlotsAndAvailability({ doctorId: effectiveDoctorId, date: dateOnly }).catch(() => null),
                                apiClient.getSlotInsights({ doctorId: effectiveDoctorId, date: dateOnly }).catch(() => null),
                            ]).then(([avail, insights]) => ({ avail, insights })),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Request timeout')), 3000) // 3 seconds timeout
                            )
                        ]);
                        return combinedData;
                    } catch (error) {
                        if (attempt === retries) throw error;
                        console.warn(`Attempt ${attempt + 1} failed, retrying...`, error);
                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
                    }
                }
            };
            
            try {
                const combinedData = await fetchWithRetry() as any;
                
                if (mySeq !== fetchSeqRef.current) return; // ignore stale responses
                
                // Cache the data in memory
                const slotsArr = Array.isArray(combinedData?.avail?.slots) ? combinedData.avail.slots : [];
                cacheRef.current.slots.set(key, slotsArr);
                const availToUse: HourAvailabilityData | null = (combinedData?.insights?.availability) || (combinedData?.avail?.availability) || null;
                if (availToUse) cacheRef.current.availability.set(key, availToUse);
                
                // Cache in localStorage for persistence
                const cacheData = {
                    slots: slotsArr,
                    availability: availToUse
                };
                localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
                localStorage.setItem(`${localStorageKey}_timestamp`, Date.now().toString());
                
                // Fetch doctor working hours and filter available times to fit day window
                const dayIdx = new Date(dateOnly).getDay();
                let whForDay: { start: string; end: string } | null = null;
                try {
                    const whList = await apiClient.getSlotAdminWorkingHours({ doctorId: effectiveDoctorId });
                    const found = Array.isArray(whList) ? whList.find((wh: any) => wh.dayOfWeek === dayIdx) : null;
                    if (found && found.startTime && found.endTime) {
                        whForDay = { start: String(found.startTime).slice(0,5), end: String(found.endTime).slice(0,5) };
                    }
                } catch {}
                setWorkingHoursForDay(whForDay);

                // Set data and apply timing filter when available
                const rawTimes = (combinedData?.avail?.availableTimes) || [];
                const filterByWH = (times: string[]) => {
                    if (!whForDay) return times;
                    const toMin = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
                    const whStart = toMin(whForDay.start);
                    const whEnd = toMin(whForDay.end);
                    return times.filter((t) => {
                        const m = toMin(t);
                        return m >= whStart && m < whEnd; // start inclusive, end exclusive
                    });
                };
                setAvailableTimes(filterByWH(rawTimes));
                // Filter hour availability to fit working hours window
                const filterHoursByWH = (hours: { hour: string; labelFrom: string; labelTo: string; capacity: number; bookedCount: number; isFull: boolean }[]) => {
                    if (!whForDay) return hours;
                    const toMin = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
                    const whStart = toMin(whForDay.start);
                    const whEnd = toMin(whForDay.end);
                    return hours.filter(h => {
                        const hourStartMin = Number(h.hour) * 60;
                        const hourEndMin = hourStartMin + 60;
                        return hourStartMin >= whStart && hourEndMin <= whEnd;
                    });
                };
                const av = availToUse as HourAvailabilityData | null;
                if (av) {
                  const filteredHours = filterHoursByWH(av.hours);
                  setHourAvailability({ periodMinutes: av.periodMinutes, hours: filteredHours });
                }
            } catch (e: any) {
                console.error('Failed to load slots/availability', e);
                if (mySeq === fetchSeqRef.current) {
                    // Show user-friendly error message and try to use cached data
                    if (e?.message === 'Request timeout') {
                        console.warn('Request timed out, showing cached data if available');
                        // Try to show any cached data we have
                        const cachedSlots = cacheRef.current.slots.get(key);
                        if (cachedSlots && cachedSlots.length > 0) {
                            const times = cachedSlots
                                .filter((s: any) => s.status === 'AVAILABLE')
                                .map((s: any) => String(s.time).slice(0,5));
                            setAvailableTimes(Array.from(new Set(times)).sort());
                        }
                        // Ensure we at least have a generic hour grid visible
                        if (!hourAvailability) {
                            const mkLabel = (h: number) => ({
                                hour: String(h).padStart(2, '0'),
                                capacity: -1,
                                bookedCount: 0,
                                isFull: false,
                                labelFrom: `${String(h).padStart(2, '0')}:00`,
                                labelTo: `${String(h + 1).padStart(2, '0')}:00`,
                            });
                            const fallbackHours = Array.from({ length: 8 }, (_, i) => mkLabel(10 + i));
                            setHourAvailability({ periodMinutes: 60, hours: fallbackHours });
                        }
                    } else {
                        setAvailableTimes([]);
                        // Provide generic fallback grid instead of spinner
                        const mkLabel = (h: number) => ({
                            hour: String(h).padStart(2, '0'),
                            capacity: -1,
                            bookedCount: 0,
                            isFull: false,
                            labelFrom: `${String(h).padStart(2, '0')}:00`,
                            labelTo: `${String(h + 1).padStart(2, '0')}:00`,
                        });
                        const fallbackHours = Array.from({ length: 8 }, (_, i) => mkLabel(10 + i));
                        setHourAvailability({ periodMinutes: 60, hours: fallbackHours });
                    }
                }
            } finally {
                if (mySeq === fetchSeqRef.current) {
                    setLoadingAvail(false);
                }
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
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                onSelect={(h) => {
                                    // Allow selecting hour from grid; if specific times are available, pick the first.
                                    const matchingTimes = availableTimes.filter((t) => t.startsWith(h));
                                    if (matchingTimes.length > 0) {
                                        setTime(matchingTimes[0]);
                                    } else {
                                        // No specific times list — default to hour start to enable booking
                                        setTime(`${h}:00`);
                                    }
                                }}
                            />
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                            {loadingAvail
                                ? (
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                                            <span>Loading available slots...</span>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            If this takes too long, we'll show cached data if available
                                        </div>
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
                <div className="text-xs text-gray-400 mt-2">
                    This may take a few moments. Please wait...
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
                const slotsLeft = Math.max(0, h.capacity - h.bookedCount);
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
                        <div className="mt-1 text-xs text-gray-600">
                            {h.bookedCount}/{h.capacity} booked{slotsLeft > 0 ? ` • ${slotsLeft} left` : ''}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}


// removed stray duplicate realtime and overlay code
