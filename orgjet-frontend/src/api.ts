import axios from 'axios';

const raw = (import.meta.env.VITE_API_BASE || '').trim();

// In production, always route through the ALB rule using /api
const baseURL = import.meta.env.PROD
  ? (raw && !/localhost|127\.0\.0\.1/i.test(raw) ? raw : '/api')
  : (raw || 'http://localhost:3000/api');

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Keep token interceptor if you want
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});