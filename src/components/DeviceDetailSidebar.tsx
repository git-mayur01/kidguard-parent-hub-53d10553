import React from 'react';
import { LayoutDashboard, MapPin, AppWindow } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DeviceSection = 'overview' | 'location' | 'apps';

interface DeviceDetailSidebarProps {
  activeSection: DeviceSection;
  onSectionChange: (section: DeviceSection) => void;
}

const sections: { id: DeviceSection; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'location', label: 'Live Location', icon: MapPin },
  { id: 'apps', label: 'Installed Apps', icon: AppWindow },
];

export const DeviceDetailSidebar: React.FC<DeviceDetailSidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  return (
    <nav className="w-[240px] shrink-0 rounded-xl border bg-card p-3 space-y-1 h-fit sticky top-8">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {section.label}
          </button>
        );
      })}
    </nav>
  );
};
