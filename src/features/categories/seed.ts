import { api } from "@/data/api/client";
import { pullChanges } from "@/data/sync";

/**
 * Aplica la semilla de categorías del backend (`POST /categories/seed`,
 * idempotente) y las baja al SQLite local. Requiere conexión una vez —
 * es una acción de onboarding, no un flujo cotidiano.
 */
export async function seedCategoriesFromServer(): Promise<void> {
  await api.post("/categories/seed");
  await pullChanges();
}
