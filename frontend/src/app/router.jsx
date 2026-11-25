import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx';

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
const PartnerDashboard = lazy(() =>
  import('../features/partners/PartnerDashboard.jsx').then((m) => ({ default: m.PartnerDashboard }))
);
const KnowledgeCenter = lazy(() =>
  import('../features/knowledge/KnowledgeCenter.jsx').then((m) => ({ default: m.KnowledgeCenter }))
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
const FinancePage = lazy(() =>
  import('../features/finance/FinancePage.jsx').then((m) => ({ default: m.FinancePage }))
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withSuspense(DashboardPage),
      },
      {
        path: 'partner-dashboard',
        element: withSuspense(PartnerDashboard),
      },
      {
        path: 'knowledge',
        element: withSuspense(KnowledgeCenter),
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
        path: 'finance',
        element: withSuspense(FinancePage),
      },
      {
        path: 'settings',
        element: withSuspense(SettingsPage),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
