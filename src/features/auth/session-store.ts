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
import { getPushTokenOrNull } from "@/lib/pushToken";

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

/**
 * Best-effort: registra el push token del dispositivo si se pudo obtener
 * uno (`getPushTokenOrNull` ya se traga los casos en que no se puede —
 * Expo Go, sin projectId de EAS). Nunca bloquea login/restore ni los
 * rompe si falla.
 */
async function registerPushToken(): Promise<void> {
  try {
    const token = await getPushTokenOrNull();
    if (!token) return;
    const deviceId = await getOrCreateDeviceId();
    await api.post("/devices", { id: deviceId, platform: Platform.OS, push_token: token });
  } catch (error) {
    console.warn("[push] No se pudo registrar el push token:", error);
  }
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
      void registerPushToken();
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
    void registerPushToken();
  },

  async register(email, password, name) {
    await api.post("/auth/register", { email, password, name });
  },

  async logout() {
    await clearTokens();
    set({ status: "unauthenticated", user: null });
  },
}));
