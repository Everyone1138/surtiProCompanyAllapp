import axios from 'axios';

// Use .env value; default to '/api' in prod, and localhost in dev.
const baseURL =
  import.meta.env.PROD
    ? (import.meta.env.VITE_API_BASE || '/api')
    : (import.meta.env.VITE_API_BASE || 'http://localhost:3000/api');

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});