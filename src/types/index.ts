export type DeviceStatus = 'PENDING' | 'ACTIVE' | 'LOCKED';

export interface Device {
  id: string;
  deviceName: string;
  status: DeviceStatus;
  platform: string;
  pairedParentId?: string;
  registeredAt: Date;
  lastSeenAt?: Date;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
  isBlocked: boolean;
  dailyLimitMinutes: number;
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
