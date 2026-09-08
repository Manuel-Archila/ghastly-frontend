/**
 * Los "compromisos" se crean online (sus endpoints REST son más ricos que
 * el sync push genérico). Cada create llama al backend y luego dispara un
 * pull para bajar el resultado. Requiere conexión — son acciones
 * mensuales, no la ruta de 10 segundos.
 */
import { api } from "@/data/api/client";
import { pullChanges } from "@/data/sync";
import { uuidv7 } from "@/lib/uuid";

async function createAndPull<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const data = await api.post<T>(path, body, headers);
  await pullChanges();
  return data;
}

export interface RecurringRuleInput {
  accountId: string;
  categoryId: string | null;
  kind: "expense" | "income";
  name: string;
  amountCents: number;
  frequency: string;
  nextDueDate: string;
  autoCreate: boolean;
  reminderDaysBefore: number;
}

export function createRecurringRule(input: RecurringRuleInput) {
  return createAndPull("/recurring-rules", {
    id: uuidv7(),
    account_id: input.accountId,
    category_id: input.categoryId,
    kind: input.kind,
    name: input.name,
    amount_cents: input.amountCents,
    frequency: input.frequency,
    next_due_date: input.nextDueDate,
    auto_create: input.autoCreate,
    reminder_days_before: input.reminderDaysBefore,
  });
}

export function confirmRecurringRule(ruleId: string, dateIso: string) {
  return createAndPull(
    `/recurring-rules/${ruleId}/confirm`,
    { id: uuidv7(), date: dateIso },
    { "Idempotency-Key": uuidv7() },
  );
}

export function pauseRecurringRule(ruleId: string) {
  return createAndPull(`/recurring-rules/${ruleId}/pause`, undefined);
}

export function resumeRecurringRule(ruleId: string) {
  return createAndPull(`/recurring-rules/${ruleId}/resume`, undefined);
}

export interface InstallmentPlanInput {
  accountId: string;
  categoryId: string | null;
  description: string;
  totalAmountCents: number;
  installmentsCount: number;
  firstPaymentDate: string;
}

export function createInstallmentPlan(input: InstallmentPlanInput) {
  return createAndPull("/installment-plans", {
    id: uuidv7(),
    account_id: input.accountId,
    category_id: input.categoryId,
    description: input.description,
    total_amount_cents: input.totalAmountCents,
    installments_count: input.installmentsCount,
    first_payment_date: input.firstPaymentDate,
    installment_ids: Array.from({ length: input.installmentsCount }, () => uuidv7()),
  });
}

export function payInstallment(installmentId: string, dateIso: string) {
  return createAndPull(
    `/installments/${installmentId}/pay`,
    { id: uuidv7(), date: dateIso },
    { "Idempotency-Key": uuidv7() },
  );
}

export interface DebtInput {
  name: string;
  type: string;
  principalCents: number;
  monthlyInterestRate: number;
  startDate: string;
  termMonths: number | null;
  linkedAccountId: string | null;
}

export function createDebt(input: DebtInput) {
  return createAndPull("/debts", {
    id: uuidv7(),
    name: input.name,
    type: input.type,
    principal_cents: input.principalCents,
    monthly_interest_rate: String(input.monthlyInterestRate),
    start_date: input.startDate,
    term_months: input.termMonths,
    linked_account_id: input.linkedAccountId,
  });
}

export function recordDebtPayment(
  debtId: string,
  input: { fromAccountId: string; dateIso: string; totalCents: number; feesCents: number },
) {
  return createAndPull(
    `/debts/${debtId}/payments`,
    {
      id: uuidv7(),
      from_account_id: input.fromAccountId,
      date: input.dateIso,
      total_cents: input.totalCents,
      fees_cents: input.feesCents,
      interest_transaction_id: uuidv7(),
      principal_transaction_id: uuidv7(),
      principal_transfer_out_id: uuidv7(),
      principal_transfer_in_id: uuidv7(),
    },
    { "Idempotency-Key": uuidv7() },
  );
}

export interface GoalInput {
  name: string;
  targetAmountCents: number;
  targetDate: string | null;
  linkedAccountId: string | null;
}

export function createGoal(input: GoalInput) {
  return createAndPull("/goals", {
    id: uuidv7(),
    name: input.name,
    target_amount_cents: input.targetAmountCents,
    target_date: input.targetDate,
    linked_account_id: input.linkedAccountId,
  });
}

export function contributeToGoal(
  goalId: string,
  input: { amountCents: number; dateIso: string; fromAccountId: string | null },
) {
  const body: Record<string, unknown> = {
    id: uuidv7(),
    amount_cents: input.amountCents,
    date: input.dateIso,
  };
  if (input.fromAccountId) {
    body.from_account_id = input.fromAccountId;
    body.transfer_out_id = uuidv7();
    body.transfer_in_id = uuidv7();
  }
  return createAndPull(`/goals/${goalId}/contribute`, body, { "Idempotency-Key": uuidv7() });
}
