import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const policyService = {
  async toggleDeviceLock(parentId: string, deviceId: string, locked: boolean): Promise<void> {
    const deviceRef = doc(db, 'parents', parentId, 'devices', deviceId);
    await updateDoc(deviceRef, { deviceLocked: locked });
  },

  async toggleAppBlock(
    parentId: string,
    deviceId: string,
    packageName: string,
    blocked: boolean
  ): Promise<void> {
    const appRef = doc(db, 'parents', parentId, 'devices', deviceId, 'installedApps', packageName);
    await updateDoc(appRef, { blocked });
  },

  async setAppDailyLimit(
    parentId: string,
    deviceId: string,
    packageName: string,
    limitMinutes: number
  ): Promise<void> {
    const appRef = doc(db, 'parents', parentId, 'devices', deviceId, 'installedApps', packageName);
    await updateDoc(appRef, { dailyLimitMinutes: limitMinutes });
  },
};
