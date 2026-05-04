import axios from 'axios';

const raw = (import.meta.env.VITE_API_BASE || '').trim();

// In production, ALWAYS route through ALB path-based routing using /api.
// If VITE_API_BASE is missing/empty/localhost, force '/api'.
const baseURL = import.meta.env.PROD
  ? (raw && !/localhost|127\.0\.0\.1/i.test(raw) ? raw : '/api')
  : (raw || 'http://localhost:3000/api');

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export const listUsers = (team?: string) =>
  api.get('/users', { params: team ? { team } : {} })
     .then(r => r.data);

export const searchRequests = (params?: {
  q?: string;
  status?: string;
  assigneeId?: string;
  page?: number;
  pageSize?: number;
}) =>
  api.get('/requests', { params }).then((r) => r.data);

export const addAssignees = (requestId: string, userIds: string[]) =>
  api.post(`/requests/${requestId}/assignees`, { userIds }).then(r => r.data);

export const deleteRequest = (id: string) =>
  api.delete(`/requests/${id}`).then(r => r.data);

export const removeAssignee = (requestId: string, userId: string) =>
  api.patch(`/requests/${requestId}/assignees/remove`, { userId }).then(r => r.data);


export const uploadRequestDocuments = (
  requestId: string,
  kind: 'cotizacion' | 'orden-compra' | 'remision',
  files: FileList | File[],
) => {
  const form = new FormData();

  Array.from(files).forEach((file) => {
    form.append('files', file);
  });

  return api
    .post(`/requests/${requestId}/documents/${kind}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};




api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});