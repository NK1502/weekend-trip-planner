import { useEffect, useRef } from "react";
import { Compass, LocateFixed, Plus, Minus, Sparkles } from "lucide-react";
import "./IndiaTripMap.css";

const stops = [
  { name: "Dharamshala", state: "Himachal Pradesh", icon: "☁" },
  { name: "Manali", state: "Himachal Pradesh", icon: "⌁" },
  { name: "Kasol", state: "Himachal Pradesh", icon: "✳" },
  { name: "Rishikesh", state: "Uttarakhand", icon: "〰" },
  { name: "Dalhousie", state: "Himachal Pradesh", icon: "✦" },
  { name: "Shimla", state: "Himachal Pradesh", icon: "⌂" },
];

export default function IndiaTripMap({ onExplore }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  useEffect(() => {
    const loadMap = async () => {
      if (!window.L) {
        if (!document.querySelector('link[data-leaflet]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          link.dataset.leaflet = "true";
          document.head.appendChild(link);
        }
        await new Promise((resolve, reject) => {
          const script = document.querySelector('script[data-leaflet]') || document.createElement("script");
          if (window.L) return resolve();
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.dataset.leaflet = "true";
          script.onload = resolve;
          script.onerror = reject;
          if (!script.isConnected) document.body.appendChild(script);
        });
      }
      if (!mapRef.current || mapInstance.current) return;
      const map = window.L.map(mapRef.current, { zoomControl: false, scrollWheelZoom: true }).setView([29.5, 78.2], 5);
      mapInstance.current = map;
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(map);
      window.L.control.zoom({ position: "topright" }).addTo(map);
      stops.forEach((stop) => {
        const coords = { Dharamshala: [32.219, 76.323], Manali: [32.2432, 77.1892], Kasol: [32.0098, 77.3149], Rishikesh: [30.0869, 78.2676], Dalhousie: [32.5356, 75.528], Shimla: [31.1048, 77.1734] }[stop.name];
        const icon = window.L.divIcon({ className: "destination-map-marker", html: `<span>${stop.icon}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] });
        window.L.marker(coords, { icon }).addTo(map).bindPopup(`<strong>${stop.name}</strong><br/>${stop.state}`);
      });
      window.setTimeout(() => map.invalidateSize(), 100);
    };
    loadMap().catch(() => { if (mapRef.current) mapRef.current.innerHTML = '<div class="map-load-error">Map tiles need an internet connection.<br/>You can still explore destinations from the panel.</div>'; });
    return () => { mapInstance.current?.remove(); mapInstance.current = null; };
  }, []);
  const adjustZoom = (delta) => mapInstance.current?.setZoom(mapInstance.current.getZoom() + delta);
  const resetView = () => mapInstance.current?.setView([29.5, 78.2], 5);

  return <section className="india-map-panel" aria-label="Interactive map of India">
    <div ref={mapRef} className="india-map-frame" role="application" aria-label="Pan and zoom map of northern India" />
    <div className="map-wash" />
    <header className="map-topbar"><div className="map-title-lockup"><span className="map-logo"><Compass size={20} /></span><span><strong>India, your way</strong><small>Find your next weekend escape</small></span></div><span className="map-live"><i /> LIVE MAP</span></header>
    <div className="map-region-label">NORTHERN INDIA <span>·</span> HIMALAYAS</div>
    <div className="map-controls"><button aria-label="Center map" onClick={resetView}><LocateFixed size={18} /></button><div className="map-control-divider"/><button aria-label="Zoom in" onClick={() => adjustZoom(1)}><Plus size={20} /></button><button aria-label="Zoom out" onClick={() => adjustZoom(-1)}><Minus size={20} /></button></div>
    <div className="map-bottom-card"><span className="map-bottom-icon"><Sparkles size={16} /></span><span><strong>Weekend-worthy places</strong><small>Explore 6 curated hill escapes</small></span><button onClick={onExplore} aria-label="Explore curated destinations">↗</button></div>
    <span className="map-attribution">© OpenStreetMap contributors</span>
  </section>;
}
