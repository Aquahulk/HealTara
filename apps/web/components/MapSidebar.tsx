"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin as MapPinIcon, Maximize2, Minimize2, Navigation, X, ExternalLink } from "lucide-react";

type Pin = {
  id: number;
  lat: number;
  lon: number;
  title: string;
  subtitle?: string;
  extra?: { fee?: number; experience?: number; slug?: string; city?: string };
};

interface MapSidebarProps {
  pins: Pin[];
  title?: string;
  emptyMessage?: string;
  variant?: "doctors" | "hospitals";
  onPinClick?: (pin: Pin) => void;
}

export default function MapSidebar({
  pins,
  title = "Map View",
  emptyMessage = "No locations to show",
  variant = "doctors",
  onPinClick,
}: MapSidebarProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setUserLocation({ lat: 20.5937, lon: 78.9629 }),
        { timeout: 5000 }
      );
    } else {
      setUserLocation({ lat: 20.5937, lon: 78.9629 });
    }
  }, []);

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

      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }

      const center = pins.length > 0 ? { lat: pins[0].lat, lon: pins[0].lon } : userLocation;
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lon],
        zoom: pins.length === 0 ? 5 : pins.length === 1 ? 13 : 5,
        zoomControl: true,
        attributionControl: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const markers: any[] = [];
      const validPins = pins.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));

      validPins.forEach((p) => {
        const emoji = variant === "hospitals" ? "🏥" : "👨‍⚕️";
        const icon = L.divIcon({
          html: `<div style="font-size:18px;text-align:center;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));cursor:pointer">${emoji}</div>`,
          className: "leaflet-emoji-icon",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const m = L.marker([p.lat, p.lon], { icon }).addTo(map);
        m.on('click', () => {
          setSelectedPin(p);
          if (onPinClick) onPinClick(p);
        });
        markers.push(m);
      });

      // User location
      if (userLocation) {
        const userIcon = L.divIcon({
          html: `<div style="width:12px;height:12px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.5)"></div>`,
          className: "leaflet-user-icon",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([userLocation.lat, userLocation.lon], { icon: userIcon }).addTo(map);
      }

      if (markers.length > 1) {
        try { const group = L.featureGroup(markers); map.fitBounds(group.getBounds().pad(0.15)); } catch {}
      } else if (markers.length === 1) {
        map.setView([validPins[0].lat, validPins[0].lon], 13);
      }

      setTimeout(() => { if (!cancelled && mapRef.current) mapRef.current.invalidateSize(); }, 300);
    };

    init();
    return () => { cancelled = true; if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; } };
  }, [userLocation, JSON.stringify(pins), variant, expanded]);

  const handleLocateMe = () => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.setView([userLocation.lat, userLocation.lon], 13, { animate: true });
  };

  const getGoogleMapsUrl = (pin: Pin) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lon}`;
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 sticky top-20 ${expanded ? "h-[calc(100vh-6rem)]" : "h-[500px] lg:h-[600px]"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <MapPinIcon className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
          {pins.length > 0 && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
              {pins.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleLocateMe} className="p-1 rounded-lg hover:bg-gray-200 transition-colors" title="My location">
            <Navigation className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg hover:bg-gray-200 transition-colors">
            {expanded ? <Minimize2 className="w-3.5 h-3.5 text-gray-600" /> : <Maximize2 className="w-3.5 h-3.5 text-gray-600" />}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative flex-1 h-[calc(100%-40px)]">
        {!userLocation ? (
          <div className="flex items-center justify-center h-full bg-blue-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">Loading map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "100%" }} />
        )}

        {/* Selected Pin Info Card — overlays the map bottom center */}
        {selectedPin && (
          <div className="absolute bottom-3 left-3 right-3 z-[1000] animate-in slide-in-from-bottom-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 relative">
              <button onClick={() => setSelectedPin(null)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">{variant === "hospitals" ? "🏥" : "👨‍⚕️"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{selectedPin.title.replace('🏥 ', '')}</h4>
                  {selectedPin.subtitle && <p className="text-xs text-gray-500 truncate">{selectedPin.subtitle}</p>}
                  {selectedPin.extra?.fee && <p className="text-xs text-emerald-600 font-medium mt-0.5">₹{selectedPin.extra.fee} consultation</p>}
                  {selectedPin.extra?.experience && <p className="text-[10px] text-gray-400">{selectedPin.extra.experience} yrs experience</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-2.5 pt-2 border-t border-gray-100">
                <a
                  href={getGoogleMapsUrl(selectedPin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                >
                  <Navigation className="w-3 h-3" />
                  Get Directions
                </a>
                {selectedPin.extra?.slug && (
                  <a
                    href={variant === "hospitals" ? `/hospital-site/${selectedPin.id}` : `/doctor-site/${selectedPin.extra.slug}`}
                    className="flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {userLocation && pins.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)).length === 0 && !selectedPin && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 text-center">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
