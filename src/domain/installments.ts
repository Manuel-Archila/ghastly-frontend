/**
 * Calendario de compras a cuotas (caso de negocio 6). Espejo de
 * `domain/installments.py`. Se usa para la vista previa del calendario
 * ANTES de guardar el plan.
 */
import { amortize } from "@/domain/amortization";
import { addMonthsClamped } from "@/lib/dates";

export interface InstallmentScheduleEntry {
  number: number;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
  principalCents: number;
  interestCents: number;
}

export function generateInstallmentSchedule(
  totalAmountCents: number,
  installmentsCount: number,
  firstPaymentDate: string,
  monthlyInterestRate = 0,
): InstallmentScheduleEntry[] {
  return amortize(totalAmountCents, monthlyInterestRate, installmentsCount).map((e) => ({
    number: e.number,
    dueDate: addMonthsClamped(firstPaymentDate, e.number - 1),
    amountCents: e.paymentCents,
    principalCents: e.principalCents,
    interestCents: e.interestCents,
  }));
}
