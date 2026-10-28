import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { ensureDbSeeded, db } from '../db/database.js';
import { checkAndApplyMigrations } from '../db/migrations.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { PinLockScreen } from '../components/common/PinLockScreen.jsx';
import { isPinProtected, isSessionUnlocked, requestPersistentStorage } from '../utils/security.js';

export function App() {
  const [isReady, setIsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function initApp() {
      try {
        await ensureDbSeeded(db);
        await checkAndApplyMigrations(db);
        // Request persistent storage to guard against silent IndexedDB eviction
        await requestPersistentStorage();

        // Check PIN protection
        if (isPinProtected() && !isSessionUnlocked()) {
          setIsLocked(true);
        }
      } catch (err) {
        console.error('Error initializing application:', err);
      } finally {
        setIsReady(true);
      }
    }
    initApp();
  }, []);

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
        <LoadingSpinner text="Starting BizCRM Local Database..." size="lg" />
      </div>
    );
  }

  return (
    <>
      {isLocked && <PinLockScreen onUnlock={() => setIsLocked(false)} />}
      <RouterProvider router={router} />
    </>
  );
}

export default App;

