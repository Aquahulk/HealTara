"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, MapPin, Stethoscope, Building2, Globe, Calendar, Star, Award,
  Clock, Shield, CheckCircle, ArrowRight, Phone, Users, Activity,
  ExternalLink, Navigation, Heart
} from "lucide-react";
import Link from "next/link";
import { EnhancedRatingDisplay } from "./SimpleRatingDisplay";
import { doctorMicrositeUrl, hospitalMicrositeUrl, customSubdomainUrl, shouldUseSubdomainNav } from "@/lib/subdomain";
import SaveButton from "./SaveButton";

interface EntityInfoPopupProps {
  entity: any;
  type: "doctor" | "hospital" | null;
  onClose: () => void;
  onBook?: (doctor: any) => void;
  top?: number;
}

export default function EntityInfoPopup({ entity, type, onClose, onBook, top = 64 }: EntityInfoPopupProps) {
  if (!entity || !type) return null;

  const isDoctor = type === "doctor";
  const profile = isDoctor ? entity.doctorProfile : (entity.profile?.general || {});
  
  // Doctor name
  const name = isDoctor 
    ? (profile?.clinicName || profile?.name || entity.email?.split('@')[0]?.replace(/^(dr|doc)[\._-]?/i, '').replace(/[._-]/g, ' ').replace(/\d{3,}/g, '').trim() || 'Doctor')
    : (entity.name || 'Hospital');
  
  const image = isDoctor ? profile?.profileImage : (profile?.logoUrl || entity.logoUrl);
  const specialization = isDoctor ? (profile?.specialization || "General Practitioner") : "Multi-Specialty Hospital";
  const location = isDoctor ? [profile?.city, profile?.state].filter(Boolean).join(', ') : [entity.city, entity.state].filter(Boolean).join(', ');
  const experience = isDoctor ? profile?.experience : null;
  const fee = isDoctor ? profile?.consultationFee : null;
  const slug = isDoctor ? profile?.slug : entity.subdomain;
  const phone = isDoctor ? profile?.phone : entity.phone;
  const about = isDoctor ? profile?.about : (profile?.description || entity.description);
  const services = isDoctor ? (profile?.services || []) : [];
  const qualifications = isDoctor ? profile?.qualifications : null;
  const clinicAddress = isDoctor ? profile?.clinicAddress : entity.address;
  const lat = isDoctor ? profile?.latitude : entity.latitude;
  const lon = isDoctor ? profile?.longitude : entity.longitude;

  // Hospital-specific
  const deptCount = !isDoctor ? (entity._count?.departments || 0) : 0;
  const docCount = !isDoctor ? (entity._count?.doctors || 0) : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="hidden lg:flex fixed right-0 w-[31vw] z-40 flex-col bg-white shadow-2xl border-l border-gray-200 overflow-hidden"
        style={{ top: `${top}px`, height: `calc(100vh - ${top}px)` }}
      >
        {/* Header */}
        <div className="relative flex-shrink-0">
          <div className={`h-28 ${isDoctor ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700' : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-800'}`}>
            {/* Decorative circles */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-8 w-20 h-20 bg-white rounded-full" />
              <div className="absolute -bottom-4 left-12 w-16 h-16 bg-white rounded-full" />
            </div>
          </div>
          
          {/* Close */}
          <button onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10 backdrop-blur-sm">
            <X className="w-4 h-4" />
          </button>

          {/* Save */}
          <div className="absolute top-3 right-12 z-10">
            <SaveButton entityType={isDoctor ? "doctor" : "hospital"} entityId={entity.id} />
          </div>

          {/* Avatar */}
          <div className="absolute -bottom-8 left-5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-white">
              {image ? (
                <img src={image} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-3xl ${isDoctor ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
                  {isDoctor ? "👨‍⚕️" : "🏥"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pt-12 px-5 pb-5">
          {/* Name + specialty */}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{isDoctor ? `Dr. ${name}` : name}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              {isDoctor ? <Stethoscope className="w-3.5 h-3.5 text-emerald-500" /> : <Building2 className="w-3.5 h-3.5 text-indigo-500" />}
              <span className="text-xs font-semibold text-gray-600">{specialization}</span>
            </div>
            {qualifications && <p className="text-[11px] text-gray-500 mt-0.5">{qualifications}</p>}
          </div>

          {/* Rating */}
          <div className="mb-4">
            <EnhancedRatingDisplay entityType={isDoctor ? "doctor" : "hospital"} entityId={String(entity.id)} size="sm" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {isDoctor ? (
              <>
                {experience && <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100"><div className="text-sm font-black text-blue-700">{experience}+</div><div className="text-[8px] text-blue-500 font-bold uppercase">Years</div></div>}
                {fee && <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-100"><div className="text-sm font-black text-emerald-700">₹{fee}</div><div className="text-[8px] text-emerald-500 font-bold uppercase">Fee</div></div>}
                <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-100"><div className="text-sm font-black text-purple-700">⚡</div><div className="text-[8px] text-purple-500 font-bold uppercase">Available</div></div>
              </>
            ) : (
              <>
                <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100"><div className="text-sm font-black text-blue-700">{deptCount}</div><div className="text-[8px] text-blue-500 font-bold uppercase">Depts</div></div>
                <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-100"><div className="text-sm font-black text-emerald-700">{docCount}</div><div className="text-[8px] text-emerald-500 font-bold uppercase">Doctors</div></div>
                <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-100"><div className="text-sm font-black text-purple-700">24/7</div><div className="text-[8px] text-purple-500 font-bold uppercase">Open</div></div>
              </>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-2.5 mb-4">
            {location && (
              <div className="flex items-start gap-2.5 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{location}</p>
                  {clinicAddress && <p className="text-xs text-gray-500">{clinicAddress}</p>}
                </div>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{phone}</span>
              </div>
            )}
            {!isDoctor && (
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-medium">Verified & Approved</span>
              </div>
            )}
          </div>

          {/* About */}
          {about && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-900 mb-1 uppercase tracking-wider">About</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{typeof about === 'string' ? about.slice(0, 300) : ''}{about && about.length > 300 ? '…' : ''}</p>
            </div>
          )}

          {/* Services */}
          {services.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-900 mb-1.5 uppercase tracking-wider">Services</h4>
              <div className="flex flex-wrap gap-1.5">
                {services.slice(0, 8).map((s: string, i: number) => (
                  <span key={i} className="bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-1 rounded-md border border-gray-200">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Directions */}
          {Number.isFinite(lat) && Number.isFinite(lon) && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mb-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 text-xs font-bold transition-colors">
              <Navigation className="w-3.5 h-3.5" /> Get Directions
            </a>
          )}
        </div>

        {/* Fixed bottom actions */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            {isDoctor ? (
              <>
                <Link 
                  href={slug ? (shouldUseSubdomainNav() ? doctorMicrositeUrl(slug) : `/doctor-site/${slug}`) : "#"}
                  className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-3 rounded-lg text-xs text-center border border-gray-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full Profile
                </Link>
                <button 
                  onClick={() => onBook?.(entity)}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" /> Book Now
                </button>
              </>
            ) : (
              <Link 
                href={slug ? (shouldUseSubdomainNav() ? customSubdomainUrl(slug) : `/hospital-site/${entity.id}`) : `/hospital-site/${entity.id}`}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold py-2.5 px-4 rounded-lg text-xs text-center shadow-md transition-all flex items-center justify-center gap-2"
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
