import React from 'react';
import { createMemoryRouter, Navigate, RouterProvider } from 'react-router-dom';

// Layouts and Protected Routes
import AppLayout from '../components/layout/AppLayout';
import EnsureWfsDeviceRoute from '../components/layout/EnsureWfsDeviceRoute';

// Pages
import LoadWfsImagePage from '../pages/LoadWfsImagePage';
import DirectoryBrowserPage from '../pages/DirectoryBrowserPage';
import NotFoundPage from '../pages/NotFoundPage';
//import HomePage from '../pages/HomePage';

const AppRouter: React.FC = () => {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <AppLayout />,
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
