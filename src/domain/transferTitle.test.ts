import { describe, expect, it } from "vitest";

import { transferTitle } from "./transferTitle";

describe("transferTitle", () => {
  it("la fila de salida va de su cuenta a la contraparte", () => {
    expect(transferTitle("out", "Banrural", "BAC Visa")).toBe("Banrural → BAC Visa");
  });

  it("la fila de entrada muestra el mismo título", () => {
    expect(transferTitle("in", "BAC Visa", "Banrural")).toBe("Banrural → BAC Visa");
  });

  it("sin contraparte o dirección no inventa título", () => {
    expect(transferTitle("out", "Banrural", null)).toBeNull();
    expect(transferTitle(null, "Banrural", "BAC Visa")).toBeNull();
  });
});
