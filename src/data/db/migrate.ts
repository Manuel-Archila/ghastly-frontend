import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { db } from "./client";
import migrations from "./migrations/migrations";

/** Corre las migraciones pendientes al abrir la app. `success` es false
 * hasta que terminan; `error` si algo falló. */
export function useRunMigrations() {
  return useMigrations(db, migrations);
}
