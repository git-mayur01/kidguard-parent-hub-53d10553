import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow } from 'date-fns';
import { Geofence } from '@/types';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LastLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LiveLocationMapProps {
  lastLocation: LastLocation | null;
  geofences: Geofence[];
}

export const LiveLocationMap: React.FC<LiveLocationMapProps> = ({ lastLocation, geofences }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const geofenceLayersRef = useRef<L.Circle[]>([]);

  useEffect(() => {
    if (!mapRef.current || !lastLocation) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(
        [lastLocation.latitude, lastLocation.longitude],
        16
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    const pos: L.LatLngExpression = [lastLocation.latitude, lastLocation.longitude];

    map.setView(pos, map.getZoom());

    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
      markerRef.current.setPopupContent(
        `Last updated: ${formatDistanceToNow(new Date(lastLocation.timestamp), { addSuffix: true })}`
      );
    } else {
      markerRef.current = L.marker(pos)
        .addTo(map)
        .bindPopup(
          `Last updated: ${formatDistanceToNow(new Date(lastLocation.timestamp), { addSuffix: true })}`
        );
    }

    if (circleRef.current) {
      circleRef.current.setLatLng(pos);
      circleRef.current.setRadius(lastLocation.accuracy);
    } else {
      circleRef.current = L.circle(pos, {
        radius: lastLocation.accuracy,
        color: 'hsl(221, 83%, 53%)',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map);
    }

    return () => {};
  }, [lastLocation]);

  // Render geofence circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old geofence layers
    geofenceLayersRef.current.forEach((layer) => layer.remove());
    geofenceLayersRef.current = [];

    geofences.forEach((fence) => {
      const circle = L.circle([fence.latitude, fence.longitude], {
        radius: fence.radius,
        color: 'hsl(142, 71%, 45%)',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '6 4',
      })
        .addTo(map)
        .bindPopup(fence.name);
      geofenceLayersRef.current.push(circle);
    });
  }, [geofences]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
        geofenceLayersRef.current = [];
      }
    };
  }, []);

  if (!lastLocation) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-lg border text-muted-foreground">
        Waiting for device location...
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="h-[350px] w-full rounded-lg overflow-hidden border"
    />
  );
};
