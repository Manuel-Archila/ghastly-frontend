/**
 * Aritmética de dinero. Espejo de `domain/money.py` del backend — misma
 * regla: ninguna operación de dinero ocurre fuera de este módulo
 * (CLAUDE.md).
 *
 * Todo monto es un entero en centavos (columna `INTEGER` en SQLite,
 * `number` en TS). Se valida con `Number.isInteger()` porque en
 * JavaScript no existe un tipo entero separado — un `250.5` se rechaza
 * en el constructor, no silenciosamente se trunca.
 *
 * Redondeo: half-up. En un reparto (`allocate`), el residuo de la
 * división entera lo absorbe la ÚLTIMA fracción — igual que el backend,
 * para que cliente y servidor calculen el mismo calendario de cuotas.
 */

export type CurrencyCode = string; // "GTQ" | "USD" | ...
export type TransactionKind = "expense" | "income" | "transfer";

const SYMBOLS: Record<string, string> = { GTQ: "Q", USD: "$" };

// U+2212 (signo menos matemático), no un guion — es lo que pide
// PLAN-frontend §4.6 para los montos en la lista de movimientos.
const MINUS_SIGN = "−";

export class MoneyError extends Error {}

export class Money {
  readonly cents: number;
  readonly currency: CurrencyCode;

  constructor(cents: number, currency: CurrencyCode = "GTQ") {
    if (!Number.isInteger(cents)) {
      throw new MoneyError(`cents debe ser un entero, recibido ${cents}`);
    }
    this.cents = cents;
    this.currency = currency;
  }

  private requireSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new MoneyError(
        `no se pueden operar montos de distinta moneda: ${this.currency} vs ${other.currency}`,
      );
    }
  }

  add(other: Money): Money {
    this.requireSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    this.requireSameCurrency(other);
    return new Money(this.cents - other.cents, this.currency);
  }

  negate(): Money {
    return new Money(-this.cents, this.currency);
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  /** Reparte en `parts` fracciones iguales; la última absorbe el residuo. */
  allocate(parts: number): Money[] {
    if (parts <= 0) {
      throw new MoneyError("parts debe ser mayor a 0");
    }
    // Math.floor, no Math.trunc: necesitamos división entera que redondea
    // hacia -Infinity (igual que el `//` de Python), no hacia cero.
    const base = Math.floor(this.cents / parts);
    const remainder = this.cents - base * parts;
    const shares = new Array<number>(parts).fill(base);
    shares[shares.length - 1] += remainder;
    return shares.map((c) => new Money(c, this.currency));
  }

  /**
   * Convierte a otra moneda con una tasa ya congelada (caso de negocio 4 —
   * quien llama es responsable de congelarla, esta función no sabe de dónde
   * salió). `rate` es cuántas unidades de `toCurrency` vale 1 unidad de
   * `this.currency`.
   *
   * Nota: usa aritmética de punto flotante de JS, no un decimal exacto. Es
   * seguro para montos de dinero real (el error de redondeo es muchos
   * órdenes de magnitud menor a un centavo) y evita cargar una dependencia
   * de decimales de precisión arbitraria para esto. El valor que manda
   * siempre es el que calculó el servidor; esto es solo para pintar rápido.
   */
  convert(rate: number, toCurrency: CurrencyCode): Money {
    const converted = Math.round(this.cents * rate);
    return new Money(converted, toCurrency);
  }

  /** Magnitud con símbolo: `Q 1,250.00` · negativo: `− Q 5.00`. */
  format(): string {
    const symbol = SYMBOLS[this.currency] ?? `${this.currency} `;
    const sign = this.cents < 0 ? `${MINUS_SIGN} ` : "";
    const abs = Math.abs(this.cents);
    const whole = Math.floor(abs / 100);
    const frac = abs % 100;
    return `${sign}${symbol} ${whole.toLocaleString("en-US")}.${String(frac).padStart(2, "0")}`;
  }
}

export function sumMoney(amounts: Money[], currency: CurrencyCode = "GTQ"): Money {
  return amounts.reduce((total, m) => total.add(m), new Money(0, currency));
}

/**
 * Convierte lo que el usuario tecleó ("250", "250.5", "1,250.50") a
 * centavos. Devuelve `null` si no es un monto válido. Nunca pasa por
 * `parseFloat` sobre el valor completo — se separa parte entera y
 * decimal para no depender de la representación binaria de un float.
 */
export function parseCentsFromInput(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (cleaned === "" || !/^\d*\.?\d{0,2}$/.test(cleaned)) {
    return null;
  }
  const [whole = "0", frac = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

/**
 * Formato para la lista de movimientos (PLAN-frontend §4.6): el signo lo
 * da `kind`, no el monto — un gasto siempre se muestra con "−" aunque
 * `amount_cents` en la API sea positivo (CLAUDE.md: el signo lo decide un
 * solo lugar). Una transferencia nunca lleva signo, solo una flecha.
 */
export function formatForKind(amount: Money, kind: TransactionKind): string {
  const magnitude = new Money(Math.abs(amount.cents), amount.currency).format();
  if (kind === "expense") return `${MINUS_SIGN} ${magnitude}`;
  if (kind === "income") return `+ ${magnitude}`;
  return `${magnitude} →`; // transfer: "Q 500.00 →"
}
