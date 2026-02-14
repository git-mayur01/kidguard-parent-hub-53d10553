import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

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
}

export const LiveLocationMap: React.FC<LiveLocationMapProps> = ({ lastLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

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
        color: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map);
    }

    return () => {};
  }, [lastLocation]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Live Location</CardTitle>
            <CardDescription>Real-time device location tracking</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {lastLocation ? (
          <div
            ref={mapRef}
            className="h-[350px] w-full rounded-lg overflow-hidden border"
          />
        ) : (
          <div className="flex h-[350px] items-center justify-center rounded-lg border text-muted-foreground">
            Waiting for device location...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
