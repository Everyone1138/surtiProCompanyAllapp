import axios from 'axios';

// Normalize and choose a safe base URL:
// - DEV: use VITE_API_BASE if set, else http://localhost:3000/api
// - PROD: use VITE_API_BASE if set, else /api (relative to https://workjetworks.com)
function normalize(url: string) {
  return url.replace(/\/+$/, ''); // trim trailing slash
}

const resolvedBase =
  import.meta.env.DEV
    ? (import.meta.env.VITE_API_BASE || 'http://localhost:3000/api')
    : (import.meta.env.VITE_API_BASE || '/api');

export const api = axios.create({
  baseURL: normalize(resolvedBase),
  // withCredentials: false, // enable if you switch to cookies
  timeout: 15000,
});

// Attach bearer token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});