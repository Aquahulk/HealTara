"use client";

import React from "react";
import Link from "next/link";
import { Doctor } from "@/lib/api";

export interface DoctorCardProps {
    doctor: Doctor;
    // Prefer this handler: pages pass a closed-over doctor to trigger booking
    onBookAppointment?: () => void;
    // Backward-compatible handler: accepts a doctorId
    onBookClick?: (doctorId: number) => void;
}

export default function DoctorCard({ doctor, onBookAppointment, onBookClick }: DoctorCardProps) {
    const profile = doctor.doctorProfile;
    const clinicName = profile?.clinicName || "Clinic";
    const specialization = profile?.specialization || "Specialist";
    const fee = profile?.consultationFee;
    const city = profile?.city;
    const state = profile?.state;
    const slug = profile?.slug;

	return (
		<div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
			<div className="p-4 flex-1">
				<h3 className="text-xl font-semibold text-gray-900">{clinicName}</h3>
				<p className="text-sm text-gray-600 mt-1">{specialization}</p>
				<p className="text-sm text-gray-500 mt-2">
					{city && state ? `${city}, ${state}` : city || state || ""}
				</p>
				{typeof fee === "number" && (
					<p className="text-sm text-gray-700 mt-2">Fee: ₹{fee}</p>
				)}
			</div>
			<div className="p-4 border-t border-gray-200 flex gap-3">
				{slug ? (
					<Link
						href={`/site/${slug}`}
						className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 rounded-lg transition-colors"
					>
						View Site
					</Link>
				) : (
					<div className="flex-1 text-center bg-gray-100 text-gray-400 font-medium py-2 rounded-lg cursor-not-allowed">
						No Site
					</div>
				)}
                {onBookAppointment || onBookClick ? (
                    <button
                        onClick={() => {
                            if (onBookAppointment) {
                                onBookAppointment();
                            } else if (onBookClick) {
                                onBookClick(doctor.id);
                            }
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
                    >
                        Book
                    </button>
                ) : (
                    <div className="flex-1 text-center bg-gray-100 text-gray-400 font-medium py-2 rounded-lg cursor-not-allowed">
                        Book
                    </div>
                )}
            </div>
        </div>
    );
}
