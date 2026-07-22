import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export type User = {
  id: string;
  email: string;
  fullName: string;
  languagePreference: string;
  subscriptionTier: string;
  subscriptionExpiresAt?: string | null;
  isAdmin?: boolean;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  // Refresh token har yangilanishda serverda rotatsiya qilinadi — xotiradagi
  // nusxani ham yangilab boramiz, aks holda eski token fallback sifatida
  // yuborilib, "qayta ishlatish" signalini keltirib chiqaradi.
  setTokens: (accessToken: string, refreshToken?: string | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setTokens: (accessToken, refreshToken) =>
        set(refreshToken ? { accessToken, refreshToken } : { accessToken }),
      logout: () => {
        // Serverdagi httpOnly refresh cookie'ni ham o'chiramiz (javobni kutmaymiz).
        fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
        set({ user: null, accessToken: null, refreshToken: null });
      },
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: "arabexam-auth",
      // XAVFSIZLIK: refreshToken localStorage'ga YOZILMAYDI — u httpOnly cookie'da saqlanadi
      // (XSS hujumida o'g'irlanmasligi uchun). Xotiradagi nusxa faqat eski sessiyalar uchun fallback.
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
);
