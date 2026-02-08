import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Device, InstalledApp, DevicePolicy } from '@/types';

export const deviceService = {
  subscribeToDevices(
    parentId: string,
    callback: (devices: Device[]) => void
  ): () => void {
    const devicesRef = collection(db, 'devices');
    const q = query(devicesRef, where('parentId', '==', parentId));

    return onSnapshot(q, (snapshot) => {
      const devices: Device[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          parentId: data.parentId,
          status: data.status,
          pairingCode: data.pairingCode || '',
          deviceName: data.deviceName,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastSeenAt: data.lastSeenAt?.toDate() || new Date(),
        };
      });
      callback(devices);
    });
  },

  subscribeToDevice(
    deviceId: string,
    callback: (device: Device | null) => void
  ): () => void {
    const deviceRef = doc(db, 'devices', deviceId);

    return onSnapshot(deviceRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        parentId: data.parentId,
        status: data.status,
        pairingCode: data.pairingCode || '',
        deviceName: data.deviceName,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastSeenAt: data.lastSeenAt?.toDate() || new Date(),
      });
    });
  },

  subscribeToInstalledApps(
    deviceId: string,
    callback: (apps: InstalledApp[]) => void
  ): () => void {
    const appsRef = collection(db, 'devices', deviceId, 'installedApps');

    return onSnapshot(appsRef, (snapshot) => {
      const apps: InstalledApp[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          packageName: doc.id,
          appName: data.appName,
          isBlocked: data.isBlocked || false,
          dailyLimitMinutes: data.dailyLimitMinutes || 0,
        };
      });
      callback(apps);
    });
  },

  subscribeToPolicy(
    deviceId: string,
    callback: (policy: DevicePolicy | null) => void
  ): () => void {
    const policyRef = doc(db, 'devices', deviceId, 'policy', 'current');

    return onSnapshot(policyRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const data = snapshot.data();
      callback({
        deviceLocked: data.deviceLocked || false,
        blockedApps: data.blockedApps || [],
        dailyLimits: data.dailyLimits || {},
      });
    });
  },

  async pairDevice(pairingCode: string, parentId: string): Promise<string | null> {
    const devicesRef = collection(db, 'devices');
    const q = query(devicesRef, where('pairingCode', '==', pairingCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const deviceDoc = snapshot.docs[0];
    await updateDoc(doc(db, 'devices', deviceDoc.id), {
      parentId,
      status: 'ACTIVE',
      pairingCode: '',
    });

    return deviceDoc.id;
  },
};
