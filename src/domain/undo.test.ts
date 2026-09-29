import { describe, expect, it } from "vitest";

import { planRestore, planTransactionRestore, type RestorableTransaction } from "./undo";

function txn(over: Partial<RestorableTransaction> = {}): RestorableTransaction {
  return {
    deletedAt: "2026-09-29T20:00:00.000Z",
    kind: "expense",
    installmentId: null,
    receivableId: null,
    transferGroupId: null,
    refundOfId: null,
    ...over,
  };
}

describe("planTransactionRestore", () => {
  it("does nothing if the transaction was never deleted (idempotent)", () => {
    expect(planTransactionRestore(txn({ deletedAt: null }), false)).toBe("already-active");
  });

  it("cancels the pending delete when it has not been synced yet", () => {
    expect(planTransactionRestore(txn(), true)).toBe("cancel-pending-delete");
  });

  it("prefers cancelling the pending delete even for linked transactions", () => {
    // Mismo id y el servidor nunca se enteró: el vínculo sigue intacto.
    expect(planTransactionRestore(txn({ installmentId: "i1" }), true)).toBe("cancel-pending-delete");
    expect(planTransactionRestore(txn({ kind: "transfer" }), true)).toBe("cancel-pending-delete");
  });

  it("recreates a plain expense or income once the delete already reached the server", () => {
    expect(planTransactionRestore(txn(), false)).toBe("recreate");
    expect(planTransactionRestore(txn({ kind: "income" }), false)).toBe("recreate");
  });

  it("refuses to recreate a transaction that was linked to something else", () => {
    expect(planTransactionRestore(txn({ kind: "transfer" }), false)).toBe("impossible");
    expect(planTransactionRestore(txn({ installmentId: "i1" }), false)).toBe("impossible");
    expect(planTransactionRestore(txn({ receivableId: "r1" }), false)).toBe("impossible");
    expect(planTransactionRestore(txn({ transferGroupId: "g1" }), false)).toBe("impossible");
    expect(planTransactionRestore(txn({ refundOfId: "t1" }), false)).toBe("impossible");
  });
});

describe("planRestore", () => {
  const deleted = "2026-09-29T20:00:00.000Z";

  it("is idempotent when the entity is not deleted", () => {
    expect(planRestore({ deletedAt: null, hasPendingDelete: false, canRecreate: true })).toBe(
      "already-active",
    );
  });

  it("cancels a pending delete before anything else", () => {
    expect(planRestore({ deletedAt: deleted, hasPendingDelete: true, canRecreate: false })).toBe(
      "cancel-pending-delete",
    );
  });

  it("recreates only when nothing else depends on the entity", () => {
    expect(planRestore({ deletedAt: deleted, hasPendingDelete: false, canRecreate: true })).toBe(
      "recreate",
    );
    expect(planRestore({ deletedAt: deleted, hasPendingDelete: false, canRecreate: false })).toBe(
      "impossible",
    );
  });
});
