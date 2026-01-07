import { create } from 'zustand';
import { api } from '../lib/api';
import { navigateTo } from '../lib/nav';

type User = { id: string; name: string; email: string; role: string; team?: { name: string } };

type State = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
};

export const useAuth = create<State>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
    navigateTo('/');
  },
  async fetchMe() {
    try {
      const { data } = await api.get('/me');
      set({ user: data });
    } catch (e) {
      set({ user: null, token: null });
      localStorage.removeItem('token');
      navigateTo('/login');
    }
  },
  logout() {
    localStorage.removeItem('token');
    set({ user: null, token: null });
    navigateTo('/login');
  },
}));
