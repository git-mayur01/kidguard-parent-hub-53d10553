import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Unlock, Smartphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/Header';
import { AppListItem } from '@/components/AppListItem';
import { useAuth } from '@/contexts/AuthContext';
import { deviceService } from '@/services/deviceService';
import { policyService } from '@/services/policyService';
import { Device, InstalledApp, DevicePolicy } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export const DeviceDetail: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [policy, setPolicy] = useState<DevicePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockUpdating, setLockUpdating] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!deviceId || !user) return;

    const unsubDevice = deviceService.subscribeToDevice(deviceId, (device) => {
      if (device && device.pairedParentId !== user.uid) {
        toast.error('You do not have access to this device');
        navigate('/');
        return;
      }
      setDevice(device);
      setLoading(false);
    });

    const unsubApps = deviceService.subscribeToInstalledApps(deviceId, setApps);
    const unsubPolicy = deviceService.subscribeToPolicy(deviceId, setPolicy);

    return () => {
      unsubDevice();
      unsubApps();
      unsubPolicy();
    };
  }, [deviceId, user, navigate]);

  const handleLockToggle = async (locked: boolean) => {
    if (!deviceId) return;
    
    setLockUpdating(true);
    try {
      await policyService.toggleDeviceLock(deviceId, locked);
      toast.success(`Device ${locked ? 'locked' : 'unlocked'}`);
    } catch (error) {
      toast.error('Failed to update device lock status');
    } finally {
      setLockUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Device not found</h2>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isLocked = policy?.deviceLocked ?? false;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Device Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>{device.deviceName}</CardTitle>
                  <CardDescription>
                    {device.lastSeenAt 
                      ? `Last seen ${formatDistanceToNow(device.lastSeenAt, { addSuffix: true })}`
                      : `Registered ${formatDistanceToNow(device.registeredAt, { addSuffix: true })}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant={
                    device.status === 'ACTIVE'
                      ? 'default'
                      : device.status === 'LOCKED'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {device.status}
                </Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <Lock className="h-5 w-5 text-destructive" />
                  ) : (
                    <Unlock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-medium">Device Lock</span>
                </div>
                <Switch
                  checked={isLocked}
                  onCheckedChange={handleLockToggle}
                  disabled={lockUpdating}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {isLocked
                  ? 'Device is locked. Your child cannot use the device.'
                  : 'Device is unlocked and can be used normally.'}
              </p>
            </CardContent>
          </Card>

          {/* Installed Apps Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Installed Apps</CardTitle>
              <CardDescription>
                Manage app access and set daily time limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apps.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No apps found. Apps will appear here once the device syncs.
                </div>
              ) : (
                <div className="space-y-3">
                  {apps.map((app) => (
                    <AppListItem
                      key={app.packageName}
                      app={app}
                      deviceId={deviceId!}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DeviceDetail;
