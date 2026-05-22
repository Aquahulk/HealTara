"use client";

import React, { useState } from "react";
import { Search, MapPin, Calendar, Clock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

interface MiniSearchProps {
  initialQuery?: string;
}

export default function MiniSearch({ initialQuery = "" }: MiniSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();

  const handleSearch = (q: string) => {
    const trimmed = q.trim();
    if (trimmed) {
      apiClient.trackSearch(trimmed, { source: 'mini_search' });
      router.push(`/doctors?search=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="hidden lg:block fixed right-0 w-[22rem] z-30 bg-white border-l border-b border-gray-200 shadow-lg rounded-bl-2xl overflow-hidden p-4"
      style={{ top: '408px' }}
    >
      <div className="mb-3">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-blue-600" />
          Quick Search
        </h3>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search doctors, specialties..."
            value={query}
            onChange={async (e) => {
              const val = e.target.value;
              setQuery(val);
              const q = val.trim();
              if (!q) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
              }
              try {
                const resp = await apiClient.searchDoctors(q);
                const combined = resp.suggestions.slice(0, 8);
                setSuggestions(combined);
                setShowSuggestions(combined.length > 0);
              } catch {
                setShowSuggestions(false);
              }
            }}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch(query);
            }}
            className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
          <button 
            onClick={() => handleSearch(query)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showSuggestions && suggestions.length > 0 ? (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden -mx-4 border-t border-gray-100"
          >
            <div className="flex flex-col max-h-[280px] overflow-y-auto scrollbar-hide">
              <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Top Matches</span>
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={() => {
                    const picked = s.replace(/ \((specialization)\)$/i, '');
                    setQuery(picked);
                    setShowSuggestions(false);
                    handleSearch(picked);
                  }}
                  className="w-full text-left px-4 py-3 text-[12px] text-gray-700 hover:bg-blue-50/80 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3 group"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors shadow-sm">
                    <Search className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <span className="font-medium truncate group-hover:text-blue-700">{s}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="grid grid-cols-2 gap-2 mt-3"
          >
            <button 
              onClick={() => router.push('/doctors')}
              className="flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all shadow-sm active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5" /> Book Appointment
            </button>
            <button 
              onClick={() => router.push('/hospitals')}
              className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5" /> Nearby Hospitals
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
