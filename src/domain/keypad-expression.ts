/**
 * Evalúa la expresión del teclado numérico (`"12.50+3-1.25"`) a centavos.
 * Cada operando es un monto en quetzales; el total se suma en centavos,
 * nunca sobre un float del resultado.
 */
export function evaluateKeypadExpression(expr: string): number {
  const parts = expr.split(/([+-])/).filter((p) => p !== "");
  let total = 0;
  let sign = 1;
  for (const part of parts) {
    if (part === "+") {
      sign = 1;
    } else if (part === "-") {
      sign = -1;
    } else {
      const [whole = "0", frac = ""] = part.split(".");
      const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
      total += sign * (Number.isFinite(cents) ? cents : 0);
    }
  }
  return total;
}
