import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { api, setAccessToken } from "@/data/api/client";
import { getOrCreateDeviceId } from "@/lib/deviceId";

const ACCESS_TOKEN_KEY = "ghastly.accessToken";
const REFRESH_TOKEN_KEY = "ghastly.refreshToken";

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
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!token) {
      set({ status: "unauthenticated" });
      return;
    }
    setAccessToken(token);
    try {
      const user = await api.get<SessionUser>("/auth/me");
      set({ status: "authenticated", user });
    } catch {
      // El token no sirve (expiró, revocado). Fase 1 no implementa refresh
      // automático todavía — se pide login de nuevo.
      setAccessToken(null);
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
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.access_token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
    setAccessToken(data.access_token);
    set({ status: "authenticated", user: data.user });
  },

  async register(email, password, name) {
    await api.post("/auth/register", { email, password, name });
  },

  async logout() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    set({ status: "unauthenticated", user: null });
  },
}));
