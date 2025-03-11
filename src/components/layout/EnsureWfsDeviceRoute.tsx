import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { CircularProgress, Box } from '@mui/material';
import { useWfsLib } from '../../services/wfslib/WfsLibProvider';

const EnsureWfsDeviceRoute: React.FC = () => {
  const { device, loading } = useWfsLib();

  // If still loading module, show loading
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  // If module is loaded but no device, redirect to load page
  if (!device) {
    return <Navigate to="/load" replace />;
  }

  // If device exists, render child routes
  return <Outlet />;
};

export default EnsureWfsDeviceRoute;
