import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Device } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface DeviceCardProps {
  device: Device;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  PENDING: 'secondary',
  LOCKED: 'destructive',
};

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent"
      onClick={() => navigate(`/device/${device.id}`)}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">{device.deviceName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {device.lastSeenAt 
                  ? `Last seen ${formatDistanceToNow(device.lastSeenAt, { addSuffix: true })}`
                  : `Registered ${formatDistanceToNow(device.registeredAt, { addSuffix: true })}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant[device.status]}>{device.status}</Badge>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
};
