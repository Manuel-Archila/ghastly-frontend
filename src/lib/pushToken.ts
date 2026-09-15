import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

/**
 * Pide permiso y obtiene el Expo push token para registrarlo contra
 * `POST /devices` (`push_token`, backend ya lo soporta). Devuelve `null`
 * sin tirar en cualquier caso en que no se pueda — dos motivos posibles
 * hoy mismo en este proyecto, ninguno es un bug:
 *
 * 1. Expo Go no soporta push remoto desde hace varias versiones —
 *    `getExpoPushTokenAsync` tira ahí. Hace falta un dev build
 *    (`npx expo run:ios`/`run:android`).
 * 2. Sin un `projectId` de EAS configurado (`app.json` → `extra.eas.projectId`,
 *    lo escribe `eas init`), `getExpoPushTokenAsync` no tiene con qué pedir
 *    el token aunque haya dev build.
 *
 * Se loguea una sola vez con `console.warn` y no rompe login/restore.
 */
export async function getPushTokenOrNull(): Promise<string | null> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) {
      console.warn(
        "[push] Sin extra.eas.projectId en app.json — no se puede pedir el push token todavía.",
      );
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (error) {
    console.warn("[push] No se pudo obtener el push token (¿Expo Go?):", error);
    return null;
  }
}
