/** Dispositivos del usuario. Revocar invalida sus refresh tokens. */
import { api } from "@/data/api/client";

export interface DeviceOut {
  id: string;
  platform: string;
  app_version: string | null;
  push_token: string | null;
  last_sync_seq: number;
  last_seen_at: string | null;
}

export function listDevices(): Promise<DeviceOut[]> {
  return api.get("/devices");
}

export function revokeDevice(id: string): Promise<void> {
  return api.delete(`/devices/${id}`);
}
