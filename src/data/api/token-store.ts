import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "ghastly.accessToken";
const REFRESH_KEY = "ghastly.refreshToken";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onAuthLost: (() => void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function loadTokens(): Promise<boolean> {
  accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
  refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  return accessToken !== null;
}

/** El session store registra acá cómo reaccionar cuando el refresh falla
 * (token revocado / reuso detectado): limpiar sesión y pedir login. */
export function registerAuthLostHandler(handler: () => void): void {
  onAuthLost = handler;
}

export function notifyAuthLost(): void {
  onAuthLost?.();
}
