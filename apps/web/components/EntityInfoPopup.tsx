"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  MapPin, 
  Stethoscope, 
  Building2, 
  Globe, 
  Calendar, 
  Star, 
  Award,
  Clock,
  Shield,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail
} from "lucide-react";
import Link from "next/link";
import { EnhancedRatingDisplay } from "./SimpleRatingDisplay";
import { doctorMicrositeUrl, hospitalMicrositeUrl, customSubdomainUrl, shouldUseSubdomainNav } from "@/lib/subdomain";

interface EntityInfoPopupProps {
  entity: any;
  type: "doctor" | "hospital" | null;
  onClose: () => void;
  onBook?: (doctor: any) => void;
  top?: number;
}

export default function EntityInfoPopup({ entity, type, onClose, onBook, top = 408 }: EntityInfoPopupProps) {
  if (!entity || !type) return null;

  const isDoctor = type === "doctor";
  const name = isDoctor 
    ? `Dr. ${entity.email?.split('@')[0] || 'Unknown'}`
    : entity.name || 'Hospital';
  
  const profile = isDoctor ? entity.doctorProfile : (entity.profile?.general || {});
  const image = isDoctor 
    ? profile?.profileImage 
    : (profile?.logoUrl || entity.logoUrl);
  
  const specialization = isDoctor 
    ? (profile?.specialization || "General Practitioner")
    : "Multi-Specialty Hospital";

  const location = isDoctor
    ? profile?.city
    : [entity.city, entity.state].filter(Boolean).join(', ');

  const experience = isDoctor ? profile?.experience : null;
  const fee = isDoctor ? profile?.consultationFee : null;
  const slug = isDoctor ? profile?.slug : entity.subdomain;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="hidden lg:block fixed right-0 w-[22rem] z-40 bg-white rounded-bl-2xl shadow-2xl border-l border-b border-gray-200 overflow-hidden transition-all duration-500 ease-in-out"
        style={{ top: `${top}px` }}
      >
        {/* Header with close button */}
        <div className="relative h-24 bg-gradient-to-r from-blue-600 to-indigo-700">
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="absolute -bottom-6 left-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-4 border-white shadow-md bg-white">
              {image ? (
                <img src={image} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl">
                  {isDoctor ? "👨‍⚕️" : "🏥"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-8 px-4 pb-4">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              {isDoctor ? (
                <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span className="text-xs font-semibold text-gray-600">{specialization}</span>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {location && (
              <div className="flex items-center text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400" />
                {location}
              </div>
            )}
            {isDoctor && experience && (
              <div className="flex items-center text-xs text-gray-500">
                <Award className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                {experience}+ Years Experience
              </div>
            )}
            {isDoctor && fee && (
              <div className="flex items-center text-xs font-bold text-emerald-600">
                <span className="w-3.5 h-3.5 mr-2 flex items-center justify-center text-[10px]">₹</span>
                Consultation Fee: ₹{fee}
              </div>
            )}
            {!isDoctor && (
              <div className="flex items-center text-xs text-gray-500">
                <CheckCircle className="w-3.5 h-3.5 mr-2 text-blue-500" />
                24/7 Emergency Available
              </div>
            )}
          </div>

          <div className="mb-4">
            <EnhancedRatingDisplay entityType={isDoctor ? "doctor" : "hospital"} entityId={String(entity.id)} size="sm" />
          </div>

          <div className="flex gap-2">
            {isDoctor ? (
              <>
                <Link 
                  href={slug ? (shouldUseSubdomainNav() ? doctorMicrositeUrl(slug) : `/doctor-site/${slug}`) : "#"}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-2 px-3 rounded-lg text-[11px] text-center border border-gray-200 transition-colors"
                >
                  View Profile
                </Link>
                <button 
                  onClick={() => onBook?.(entity)}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-bold py-2 px-3 rounded-lg text-[11px] shadow-sm hover:shadow-md transition-all"
                >
                  Book Now
                </button>
              </>
            ) : (
              <Link 
                href={slug ? (shouldUseSubdomainNav() ? customSubdomainUrl(slug) : `/hospital-site/${entity.id}`) : `/hospital-site/${entity.id}`}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs text-center shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Visit Hospital <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
