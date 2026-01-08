import axios from 'axios';

const baseURL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_BASE || '/api')
  : 'http://localhost:3000/api';

export const api = axios.create({
  baseURL,
});

export const listUsers = (q?: string) =>
  api.get('/users', { params: q ? { q } : {} })
     .then(r => r.data.items || r.data || []);

export const addAssignees = (requestId: string, userIds: string[]) =>
  api.post(`/requests/${requestId}/assignees`, { userIds }).then(r => r.data);

export const deleteRequest = (id: string) =>
  api.delete(`/requests/${id}`).then(r => r.data);

export const removeAssignee = (requestId: string, userId: string) =>
  api.patch(`/requests/${requestId}/assignees/remove`, { userId }).then(r => r.data);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});