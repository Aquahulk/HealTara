"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth();

  // Patient form state
  const [patientMode, setPatientMode] = useState<"login" | "register">("login");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [patientConfirm, setPatientConfirm] = useState("");

  // Provider (Doctor/Hospital) state
  const [providerRole, setProviderRole] = useState<"DOCTOR" | "HOSPITAL_ADMIN">("DOCTOR");
  const [providerMode, setProviderMode] = useState<"login" | "register">("login"); // register only for DOCTOR
  const [providerEmail, setProviderEmail] = useState("");
  const [providerPassword, setProviderPassword] = useState("");
  const [licenseNumber, setLicenseNumber] = useState(""); // doctor-only
  const [clinicName, setClinicName] = useState(""); // doctor-only optional

  // Common UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  // New: Optional name fields
  const [patientName, setPatientName] = useState("");
  const [providerName, setProviderName] = useState("");

  if (!open) return null;

  const resetAll = () => {
    setPatientEmail("");
    setPatientPassword("");
    setPatientConfirm("");
    setProviderEmail("");
    setProviderPassword("");
    setLicenseNumber("");
    setClinicName("");
    setMessage("");
    setPatientName("");
    setProviderName("");
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      if (patientMode === "login") {
        await login(patientEmail, patientPassword);
      } else {
        // basic validations
        if (patientPassword.length < 6) throw new Error("Password must be at least 6 characters.");
        if (patientPassword !== patientConfirm) throw new Error("Passwords do not match.");
        await register(patientEmail, patientPassword, "PATIENT", patientName.trim() || undefined);
      }
      onClose();
      resetAll();
    } catch (err: any) {
      setMessage(err?.message || "Unable to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      if (providerMode === "login") {
        await login(providerEmail, providerPassword);
      } else {
        // register only for doctors
        if (providerRole !== "DOCTOR") {
          throw new Error("Registration is available for Doctors only.");
        }
        if (!licenseNumber.trim()) throw new Error("License number is required for Doctor registration.");
        if (providerPassword.length < 6) throw new Error("Password must be at least 6 characters.");
        // Note: backend currently accepts email/password/role/name only.
        // We validate extra fields client-side and can wire them server-side later.
        await register(providerEmail, providerPassword, "DOCTOR", providerName.trim() || undefined);
      }
      onClose();
      resetAll();
    } catch (err: any) {
      setMessage(err?.message || "Unable to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      {/* Modal */}
      <div className="relative w-full max-w-5xl mx-auto">
        <div className="rounded-2xl overflow-hidden shadow-2xl">
          {/* Brand header */}
          <div className="bg-[#003a9f] text-white px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Secure Access Portal</h2>
            <button onClick={onClose} className="text-white/80 hover:text-white" aria-label="Close">✖</button>
          </div>

          {/* Two-column layout */}
          <div className="bg-white grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Patient Panel */}
            <div className="p-6 border-r md:border-r border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Patient Access</h3>
              <p className="text-sm text-gray-600 mt-1">Book appointments and manage your visits.</p>

              {/* mode switch */}
              <div className="mt-4 inline-flex bg-gray-100 rounded-full p-1 text-sm font-medium">
                <button
                  className={`px-3 py-1 rounded-full ${patientMode === "login" ? "bg-white shadow" : "text-gray-700"}`}
                  onClick={() => setPatientMode("login")}
                >
                  Login
                </button>
                <button
                  className={`px-3 py-1 rounded-full ${patientMode === "register" ? "bg-white shadow" : "text-gray-700"}`}
                  onClick={() => setPatientMode("register")}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handlePatientSubmit} className="mt-4 space-y-4">
                {patientMode === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name (optional)</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003a9f]"
                      placeholder="e.g., Jane Doe"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003a9f]"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={patientPassword}
                    onChange={(e) => setPatientPassword(e.target.value)}
                    className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003a9f]"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {patientMode === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input
                      type="password"
                      value={patientConfirm}
                      onChange={(e) => setPatientConfirm(e.target.value)}
                      className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003a9f]"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#003a9f] hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition-colors"
                >
                  {loading ? "Processing..." : patientMode === "login" ? "Login" : "Register as Patient"}
                </button>
              </form>
            </div>

            {/* Provider Panel */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900">Doctor & Hospital Access</h3>
              <p className="text-sm text-gray-600 mt-1">Manage schedules, rosters, and patient engagement.</p>

              {/* role and mode controls */}
              <div className="mt-4 flex items-center space-x-3">
                <div className="inline-flex bg-gray-100 rounded-full p-1 text-sm font-medium">
                  <button
                    className={`px-3 py-1 rounded-full ${providerRole === "DOCTOR" ? "bg-white shadow" : "text-gray-700"}`}
                    onClick={() => {
                      setProviderRole("DOCTOR");
                      setProviderMode("login");
                    }}
                  >
                    Doctor
                  </button>
                  <button
                    className={`px-3 py-1 rounded-full ${providerRole === "HOSPITAL_ADMIN" ? "bg-white shadow" : "text-gray-700"}`}
                    onClick={() => {
                      setProviderRole("HOSPITAL_ADMIN");
                      setProviderMode("login");
                    }}
                  >
                    Hospital Admin
                  </button>
                </div>
                {providerRole === "DOCTOR" && (
                  <div className="inline-flex bg-gray-100 rounded-full p-1 text-sm font-medium">
                    <button
                      className={`px-3 py-1 rounded-full ${providerMode === "login" ? "bg-white shadow" : "text-gray-700"}`}
                      onClick={() => setProviderMode("login")}
                    >
                      Login
                    </button>
                    <button
                      className={`px-3 py-1 rounded-full ${providerMode === "register" ? "bg-white shadow" : "text-gray-700"}`}
                      onClick={() => setProviderMode("register")}
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleProviderSubmit} className="mt-4 space-y-4">
                {providerMode === "register" && providerRole === "DOCTOR" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name (optional)</label>
                    <input
                      type="text"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003a9f]"
                      placeholder="e.g., Dr. John Smith"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={providerEmail}
                    onChange={(e) => setProviderEmail(e.target.value)}
                    className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003a9f]"
                    placeholder="provider@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={providerPassword}
                    onChange={(e) => setProviderPassword(e.target.value)}
                    className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003a9f]"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {providerRole === "DOCTOR" && providerMode === "register" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Number</label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003a9f]"
                        placeholder="e.g., MED-123456"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Clinic/Hospital Name (optional)</label>
                      <input
                        type="text"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003a9f]"
                        placeholder="Your practice name"
                      />
                    </div>
                  </>
                )}

                {providerRole === "HOSPITAL_ADMIN" && (
                  <p className="text-xs text-gray-500">
                    Registration for Hospital Admin is restricted. Contact support to create an admin account.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#003a9f] hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition-colors"
                >
                  {loading
                    ? "Processing..."
                    : providerMode === "login"
                    ? "Login"
                    : "Register as Doctor"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}