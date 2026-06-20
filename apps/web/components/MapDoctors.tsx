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

  useEffect(() => {
    const cssHref = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    const jsSrc = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    const ensureLeaflet = async () => {
      if (!(window as any).L) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = cssHref;
        document.head.appendChild(link);
        await new Promise((res) => {
          const s = document.createElement("script");
          s.src = jsSrc;
          s.onload = () => res(null);
          document.body.appendChild(s);
        });
      }
    };
    const init = async () => {
      await ensureLeaflet();
      const L = (window as any).L;
      if (!ref.current) return;
      ref.current.innerHTML = "";
      const map = L.map(ref.current).setView([center.lat, center.lon], pins.length <= 1 ? 13 : 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      const markers: any[] = [];
      pins.forEach((p) => {
        const isHospital = p.title.startsWith('🏥');
        const icon = L.divIcon({
          html: `<div style="font-size:${isHospital ? '18px' : '14px'};text-align:center">${isHospital ? '🏥' : '👨‍⚕️'}</div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        const m = L.marker([p.lat, p.lon], { icon }).addTo(map);
        m.bindPopup(`<strong>${p.title}</strong>${p.subtitle ? `<br/><span style="font-size:11px;color:#666">${p.subtitle}</span>` : ""}`);
        markers.push(m);
      });
      // Auto-fit bounds to show all pins
      if (markers.length > 1) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lon, JSON.stringify(pins), height]);

  return <div ref={ref} style={{ height }} />;
}

