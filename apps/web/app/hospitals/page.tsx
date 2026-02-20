"use client";

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { hospitalMicrositeUrl, hospitalIdMicrositeUrl, shouldUseSubdomainNav, slugifyName, customSubdomainUrl } from '@/lib/subdomain';
import HorizontalHospitalScroll from '@/components/HorizontalHospitalScroll';
import { apiClient } from '@/lib/api';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const items = await apiClient.getHospitals({ page: 1, limit: 50 });
        if (!cancelled) setHospitals(items || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load hospitals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Partner Hospitals</h1>
          <p className="text-lg text-gray-600">Browse verified hospitals and visit their websites</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-16 w-16 bg-gray-200 rounded-xl mb-4" />
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Could not load hospitals</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {!loading && !error && hospitals.length > 0 && (
          <div className="space-y-10">
            <HorizontalHospitalScroll hospitals={hospitals} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hospitals.map((h) => {
                const name = h.name || 'Hospital';
                const city = h.city || '';
                const state = h.state || '';
                const location = [city, state].filter(Boolean).join(', ');
                const logoUrl = h.profile && typeof h.profile === 'object' && 'logoUrl' in h.profile ? (h.profile as any).logoUrl : null;
                return (
                  <div key={h.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt={name} className="w-14 h-14 rounded-xl object-cover" />
                        ) : (
                          <span className="text-2xl">🏥</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
                        <p className="text-sm text-gray-600">{location}</p>
                      </div>
                    </div>
                    <div className="p-5 border-t border-gray-200 flex gap-3">
                      <a
                        href={`/hospital-site/${h.id}`}
                        className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 rounded-lg transition-colors"
                        onClick={(e) => {
                          try {
                            if (shouldUseSubdomainNav()) {
                              e.preventDefault();
                              const sub = (h as any).subdomain as string | undefined;
                              if (sub && sub.length > 1) {
                                window.location.href = customSubdomainUrl(sub);
                              } else {
                                window.location.href = hospitalIdMicrositeUrl(h.id);
                              }
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

        {!loading && !error && hospitals.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏥</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No hospitals found</h2>
            <p className="text-gray-600">Please check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
