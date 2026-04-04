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
      const role = decoded?.role;
      if (role !== "SLOT_ADMIN" && role !== "ADMIN") {
        throw new Error("This login is only for Slot Admin or Admin accounts");
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
        <div className="text-5xl mb-4">🕒</div>
        <h1 className="text-2xl font-bold text-gray-800">Doctors Management Panel</h1>
        <p className="text-gray-600 mb-6">Sign in as Slot Admin or Admin</p>

        {message && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
              placeholder="••••••••"
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
          Need help? Ask your doctor or hospital admin to set up your Slot Admin account in their dashboard.{" "}
          <Link href="/" className="text-blue-600 underline">Go home</Link>
        </div>
      </div>
    </div>
  );
}