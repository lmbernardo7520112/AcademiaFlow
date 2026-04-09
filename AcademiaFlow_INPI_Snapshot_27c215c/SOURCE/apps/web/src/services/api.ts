import axios from 'axios';

// Usamos a URL configurada no .env ou localhost:3000 (porta padrão do Fastify)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
