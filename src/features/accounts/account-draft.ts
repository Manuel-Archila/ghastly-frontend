import type { CreateAccountInput } from "@/data/repositories/accounts";
import { parseCentsFromInput } from "@/domain/money";

export const ACCOUNT_TYPES: { value: string; label: string }[] = [
  { value: "checking", label: "Monetaria" },
  { value: "savings", label: "Ahorro" },
  { value: "cash", label: "Efectivo" },
  { value: "credit_card", label: "Tarjeta" },
  { value: "digital_wallet", label: "Billetera" },
];

export const ACCOUNT_CURRENCIES = ["GTQ", "USD"] as const;
export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

/**
 * Lo que el usuario escribe al dar de alta una cuenta, todo como texto tal cual
 * lo tecleó. Lo comparten "Nueva cuenta" y el onboarding: antes el onboarding no
 * tenía moneda ni campos de tarjeta, y quien empezaba de cero no podía crear una
 * cuenta en dólares.
 */
export interface AccountDraft {
  name: string;
  type: string;
  currency: AccountCurrency;
  balance: string;
  // Solo tarjeta de crédito; todos opcionales.
  creditLimit: string;
  statementDay: string;
  paymentDueDay: string;
  interestRate: string;
  minimumPaymentPercent: string;
  /** Tarjeta con un segundo saldo en dólares: se crea como una cuenta aparte. */
  alsoInDollars: boolean;
  usdBalance: string;
  usdCreditLimit: string;
}

export function emptyAccountDraft(): AccountDraft {
  return {
    name: "",
    type: "checking",
    currency: "GTQ",
    balance: "",
    creditLimit: "",
    statementDay: "",
    paymentDueDay: "",
    interestRate: "",
    minimumPaymentPercent: "",
    alsoInDollars: false,
    usdBalance: "",
    usdCreditLimit: "",
  };
}

export function isCreditCard(draft: Pick<AccountDraft, "type">): boolean {
  return draft.type === "credit_card";
}

/** El segundo saldo en dólares solo aplica a una tarjeta cuya cuenta principal es en quetzales. */
export function canAddDollarBalance(draft: Pick<AccountDraft, "type" | "currency">): boolean {
  return isCreditCard(draft) && draft.currency === "GTQ";
}

/** "2.5" o "2,5" → 2.5; vacío o no numérico → null. */
export function parsePercent(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Entero (día del mes) o null si está vacío o no es un entero. */
export function parseDay(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : null;
}

function cardFields(draft: AccountDraft, creditLimit: string) {
  return {
    creditLimitCents: parseCentsFromInput(creditLimit),
    statementDay: parseDay(draft.statementDay),
    paymentDueDay: parseDay(draft.paymentDueDay),
    interestRate: parsePercent(draft.interestRate),
    minimumPaymentPercent: parsePercent(draft.minimumPaymentPercent),
  };
}

/**
 * Las cuentas que hay que crear para un borrador: ninguna si no tiene nombre,
 * una normalmente, y dos si es una tarjeta con saldo también en dólares. Son dos
 * cuentas independientes (cada una con su moneda, su saldo y su límite) que
 * comparten los días de corte y de pago, porque el banco cobra cada saldo por
 * separado; una cuenta tiene una sola moneda.
 */
export function buildAccountInputs(draft: AccountDraft): CreateAccountInput[] {
  const name = draft.name.trim();
  if (!name) return [];

  const card = isCreditCard(draft);
  const inputs: CreateAccountInput[] = [
    {
      name,
      type: draft.type,
      currency: draft.currency,
      initialBalanceCents: parseCentsFromInput(draft.balance) ?? 0,
      ...(card ? cardFields(draft, draft.creditLimit) : {}),
    },
  ];

  if (canAddDollarBalance(draft) && draft.alsoInDollars) {
    inputs.push({
      name: `${name} USD`,
      type: draft.type,
      currency: "USD",
      initialBalanceCents: parseCentsFromInput(draft.usdBalance) ?? 0,
      ...cardFields(draft, draft.usdCreditLimit),
    });
  }
  return inputs;
}
