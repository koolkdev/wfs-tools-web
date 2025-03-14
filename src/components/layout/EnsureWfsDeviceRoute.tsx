import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useWfsLib } from '../../services/wfslib/WfsLibProvider';

const EnsureWfsDeviceRoute: React.FC = () => {
  const { device } = useWfsLib();

  // If no device, redirect to load page
  if (!device) {
    return <Navigate to="/load" replace />;
  }

  // If device exists, render child routes
  return <Outlet />;
};

export default EnsureWfsDeviceRoute;
