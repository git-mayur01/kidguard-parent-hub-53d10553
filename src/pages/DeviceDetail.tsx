import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Unlock, Smartphone, Loader2, MapPin, AppWindow, Shield, MapPinned } from 'lucide-react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/Header';
import { AppListItem } from '@/components/AppListItem';
import { LiveLocationMap } from '@/components/LiveLocationMap';
import { DeviceDetailSidebar, DeviceSection } from '@/components/DeviceDetailSidebar';
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
  const [lastLocation, setLastLocation] = useState<{ latitude: number; longitude: number; accuracy: number; timestamp: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockUpdating, setLockUpdating] = useState(false);
  const [activeSection, setActiveSection] = useState<DeviceSection>('overview');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!deviceId || !user) return;

    const unsubDevice = deviceService.subscribeToDevice(user.uid, deviceId, (device) => {
      setDevice(device);
      setLoading(false);
    });

    const deviceDocRef = doc(db, "parents", user.uid, "devices", deviceId);
    const unsubLocation = onSnapshot(deviceDocRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.lastLocation) {
        setLastLocation(data.lastLocation);
      }
    });

    return () => { unsubDevice(); unsubLocation(); };
  }, [deviceId, user]);

  useEffect(() => {
    if (!deviceId || !user) return;

    const appsRef = collection(db, "parents", user.uid, "devices", deviceId, "installedApps");
    const unsubApps = onSnapshot(appsRef, (snapshot) => {
      const appsList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setApps(appsList);
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

        <div className="flex gap-6">
          <DeviceDetailSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          <div className="flex-1 min-w-0">
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <Card>
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

                  {lastLocation && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Location Update</span>
                        <span className="text-sm font-medium">
                          {formatDistanceToNow(new Date(lastLocation.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </>
                  )}

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
            )}

            {/* Live Location Section */}
            {activeSection === 'location' && (
              <Card>
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
                  <LiveLocationMap lastLocation={lastLocation} />
                </CardContent>
              </Card>
            )}

            {/* Installed Apps Section */}
            {activeSection === 'apps' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AppWindow className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Installed Apps</CardTitle>
                      <CardDescription>
                        Manage app access and set daily time limits
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredApps.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No apps found. Apps will appear here once the device syncs.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
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
            )}

            {/* Device Lock Section */}
            {activeSection === 'lock' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Device Lock</CardTitle>
                      <CardDescription>Control device access remotely</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      {isLocked ? (
                        <Lock className="h-6 w-6 text-destructive" />
                      ) : (
                        <Unlock className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {isLocked ? 'Device is Locked' : 'Device is Unlocked'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isLocked
                            ? 'Your child cannot use the device until you unlock it.'
                            : 'The device can be used normally.'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isLocked}
                      onCheckedChange={handleLockToggle}
                      disabled={lockUpdating}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When locked, the device will display a lock screen preventing any usage.
                    The lock status updates in real-time on the child's device.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Geo-Fences Section (Placeholder) */}
            {activeSection === 'geofences' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Geo-Fencing</CardTitle>
                      <CardDescription>Location-based alerts and boundaries</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MapPinned className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-muted-foreground">
                      Create safe zones and receive alerts when your child enters or exits specific areas.
                    </p>
                    <Badge variant="secondary" className="mt-4">Coming Soon</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeviceDetail;
