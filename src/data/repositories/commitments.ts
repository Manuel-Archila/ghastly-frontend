import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";

import { db } from "@/data/db/client";
import { debts, goals, installmentPlans, installments, recurringRules } from "@/data/db/schema";
import { monthlyEquivalentCents, type Frequency } from "@/domain/recurrence";
import { addDays, todayIso } from "@/lib/dates";

export type RecurringRule = typeof recurringRules.$inferSelect;
export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type Installment = typeof installments.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type Goal = typeof goals.$inferSelect;

// --- Recurrentes / suscripciones ---

export async function listRecurringRules(): Promise<RecurringRule[]> {
  return db
    .select()
    .from(recurringRules)
    .where(and(isNull(recurringRules.deletedAt), eq(recurringRules.status, "active")))
    .orderBy(recurringRules.nextDueDate);
}

export interface SubscriptionSummary {
  totalMonthlyCents: number;
  totalAnnualizedCents: number;
  items: {
    rule: RecurringRule;
    monthlyEquivalentCents: number;
    priceIncreased: boolean;
  }[];
}

export async function computeSubscriptionSummary(): Promise<SubscriptionSummary> {
  const rules = await db
    .select()
    .from(recurringRules)
    .where(
      and(
        isNull(recurringRules.deletedAt),
        eq(recurringRules.status, "active"),
        eq(recurringRules.kind, "expense"),
      ),
    );

  let totalMonthlyCents = 0;
  const items = rules
    .map((rule) => {
      const monthly = monthlyEquivalentCents(
        rule.amountCents,
        rule.frequency as Frequency,
        rule.interval,
      );
      totalMonthlyCents += monthly;
      return {
        rule,
        monthlyEquivalentCents: monthly,
        priceIncreased: (rule.priceHistory ?? []).length > 0,
      };
    })
    .sort((a, b) => b.monthlyEquivalentCents - a.monthlyEquivalentCents);

  return { totalMonthlyCents, totalAnnualizedCents: totalMonthlyCents * 12, items };
}

// --- Cuotas ---

export async function listInstallmentPlans(): Promise<InstallmentPlan[]> {
  return db
    .select()
    .from(installmentPlans)
    .where(and(isNull(installmentPlans.deletedAt), eq(installmentPlans.status, "active")))
    .orderBy(installmentPlans.createdAt);
}

export async function getInstallmentPlan(id: string): Promise<InstallmentPlan | undefined> {
  const rows = await db.select().from(installmentPlans).where(eq(installmentPlans.id, id)).limit(1);
  return rows[0];
}

export async function listInstallmentsForPlan(planId: string): Promise<Installment[]> {
  return db
    .select()
    .from(installments)
    .where(eq(installments.planId, planId))
    .orderBy(asc(installments.number));
}

export interface InstallmentCommitment {
  monthlyCommitmentCents: number;
  totalLiabilityCents: number;
}

export async function computeInstallmentCommitment(): Promise<InstallmentCommitment> {
  const today = todayIso();
  const monthEnd = `${today.slice(0, 7)}-31`;
  const rows = await db
    .select()
    .from(installments)
    .where(eq(installments.status, "pending"));

  const monthlyCommitmentCents = rows
    .filter((i) => i.dueDate >= today.slice(0, 8) + "01" && i.dueDate <= monthEnd)
    .reduce((s, i) => s + i.amountCents, 0);
  const totalLiabilityCents = rows.reduce((s, i) => s + i.amountCents, 0);
  return { monthlyCommitmentCents, totalLiabilityCents };
}

export async function listUpcomingInstallments(days = 30): Promise<Installment[]> {
  const today = todayIso();
  return db
    .select()
    .from(installments)
    .where(
      and(
        eq(installments.status, "pending"),
        gte(installments.dueDate, today),
        lte(installments.dueDate, addDays(today, days)),
      ),
    )
    .orderBy(asc(installments.dueDate));
}

// --- Deudas ---

export async function listDebts(): Promise<Debt[]> {
  return db.select().from(debts).where(isNull(debts.deletedAt)).orderBy(debts.createdAt);
}

export async function getDebt(id: string): Promise<Debt | undefined> {
  const rows = await db.select().from(debts).where(eq(debts.id, id)).limit(1);
  return rows[0];
}

// --- Metas ---

export async function listGoals(): Promise<Goal[]> {
  return db.select().from(goals).where(isNull(goals.deletedAt)).orderBy(goals.createdAt);
}
