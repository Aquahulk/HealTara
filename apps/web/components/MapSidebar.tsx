"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin as MapPinIcon, Maximize2, Minimize2, Navigation } from "lucide-react";

type Pin = {
  id: number;
  lat: number;
  lon: number;
  title: string;
  subtitle?: string;
};

interface MapSidebarProps {
  pins: Pin[];
  title?: string;
  emptyMessage?: string;
  /** "doctors" or "hospitals" — determines marker styling */
  variant?: "doctors" | "hospitals";
}

export default function MapSidebar({
  pins,
  title = "Map View",
  emptyMessage = "No locations to show",
  variant = "doctors",
}: MapSidebarProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          // Default to India center if geolocation denied
          setUserLocation({ lat: 20.5937, lon: 78.9629 });
        },
        { timeout: 5000 }
      );
    } else {
      setUserLocation({ lat: 20.5937, lon: 78.9629 });
    }
  }, []);

  // Initialize/update map
  useEffect(() => {
    if (!userLocation) return;
    let cancelled = false;

    const ensureLeaflet = async () => {
      if ((window as any).L) return;
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
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
      if (cancelled || !mapContainerRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      // Destroy previous
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }

      const center = pins.length > 0
        ? { lat: pins[0].lat, lon: pins[0].lon }
        : userLocation;

      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lon],
        zoom: pins.length === 0 ? 5 : pins.length === 1 ? 13 : 5,
        zoomControl: true,
        attributionControl: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Add markers
      const markers: any[] = [];
      const validPins = pins.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));
      
      validPins.forEach((p) => {
        const emoji = variant === "hospitals" ? "🏥" : "👨‍⚕️";
        const icon = L.divIcon({
          html: `<div style="font-size:18px;text-align:center;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">${emoji}</div>`,
          className: "leaflet-emoji-icon",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const m = L.marker([p.lat, p.lon], { icon }).addTo(map);
        m.bindPopup(
          `<strong style="font-size:13px">${p.title}</strong>${p.subtitle ? `<br/><span style="font-size:11px;color:#666">${p.subtitle}</span>` : ""}`
        );
        markers.push(m);
      });

      // Add user location marker
      if (userLocation) {
        const userIcon = L.divIcon({
          html: `<div style="width:12px;height:12px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.5)"></div>`,
          className: "leaflet-user-icon",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
          .addTo(map)
          .bindPopup('<span style="font-size:12px;font-weight:600">📍 Your Location</span>');
      }

      // Fit bounds
      if (markers.length > 1) {
        try {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.15));
        } catch {}
      } else if (markers.length === 1) {
        map.setView([validPins[0].lat, validPins[0].lon], 13);
      }

      // Fix tile rendering
      setTimeout(() => {
        if (!cancelled && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 300);
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, [userLocation, JSON.stringify(pins), variant, expanded]);

  const handleLocateMe = () => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.setView([userLocation.lat, userLocation.lon], 13, { animate: true });
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 sticky top-20 ${
        expanded ? "h-[calc(100vh-6rem)]" : "h-[500px] lg:h-[600px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <MapPinIcon className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {pins.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {pins.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)).length} pins
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleLocateMe}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            title="Go to my location"
          >
            <Navigation className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            title={expanded ? "Shrink map" : "Expand map"}
          >
            {expanded ? (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative flex-1 h-[calc(100%-48px)]">
        {!userLocation ? (
          <div className="flex items-center justify-center h-full bg-blue-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">Loading map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "100%" }} />
        )}

        {/* No pins overlay */}
        {userLocation && pins.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)).length === 0 && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 text-center">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
