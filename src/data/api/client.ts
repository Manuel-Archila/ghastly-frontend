/**
 * Cliente HTTP tipado contra el envelope `ApiResponse` del backend
 * (CLAUDE.md). El cliente decide por `data.code`, nunca parseando `message`.
 *
 * Refresh automático: si un request falla con 401 (`TOKEN_EXPIRED` /
 * `INVALID_TOKEN`), intenta `POST /auth/refresh` una vez y reintenta. Si el
 * refresh falla, avisa al session store (`notifyAuthLost`) para volver a
 * login — nada se pierde, todo está en SQLite.
 *
 * `EXPO_PUBLIC_API_URL` — en un dispositivo físico, `localhost` es el
 * dispositivo mismo: usá la IP de LAN de tu compu. Ver `.env.example`.
 */
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  notifyAuthLost,
  setTokens,
} from "./token-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8011/v1";

interface ApiEnvelope<T> {
  is_success: boolean;
  message: string;
  data: T | null;
}

interface ErrorData {
  code?: string;
  field?: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly field: string | undefined;
  readonly status: number;

  constructor(message: string, code: string, status: number, field?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

const AUTH_ERROR_CODES = new Set(["TOKEN_EXPIRED", "INVALID_TOKEN", "MISSING_TOKEN"]);

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const envelope = (await response.json()) as ApiEnvelope<{
        access_token: string;
        refresh_token: string;
      }>;
      if (!envelope.is_success || !envelope.data) {
        await clearTokens();
        notifyAuthLost();
        return false;
      }
      await setTokens(envelope.data.access_token, envelope.data.refresh_token);
      return true;
    } catch {
      return false; // error de red: no tiramos la sesión, se reintenta luego
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function doFetch(
  method: string,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string>,
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await doFetch(method, path, body, extraHeaders);
  } catch {
    throw new ApiError("No se pudo conectar con el servidor.", "NETWORK_ERROR", 0);
  }

  let envelope = (await response.json()) as ApiEnvelope<T>;

  if (!envelope.is_success) {
    const code = (envelope.data as ErrorData | null)?.code ?? "UNKNOWN_ERROR";
    if (AUTH_ERROR_CODES.has(code) && path !== "/auth/refresh" && path !== "/auth/login") {
      const refreshed = await tryRefresh();
      if (refreshed) {
        try {
          response = await doFetch(method, path, body, extraHeaders);
        } catch {
          throw new ApiError("No se pudo conectar con el servidor.", "NETWORK_ERROR", 0);
        }
        envelope = (await response.json()) as ApiEnvelope<T>;
      }
    }
  }

  if (!envelope.is_success) {
    const errorData = envelope.data as ErrorData | null;
    throw new ApiError(
      envelope.message,
      errorData?.code ?? "UNKNOWN_ERROR",
      response.status,
      errorData?.field,
    );
  }
  return envelope.data as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>("GET", path),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> =>
    request<T>("POST", path, body, headers),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>("PATCH", path, body),
  delete: <T>(path: string): Promise<T> => request<T>("DELETE", path),
};
