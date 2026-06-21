"use client";

import { useEffect, useRef } from "react";

type DoctorPin = {
  id: number;
  lat: number;
  lon: number;
  title: string;
  subtitle?: string;
};

export default function MapDoctors({
  center,
  pins,
  height = 400
}: {
  center: { lat: number; lon: number };
  pins: DoctorPin[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const ensureLeaflet = async () => {
      if ((window as any).L) return;
      // Load CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      // Load JS
      await new Promise<void>((resolve) => {
        if ((window as any).L) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.body.appendChild(s);
      });
    };

    const init = async () => {
      await ensureLeaflet();
      if (cancelled || !ref.current) return;
      const L = (window as any).L;
      if (!L) return;

      // Destroy previous map instance properly
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }

      // Create new map
      const map = L.map(ref.current, {
        center: [center.lat, center.lon],
        zoom: pins.length === 0 ? 12 : pins.length === 1 ? 14 : 5,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org">OSM</a>',
      }).addTo(map);

      // Add markers
      const markers: any[] = [];
      pins.forEach((p) => {
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return;
        const isHospital = p.title.startsWith('🏥');
        const icon = L.divIcon({
          html: `<div style="font-size:${isHospital ? '20px' : '16px'};text-align:center;line-height:1">${isHospital ? '🏥' : '👨‍⚕️'}</div>`,
          className: 'leaflet-emoji-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const m = L.marker([p.lat, p.lon], { icon }).addTo(map);
        m.bindPopup(`<strong>${p.title}</strong>${p.subtitle ? `<br/><span style="font-size:11px;color:#666">${p.subtitle}</span>` : ""}`);
        markers.push(m);
      });

      // Fit bounds to show all markers
      if (markers.length > 1) {
        try {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.15));
        } catch {}
      } else if (markers.length === 0) {
        // No markers — just show the center location
        map.setView([center.lat, center.lon], 12);
      }

      // Force tile redraw after a short delay (fixes gray tiles on initial render)
      setTimeout(() => {
        if (!cancelled && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 200);
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, [center.lat, center.lon, JSON.stringify(pins), height]);

  return (
    <div ref={ref} style={{ height, width: '100%', minHeight: height, background: '#e8f4f8' }} />
  );
}
