import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <LoadingSpinner text="Loading..." size="md" />
  </div>
);

const withSuspense = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage.jsx').then((m) => ({ default: m.DashboardPage }))
);
const ClientsPage = lazy(() =>
  import('../features/clients/ClientsPage.jsx').then((m) => ({ default: m.ClientsPage }))
);
const ClientDetailPage = lazy(() =>
  import('../features/clients/ClientDetailPage.jsx').then((m) => ({ default: m.ClientDetailPage }))
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage.jsx').then((m) => ({ default: m.SettingsPage }))
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: withSuspense(DashboardPage),
      },
      {
        path: 'clients',
        element: withSuspense(ClientsPage),
      },
      {
        path: 'clients/:id',
        element: withSuspense(ClientDetailPage),
      },
      {
        path: 'settings',
        element: withSuspense(SettingsPage),
      },
      // Safe redirects for any old URLs
      {
        path: 'leads',
        element: <Navigate to="/clients" replace />,
      },
      {
        path: 'leads/:id',
        element: <Navigate to="/clients" replace />,
      },
      {
        path: 'projects',
        element: <Navigate to="/clients" replace />,
      },
      {
        path: 'projects/:id',
        element: <Navigate to="/clients" replace />,
      },
      {
        path: 'tasks',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'finance',
        element: <Navigate to="/clients" replace />,
      },
      {
        path: 'payments',
        element: <Navigate to="/clients" replace />,
      },
      {
        path: 'content',
        element: <Navigate to="/clients" replace />,
      },
      {
        path: 'reports',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'notifications',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'reminders',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'services',
        element: <Navigate to="/clients" replace />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
