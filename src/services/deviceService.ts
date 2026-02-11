import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
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
        deviceLocked: data.deviceLocked || false,
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
      console.log('[DEBUG] installedApps snapshot.size:', snapshot.size);
      console.log('[DEBUG] installedApps path:', appsRef.path);
      const apps: InstalledApp[] = snapshot.docs.map((d) => {
        const data = d.data();
        console.log('[DEBUG] app doc id:', d.id, 'data:', JSON.stringify(data));
        return {
          packageName: d.id,
          appName: data.appName || d.id,
          blocked: data.blocked || false,
          dailyLimitMinutes: data.dailyLimitMinutes || 0,
          lastSeenAt: data.lastSeenAt?.toDate(),
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

  async pairDevice(pairingCode: string, parentId: string): Promise<{ deviceId: string } | { error: string }> {
    const { getDoc, serverTimestamp } = await import('firebase/firestore');
    
    const codeRef = doc(db, 'pairingCodes', pairingCode);
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      return { error: 'Invalid pairing code' };
    }

    const codeData = codeSnap.data();

    if (codeData.claimed === true) {
      return { error: 'Code already used' };
    }

    const deviceId = codeData.deviceId;
    if (!deviceId) {
      return { error: 'Invalid pairing code' };
    }

    // Create parent's device document
    await setDoc(doc(db, 'parents', parentId, 'devices', deviceId), {
      platform: 'android',
      status: 'ACTIVE',
      pairedAt: serverTimestamp(),
    });

    // Mark code as claimed
    await updateDoc(codeRef, {
      claimed: true,
    });

    return { deviceId };
  },
};
