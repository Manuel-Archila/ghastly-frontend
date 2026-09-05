/**
 * Derivación de saldos. Espejo de `domain/balances.py` del backend —
 * misma regla: las cuentas `credit_card`/`loan` son pasivos, un gasto
 * AUMENTA lo que se debe.
 *
 * Se usa localmente solo para pintar rápido (optimista); el valor del
 * servidor siempre sobrescribe al llegar el pull (PLAN-frontend §3).
 */

export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "cash"
  | "investment"
  | "loan"
  | "digital_wallet";

export type TransactionKind = "expense" | "income" | "transfer";
export type TransferDirection = "in" | "out" | null;

const LIABILITY_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set(["credit_card", "loan"]);

export class BalanceError extends Error {}

export interface LedgerEntry {
  kind: TransactionKind;
  amountCents: number;
  transferDirection?: TransferDirection;
}

/** El único lugar que decide el signo de un movimiento sobre un saldo. */
export function signedDelta(entry: LedgerEntry, accountType: AccountType): number {
  if (entry.amountCents < 0) {
    throw new BalanceError("amountCents debe ser positivo; el signo lo da esta función");
  }
  const isLiability = LIABILITY_ACCOUNT_TYPES.has(accountType);

  if (entry.kind === "income") {
    return isLiability ? -entry.amountCents : entry.amountCents;
  }
  if (entry.kind === "expense") {
    return isLiability ? entry.amountCents : -entry.amountCents;
  }
  if (entry.kind === "transfer") {
    if (entry.transferDirection !== "in" && entry.transferDirection !== "out") {
      throw new BalanceError("una transferencia necesita transferDirection 'in' u 'out'");
    }
    const incoming = entry.transferDirection === "in";
    if (isLiability) {
      return incoming ? -entry.amountCents : entry.amountCents;
    }
    return incoming ? entry.amountCents : -entry.amountCents;
  }
  throw new BalanceError(`kind desconocido: ${entry.kind as string}`);
}

export function computeBalance(
  initialBalanceCents: number,
  entries: LedgerEntry[],
  accountType: AccountType,
): number {
  return entries.reduce((balance, entry) => balance + signedDelta(entry, accountType), initialBalanceCents);
}
