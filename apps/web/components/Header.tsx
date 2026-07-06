'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useInstantNav } from '@/hooks/useInstantNav';
import { apiClient } from '@/lib/api';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  const { getNavProps } = useInstantNav();

  // Search state — same algorithm as homepage
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [specialization, setSpecialization] = useState('');
  const [city, setCity] = useState('');
  const [availability, setAvailability] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.getHomepageContent?.().then((c: any) => {
      if (c?.logo) {
        const raw = c.logo;
        if (raw.startsWith('data:')) { setLogoUrl(raw); return; }
        const fullUrl = raw.startsWith('/') ? `https://healtara.onrender.com${raw}` : raw;
        const img = new window.Image();
        img.onload = () => setLogoUrl(fullUrl);
        img.src = fullUrl;
      }
    }).catch(() => {});
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── EXACT same search handler as homepage ──
  const handleQueryChange = async (raw: string) => {
    setQuery(raw);
    const q = raw.trim();
    if (!q) {
      const seeds = apiClient.getSeedSuggestions();
      setSuggestions(seeds);
      setShowSuggestions(seeds.length > 0);
      return;
    }
    // Instant local cache
    const cached = apiClient.peekCachedSearch(q);
    if (cached) {
      if (Array.isArray(cached.suggestions)) { setSuggestions(cached.suggestions.slice(0, 8)); setShowSuggestions(true); }
    } else {
      const local = apiClient.getLocalSuggestions(q).slice(0, 8);
      if (local.length > 0) { setSuggestions(local); setShowSuggestions(true); }
    }
    try {
      const resp = await apiClient.searchDoctors(q);
      const combined = resp.suggestions.slice(0, 8);
      setSuggestions(combined);
      setShowSuggestions(combined.length > 0);
      apiClient.trackSearchDebounced(q, {
        matchedSpecialties: resp.matchedSpecialties,
        matchedConditions: resp.matchedConditions,
        topDoctorIds: (resp.doctors || []).slice(0, 5).map((d: any) => d.id)
      });
    } catch { apiClient.trackSearchDebounced(q); }
  };

  const handleSuggestionClick = (s: string, e: React.MouseEvent) => {
    const raw = query;
    const inputEl = inputRef.current;
    const caret = inputEl?.selectionStart ?? raw.length;
    const start = Math.max(0, raw.lastIndexOf(' ', Math.max(0, (caret ?? raw.length) - 1)) + 1);
    const nextSpace = raw.indexOf(' ', caret ?? raw.length);
    const end = nextSpace === -1 ? raw.length : nextSpace;
    const active = raw.substring(start, end).trim();
    const picked = s.replace(/ \((specialization)\)$/i, '');
    const newRaw = raw.slice(0, start) + picked + (end < raw.length ? raw.slice(end) : '');
    const newQ = newRaw.trim();
    setQuery(newRaw);
    setShowSuggestions(false);
    if (active) apiClient.addLocalSuggestion(active, picked);
    apiClient.trackSearch(newQ, { source: 'suggestion_click', selectedSuggestion: picked });
    router.push(`/doctors?search=${encodeURIComponent(newQ)}`);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (q) apiClient.trackSearch(q, { source: 'enter' });
    setShowSuggestions(false);
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (specialization) params.set('specialization', specialization);
    if (city) params.set('city', city);
    if (availability) params.set('availability', availability);
    router.push(`/doctors?${params.toString()}`);
    setShowFilters(false);
  };

  const hasFilters = !!(specialization || city || availability);
  const clearFilters = () => { setSpecialization(''); setCity(''); setAvailability(''); };

  const handleLogout = () => { logout(); setIsUserMenuOpen(false); };

  const userName = (() => {
    if ((user as any)?.name) return (user as any).name;
    const handle = (user?.email || '').split('@')[0];
    const clean = handle.replace(/[._\-]+/g, ' ').replace(/\d{4,}/g, '').trim();
    if (clean.length < 2) return handle;
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  })();

  return (
    <header className="bg-[#1a2744] text-white fixed top-0 left-0 right-0 z-50 w-full shadow-md">
      <div className="max-w-full mx-auto px-3 md:px-4">
        <div className="flex items-center h-14 md:h-16 gap-2 md:gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0" prefetch {...getNavProps("/")}>
            <img src={logoUrl} alt="Healtara" className="h-9 md:h-11 w-auto rounded" />
            <span className="text-lg md:text-2xl font-bold text-white hidden sm:block tracking-tight">Healtara</span>
          </Link>

          {/* ── SEARCH BAR ── */}
          <form onSubmit={handleSearch} className="flex-1 items-center gap-1.5 max-w-2xl mx-auto hidden md:flex">
            {/* Input + suggestions */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                  else if (!query.trim()) {
                    const seeds = apiClient.getSeedSuggestions();
                    if (seeds.length > 0) { setSuggestions(seeds); setShowSuggestions(true); }
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { handleSearch(); }
                  if (e.key === 'Escape') setShowSuggestions(false);
                }}
                placeholder="Search doctors, specialties, symptoms…"
                className="w-full pl-9 pr-8 py-2 border border-white/20 focus:border-white/40 rounded-xl text-white placeholder-white/40 text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.12)', WebkitTextFillColor: 'white' }}
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-white/60 hover:text-white transition-colors" />
                </button>
              )}

              {/* Suggestions dropdown — glass dark */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 rounded-xl shadow-2xl border border-white/10 z-[60] overflow-hidden"
                  style={{ background: 'rgba(10, 15, 40, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                  {suggestions.map((s, i) => (
                    <button key={i} type="button"
                      className="w-full text-left px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 flex items-center gap-2.5 transition-colors border-b border-white/5 last:border-0"
                      onMouseDown={e => handleSuggestionClick(s, e)}>
                      <Search className="w-3 h-3 text-white/40 flex-shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter button */}
            <div ref={filterRef} className="relative flex-shrink-0">
              <button type="button" onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-sm font-medium ${
                  hasFilters
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
                    : 'bg-white/15 border-white/20 text-white/80 hover:bg-white/25'
                }`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden lg:block">Filters</span>
                {hasFilters && (
                  <span className="w-4 h-4 bg-white text-emerald-600 text-[9px] font-black rounded-full flex items-center justify-center">
                    {[specialization, city, availability].filter(Boolean).length}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Filter Dropdown */}
              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-[60]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Filter Options</h3>
                    {hasFilters && <button type="button" onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear all</button>}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Specialization</label>
                      <select value={specialization} onChange={e => setSpecialization(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Specializations</option>
                        <option value="General Practitioner">General Practitioner</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Gynecology">Gynecology</option>
                        <option value="Ophthalmology">Ophthalmology</option>
                        <option value="Psychiatry">Psychiatry</option>
                        <option value="Pulmonology">Pulmonology</option>
                        <option value="Endocrinology">Endocrinology</option>
                        <option value="Gastroenterology">Gastroenterology</option>
                        <option value="Nephrology">Nephrology</option>
                        <option value="Oncology">Oncology</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">City / Town</label>
                      <input type="text" value={city} onChange={e => setCity(e.target.value)}
                        placeholder="e.g. Mumbai, Delhi, Satna…"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Availability</label>
                      <div className="flex gap-2">
                        {[['Today', 'today'], ['Tomorrow', 'tomorrow'], ['This Week', 'week']].map(([label, val]) => (
                          <button key={val} type="button"
                            onClick={() => setAvailability(availability === val ? '' : val)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                              availability === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                            }`}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={handleSearch}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 rounded-lg text-sm transition-all shadow-sm">
                      Search Doctors
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Search submit */}
            <button type="submit"
              className="flex-shrink-0 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all">
              Search
            </button>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0 ml-auto md:ml-0">
            <button className="md:hidden p-2 rounded-lg hover:bg-white/10" onClick={() => router.push('/doctors')}>
              <Search className="w-5 h-5 text-white" />
            </button>

            <Link href="/doctors" prefetch {...getNavProps("/doctors")}
              className="hidden lg:flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-4 py-2 rounded-full font-semibold text-sm transition-all">
              📅 Book
            </Link>

            {user ? (
              <div className="relative">
                <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 text-white/90 hover:text-white px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-all">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:block max-w-[100px] truncate">{userName}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform hidden md:block ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{userName}</p>
                      <p className="text-[10px] text-gray-500">{user.role}</p>
                    </div>
                    <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>🏠 Dashboard</Link>
                    <Link href="/dashboard/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>👤 Profile</Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">🚪 Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link href="/login" className="text-white/90 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-all hidden sm:block">Login</Link>
                <Link href="/login/doctors" className="text-white/90 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-all hidden md:block">Doctors</Link>
              </div>
            )}

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {isMenuOpen && (
          <div className="border-t border-white/20 py-2 space-y-0.5">
            <div className="px-2 pb-2 flex gap-2">
              <input type="text" value={query} onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Search doctors…"
                className="flex-1 px-3 py-2 bg-white/15 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm outline-none" />
              <button type="button" onClick={handleSearch} className="px-4 py-2 bg-emerald-500 rounded-lg text-sm font-semibold">Go</button>
            </div>
            {user ? (
              <>
                <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 text-sm" onClick={() => setIsMenuOpen(false)}>🏠 Dashboard</Link>
                <Link href="/dashboard/profile" className="block px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 text-sm" onClick={() => setIsMenuOpen(false)}>👤 Profile</Link>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 text-sm">🚪 Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 text-sm" onClick={() => setIsMenuOpen(false)}>🧑‍⚕️ Patient Login</Link>
                <Link href="/login/doctors" className="block px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 text-sm" onClick={() => setIsMenuOpen(false)}>🏥 Doctor Login</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
