import { beforeEach, describe, expect, it, vi } from "vitest";

import { useToastStore } from "@/ui/toast";
import { deferDelete, flushPendingDeletes, useDeferredDeleteStore } from "./deferred-delete";

const isHidden = (entity: string, id: string) =>
  useDeferredDeleteStore.getState().hidden.has(`${entity}:${id}`);
const version = () => useDeferredDeleteStore.getState().version;
const toast = () => useToastStore.getState().current;

beforeEach(async () => {
  await flushPendingDeletes();
  useToastStore.setState({ current: null });
  useDeferredDeleteStore.setState({ hidden: new Set(), version: 0 });
});

function start(perform = vi.fn().mockResolvedValue(undefined), id = "t1") {
  deferDelete({ entity: "template", id, message: "Plantilla eliminada", perform });
  return perform;
}

describe("deferDelete", () => {
  it("hides the item and offers Deshacer, without calling the API yet", () => {
    const perform = start();
    expect(isHidden("template", "t1")).toBe(true);
    expect(toast()?.message).toBe("Plantilla eliminada");
    expect(toast()?.actionLabel).toBe("Deshacer");
    expect(perform).not.toHaveBeenCalled();
  });

  it("undoing shows the item again and the API is never called", async () => {
    const perform = start();
    toast()!.onAction!();
    useToastStore.getState().dismiss();

    expect(isHidden("template", "t1")).toBe(false);
    // Aunque el aviso "expire" después, no hay nada que confirmar.
    useToastStore.getState().expire();
    await flushPendingDeletes();
    expect(perform).not.toHaveBeenCalled();
  });

  it("when the toast expires the API is called once and the item stays hidden", async () => {
    const perform = start();
    useToastStore.getState().expire();
    await flushPendingDeletes();

    expect(perform).toHaveBeenCalledTimes(1);
    expect(isHidden("template", "t1")).toBe(true);
    expect(version()).toBe(1); // las listas abiertas se recargan
  });

  it("a failing delete shows the item again and explains what happened", async () => {
    const perform = vi.fn().mockRejectedValue({ code: "TEMPLATE_NOT_FOUND", message: "raw server text" });
    start(perform);
    useToastStore.getState().expire();
    await vi.waitFor(() => expect(isHidden("template", "t1")).toBe(false));

    expect(toast()?.message).toBe("No encontramos esa plantilla.");
    expect(toast()?.message).not.toContain("raw server text");
  });

  it("falls back to the caller's message for an unknown error code", async () => {
    deferDelete({
      entity: "template",
      id: "t1",
      message: "x",
      perform: vi.fn().mockRejectedValue(new Error("boom")),
      failureMessage: "No se pudo borrar la plantilla.",
    });
    useToastStore.getState().expire();
    await vi.waitFor(() => expect(toast()?.message).toBe("No se pudo borrar la plantilla."));
  });

  it("a new toast confirms the previous pending delete instead of dropping it", async () => {
    const first = start(undefined, "a");
    const second = vi.fn().mockResolvedValue(undefined);
    deferDelete({ entity: "template", id: "b", message: "Otra", perform: second });

    await vi.waitFor(() => expect(first).toHaveBeenCalledTimes(1));
    expect(second).not.toHaveBeenCalled();
    expect(isHidden("template", "a")).toBe(true);
    expect(isHidden("template", "b")).toBe(true);
  });

  it("flushPendingDeletes confirms everything pending, exactly once", async () => {
    const a = start(undefined, "a");
    await flushPendingDeletes();
    expect(a).toHaveBeenCalledTimes(1);

    // El aviso expira después del flush: no se llama otra vez.
    useToastStore.getState().expire();
    await flushPendingDeletes();
    expect(a).toHaveBeenCalledTimes(1);
  });

  it("keeps different entities with the same id apart", () => {
    start(undefined, "same");
    expect(isHidden("template", "same")).toBe(true);
    expect(isHidden("account", "same")).toBe(false);
  });
});
