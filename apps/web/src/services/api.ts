import axios from 'axios';

/**
 * API base URL resolution:
 * 1. In development: VITE_API_URL from .env (typically http://localhost:3000/api via vite proxy)
 * 2. In production/appliance: VITE_API_URL should be set to "/api" at build time
 * 3. Fallback: "/api" (relative — works behind any reverse proxy)
 *
 * NEVER fall back to http://localhost:3000 — that breaks LAN, tunnel, and any non-localhost access.
 */
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: anexa o Bearer token se ele existir no localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('@academiaflow_raw_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Lida com 401 Unauthorized para deslogar suavemente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se o token expirar ou for inválido, podemos emitir um evento ou limpar a store
    if (error.response?.status === 401) {
      localStorage.removeItem('@academiaflow_raw_token');
      localStorage.removeItem('@academiaflow_profile');
      // Opcional: window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);
