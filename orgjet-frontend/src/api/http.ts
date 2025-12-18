// src/api/http.ts
import axios from "axios";

const FALLBACK =
  location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "https://workjetworks.com/api";

const API_BASE = import.meta.env?.VITE_API_BASE ?? FALLBACK;

// normalize to avoid double slashes if someone sets a trailing /
const baseURL = API_BASE.replace(/\/+$/, "");

export const http = axios.create({
  baseURL,            // <- all requests now prefix with this
  withCredentials: true, // keep if you use cookies/sessions
});

// Optional: add interceptors (central error handling, auth headers)
http.interceptors.request.use((config) => {
  // Example: attach JWT if you store it
  // const token = localStorage.getItem("jwt");
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // Example: redirect on 401, show toasts, etc.
    // if (err.response?.status === 401) logout();
    return Promise.reject(err);
  }
);