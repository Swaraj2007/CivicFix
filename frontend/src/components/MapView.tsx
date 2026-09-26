import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onPick: (lat: number, lng: number) => void;
  height?: string;
}

export function MapPicker({ latitude, longitude, onPick, height = '320px' }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 13,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const icon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="width:24px;height:24px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([latitude, longitude], { icon }).addTo(map);
    markerRef.current = marker;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onPick(lat, lng);
    });

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
    }
  }, [latitude, longitude]);

  return <div ref={containerRef} style={{ height }} className="rounded-xl overflow-hidden border border-slate-200" />;
}

interface ComplaintMapProps {
  markers: {
    id: string;
    latitude: number;
    longitude: number;
    priority: string;
    status: string;
    popupHtml: string;
  }[];
  height?: string;
}

export function ComplaintMap({ markers, height = '480px' }: ComplaintMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [28.65, 77.22],
      zoom: 11,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const colorMap: Record<string, string> = {
      Critical: '#dc2626',
      High: '#ea580c',
      Medium: '#d97706',
      Low: '#16a34a',
    };

    for (const m of markers) {
      const color = m.status === 'Resolved' ? '#10b981' : (colorMap[m.priority] || '#64748b');
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:20px;height:20px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(map);
      marker.bindPopup(m.popupHtml);
    }
  }, [markers]);

  return <div ref={containerRef} style={{ height }} className="rounded-xl overflow-hidden border border-slate-200" />;
}
