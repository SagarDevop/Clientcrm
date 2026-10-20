import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (isInstalled || isDismissed) return null;
  if (!deferredPrompt && !isIos) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="bg-brand-50 dark:bg-slate-900/90 border-b border-brand-100 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between">
      <div className="flex items-center space-x-2 mr-2">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white flex-shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">Install BizCRM App: </span>
          {isIos ? (
            <span>
              Tap <Share className="w-3.5 h-3.5 inline mx-0.5 text-brand-600" /> then <b>"Add to Home Screen"</b> for offline access.
            </span>
          ) : (
            <span>Install on your phone for quick offline access & reminders.</span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1.5 flex-shrink-0">
        {deferredPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg text-xs transition-colors shadow-xs"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
