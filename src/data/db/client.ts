import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "./schema";

export const sqlite = openDatabaseSync("ghastly.db", { enableChangeListener: false });

export const db = drizzle(sqlite, { schema });
