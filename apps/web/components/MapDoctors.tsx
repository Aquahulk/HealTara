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
      const map = L.map(ref.current).setView([center.lat, center.lon], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      pins.forEach((p) => {
        const m = L.marker([p.lat, p.lon]).addTo(map);
        m.bindPopup(`<strong>${p.title}</strong>${p.subtitle ? `<br/>${p.subtitle}` : ""}`);
      });
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lon, JSON.stringify(pins)]);

  return <div ref={ref} style={{ height }} />;
}

