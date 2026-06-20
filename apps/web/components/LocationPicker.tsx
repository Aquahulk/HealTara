"use client";

import React, { useState, useRef, useEffect } from "react";

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onSave: (coords: { latitude: number; longitude: number }) => Promise<void>;
  onAutoGeocode: () => Promise<{ latitude: number; longitude: number }>;
  label?: string;
}

export default function LocationPicker({ latitude, longitude, onSave, onAutoGeocode, label }: LocationPickerProps) {
  const [mode, setMode] = useState<'view' | 'pick'>('view');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    latitude && longitude ? { lat: latitude, lon: longitude } : null
  );
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const handleAutoGeocode = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const result = await onAutoGeocode();
      setCoords({ lat: result.latitude, lon: result.longitude });
      setSuccess('Location detected from your address');
      setMode('view');
    } catch (e: any) {
      setError(e?.message || 'Failed to detect location');
    } finally { setSaving(false); }
  };

  const handleManualSave = async () => {
    if (!coords) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      await onSave({ latitude: coords.lat, longitude: coords.lon });
      setSuccess('Location saved');
      setMode('view');
    } catch (e: any) {
      setError(e?.message || 'Failed to save location');
    } finally { setSaving(false); }
  };

  // Initialize map when in pick mode
  useEffect(() => {
    if (mode !== 'pick' || !mapRef.current) return;
    const initMap = async () => {
      if (!(window as any).L) {
        const link = document.createElement("link");
        link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
        await new Promise(res => { const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = () => res(null); document.body.appendChild(s); });
      }
      const L = (window as any).L;
      if (!mapRef.current) return;
      mapRef.current.innerHTML = "";
      const center = coords || { lat: 20.5937, lon: 78.9629 }; // India center
      const map = L.map(mapRef.current).setView([center.lat, center.lon], coords ? 15 : 5);
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OSM" }).addTo(map);
      if (coords) {
        markerRef.current = L.marker([coords.lat, coords.lon], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng();
          setCoords({ lat: pos.lat, lon: pos.lng });
        });
      }
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lon: lng });
        if (markerRef.current) { markerRef.current.setLatLng([lat, lng]); }
        else { markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map); markerRef.current.on('dragend', () => { const pos = markerRef.current.getLatLng(); setCoords({ lat: pos.lat, lon: pos.lng }); }); }
      });
    };
    initMap();
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [mode]);

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-900">📍 {label || 'Clinic Location'}</h4>
        {coords && <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">✓ Location set</span>}
      </div>

      {/* Current status */}
      {coords && mode === 'view' && (
        <div className="text-xs text-gray-500 mb-3">
          Lat: {coords.lat.toFixed(5)}, Lon: {coords.lon.toFixed(5)}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {success && <p className="text-xs text-emerald-600 mb-2">{success}</p>}

      {mode === 'view' && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={handleAutoGeocode} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors">
            {saving ? '⏳ Detecting...' : '📍 Auto-detect from Address'}
          </button>
          <button type="button" onClick={() => setMode('pick')}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors">
            🗺️ Pin on Map
          </button>
        </div>
      )}

      {mode === 'pick' && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Click on the map to set your location, or drag the marker.</p>
          <div ref={mapRef} className="h-[200px] md:h-[250px] rounded-xl overflow-hidden border border-gray-200 mb-3" />
          {coords && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Lat: {coords.lat.toFixed(5)}, Lon: {coords.lon.toFixed(5)}</span>
              <button type="button" onClick={handleManualSave} disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-1.5 px-3 rounded-lg">
                {saving ? 'Saving...' : '✓ Save Location'}
              </button>
              <button type="button" onClick={() => setMode('view')} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
            </div>
          )}
          {!coords && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Click the map to place your pin</span>
              <button type="button" onClick={() => setMode('view')} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
