import React, { useState } from 'react';
import { Grid, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import InsertDriveFile from '@mui/icons-material/InsertDriveFile';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';

export type DeviceType = 'plain' | 'mlc' | 'usb';

// Map of option values to their display properties
const OPTION_CONFIGS: Record<DeviceType, { icon: React.ElementType; label: string }> = {
  plain: {
    icon: InsertDriveFile,
    label: 'Plain',
  },
  mlc: {
    icon: MemoryIcon,
    label: 'MLC',
  },
  usb: {
    icon: StorageIcon,
    label: 'USB',
  },
};

/**
 * A reusable selection card component that displays multiple options in a grid layout
 * @param {Object} props Component props
 * @param {string} props.selectedValue - Currently selected value
 * @param {function} props.onChange - Callback when selection changes
 */
const DeviceSelection = ({
  selectedValue: externalSelectedValue,
  onChange,
}: {
  selectedValue: DeviceType;
  onChange: (value: DeviceType) => void;
}) => {
  // Use internal state if component is uncontrolled
  const [internalSelectedValue, setInternalSelectedValue] = useState('mlc');

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
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {Object.entries(OPTION_CONFIGS).map(([value, config]) => {
        const isSelected = selectedValue === value;
        const Icon = config.icon;

        return (
          <Grid item xs={4} key={value}>
            <Card
              variant="outlined"
              sx={{
                borderColor: isSelected ? 'primary.main' : 'divider',
                backgroundColor: isSelected ? 'action.selected' : 'background.paper',
                transition: 'background-color 0.3s ease, border-color 0.3s ease',
              }}
            >
              <CardActionArea onClick={() => handleSelect(value as DeviceType)}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Icon fontSize="large" color={isSelected ? 'primary' : 'action'} />
                  <Typography
                    variant="subtitle1"
                    sx={{
                      mt: 1,
                      fontWeight: isSelected ? 'bold' : 'normal',
                      color: isSelected ? 'primary.main' : 'text.primary',
                    }}
                  >
                    {config.label}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default DeviceSelection;
