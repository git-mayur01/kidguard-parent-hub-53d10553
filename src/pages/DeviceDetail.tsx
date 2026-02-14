import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Unlock, Smartphone, Loader2, MapPin, MapPinned, AppWindow, Plus, Trash2 } from 'lucide-react';
import { collection, doc, onSnapshot, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/Header';
import { AppListItem } from '@/components/AppListItem';
import { LiveLocationMap } from '@/components/LiveLocationMap';
import { AddGeofenceModal } from '@/components/AddGeofenceModal';
import { DeviceDetailSidebar, DeviceSection } from '@/components/DeviceDetailSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { deviceService } from '@/services/deviceService';
import { policyService } from '@/services/policyService';
import { Device, InstalledApp, Geofence } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export const DeviceDetail: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [lastLocation, setLastLocation] = useState<{ latitude: number; longitude: number; accuracy: number; timestamp: number } | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockUpdating, setLockUpdating] = useState(false);
  const [activeSection, setActiveSection] = useState<DeviceSection>('overview');
  const [geofenceModalOpen, setGeofenceModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Device + location listener
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

  // Installed apps listener
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

  // Geofences listener
  useEffect(() => {
    if (!deviceId || !user) return;

    const geofencesRef = collection(db, "parents", user.uid, "devices", deviceId, "geofences");
    const unsubGeo = onSnapshot(geofencesRef, (snapshot) => {
      const fences = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Geofence[];
      setGeofences(fences);
    });

    return () => unsubGeo();
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

  const handleSaveGeofence = async (name: string, latitude: number, longitude: number, radius: number) => {
    if (!deviceId || !user) {
      console.error('[GeoFence] Missing deviceId or user', { deviceId, user: user?.uid });
      return;
    }
    const path = `parents/${user.uid}/devices/${deviceId}/geofences`;
    console.log('[GeoFence] Saving fence:', { parentId: user.uid, deviceId, path, name, latitude, longitude, radius });
    try {
      const geofencesRef = collection(db, "parents", user.uid, "devices", deviceId, "geofences");
      const docRef = await addDoc(geofencesRef, { name, latitude, longitude, radius, createdAt: serverTimestamp(), isActive: true });
      console.log('[GeoFence] Successfully saved with ID:', docRef.id);
      toast.success(`Geo-fence "${name}" created`);
    } catch (error) {
      console.error('[GeoFence] Error saving fence:', error);
      toast.error('Failed to save geo-fence');
    }
  };

  const handleDeleteGeofence = async (fenceId: string) => {
    if (!deviceId || !user) return;
    const fenceDoc = doc(db, "parents", user.uid, "devices", deviceId, "geofences", fenceId);
    await deleteDoc(fenceDoc);
    toast.success('Geo-fence deleted');
  };

  // Compute geofence status
  const geofenceStatus = useMemo(() => {
    if (!lastLocation || geofences.length === 0) return null;

    const insideFences: string[] = [];
    geofences.forEach((fence) => {
      const dist = getDistanceMeters(
        lastLocation.latitude, lastLocation.longitude,
        fence.latitude, fence.longitude
      );
      if (dist <= fence.radius) {
        insideFences.push(fence.name);
      }
    });

    if (insideFences.length > 0) {
      return `Inside ${insideFences.join(', ')}`;
    }
    return 'Outside all fences';
  }, [lastLocation, geofences]);

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

            {/* Live Location + Geo-Fences Section */}
            {activeSection === 'location' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>Live Location</CardTitle>
                        <CardDescription>Real-time device location</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <LiveLocationMap lastLocation={lastLocation} geofences={geofences} />
                    {geofenceStatus && (
                      <div className="flex items-center gap-2 rounded-lg border px-4 py-3 mt-4">
                        <Badge variant={geofenceStatus.startsWith('Inside') ? 'default' : 'secondary'}>
                          {geofenceStatus}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPinned className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle>Geo-Fences</CardTitle>
                          <CardDescription>Safe zones and boundary alerts</CardDescription>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setGeofenceModalOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add Geo-Fence
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {geofences.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No geo-fences configured yet. Add one to start monitoring.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {geofences.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between rounded-lg border px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium">{f.name}</p>
                              <p className="text-xs text-muted-foreground">Radius: {f.radius}m</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteGeofence(f.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <AddGeofenceModal
                  open={geofenceModalOpen}
                  onClose={() => setGeofenceModalOpen(false)}
                  onSave={handleSaveGeofence}
                  initialCenter={lastLocation ? { latitude: lastLocation.latitude, longitude: lastLocation.longitude } : null}
                />
              </div>
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
          </div>
        </div>
      </main>
    </div>
  );
};

// Haversine distance in meters
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default DeviceDetail;
