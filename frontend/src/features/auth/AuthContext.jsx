import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, getAuthUser, setAuthToken, setAuthUser, saasApi } from '../../services/saasApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState(getAuthUser());
  const [tenant, setTenant] = useState(() => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('bizcrm_saas_tenant');
      return data ? JSON.parse(data) : null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      const currentToken = getAuthToken();
      if (!currentToken) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await saasApi.me();
        if (data.user) {
          setUser(data.user);
          setTenant(data.tenant);
          setAuthUser(data.user, data.tenant);
        }
      } catch (err) {
        console.warn('Session expired or offline:', err.message);
        // If server unreachable, retain cached user for resilient SaaS experience
      } finally {
        setIsLoading(false);
      }
    }
    verifyAuth();
  }, []);

  const login = (resToken, resUser, resTenant) => {
    setAuthToken(resToken);
    setAuthUser(resUser, resTenant);
    setToken(resToken);
    setUser(resUser);
    setTenant(resTenant);
  };

  const logout = () => {
    setAuthToken(null);
    setAuthUser(null);
    setToken(null);
    setUser(null);
    setTenant(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ token, user, tenant, isLoading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
