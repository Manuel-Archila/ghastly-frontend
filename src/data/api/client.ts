/**
 * Cliente HTTP tipado contra el envelope `ApiResponse` del backend
 * (CLAUDE.md). El cliente decide por `data.code`, nunca parseando `message`.
 *
 * `EXPO_PUBLIC_API_URL` — en un dispositivo físico, `localhost` es el
 * dispositivo mismo, no tu máquina: usá la IP de LAN de tu compu
 * (`http://192.168.x.x:8010/v1`). Ver `.env.example`.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8010/v1";

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

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor.", "NETWORK_ERROR", 0);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
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
