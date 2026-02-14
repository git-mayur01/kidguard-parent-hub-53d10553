import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
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

const MapUpdater: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

export const LiveLocationMap: React.FC<LiveLocationMapProps> = ({ lastLocation }) => {
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
          <div className="h-[350px] w-full rounded-lg overflow-hidden border">
            <MapContainer
              center={[lastLocation.latitude, lastLocation.longitude]}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater lat={lastLocation.latitude} lng={lastLocation.longitude} />
              <Marker position={[lastLocation.latitude, lastLocation.longitude]}>
                <Popup>
                  Last updated: {formatDistanceToNow(new Date(lastLocation.timestamp), { addSuffix: true })}
                </Popup>
              </Marker>
              <Circle
                center={[lastLocation.latitude, lastLocation.longitude]}
                radius={lastLocation.accuracy}
                pathOptions={{ color: 'hsl(var(--primary))', fillOpacity: 0.15, weight: 1 }}
              />
            </MapContainer>
          </div>
        ) : (
          <div className="flex h-[350px] items-center justify-center rounded-lg border text-muted-foreground">
            Waiting for device location...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
