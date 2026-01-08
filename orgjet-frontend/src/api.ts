import axios from 'axios';

const raw = (import.meta.env.VITE_API_BASE || '').trim();

// If we're in production and VITE_API_BASE is empty or points at localhost,
// force it to '/api' so calls go through the ALB path rule.
const baseURL =
  import.meta.env.PROD
    ? (raw && !/localhost|127\.0\.0\.1/i.test(raw) ? raw : '/api')
    : (raw || 'http://localhost:3000/api');

export const api = axios.create({ baseURL });

// (keep your interceptor)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});