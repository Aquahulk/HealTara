"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  MessageCircle, 
  Phone, 
  Mail,
  CheckCircle,
  AlertCircle,
  XCircle,
  Activity,
  History
} from "lucide-react";

interface PatientDetailPopupProps {
  appointment: any;
  onClose: () => void;
  onStatusUpdate?: (id: number, status: string) => void;
}

export default function PatientDetailPopup({ appointment, onClose, onStatusUpdate }: PatientDetailPopupProps) {
  if (!appointment) return null;

  const patient = appointment.patient || {};
  const patientName = patient.name || patient.email?.split('@')[0] || `Patient ${appointment.patientId}`;
  const status = appointment.status;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
      case 'PENDING':
        return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertCircle };
      case 'CANCELLED':
        return { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle };
      case 'COMPLETED':
        return { color: 'text-indigo-600', bg: 'bg-indigo-50', icon: CheckCircle };
      case 'EMERGENCY':
        return { color: 'text-rose-600', bg: 'bg-rose-50', icon: Activity };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', icon: AlertCircle };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  const formatIST = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
        hour12: false
      }).format(new Date(dateStr));
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-[24rem] z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold truncate max-w-[14rem]">{patientName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusConfig.bg} ${statusConfig.color} border border-current`}>
                  <StatusIcon className="w-3 h-3" />
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Appointment Details */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Appointment Details
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Appointment ID</span>
                <span className="text-xs font-mono font-bold text-gray-900">#{appointment.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Scheduled For</span>
                <span className="text-xs font-bold text-gray-900">{formatIST(appointment.date)}</span>
              </div>
              {appointment.time && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Time Slot</span>
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {appointment.time}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Reason / Notes */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Reason for Visit
            </h3>
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "{appointment.reason || 'No specific reason provided for this visit.'}"
              </p>
            </div>
          </section>

          {/* Patient Info */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-purple-500" />
              Patient Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <Mail className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Email Address</div>
                  <div className="text-sm text-gray-700 font-medium">{patient.email || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <Phone className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Contact Number</div>
                  <div className="text-sm text-gray-700 font-medium">+91 98765 43210</div> {/* Mock data */}
                </div>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <section className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onStatusUpdate?.(appointment.id, 'CONFIRMED')}
                className="flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
              >
                <CheckCircle className="w-4 h-4" /> Confirm
              </button>
              <button 
                onClick={() => onStatusUpdate?.(appointment.id, 'COMPLETED')}
                className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
              >
                <CheckCircle className="w-4 h-4" /> Complete
              </button>
            </div>
            <button 
              onClick={() => onStatusUpdate?.(appointment.id, 'CANCELLED')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              <XCircle className="w-4 h-4" /> Cancel Appointment
            </button>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors">
            <History className="w-3.5 h-3.5" /> Medical History
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 rounded-lg text-xs font-bold text-white hover:bg-blue-700 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> Message
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
