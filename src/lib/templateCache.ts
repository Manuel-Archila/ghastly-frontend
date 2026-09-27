/**
 * Caché local de plantillas para los chips de la captura rápida. El backend
 * no las emite por pull, así que se guardan tal cual llegan del `GET` en
 * `expo-sqlite/kv-store` (viene con expo-sqlite; sin dependencia ni
 * migración nueva). Solo lectura: crear/editar sigue siendo online.
 */
import Storage from "expo-sqlite/kv-store";

import { listTemplates, type TemplateOut } from "@/data/api/templates";

const KEY = "ghastly.templates.v1";

export async function loadCachedTemplates(): Promise<TemplateOut[]> {
  try {
    const raw = await Storage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TemplateOut[]) : [];
  } catch {
    return [];
  }
}

export async function saveCachedTemplates(templates: TemplateOut[]): Promise<void> {
  try {
    await Storage.setItem(KEY, JSON.stringify(templates));
  } catch {
    // la caché es una comodidad; nunca rompe nada
  }
}

/** Baja las plantillas y refresca la caché. Best-effort: sin red, no hace nada. */
export async function refreshTemplateCache(): Promise<TemplateOut[] | null> {
  try {
    const fresh = await listTemplates();
    await saveCachedTemplates(fresh);
    return fresh;
  } catch {
    return null;
  }
}
