import { asc, eq } from "drizzle-orm";

import { api, ApiError } from "@/data/api/client";
import { db } from "@/data/db/client";
import { outboxMutations } from "@/data/db/schema";
import { getOrCreateDeviceId } from "@/lib/deviceId";

interface SyncConflict {
  client_mutation_id: string;
  entity_id: string;
  reason: string;
}

interface SyncPushResponse {
  applied: string[];
  conflicts: SyncConflict[];
  next_seq: number;
}

const BATCH_SIZE = 200;
const MAX_ATTEMPTS = 5;

/** Empuja el outbox al servidor en lotes. Lo aplicado o en conflicto se
 * saca del outbox; lo que falló por red se deja con `attempts` +1 y
 * backoff — a los 5 fallos queda visible en Ajustes → Sincronización
 * (PLAN-frontend §3, §7). */
export async function pushOutbox(): Promise<{ applied: number; conflicts: number }> {
  const deviceId = await getOrCreateDeviceId();
  let totalApplied = 0;
  let totalConflicts = 0;

  for (;;) {
    const batch = await db
      .select()
      .from(outboxMutations)
      .orderBy(asc(outboxMutations.createdAt))
      .limit(BATCH_SIZE);

    const sendable = batch.filter((m) => m.attempts < MAX_ATTEMPTS);
    if (sendable.length === 0) break;

    const mutations = sendable.map((m) => ({
      client_mutation_id: m.clientMutationId,
      entity_type: m.entityType,
      entity_id: m.entityId,
      op: m.op,
      payload: m.payload,
      client_updated_at: m.clientUpdatedAt,
    }));

    let response: SyncPushResponse;
    try {
      response = await api.post<SyncPushResponse>("/sync/push", {
        device_id: deviceId,
        mutations,
      });
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "error de red";
      for (const m of sendable) {
        await db
          .update(outboxMutations)
          .set({ attempts: m.attempts + 1, lastError: message })
          .where(eq(outboxMutations.clientMutationId, m.clientMutationId));
      }
      break; // se reintenta en el próximo ciclo de sync
    }

    const resolved = new Set([
      ...response.applied,
      ...response.conflicts.map((c) => c.client_mutation_id),
    ]);
    for (const id of resolved) {
      await db.delete(outboxMutations).where(eq(outboxMutations.clientMutationId, id));
    }
    totalApplied += response.applied.length;
    totalConflicts += response.conflicts.length;

    if (sendable.length < BATCH_SIZE) break;
  }

  return { applied: totalApplied, conflicts: totalConflicts };
}
