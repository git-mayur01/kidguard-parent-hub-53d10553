import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Device, InstalledApp, DevicePolicy } from '@/types';

export const deviceService = {
  // Subscribe to devices from parents/{parentId}/devices subcollection
  subscribeToDevices(
    parentId: string,
    callback: (devices: Device[]) => void
  ): () => void {
    const devicesRef = collection(db, 'parents', parentId, 'devices');

    return onSnapshot(devicesRef, (snapshot) => {
      const devices: Device[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          deviceName: data.deviceName || 'Unknown Device',
          status: data.status || 'PENDING',
          platform: data.platform || 'android',
          pairedParentId: data.pairedParentId,
          registeredAt: data.registeredAt?.toDate() || new Date(),
          lastSeenAt: data.lastSeenAt?.toDate(),
        };
      });
      callback(devices);
    });
  },

  subscribeToDevice(
    parentId: string,
    deviceId: string,
    callback: (device: Device | null) => void
  ): () => void {
    const deviceRef = doc(db, 'parents', parentId, 'devices', deviceId);

    return onSnapshot(deviceRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        deviceName: data.deviceName || 'Unknown Device',
        status: data.status || 'PENDING',
        platform: data.platform || 'android',
        pairedParentId: data.pairedParentId || parentId,
        registeredAt: data.registeredAt?.toDate() || new Date(),
        lastSeenAt: data.lastSeenAt?.toDate(),
      });
    });
  },

  subscribeToInstalledApps(
    parentId: string,
    deviceId: string,
    callback: (apps: InstalledApp[]) => void
  ): () => void {
    const appsRef = collection(db, 'parents', parentId, 'devices', deviceId, 'installedApps');

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
    // Query devices collection for matching pairing code
    const devicesRef = collection(db, 'devices');
    const q = query(devicesRef, where('pairingCode', '==', pairingCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const deviceDoc = snapshot.docs[0];
    const deviceData = deviceDoc.data();
    const deviceId = deviceDoc.id;

    // 1. Create document in parents/{parentId}/devices/{deviceId}
    await setDoc(doc(db, 'parents', parentId, 'devices', deviceId), {
      deviceId: deviceId,
      deviceName: deviceData.deviceName || 'Unknown Device',
      platform: deviceData.platform || 'android',
      status: 'ACTIVE',
      pairedParentId: parentId,
      registeredAt: deviceData.registeredAt || new Date(),
    });

    // 2. Update the main device document
    await updateDoc(doc(db, 'devices', deviceId), {
      status: 'ACTIVE',
      pairedParentId: parentId,
      pairingCode: null,
    });

    return deviceId;
  },
};
