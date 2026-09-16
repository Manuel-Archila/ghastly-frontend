import * as SecureStore from "expo-secure-store";

const KEY = "ghastly.hiddenAccountIds";

/**
 * Preferencia SOLO local (no sincroniza, ni siquiera vive en la tabla
 * `accounts` — esa mirrorea el esquema del backend campo a campo,
 * CLAUDE.md, y esto no es un campo del backend). Es puramente "no me
 * muestres esta cuenta en la tarjeta de Hoy" — la cuenta sigue activa en
 * todo lo demás (transacciones, presupuesto, etc.), a diferencia de
 * archivarla. Mismo patrón que `lib/deviceId.ts` (SecureStore, sin
 * agregar AsyncStorage como dependencia nueva).
 */
export async function getHiddenAccountIds(): Promise<Set<string>> {
  const raw = await SecureStore.getItemAsync(KEY);
  return new Set(raw ? (JSON.parse(raw) as string[]) : []);
}

export async function setAccountHidden(id: string, hidden: boolean): Promise<void> {
  const ids = await getHiddenAccountIds();
  if (hidden) {
    ids.add(id);
  } else {
    ids.delete(id);
  }
  await SecureStore.setItemAsync(KEY, JSON.stringify([...ids]));
}
