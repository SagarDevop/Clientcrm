import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saasApi, setAuthToken, setAuthUser } from '../../services/saasApi.js';
import { Mail, Lock, Building, ArrowRight, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('warshasingh21@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await saasApi.login({ email, password });

      if (res && res.token) {
        setAuthToken(res.token);
        setAuthUser(res.user, res.tenant);
        navigate(from, { replace: true });
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <Building className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
          Jugarr Agency CRM
        </h2>
        <p className="mt-2 text-center text-xs text-stone-500 dark:text-stone-400">
          Private Owner Access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-stone-900 py-8 px-6 shadow-xl border border-stone-200 dark:border-stone-800 rounded-3xl sm:px-10 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-semibold">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-1">
                Owner Email
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-stone-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="warshasingh21@gmail.com"
                  className="appearance-none block w-full pl-10 pr-3.5 py-3 border border-stone-200 dark:border-stone-700 rounded-xl placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-stone-50/50 dark:bg-stone-800 dark:text-stone-100 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-stone-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full pl-10 pr-3.5 py-3 border border-stone-200 dark:border-stone-700 rounded-xl placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-stone-50/50 dark:bg-stone-800 dark:text-stone-100 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/25 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                'Signing In...'
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/60 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Owner Access Only</span>
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">warshasingh21@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
