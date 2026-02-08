import React, { useState } from 'react';
import { Package, Clock, Ban } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InstalledApp } from '@/types';
import { policyService } from '@/services/policyService';
import { toast } from 'sonner';

interface AppListItemProps {
  app: InstalledApp;
  deviceId: string;
  parentId: string;
}

export const AppListItem: React.FC<AppListItemProps> = ({ app, deviceId, parentId }) => {
  const [limitMinutes, setLimitMinutes] = useState(app.dailyLimitMinutes.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  const handleBlockToggle = async (blocked: boolean) => {
    try {
      await policyService.toggleAppBlock(parentId, deviceId, app.packageName, blocked);
      toast.success(`${app.appName} ${blocked ? 'blocked' : 'unblocked'}`);
    } catch (error) {
      toast.error('Failed to update app block status');
    }
  };

  const handleLimitUpdate = async () => {
    const minutes = parseInt(limitMinutes, 10);
    if (isNaN(minutes) || minutes < 0) {
      toast.error('Please enter a valid number of minutes');
      return;
    }

    setIsUpdating(true);
    try {
      await policyService.setAppDailyLimit(parentId, deviceId, app.packageName, minutes);
      toast.success(`Daily limit set to ${minutes} minutes`);
    } catch (error) {
      toast.error('Failed to update daily limit');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">{app.appName}</p>
          <p className="text-xs text-muted-foreground">{app.packageName}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            value={limitMinutes}
            onChange={(e) => setLimitMinutes(e.target.value)}
            className="w-20"
            min={0}
            placeholder="0"
          />
          <span className="text-sm text-muted-foreground">min</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleLimitUpdate}
            disabled={isUpdating}
          >
            Set
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-muted-foreground" />
          <Switch
            checked={app.isBlocked}
            onCheckedChange={handleBlockToggle}
          />
        </div>
      </div>
    </div>
  );
};
