"use client";

import { useState } from "react";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";

const API_URL = ""; // use relative URLs with Next.js dev rewrites

export default function SlotAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setMessage(null);
    if (!email || !password) {
      setMessage("Please enter email and password");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(err.message || "Login failed");
      }
      const data = await res.json();
      const token = data?.token;
      if (!token) throw new Error("No token returned");
      const decoded: any = jwtDecode(token);
      if (decoded?.role !== "SLOT_ADMIN") {
        throw new Error("This login is only for Slot Admin accounts");
      }
      localStorage.setItem("slotAdminToken", token);
      window.location.href = "/slot-admin";
    } catch (e: any) {
      setMessage(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🕒</div>
          <h1 className="text-2xl font-bold text-gray-800">Slot Admin Login</h1>
          <p className="text-gray-600 text-sm mt-1">Manage doctor/hospital slots with your staff account</p>
        </div>
        {message && (
          <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">{message}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="slot-admin@example.com"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        <div className="text-center mt-6 text-sm text-gray-600">
          Need help? Ask your doctor or hospital admin to set up your Slot Admin account in their dashboard.{' '}
          <Link href="/" className="text-blue-600 underline">Go home</Link>
        </div>
      </div>
    </div>
  );
}