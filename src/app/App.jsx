import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { ensureDbSeeded } from '../db/database.js';
import { checkAndApplyMigrations } from '../db/migrations.js';
import { db } from '../db/database.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';

export function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initApp() {
      try {
        await ensureDbSeeded(db);
        await checkAndApplyMigrations(db);
      } catch (err) {
        console.error('Error initializing database:', err);
      } finally {
        setIsReady(true);
      }
    }
    initApp();
  }, []);

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner text="Starting BizCRM Local Database..." size="lg" />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;
