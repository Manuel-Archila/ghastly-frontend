/**
 * `notification_preferences` es un singleton por usuario que vive SOLO en
 * el servidor (se edita online, como el perfil) — no se replica a SQLite,
 * mismo patrón que `data/api/reports.ts`. Tipos en snake_case espejando
 * `schemas/notifications.py` del backend.
 */
import { api } from "@/data/api/client";

export interface NotificationPreferencesOut {
  budget_alert_thresholds: number[];
  due_reminder_days: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  channels: string[];
}

export type NotificationPreferencesPatch = Partial<NotificationPreferencesOut>;

export function getNotificationPreferences(): Promise<NotificationPreferencesOut> {
  return api.get("/notification-preferences");
}

export function updateNotificationPreferences(
  patch: NotificationPreferencesPatch,
): Promise<NotificationPreferencesOut> {
  return api.patch("/notification-preferences", patch);
}
