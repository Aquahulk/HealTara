"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

type DoctorPin = {
  id: number;
  lat: number;
  lon: number;
  title: string;
  subtitle?: string;
};

export interface MapDoctorsHandle {
  zoomToPin: (pinId: number) => void;
  zoomToCoords: (lat: number, lon: number, zoom?: number) => void;
}

const MapDoctors = forwardRef<MapDoctorsHandle, {
  center: { lat: number; lon: number };
  pins: DoctorPin[];
  height?: number;
  onPinClick?: (pin: DoctorPin) => void;
}>(function MapDoctors({ center, pins, height = 400, onPinClick }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const clusterGroupRef = useRef<any>(null);

  // Expose methods for parent to zoom into pins
  useImperativeHandle(ref, () => ({
    zoomToPin(pinId: number) {
      const map = mapRef.current;
      const marker = markersRef.current.get(pinId);
      if (map && marker) {
        map.setView(marker.getLatLng(), 15, { animate: true, duration: 0.6 });
        setTimeout(() => marker.openPopup(), 300);
      }
    },
    zoomToCoords(lat: number, lon: number, zoom = 15) {
      const map = mapRef.current;
      if (map) {
        map.setView([lat, lon], zoom, { animate: true, duration: 0.6 });
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;

    const ensureLeaflet = async () => {
      if ((window as any).L) return;
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      // Load Leaflet JS
      await new Promise<void>((resolve) => {
        if ((window as any).L) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.body.appendChild(s);
      });
    };

    const ensureMarkerCluster = async () => {
      const L = (window as any).L;
      if (!L || L.MarkerClusterGroup) return;
      // Load MarkerCluster CSS
      if (!document.querySelector('link[href*="MarkerCluster"]')) {
        const link1 = document.createElement("link");
        link1.rel = "stylesheet";
        link1.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
        document.head.appendChild(link1);
        const link2 = document.createElement("link");
        link2.rel = "stylesheet";
        link2.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
        document.head.appendChild(link2);
      }
      // Load MarkerCluster JS
      await new Promise<void>((resolve) => {
        if (L.MarkerClusterGroup) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.body.appendChild(s);
      });
    };

    // Inject custom marker styles
    const injectStyles = () => {
      if (document.getElementById('map-marker-styles')) return;
      const style = document.createElement('style');
      style.id = 'map-marker-styles';
      style.textContent = `
        .leaflet-emoji-icon { background: none !important; border: none !important; }
        .map-pin-hospital {
          width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(99,102,241,0.4);
          border: 2px solid white;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .map-pin-hospital:hover {
          transform: rotate(-45deg) scale(1.15);
          box-shadow: 0 5px 15px rgba(99,102,241,0.5);
        }
        .map-pin-hospital span { transform: rotate(45deg); font-size: 14px; line-height: 1; }
        .map-pin-doctor {
          width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #10b981, #059669);
          transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(16,185,129,0.4);
          border: 2px solid white;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .map-pin-doctor:hover {
          transform: rotate(-45deg) scale(1.15);
          box-shadow: 0 5px 15px rgba(16,185,129,0.5);
        }
        .map-pin-doctor span { transform: rotate(45deg); font-size: 12px; line-height: 1; }
        .modern-popup .leaflet-popup-content-wrapper {
          border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12); border: none; padding: 0;
        }
        .modern-popup .leaflet-popup-content { margin: 0; padding: 12px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .modern-popup .leaflet-popup-tip { box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
        .leaflet-control-zoom a {
          border-radius: 8px !important; width: 32px !important; height: 32px !important;
          line-height: 32px !important; font-size: 16px !important; border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important; margin-bottom: 4px !important;
        }
        .leaflet-control-zoom { border: none !important; box-shadow: none !important; }
        .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .marker-cluster-small { background-color: rgba(16,185,129,0.3); }
        .marker-cluster-small div { background-color: rgba(16,185,129,0.7); color: white; font-weight: 700; font-size: 12px; }
        .marker-cluster-medium { background-color: rgba(99,102,241,0.3); }
        .marker-cluster-medium div { background-color: rgba(99,102,241,0.7); color: white; font-weight: 700; font-size: 13px; }
        .marker-cluster-large { background-color: rgba(239,68,68,0.3); }
        .marker-cluster-large div { background-color: rgba(239,68,68,0.7); color: white; font-weight: 700; font-size: 14px; }
      `;
      document.head.appendChild(style);
    };

    const init = async () => {
      await ensureLeaflet();
      if (cancelled || !containerRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      // Try to load clustering plugin (non-blocking)
      await ensureMarkerCluster().catch(() => {});
      if (cancelled) return;

      injectStyles();

      // Destroy previous map
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
      markersRef.current.clear();
      clusterGroupRef.current = null;

      // Create map
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lon],
        zoom: pins.length === 0 ? 12 : pins.length === 1 ? 14 : 5,
        zoomControl: false,
        attributionControl: false,
      });
      mapRef.current = map;

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Modern tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://carto.com">CARTO</a>',
      }).addTo(map);

      // Use clustering if available and more than 5 pins
      const useClustering = !!L.MarkerClusterGroup && pins.length > 5;
      let markerLayer: any;

      if (useClustering) {
        markerLayer = new L.MarkerClusterGroup({
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          disableClusteringAtZoom: 15,
        });
        clusterGroupRef.current = markerLayer;
      }

      // Add markers
      const allMarkers: any[] = [];
      pins.forEach((p) => {
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return;
        const isHospital = p.title.startsWith('🏥');
        const cleanTitle = p.title.replace(/^🏥\s*/, '');

        const icon = L.divIcon({
          html: `<div class="${isHospital ? 'map-pin-hospital' : 'map-pin-doctor'}"><span>${isHospital ? '🏥' : '⚕️'}</span></div>`,
          className: 'leaflet-emoji-icon',
          iconSize: isHospital ? [36, 36] : [32, 32],
          iconAnchor: isHospital ? [18, 36] : [16, 32],
          popupAnchor: [0, -36],
        });

        const m = L.marker([p.lat, p.lon], { icon });

        // Popup
        const popupContent = `
          <div style="min-width:160px">
            <div style="font-weight:700;font-size:13px;color:#1f2937;margin-bottom:2px">${cleanTitle || p.title}</div>
            ${p.subtitle ? `<div style="font-size:11px;color:#6b7280;display:flex;align-items:center;gap:4px">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${p.subtitle}
            </div>` : ''}
          </div>
        `;
        m.bindPopup(popupContent, { className: 'modern-popup', closeButton: false, offset: [0, -4] });

        // Click handler — zoom in and notify parent
        m.on('click', () => {
          map.setView([p.lat, p.lon], 15, { animate: true, duration: 0.5 });
          if (onPinClick) onPinClick(p);
        });

        if (useClustering) {
          markerLayer.addLayer(m);
        } else {
          m.addTo(map);
        }

        markersRef.current.set(p.id, m);
        allMarkers.push(m);
      });

      if (useClustering) {
        map.addLayer(markerLayer);
      }

      // Fit bounds
      if (allMarkers.length > 1) {
        try {
          const group = L.featureGroup(allMarkers);
          map.fitBounds(group.getBounds().pad(0.15), { animate: true, duration: 0.5 });
        } catch {}
      } else if (allMarkers.length === 1) {
        map.setView([pins[0].lat, pins[0].lon], 14, { animate: true });
      } else {
        map.setView([center.lat, center.lon], 12, { animate: true });
      }

      // Force tile redraw
      setTimeout(() => {
        if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
      }, 250);
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
      markersRef.current.clear();
      clusterGroupRef.current = null;
    };
  }, [center.lat, center.lon, JSON.stringify(pins), height]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', minHeight: height }}
      className="rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-blue-50 ring-1 ring-black/5"
    />
  );
});

export default MapDoctors;
