import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { ClientsPage } from '../features/clients/ClientsPage.jsx';
import { ClientDetailPage } from '../features/clients/ClientDetailPage.jsx';
import { LeadsPage } from '../features/leads/LeadsPage.jsx';
import { LeadDetailPage } from '../features/leads/LeadDetailPage.jsx';
import { TasksPage } from '../features/tasks/TasksPage.jsx';
import { ProjectsPage } from '../features/projects/ProjectsPage.jsx';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage.jsx';
import { PaymentsPage } from '../features/payments/PaymentsPage.jsx';
import { ServicesPage } from '../features/services/ServicesPage.jsx';
import { RemindersPage } from '../features/reminders/RemindersPage.jsx';
import { ReportsPage } from '../features/reports/ReportsPage.jsx';
import { SettingsPage } from '../features/settings/SettingsPage.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'clients',
        element: <ClientsPage />,
      },
      {
        path: 'clients/:id',
        element: <ClientDetailPage />,
      },
      {
        path: 'leads',
        element: <LeadsPage />,
      },
      {
        path: 'leads/:id',
        element: <LeadDetailPage />,
      },
      {
        path: 'tasks',
        element: <TasksPage />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'projects/:id',
        element: <ProjectDetailPage />,
      },
      {
        path: 'payments',
        element: <PaymentsPage />,
      },
      {
        path: 'services',
        element: <ServicesPage />,
      },
      {
        path: 'reminders',
        element: <RemindersPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);
