import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saasApi, setAuthToken, setAuthUser } from '../../services/saasApi.js';
import { ShieldCheck, Mail, Lock, Building, ArrowRight, CheckCircle2 } from 'lucide-react';

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      let res;
      if (isRegister) {
        res = await saasApi.register({ name, companyName, email, password });
      } else {
        res = await saasApi.login({ email, password });
      }

      if (res && res.token) {
        setAuthToken(res.token);
        setAuthUser(res.user, res.tenant);
        navigate(from, { replace: true });
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
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
        <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-900 dark:text-stone-100">
          {isRegister ? 'Start Your SaaS Workspace' : 'Sign in to BizCRM SaaS'}
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600 dark:text-stone-400">
          Cloud-powered agency client & billing platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-stone-900 py-8 px-6 shadow-xl border border-stone-200 dark:border-stone-800 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Full Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Sagar Singh"
                      className="appearance-none block w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50/50 dark:bg-stone-800 dark:text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Agency / Business Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Jugarr Agency"
                      className="appearance-none block w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50/50 dark:bg-stone-800 dark:text-stone-100"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Email Address
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-stone-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="warshasingh21@gmail.com"
                  className="appearance-none block w-full pl-9 pr-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50/50 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-stone-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full pl-9 pr-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50/50 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            >
              {loading ? (
                'Processing...'
              ) : isRegister ? (
                <>
                  Create SaaS Account <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {!isRegister && (
            <div className="mt-4 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300">
              <span className="font-bold text-stone-900 dark:text-stone-100 block mb-1">🔑 Default Admin Login:</span>
              <div>Email: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">warshasingh21@gmail.com</span></div>
              <div>Password: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">admin123</span></div>
            </div>
          )}

          <div className="mt-6 border-t border-stone-200 dark:border-stone-800 pt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {isRegister
                ? 'Already have an account? Sign in here'
                : "Don't have an agency account? Register your SaaS workspace"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
