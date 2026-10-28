import React, { useState, useEffect } from 'react';
import { getPinConfig, verifyPin, setSessionUnlocked } from '../../utils/security.js';

export function PinLockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let interval;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (lockoutTimer > 0 || isVerifying || !pin) return;

    setIsVerifying(true);
    setError('');

    try {
      const config = getPinConfig();
      if (!config.enabled || !config.hash) {
        setSessionUnlocked(true);
        if (onUnlock) onUnlock();
        return;
      }

      const isValid = await verifyPin(pin, config.hash, config.salt);
      if (isValid) {
        setSessionUnlocked(true);
        if (onUnlock) onUnlock();
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPin('');

        if (nextAttempts >= 5) {
          setLockoutTimer(30);
          setAttempts(0);
          setError('Too many failed attempts. Locked for 30 seconds.');
        } else {
          setError(`Incorrect PIN. ${5 - nextAttempts} attempts remaining.`);
        }
      }
    } catch (err) {
      setError('Verification error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (num) => {
    if (lockoutTimer > 0 || isVerifying) return;
    if (pin.length < 8) {
      const newPin = pin + num;
      setPin(newPin);
    }
  };

  const handleDelete = () => {
    if (lockoutTimer > 0 || isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/90 backdrop-blur-md px-4 select-none">
      <div className="w-full max-w-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 shadow-2xl text-center">
        {/* Shield / Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          BizCRM Protected
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-6">
          Enter your security PIN to unlock your agency workspace
        </p>

        {/* PIN Dots Display */}
        <div className="flex justify-center items-center gap-3 mb-6 h-8">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-emerald-600 dark:bg-emerald-400 scale-110 shadow-sm shadow-emerald-500/40'
                  : 'bg-stone-200 dark:bg-stone-800'
              }`}
            />
          ))}
          {pin.length > 4 && (
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">+{pin.length - 4}</span>
          )}
        </div>

        {error && (
          <div className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-4 bg-rose-50 dark:bg-rose-950/40 py-2 px-3 rounded-lg border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        {lockoutTimer > 0 && (
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-4 bg-amber-50 dark:bg-amber-950/40 py-2 px-3 rounded-lg border border-amber-200 dark:border-amber-900">
            Try again in {lockoutTimer}s
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={lockoutTimer > 0 || isVerifying}
              onClick={() => handleKeyPress(String(num))}
              className="h-14 rounded-2xl bg-stone-100 dark:bg-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-700/80 text-lg font-semibold text-stone-800 dark:text-stone-200 active:scale-95 transition-all disabled:opacity-40"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={lockoutTimer > 0 || isVerifying || !pin}
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-stone-100 dark:bg-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-700/80 flex items-center justify-center text-stone-600 dark:text-stone-300 active:scale-95 transition-all disabled:opacity-40"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H20a2 2 0 012 2v10a2 2 0 01-2 2h-9.172a2 2 0 01-1.414-.586L3 12z" />
            </svg>
          </button>
          <button
            type="button"
            disabled={lockoutTimer > 0 || isVerifying}
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-stone-100 dark:bg-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-700/80 text-lg font-semibold text-stone-800 dark:text-stone-200 active:scale-95 transition-all disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            disabled={lockoutTimer > 0 || isVerifying || pin.length < 4}
            onClick={handleSubmit}
            className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 shadow-md shadow-emerald-600/30 font-medium"
            title="Unlock"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-relaxed">
          Local device protection. Data remains stored securely in your browser's IndexedDB.
        </p>
      </div>
    </div>
  );
}
