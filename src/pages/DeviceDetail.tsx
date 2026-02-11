import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Unlock, Smartphone, Loader2 } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import { Device, InstalledApp } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export const DeviceDetail: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [snapshotSize, setSnapshotSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockUpdating, setLockUpdating] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!deviceId || !user) return;

    const unsubDevice = deviceService.subscribeToDevice(user.uid, deviceId, (device) => {
      setDevice(device);
      setLoading(false);
    });

    return () => unsubDevice();
  }, [deviceId, user]);

  useEffect(() => {
    if (!deviceId || !user) return;

    const appsRef = collection(db, "parents", user.uid, "devices", deviceId, "installedApps");
    const unsubApps = onSnapshot(appsRef, (snapshot) => {
      console.log("[DIRECT] snapshot.size:", snapshot.size);
      setSnapshotSize(snapshot.size);
      const appsList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      console.log("[DIRECT] appsList length:", appsList.length);
      setApps(appsList);
    }, (error) => {
      console.error("[DIRECT] onSnapshot error:", error);
    });

    return () => unsubApps();
  }, [deviceId, user]);

  const filteredApps = apps.filter((app) => {
    const pkg = app.packageName || app.id || '';
    const name = app.appName || '';
    return (
      app.platform === 'android' &&
      !pkg.startsWith('com.android.') &&
      !pkg.startsWith('android') &&
      name.trim() !== ''
    );
  });
  const handleLockToggle = async (locked: boolean) => {
    if (!deviceId || !user) return;
    
    setLockUpdating(true);
    try {
      await policyService.toggleDeviceLock(user.uid, deviceId, locked);
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

  const isLocked = device?.deviceLocked ?? false;

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

        {/* Debug Card */}
        <Card className="mb-6 border-dashed border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono">🐛 Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 font-mono text-xs">
            <p><span className="font-semibold">User UID:</span> {user?.uid ?? 'N/A'}</p>
            <p><span className="font-semibold">Device ID:</span> {deviceId ?? 'N/A'}</p>
            <p><span className="font-semibold">Firestore Path:</span> parents/{user?.uid}/devices/{deviceId}/installedApps</p>
            <p><span className="font-semibold">Snapshot Size:</span> {snapshotSize ?? 'N/A'}</p>
            <p><span className="font-semibold">Apps count (state):</span> {apps.length}</p>
            {apps.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <p className="font-semibold mb-1">Raw app docs:</p>
                {apps.slice(0, 10).map((app) => (
                  <p key={app.id}>• {app.id} → {app.appName ?? 'N/A'} (blocked: {String(app.blocked ?? false)}, limit: {app.dailyLimitMinutes ?? 0})</p>
                ))}
                {apps.length > 10 && <p>... and {apps.length - 10} more</p>}
              </div>
            )}
          </CardContent>
        </Card>

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
                <span className="text-sm text-muted-foreground">Platform</span>
                <span className="text-sm font-medium capitalize">{device.platform}</span>
              </div>

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
              {filteredApps.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No apps found. Apps will appear here once the device syncs.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredApps.map((app) => (
                    <AppListItem
                      key={app.packageName || app.id}
                      app={app}
                      deviceId={deviceId!}
                      parentId={user!.uid}
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
