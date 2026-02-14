import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { MapPinned } from 'lucide-react';

interface AddGeofenceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, latitude: number, longitude: number, radius: number) => Promise<void>;
  initialCenter: { latitude: number; longitude: number } | null;
}

export const AddGeofenceModal: React.FC<AddGeofenceModalProps> = ({
  open,
  onClose,
  onSave,
  initialCenter,
}) => {
  const [name, setName] = useState('');
  const [radius, setRadius] = useState(200);
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setName('');
      setRadius(200);
      setSelectedPos(null);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
      return;
    }

    // Small delay to let dialog render
    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const center: L.LatLngExpression = initialCenter
        ? [initialCenter.latitude, initialCenter.longitude]
        : [0, 0];

      const map = L.map(mapRef.current).setView(center, initialCenter ? 15 : 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Auto-select initialCenter if available
      if (initialCenter) {
        const { latitude: lat, longitude: lng } = initialCenter;
        setSelectedPos({ lat, lng });
        markerRef.current = L.marker([lat, lng]).addTo(map);
        circleRef.current = L.circle([lat, lng], {
          radius,
          color: 'hsl(221, 83%, 53%)',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);
      }

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setSelectedPos({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }

        if (circleRef.current) {
          circleRef.current.setLatLng([lat, lng]);
        } else {
          circleRef.current = L.circle([lat, lng], {
            radius,
            color: 'hsl(221, 83%, 53%)',
            fillOpacity: 0.15,
            weight: 2,
          }).addTo(map);
        }
      });

      mapInstanceRef.current = map;
    }, 100);

    return () => clearTimeout(timer);
  }, [open, initialCenter]);

  // Update circle radius when slider changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  const handleSave = async () => {
    if (!name.trim() || !selectedPos) return;
    setSaving(true);
    try {
      await onSave(name.trim(), selectedPos.lat, selectedPos.lng, radius);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[700px] z-[1000]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="h-5 w-5" />
            Add Geo-Fence
          </DialogTitle>
          <DialogDescription>
            Click on the map to select a center point, then set a name and radius.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            ref={mapRef}
            className="h-[300px] w-full rounded-lg overflow-hidden border relative z-0"
          />

          {selectedPos && (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedPos.lat.toFixed(5)}, {selectedPos.lng.toFixed(5)}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="fence-name">Fence Name</Label>
            <Input
              id="fence-name"
              placeholder="e.g. School, Home, Park"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Radius: {radius}m</Label>
            <Slider
              value={[radius]}
              onValueChange={(v) => setRadius(v[0])}
              min={100}
              max={1000}
              step={50}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>100m</span>
              <span>1000m</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !selectedPos || saving}
          >
            {saving ? 'Saving…' : 'Save Fence'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
