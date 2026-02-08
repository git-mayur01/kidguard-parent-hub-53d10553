import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const policyService = {
  async toggleDeviceLock(deviceId: string, locked: boolean): Promise<void> {
    const policyRef = doc(db, 'devices', deviceId, 'policy', 'current');
    const policySnap = await getDoc(policyRef);
    
    if (policySnap.exists()) {
      await updateDoc(policyRef, { deviceLocked: locked });
    } else {
      await setDoc(policyRef, {
        deviceLocked: locked,
        blockedApps: [],
        dailyLimits: {},
      });
    }
  },

  async toggleAppBlock(
    parentId: string,
    deviceId: string,
    packageName: string,
    isBlocked: boolean
  ): Promise<void> {
    const appRef = doc(db, 'parents', parentId, 'devices', deviceId, 'installedApps', packageName);
    await updateDoc(appRef, { isBlocked });

    // Also update the policy document for Android agent
    const policyRef = doc(db, 'devices', deviceId, 'policy', 'current');
    const policySnap = await getDoc(policyRef);

    if (policySnap.exists()) {
      const currentBlockedApps: string[] = policySnap.data().blockedApps || [];
      let newBlockedApps: string[];

      if (isBlocked) {
        newBlockedApps = [...new Set([...currentBlockedApps, packageName])];
      } else {
        newBlockedApps = currentBlockedApps.filter((p) => p !== packageName);
      }

      await updateDoc(policyRef, { blockedApps: newBlockedApps });
    } else {
      await setDoc(policyRef, {
        deviceLocked: false,
        blockedApps: isBlocked ? [packageName] : [],
        dailyLimits: {},
      });
    }
  },

  async setAppDailyLimit(
    parentId: string,
    deviceId: string,
    packageName: string,
    limitMinutes: number
  ): Promise<void> {
    const appRef = doc(db, 'parents', parentId, 'devices', deviceId, 'installedApps', packageName);
    await updateDoc(appRef, { dailyLimitMinutes: limitMinutes });

    // Also update the policy document for Android agent
    const policyRef = doc(db, 'devices', deviceId, 'policy', 'current');
    const policySnap = await getDoc(policyRef);

    if (policySnap.exists()) {
      const currentLimits = policySnap.data().dailyLimits || {};
      await updateDoc(policyRef, {
        dailyLimits: { ...currentLimits, [packageName]: limitMinutes },
      });
    } else {
      await setDoc(policyRef, {
        deviceLocked: false,
        blockedApps: [],
        dailyLimits: { [packageName]: limitMinutes },
      });
    }
  },
};
