'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import { Building2, MapPin, Phone, ExternalLink, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HospitalContextBannerProps {
  userId: number;
}

export default function HospitalContextBanner({ userId }: HospitalContextBannerProps) {
  const [hospitalContext, setHospitalContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHospitalContext = async () => {
      try {
        const context = await apiClient.getDoctorHospitalContext();
        setHospitalContext(context);
      } catch (err: any) {
        console.error('Error fetching hospital context:', err);
        setError(err.message || 'Failed to load hospital context');
      } finally {
        setLoading(false);
      }
    };

    fetchHospitalContext();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl p-6 mb-6 animate-pulse">
        <div className="h-6 bg-purple-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-purple-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !hospitalContext?.linked) {
    return null; // Don't show anything if not linked or error
  }

  const { hospital, department, permissions } = hospitalContext;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl mb-6 border border-purple-400"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="relative z-10 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left Section - Hospital Info */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/30">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white/90 text-sm font-semibold uppercase tracking-wide">You're a doctor at</p>
                  {hospital.status === 'ACTIVE' ? (
                    <span className="bg-green-500/30 text-green-100 text-xs font-bold px-2 py-0.5 rounded-full border border-green-400/50">Active</span>
                  ) : (
                    <span className="bg-yellow-500/30 text-yellow-100 text-xs font-bold px-2 py-0.5 rounded-full border border-yellow-400/50">{hospital.status}</span>
                  )}
                </div>
                
                <h3 className="text-white text-2xl md:text-3xl font-black mb-2">{hospital.name}</h3>
                
                <div className="flex flex-wrap items-center gap-3 text-white/80 text-sm">
                  {department && (
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/20">
                      <span className="font-semibold">Department:</span>
                      <span className="text-white">{department.name}</span>
                    </div>
                  )}
                  
                  {hospital.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>{hospital.city}{hospital.state ? `, ${hospital.state}` : ''}</span>
                    </div>
                  )}
                  
                  {hospital.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      <span>{hospital.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex flex-col gap-3">
              <Link href={`/hospital-site/${hospital.id}`} target="_blank">
                <button className="bg-white hover:bg-purple-50 text-purple-600 px-6 py-3 rounded-xl font-bold shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group">
                  <span>View Hospital Profile</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </Link>
              
              {permissions.hospitalCanOverride && (
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                  <div className="flex items-center gap-2 text-white/90 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Hospital admin can manage your slots</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decorative border glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-indigo-400 opacity-20 blur-xl"></div>
      </motion.div>
    </AnimatePresence>
  );
}
