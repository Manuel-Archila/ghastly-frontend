import { describe, expect, it } from "vitest";

import { errorMessageFor } from "./error-messages";

describe("errorMessageFor", () => {
  it("returns the Spanish message for a known code", () => {
    expect(errorMessageFor({ code: "INVALID_CREDENTIALS" })).toBe("Correo o contraseña incorrectos.");
    expect(errorMessageFor({ code: "EMAIL_TAKEN" })).toBe("Ya existe una cuenta con ese correo.");
    expect(errorMessageFor({ code: "NETWORK_ERROR" })).toContain("No hay conexión");
  });

  it("never shows the server's own message, even when it is present", () => {
    const fromServer = { code: "INVALID_CREDENTIALS", message: "Invalid credentials for user@x.com" };
    expect(errorMessageFor(fromServer)).not.toContain("Invalid");
    expect(errorMessageFor({ code: "UNKNOWN_CODE", message: "Boom from server" }, "Fallback")).toBe(
      "Fallback",
    );
  });

  it("uses the caller's fallback for an unknown code", () => {
    expect(errorMessageFor({ code: "SOMETHING_NEW" }, "No se pudo crear.")).toBe("No se pudo crear.");
  });

  it("uses the fallback when there is no code at all", () => {
    expect(errorMessageFor(new Error("boom"), "No se pudo pagar.")).toBe("No se pudo pagar.");
    expect(errorMessageFor(null, "x")).toBe("x");
    expect(errorMessageFor(undefined, "x")).toBe("x");
    expect(errorMessageFor({ code: 500 }, "x")).toBe("x");
  });

  it("has a default fallback", () => {
    expect(errorMessageFor({})).toBe("Algo salió mal. Intentá de nuevo.");
  });

  it("covers the codes the app screens rely on", () => {
    const codes = [
      "DEBT_PAYMENT_TOO_SMALL",
      "INSTALLMENT_NOT_PENDING",
      "GOAL_NOT_FOUND",
      "FX_RATE_REQUIRED",
      "RATE_LIMITED",
      "VALIDATION_ERROR",
    ];
    for (const code of codes) {
      expect(errorMessageFor({ code }, "fallback")).not.toBe("fallback");
    }
  });
});
