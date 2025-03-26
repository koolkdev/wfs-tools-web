import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { HardDrive, Cpu, File } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DeviceType = 'plain' | 'mlc' | 'usb';

// Map of option values to their display properties
const OPTION_CONFIGS: Record<DeviceType, { icon: React.ElementType; label: string }> = {
  plain: {
    icon: File,
    label: 'Plain',
  },
  mlc: {
    icon: Cpu,
    label: 'MLC',
  },
  usb: {
    icon: HardDrive,
    label: 'USB',
  },
};

interface DeviceSelectionProps {
  selectedValue: DeviceType;
  onChange: (value: DeviceType) => void;
}

export function DeviceSelection({
  selectedValue: externalSelectedValue,
  onChange,
}: DeviceSelectionProps) {
  // Use internal state if component is uncontrolled
  const [internalSelectedValue, setInternalSelectedValue] = useState<DeviceType>('mlc');

  // Determine if component is controlled or uncontrolled
  const isControlled = externalSelectedValue !== undefined;
  const selectedValue = isControlled ? externalSelectedValue : internalSelectedValue;

  // Handle selection change
  const handleSelect = (value: DeviceType) => {
    if (!isControlled) {
      setInternalSelectedValue(value);
    }

    if (onChange) {
      onChange(value);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {(Object.entries(OPTION_CONFIGS) as [DeviceType, (typeof OPTION_CONFIGS)[DeviceType]][]).map(
        ([value, config]) => {
          const isSelected = selectedValue === value;
          const Icon = config.icon;

          return (
            <Card
              key={value}
              className={cn(
                'cursor-pointer border transition-colors transition-shadow',
                isSelected ? 'border-primary bg-primary/15 shadow' : 'hover:bg-muted/50',
              )}
              onClick={() => handleSelect(value)}
            >
              <CardContent className="p-1 text-center">
                <Icon
                  className={cn(
                    'h-8 w-8 mx-auto mb-2',
                    isSelected ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <p
                  className={cn(
                    'font-medium',
                    isSelected ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {config.label}
                </p>
              </CardContent>
            </Card>
          );
        },
      )}
    </div>
  );
}
