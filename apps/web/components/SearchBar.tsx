"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  initialQuery?: string;
  onSearch?: (query: string, filters: { specialization: string; city: string; availability: string; availabilityOnly: boolean }) => void;
  variant?: "doctors" | "hospitals";
  compact?: boolean;
}

export default function SearchBar({ initialQuery = "", onSearch, variant = "doctors", compact = false }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [specialization, setSpecialization] = useState("");
  const [city, setCity] = useState("");
  const [availability, setAvailability] = useState("");
  const [availabilityOnly, setAvailabilityOnly] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions(apiClient.getSeedSuggestions?.() || []);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const cached = apiClient.peekCachedSearch?.(query);
        if (cached?.suggestions) { setSuggestions(cached.suggestions.slice(0, 6)); setShowSuggestions(true); return; }
        const local = apiClient.getLocalSuggestions?.(query)?.slice(0, 6) || [];
        if (local.length) { setSuggestions(local); setShowSuggestions(true); }
        const resp = await apiClient.searchDoctors(query);
        setSuggestions(resp.suggestions?.slice(0, 6) || []);
        setShowSuggestions(true);
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = () => {
    const q = query.trim();
    if (onSearch) {
      onSearch(q, { specialization, city, availability, availabilityOnly });
    } else if (q) {
      router.push(`/doctors?search=${encodeURIComponent(q)}`);
    }
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (s: string) => {
    setQuery(s);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(s, { specialization, city, availability, availabilityOnly });
    } else {
      router.push(`/doctors?search=${encodeURIComponent(s)}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2.5">
      <div className="space-y-2">
        {/* Search input row */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={variant === "hospitals" ? "Search hospitals, cities..." : "Search doctors, specialties..."}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-36 overflow-auto">
              {suggestions.map((s, i) => (
                <button key={i} className="w-full text-left px-3 py-1.5 text-xs text-gray-800 hover:bg-blue-50 transition-colors"
                  onMouseDown={() => handleSuggestionClick(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <select value={specialization} onChange={(e) => { setSpecialization(e.target.value); onSearch?.(query, { specialization: e.target.value, city, availability, availabilityOnly }); }}
            className="px-2 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Specialization</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Neurology">Neurology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="General Medicine">General Medicine</option>
          </select>
          <select value={city} onChange={(e) => { setCity(e.target.value); onSearch?.(query, { specialization, city: e.target.value, availability, availabilityOnly }); }}
            className="px-2 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">City / Town</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Chennai">Chennai</option>
            <option value="Indore">Indore</option>
            <option value="Satna">Satna</option>
          </select>
          <select value={availability} onChange={(e) => { setAvailability(e.target.value); onSearch?.(query, { specialization, city, availability: e.target.value, availabilityOnly }); }}
            className="px-2 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Availability</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This Week</option>
          </select>
          <label className="flex items-center justify-center px-2 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 gap-1">
            <input type="checkbox" checked={availabilityOnly} onChange={(e) => { setAvailabilityOnly(e.target.checked); onSearch?.(query, { specialization, city, availability, availabilityOnly: e.target.checked }); }} className="w-3 h-3 text-blue-600" />
            <span className="text-gray-700 font-medium">Available Only</span>
          </label>
        </div>
      </div>
    </div>
  );
}
