import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { DeviceCard } from '@/components/DeviceCard';
import { useAuth } from '@/contexts/AuthContext';
import { deviceService } from '@/services/deviceService';
import { Device } from '@/types';

export const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = deviceService.subscribeToDevices(user.uid, (devices) => {
      setDevices(devices);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Devices</h1>
            <p className="text-muted-foreground">
              Manage and monitor your children's devices
            </p>
          </div>
          <Button onClick={() => navigate('/pair')}>
            <Plus className="mr-2 h-4 w-4" />
            Pair Device
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading devices...</div>
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <Smartphone className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No devices paired</h3>
            <p className="mb-4 text-muted-foreground">
              Get started by pairing your child's device
            </p>
            <Button onClick={() => navigate('/pair')}>
              <Plus className="mr-2 h-4 w-4" />
              Pair First Device
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
