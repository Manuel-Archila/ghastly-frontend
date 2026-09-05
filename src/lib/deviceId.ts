import * as SecureStore from "expo-secure-store";

import { uuidv7 } from "@/lib/uuid";

const DEVICE_ID_KEY = "ghastly.deviceId";

/**
 * Id estable del dispositivo, generado una vez y guardado en SecureStore.
 * Se reusa como `device_id` en login, refresh y /sync (espejo de lo que
 * el backend espera — el cliente genera el id del dispositivo).
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const id = uuidv7();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}
