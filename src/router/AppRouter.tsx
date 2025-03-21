import React from 'react';
import { createMemoryRouter, Navigate, RouterProvider } from 'react-router-dom';

// Layouts and Protected Routes
import AppLayout from '../components/layout/AppLayout';
import EnsureWfsDeviceRoute from '../components/layout/EnsureWfsDeviceRoute';
import RouterErrorPage from '@/components/common/RouterrErrorPage';

// Pages
const LoadWfsImagePage = React.lazy(() => import('../pages/LoadWfsImagePage'));
const DirectoryBrowserPage = React.lazy(() => import('../pages/DirectoryBrowserPage'));
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage'));
//import HomePage from '../pages/HomePage';

const AppRouter: React.FC = () => {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouterErrorPage />, // Add this
      children: [
        {
          index: true,
          element: <Navigate to="/load" replace />,
        },
        {
          path: 'load',
          element: <LoadWfsImagePage />,
        },
        {
          path: 'browse',
          element: <EnsureWfsDeviceRoute />,
          children: [
            {
              index: true,
              element: <DirectoryBrowserPage />,
            },
            {
              path: '*',
              element: <DirectoryBrowserPage />,
            },
          ],
        },
        {
          path: '*',
          element: <NotFoundPage />,
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
};

export default AppRouter;
