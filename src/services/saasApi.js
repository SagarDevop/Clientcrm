/**
 * SaaS API Client with JWT Bearer Token Authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('bizcrm_saas_token') || '';
  }
  return '';
}

export function setAuthToken(token) {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('bizcrm_saas_token', token);
    } else {
      localStorage.removeItem('bizcrm_saas_token');
    }
  }
}

export function getAuthUser() {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('bizcrm_saas_user');
    return data ? JSON.parse(data) : null;
  }
  return null;
}

export function setAuthUser(user, tenant) {
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem('bizcrm_saas_user', JSON.stringify(user));
      if (tenant) localStorage.setItem('bizcrm_saas_tenant', JSON.stringify(tenant));
    } else {
      localStorage.removeItem('bizcrm_saas_user');
      localStorage.removeItem('bizcrm_saas_tenant');
    }
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      setAuthToken(null);
      setAuthUser(null);
      window.location.href = '/login';
    }
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const saasApi = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me', { method: 'GET' }),

  // Generic Resource CRUD
  getAll: (resource) => request(`/${resource}`),
  getById: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, item) => request(`/${resource}`, { method: 'POST', body: JSON.stringify(item) }),
  update: (resource, id, item) => request(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
  delete: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),

  // Email
  sendEmail: (body) => request('/send-email', { method: 'POST', body: JSON.stringify(body) }),
};
