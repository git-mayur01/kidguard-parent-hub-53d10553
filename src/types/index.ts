export type DeviceStatus = 'PENDING' | 'ACTIVE' | 'LOCKED';

export interface Device {
  id: string;
  deviceName: string;
  status: DeviceStatus;
  platform: string;
  pairedParentId?: string;
  registeredAt: Date;
  lastSeenAt?: Date;
  deviceLocked?: boolean;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
  blocked: boolean;
  dailyLimitMinutes: number;
  lastSeenAt?: Date;
}

export interface DevicePolicy {
  deviceLocked: boolean;
  blockedApps: string[];
  dailyLimits: Record<string, number>;
}

export interface Parent {
  id: string;
  email: string;
}

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}
