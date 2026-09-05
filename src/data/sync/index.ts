import { pullChanges } from "./pull";
import { pushOutbox } from "./push";

export { pullChanges, pushOutbox };

let running = false;

/** Push primero, luego pull — nunca al revés (PLAN-backend §7). Idempotente:
 * si ya hay un sync corriendo, no arranca otro. */
export async function runSync(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
  if (running) {
    return { pushed: 0, pulled: 0, conflicts: 0 };
  }
  running = true;
  try {
    const push = await pushOutbox();
    const pulled = await pullChanges();
    return { pushed: push.applied, pulled, conflicts: push.conflicts };
  } finally {
    running = false;
  }
}
