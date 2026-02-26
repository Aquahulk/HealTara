"use client";

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { hospitalMicrositeUrl, doctorMicrositeUrl, hospitalIdMicrositeUrl, shouldUseSubdomainNav, slugifyName, customSubdomainUrl } from '@/lib/subdomain';
import { Building2, Users } from 'lucide-react';
import { EnhancedRatingDisplay } from '@/components/SimpleRatingDisplay';
import HorizontalHospitalScroll from '@/components/HorizontalHospitalScroll';
import { apiClient } from '@/lib/api';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';

export default function HospitalsPage() {
  const router = useRouter();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const items = await apiClient.getHospitals({ page: 1, limit: 50 });
        if (!cancelled) {
          setHospitals(items || []);
          setFilteredHospitals(items || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load hospitals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    const refresh = async () => {
      try {
        const items = await apiClient.getHospitals({ page: 1, limit: 50 });
        setHospitals(items || []);
        setFilteredHospitals(items || []);
      } catch {}
    };
    const onCustom = (e: any) => {
      const d = e?.detail;
      if (d?.entityType === 'hospital') refresh();
    };
    window.addEventListener('rating:updated', onCustom as EventListener);
    const onMsg = (msg: MessageEvent) => {
      const d = msg?.data || {};
      if (d.type === 'rating:updated' && d.entityType === 'hospital') refresh();
    };
    try {
      bc = new BroadcastChannel('entity_updates');
      bc.addEventListener('message', onMsg as EventListener);
    } catch {}
    const onStorage = (ev: StorageEvent) => {
      try {
        if (ev.key === 'entity_updated' && ev.newValue) {
          const d = JSON.parse(ev.newValue);
          if (d.type === 'rating:updated' && d.entityType === 'hospital') refresh();
        }
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('rating:updated', onCustom as EventListener);
      window.removeEventListener('storage', onStorage);
      try { bc && bc.removeEventListener('message', onMsg as EventListener); } catch {}
      try { bc && bc.close && bc.close(); } catch {}
    };
  }, []);

  // Filter hospitals based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHospitals(hospitals);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = hospitals.filter((h) => {
      const name = (h.name || '').toLowerCase();
      const city = (h.city || '').toLowerCase();
      const state = (h.state || '').toLowerCase();
      return name.includes(query) || city.includes(query) || state.includes(query);
    });
    setFilteredHospitals(filtered);
  }, [searchQuery, hospitals]);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-20 md:pb-8">{/* Add bottom padding on mobile for nav */}
          <div className="mb-6 md:mb-8 text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-3">Partner Hospitals</h1>
            <p className="text-base md:text-lg text-gray-600">Browse verified hospitals and visit their websites</p>
          </div>

          {/* Search Bar */}
          <div className="mb-6 md:mb-8">
            <div className="max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Search hospitals by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              />
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                      <div className="w-full">
                        <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 border-t border-gray-200 flex gap-3">
                    <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Could not load hospitals</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <div className="mt-6 text-sm text-gray-500">
                <p>If the problem persists, please check:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Your internet connection</li>
                  <li>• The API server is running</li>
                  <li>• Browser console for errors</li>
                </ul>
              </div>
            </div>
          )}

          {!loading && !error && filteredHospitals.length > 0 && (
            <div className="space-y-6 md:space-y-10">
              <HorizontalHospitalScroll hospitals={filteredHospitals} />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredHospitals.map((h) => {
                  const name = h.name || 'Hospital';
                  const city = h.city || '';
                  const state = h.state || '';
                  const location = [city, state].filter(Boolean).join(', ');
                  const logoUrl = h.profile && typeof h.profile === 'object' && 'logoUrl' in h.profile ? (h.profile as any).logoUrl : null;
                  return (
                    <div key={h.id} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-4 md:p-5 flex items-center gap-3 md:gap-4">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt={name} className="w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl object-cover" />
                          ) : (
                            <span className="text-xl md:text-2xl">🏥</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">{/* min-w-0 for text truncation */}
                          <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">{name}</h3>
                          <p className="text-sm text-gray-600 truncate mb-2">{location}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center text-xs text-gray-500">
                              <Building2 className="w-3 h-3 mr-1 text-blue-500" />
                              <span>{h._count?.departments || 0} Depts</span>
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                              <Users className="w-3 h-3 mr-1 text-green-500" />
                              <span>{h._count?.doctors || 0} Doctors</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 md:px-5 pb-2">
                        <EnhancedRatingDisplay entityType="hospital" entityId={String(h.id)} size="sm" />
                      </div>
                      <div className="p-4 md:p-5 border-t border-gray-200 flex gap-3">
                        <a
                          href={`/hospital-site/${h.id}`}
                          className="flex-1 text-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-medium py-3 rounded-lg transition-colors min-h-[44px] flex items-center justify-center touch-manipulation"
                          onMouseEnter={() => {
                            try {
                              if (shouldUseSubdomainNav()) {
                                const sub = (h as any).subdomain as string | undefined;
                                const url = sub && sub.length > 1 ? customSubdomainUrl(sub) : (h.name ? hospitalMicrositeUrl(h.name) : '');
                                if (url) import('@/lib/navWarmup').then(m => { try { m.preconnect(url); m.dnsPrefetch(url); } catch {} });
                              }
                            } catch {}
                          }}
                          onClick={(e) => {
                            try {
                              if (shouldUseSubdomainNav()) {
                                e.preventDefault();
                                const sub = (h as any).subdomain as string | undefined;
                                if (sub && sub.length > 1) {
                                  window.location.href = customSubdomainUrl(sub);
                                } else if (h.name) {
                                  window.location.href = hospitalMicrositeUrl(h.name);
                                } else {
                                  router.push(`/hospital-site/${h.id}`);
                                }
                              } else {
                                router.push(`/hospital-site/${h.id}`);
                              }
                            } catch {}
                          }}
                        >
                          Visit Website
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && !error && filteredHospitals.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <div className="text-6xl mb-4">🏥</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No hospitals found' : 'No hospitals available yet'}
              </h2>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search criteria or clear the search to see all hospitals' 
                  : 'Hospitals will appear here once they are added to the platform'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              )}
              {!searchQuery && (
                <div className="mt-6 text-sm text-gray-500">
                  <p>To add hospitals:</p>
                  <ol className="mt-2 space-y-1 text-left max-w-md mx-auto">
                    <li>1. Register as a hospital admin</li>
                    <li>2. Complete your hospital profile</li>
                    <li>3. Your hospital will appear in this list</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <MobileBottomNavigation />
    </>
  );
}
