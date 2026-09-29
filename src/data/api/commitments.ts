/**
 * Los "compromisos" se crean online (sus endpoints REST son más ricos que
 * el sync push genérico). Cada create llama al backend y luego dispara un
 * pull para bajar el resultado. Requiere conexión — son acciones
 * mensuales, no la ruta de 10 segundos.
 */
import { api } from "@/data/api/client";
import { assertCategoryPresent } from "@/domain/categoryRule";
import { pullChanges } from "@/data/sync";
import { uuidv7 } from "@/lib/uuid";

async function callAndPull<T>(label: string, call: () => Promise<T>): Promise<T> {
  const data = await call();
  const pull = await pullChanges();
  if (pull.failed > 0) {
    // El servidor ya lo aplicó (la llamada de arriba no lanzó) — esto solo
    // significa que la pantalla local puede tardar en mostrarlo hasta el
    // próximo sync. No se revierte nada.
    console.error(`[commitments] ${label}: se aplicó en el servidor pero falló al bajarlo local`);
  }
  return data;
}

function createAndPull<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  return callAndPull(path, () => api.post<T>(path, body, headers));
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
  /** Sigue la moneda de la cuenta elegida (igual que una transacción). */
  currency?: string;
  /** Requerida por el backend si `currency` no es GTQ — se congela una
   * sola vez al crear la regla (caso 4), no hay de dónde refrescarla al
   * auto-generar. */
  fxRate?: number;
}

export function createRecurringRule(input: RecurringRuleInput) {
  assertCategoryPresent(input.kind, input.categoryId);
  return createAndPull("/recurring-rules", {
    id: uuidv7(),
    account_id: input.accountId,
    category_id: input.categoryId,
    kind: input.kind,
    name: input.name,
    amount_cents: input.amountCents,
    currency: input.currency,
    fx_rate: input.fxRate,
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

export function skipNextRecurringRule(ruleId: string) {
  return createAndPull(`/recurring-rules/${ruleId}/skip-next`, undefined);
}

export interface RecurringRulePatch {
  name?: string;
  /** No acepta `null`: una suscripción es un gasto y un gasto no puede quedar
   * sin categoría (`domain/categoryRule.ts`). */
  categoryId?: string;
  amountCents?: number;
  endDate?: string | null;
  autoCreate?: boolean;
  reminderDaysBefore?: number;
}

export function updateRecurringRule(ruleId: string, patch: RecurringRulePatch) {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.categoryId !== undefined) body.category_id = patch.categoryId;
  if (patch.amountCents !== undefined) body.amount_cents = patch.amountCents;
  if (patch.endDate !== undefined) body.end_date = patch.endDate;
  if (patch.autoCreate !== undefined) body.auto_create = patch.autoCreate;
  if (patch.reminderDaysBefore !== undefined) body.reminder_days_before = patch.reminderDaysBefore;
  return callAndPull(`PATCH /recurring-rules/${ruleId}`, () =>
    api.patch(`/recurring-rules/${ruleId}`, body),
  );
}

export function deleteRecurringRule(ruleId: string) {
  return callAndPull(`DELETE /recurring-rules/${ruleId}`, () =>
    api.delete(`/recurring-rules/${ruleId}`),
  );
}

export interface InstallmentPlanInput {
  accountId: string;
  /** Obligatoria: un plan de cuotas siempre es gasto. */
  categoryId: string;
  description: string;
  totalAmountCents: number;
  installmentsCount: number;
  firstPaymentDate: string;
}

export function createInstallmentPlan(input: InstallmentPlanInput) {
  assertCategoryPresent("expense", input.categoryId);
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

export interface InstallmentPlanPatch {
  description?: string;
  merchant?: string | null;
  /** No acepta `null`: ver `InstallmentPlanInput.categoryId`. */
  categoryId?: string;
}

export function updateInstallmentPlan(planId: string, patch: InstallmentPlanPatch) {
  const body: Record<string, unknown> = {};
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.merchant !== undefined) body.merchant = patch.merchant;
  if (patch.categoryId !== undefined) body.category_id = patch.categoryId;
  return callAndPull(`PATCH /installment-plans/${planId}`, () =>
    api.patch(`/installment-plans/${planId}`, body),
  );
}

export function deleteInstallmentPlan(planId: string) {
  return callAndPull(`DELETE /installment-plans/${planId}`, () =>
    api.delete(`/installment-plans/${planId}`),
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
