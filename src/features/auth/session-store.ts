import { Platform } from "react-native";
import { create } from "zustand";

import { api } from "@/data/api/client";
import {
  clearTokens,
  loadTokens,
  registerAuthLostHandler,
  setTokens,
} from "@/data/api/token-store";
import { getOrCreateDeviceId } from "@/lib/deviceId";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  base_currency: string;
  timezone: string;
  locale: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: SessionUser;
}

interface SessionState {
  status: "loading" | "authenticated" | "unauthenticated";
  user: SessionUser | null;
  restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  user: null,

  async restore() {
    // Si el cliente HTTP pierde la sesión (refresh falló), volvemos a login.
    registerAuthLostHandler(() => set({ status: "unauthenticated", user: null }));

    const hasToken = await loadTokens();
    if (!hasToken) {
      set({ status: "unauthenticated" });
      return;
    }
    try {
      const user = await api.get<SessionUser>("/auth/me");
      set({ status: "authenticated", user });
    } catch {
      await clearTokens();
      set({ status: "unauthenticated", user: null });
    }
  },

  async login(email, password) {
    const deviceId = await getOrCreateDeviceId();
    const data = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
      device_id: deviceId,
      platform: Platform.OS,
    });
    await setTokens(data.access_token, data.refresh_token);
    set({ status: "authenticated", user: data.user });
  },

  async register(email, password, name) {
    await api.post("/auth/register", { email, password, name });
  },

  async logout() {
    await clearTokens();
    set({ status: "unauthenticated", user: null });
  },
}));
