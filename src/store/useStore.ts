import { create } from 'zustand';
import type { ToastMessage, AppSettings, User } from '../types';
import { settingsDB } from '../services/db';

interface AppStore {
  // ─── Theme ────────────────────────────────────────
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // ─── Auth ─────────────────────────────────────────
  isAuthenticated: boolean;
  setAuthenticated: (val: boolean) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeCollegeId: string | null;
  setActiveCollegeId: (id: string | null) => void;

  // ─── Sidebar ──────────────────────────────────────
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  toggleSidebar: () => void;

  // ─── Toast ────────────────────────────────────────
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // ─── Settings ─────────────────────────────────────
  settings: AppSettings;
  loadSettings: () => void;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // ─── Global Loading ───────────────────────────────
  isLoading: boolean;
  setLoading: (val: boolean) => void;
}

export const useStore = create<AppStore>((set, get) => ({
  // ─── Theme ────────────────────────────────────────
  theme: 'light',
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    settingsDB.update({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },

  // ─── Auth ─────────────────────────────────────────
  isAuthenticated: false,
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  activeCollegeId: localStorage.getItem('vertex_active_college'),
  setActiveCollegeId: (id) => {
    if (id) {
      localStorage.setItem('vertex_active_college', id);
    } else {
      localStorage.removeItem('vertex_active_college');
    }
    set({ activeCollegeId: id });
  },

  // ─── Sidebar ──────────────────────────────────────
  sidebarOpen: true,
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // ─── Toast ────────────────────────────────────────
  toasts: [],
  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration ?? 4000;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id, duration }] }));
    setTimeout(() => get().removeToast(id), duration);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ─── Settings ─────────────────────────────────────
  settings: settingsDB.get(),
  loadSettings: () => {
    const s = settingsDB.get();
    set({ settings: s, theme: s.theme });
    applyTheme(s.theme);
  },
  updateSettings: (partial) => {
    const current = get().settings;
    const next = { ...current, ...partial };
    settingsDB.save(next);
    set({ settings: next });
    if (partial.theme) applyTheme(partial.theme);
  },

  // ─── Loading ──────────────────────────────────────
  isLoading: false,
  setLoading: (val) => set({ isLoading: val }),
}));

function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
