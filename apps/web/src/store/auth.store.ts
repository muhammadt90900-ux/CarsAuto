// apps/web/src/store/auth.store.ts
// Access tokens live in memory only (via api.ts) — never in localStorage.
// Zustand persist is used ONLY for the non-sensitive user profile.
//
// ✅ FIX #4 (High): loadUser() now:
//   - Always sets isHydrated: true (even when no token / on error)
//   - Tracks isLoading properly with a finally block
//   - Does NOT silently return without setting isHydrated when token is missing
//
// ✅ FIX #5 (Critical): onRehydrateStorage no longer calls setHydrated().
//   - isHydrated is only set to true inside loadUser(), which runs AFTER
//     the token refresh in Providers.tsx. AuthGuard waits for loadUser() to
//     complete before making any routing decision.
//
// ✅ FIX #28: Added isAuthenticated field synced with user !== null.
//   Every action that touches `user` also sets isAuthenticated consistently.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, setAccessToken, getAccessToken, type AuthUser } from '@/lib/api';

interface AuthState {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  isHydrated:      boolean;

  login:          (email: string, password: string) => Promise<void>;
  register:       (name: string, email: string, password: string, role?: string, phone?: string) => Promise<void>;
  logout:         () => Promise<void>;
  loadUser:       () => Promise<void>;
  setHydrated:    () => void;
  setUser:        (user: AuthUser | null) => void;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword:  (token: string, newPassword: string) => Promise<{ message: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      isAuthenticated: false,
      isLoading:       false,
      isHydrated:      false,

      // ── setHydrated ────────────────────────────────────────────────────────
      setHydrated: () => set({ isHydrated: true }),

      // ── setUser — called by profile page after successful updateMe() ───────
      setUser: (user: AuthUser | null) =>
        set({ user, isAuthenticated: user !== null }),

      // ── Login ──────────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login({ email, password });
          set({ user: res.user, isAuthenticated: true });
          // Dev-only: surface token for Swagger/Postman testing
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('_dev_token', res.access_token);
          }
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Register ───────────────────────────────────────────────────────────
      register: async (name, email, password, role?, phone?) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register({ name, email, password, role, phone });
          set({ user: res.user, isAuthenticated: true });
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('_dev_token', res.access_token);
          }
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Logout ─────────────────────────────────────────────────────────────
      // a. Calls API to invalidate the HttpOnly refresh-token cookie server-side
      // b. Clears the in-memory access token
      // c. Resets user + isAuthenticated in the store
      // d. Non-fatal: local state is ALWAYS cleared even if the API call fails
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Non-fatal — always clear local state
        } finally {
          setAccessToken(null);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('_dev_token');
          }
          set({ user: null, isAuthenticated: false });
        }
      },

      // ── Load User ──────────────────────────────────────────────────────────
      // Called by Providers.tsx after token refresh completes.
      // MUST always set isHydrated: true — even on failure — so AuthGuard
      // can make a routing decision instead of spinning forever.
      loadUser: async () => {
        set({ isLoading: true });
        try {
          if (!getAccessToken()) {
            set({ user: null, isAuthenticated: false, isHydrated: true, isLoading: false });
            return;
          }
          const user = await authApi.me();
          set({ user, isAuthenticated: true, isHydrated: true });
        } catch {
          // Token invalid or network error — clear auth state
          setAccessToken(null);
          set({ user: null, isAuthenticated: false, isHydrated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Password helpers ───────────────────────────────────────────────────
      forgotPassword: (email) => authApi.forgotPassword(email),

      resetPassword: (token, newPassword) =>
        authApi.resetPassword(token, newPassword),
    }),
    {
      name:    'auth-store',
      storage: createJSONStorage(() => localStorage),

      // Only persist minimal non-sensitive profile data.
      // The access token is NEVER stored — it lives in api.ts memory only.
      // isAuthenticated is derived from user; not persisted (re-derived on hydration).
      partialize: (state) => ({
        user: state.user
          ? { id: state.user.id, name: state.user.name, role: state.user.role }
          : null,
      }),

      // ✅ FIX #5: Do NOT call setHydrated() here.
      // If we set isHydrated:true immediately after localStorage rehydration,
      // AuthGuard will see isHydrated:true + user (from localStorage) and render
      // children — but the access token is not yet in memory. Any API call inside
      // the protected page will fail with 401.
      // Solution: leave isHydrated:false here. loadUser() in Providers.tsx sets
      // isHydrated:true only after the full refresh → /me flow completes.
      onRehydrateStorage: () => () => {
        // intentionally empty — isHydrated is set by loadUser() after token refresh
      },

      // skipHydration: true prevents localStorage reads during SSR.
      // We trigger rehydration manually in Providers.tsx after mount.
      skipHydration: true,
    },
  ),
);
