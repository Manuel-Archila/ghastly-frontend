/**
 * Separación capital/interés de un pago. Espejo de `domain/amortization.py`.
 * El residuo de redondeo lo absorbe el ÚLTIMO pago — el saldo termina en
 * cero exacto.
 */
import { Money } from "@/domain/money";

export class AmortizationError extends Error {}

export interface AmortizationEntry {
  number: number;
  paymentCents: number;
  principalCents: number;
  interestCents: number;
  remainingBalanceCents: number;
}

function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function fixedPaymentCents(
  principalCents: number,
  monthlyRate: number,
  numPayments: number,
): number {
  if (numPayments <= 0) throw new AmortizationError("numPayments debe ser mayor a 0");
  if (monthlyRate === 0) return Math.ceil(principalCents / numPayments);
  return roundHalfUp(
    (principalCents * monthlyRate) / (1 - (1 + monthlyRate) ** -numPayments),
  );
}

export function amortize(
  principalCents: number,
  monthlyRate: number,
  numPayments: number,
): AmortizationEntry[] {
  if (principalCents <= 0) throw new AmortizationError("principalCents debe ser mayor a 0");
  if (numPayments <= 0) throw new AmortizationError("numPayments debe ser mayor a 0");

  if (monthlyRate === 0) {
    const shares = new Money(principalCents).allocate(numPayments);
    let balance = principalCents;
    return shares.map((share, i) => {
      balance -= share.cents;
      return {
        number: i + 1,
        paymentCents: share.cents,
        principalCents: share.cents,
        interestCents: 0,
        remainingBalanceCents: balance,
      };
    });
  }

  const payment = fixedPaymentCents(principalCents, monthlyRate, numPayments);
  const entries: AmortizationEntry[] = [];
  let balance = principalCents;
  for (let number = 1; number <= numPayments; number++) {
    const interest = roundHalfUp(balance * monthlyRate);
    if (number === numPayments) {
      entries.push({
        number,
        paymentCents: balance + interest,
        principalCents: balance,
        interestCents: interest,
        remainingBalanceCents: 0,
      });
      break;
    }
    const principal = payment - interest;
    balance -= principal;
    entries.push({
      number,
      paymentCents: payment,
      principalCents: principal,
      interestCents: interest,
      remainingBalanceCents: balance,
    });
  }
  return entries;
}
