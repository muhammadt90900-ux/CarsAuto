// apps/web/src/store/auth.store.ts
// Access tokens live in memory only (via api.ts) — never in localStorage.
// Zustand persist is used ONLY for the non-sensitive user profile.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, setAccessToken, getAccessToken, type AuthUser } from '@/lib/api';

interface AuthState {
  user:        AuthUser | null;
  isLoading:   boolean;
  isHydrated:  boolean;

  login:         (email: string, password: string) => Promise<void>;
  register:      (name: string, email: string, password: string, role?: string, phone?: string) => Promise<void>;
  logout:        () => Promise<void>;
  loadUser:      () => Promise<void>;
  setHydrated:   () => void;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword:  (token: string, newPassword: string) => Promise<{ message: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:       null,
      isLoading:  false,
      isHydrated: false,

      setHydrated: () => set({ isHydrated: true }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login({ email, password });
          set({ user: res.user });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (name, email, password, role?, phone?) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register({ name, email, password, role, phone });
          set({ user: res.user });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        await authApi.logout();
        set({ user: null });
      },

      forgotPassword: (email) => authApi.forgotPassword(email),

      resetPassword: (token, newPassword) =>
        authApi.resetPassword(token, newPassword),

      loadUser: async () => {
        // Skip fetch if there is no access token in memory
        if (!getAccessToken()) {
          set({ isHydrated: true });
          return;
        }
        try {
          const user = await authApi.me();
          set({ user, isHydrated: true });
        } catch {
          // Token invalid or expired — clear state
          setAccessToken(null);
          set({ user: null, isHydrated: true });
        }
      },
    }),
    {
      name:    'auth-store',
      storage: createJSONStorage(() => localStorage),

      // Only persist minimal non-sensitive profile data
      partialize: (state) => ({
        user: state.user
          ? { id: state.user.id, name: state.user.name, role: state.user.role }
          : null,
      }),

      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
      skipHydration: true,
    },
  ),
);
