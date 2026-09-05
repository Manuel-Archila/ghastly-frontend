/**
 * Esquema Drizzle — espejo de las migraciones del backend
 * (`ghastly-backend/migrations/V1_1` a `V1_4`). Un cambio de modelo se
 * hace en los dos repos en el mismo commit lógico (CLAUDE.md).
 *
 * `budget_periods`/`budget_period_items` (historial congelado) no viven
 * acá todavía: se agregan cuando la pantalla de historial de presupuesto
 * lo pida.
 */

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(), // UUIDv7 generado en el cliente
  name: text("name").notNull(),
  type: text("type").notNull(), // checking|savings|credit_card|cash|investment|loan|digital_wallet
  currency: text("currency").notNull().default("GTQ"),
  institution: text("institution"),
  lastFour: text("last_four"),
  initialBalanceCents: integer("initial_balance_cents").notNull().default(0),
  currentBalanceCents: integer("current_balance_cents").notNull().default(0),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  color: text("color"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  creditLimitCents: integer("credit_limit_cents"),
  statementDay: integer("statement_day"),
  paymentDueDay: integer("payment_due_day"),
  interestRate: real("interest_rate"),
  balanceRecalculatedAt: text("balance_recalculated_at"), // ISO 8601
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // expense|income
  parentId: text("parent_id"),
  icon: text("icon"),
  color: text("color"),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  isTaxDeductible: integer("is_tax_deductible", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  categoryId: text("category_id"),
  kind: text("kind").notNull(), // expense|income|transfer
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("GTQ"),
  fxRate: real("fx_rate"),
  baseAmountCents: integer("base_amount_cents"),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description"),
  merchant: text("merchant"),
  notes: text("notes"),
  transferGroupId: text("transfer_group_id"),
  transferDirection: text("transfer_direction"), // in|out
  refundOfId: text("refund_of_id"),
  isReconciled: integer("is_reconciled", { mode: "boolean" }).notNull().default(false),
  isTaxRelevant: integer("is_tax_relevant", { mode: "boolean" }).notNull().default(false),
  isExtraordinary: integer("is_extraordinary", { mode: "boolean" }).notNull().default(false),
  affectsClosedPeriod: integer("affects_closed_period", { mode: "boolean" })
    .notNull()
    .default(false),
  receiptKey: text("receipt_key"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  installmentId: text("installment_id"),
  recurringRuleId: text("recurring_rule_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  periodType: text("period_type").notNull().default("monthly"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  rolloverEnabled: integer("rollover_enabled", { mode: "boolean" }).notNull().default(false),
  globalLimitCents: integer("global_limit_cents"),
  incomeBasis: text("income_basis").notNull().default("fixed"),
  fixedIncomeCents: integer("fixed_income_cents"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const budgetItems = sqliteTable("budget_items", {
  id: text("id").primaryKey(),
  budgetId: text("budget_id").notNull(),
  categoryId: text("category_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  rolloverEnabled: integer("rollover_enabled", { mode: "boolean" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const recurringRules = sqliteTable("recurring_rules", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  categoryId: text("category_id"),
  kind: text("kind").notNull(), // expense|income
  name: text("name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("GTQ"),
  frequency: text("frequency").notNull(), // daily|weekly|monthly|quarterly|yearly
  interval: integer("interval").notNull().default(1),
  nextDueDate: text("next_due_date").notNull(),
  endDate: text("end_date"),
  autoCreate: integer("auto_create", { mode: "boolean" }).notNull().default(true),
  reminderDaysBefore: integer("reminder_days_before").notNull().default(1),
  status: text("status").notNull().default("active"), // active|paused|ended
  lastGeneratedAt: text("last_generated_at"),
  lastAmountCents: integer("last_amount_cents"),
  priceHistory: text("price_history", { mode: "json" })
    .$type<{ date: string; amount_cents: number }[]>()
    .notNull()
    .default([]),
  isExtraordinary: integer("is_extraordinary", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const installmentPlans = sqliteTable("installment_plans", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  categoryId: text("category_id"),
  description: text("description").notNull(),
  merchant: text("merchant"),
  totalAmountCents: integer("total_amount_cents").notNull(),
  installmentsCount: integer("installments_count").notNull(),
  firstPaymentDate: text("first_payment_date").notNull(),
  monthlyInterestRate: real("monthly_interest_rate").notNull().default(0),
  status: text("status").notNull().default("active"), // active|completed|cancelled
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const installments = sqliteTable("installments", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull(),
  number: integer("number").notNull(),
  dueDate: text("due_date").notNull(),
  amountCents: integer("amount_cents").notNull(),
  principalCents: integer("principal_cents").notNull(),
  interestCents: integer("interest_cents").notNull().default(0),
  paidAt: text("paid_at"),
  transactionId: text("transaction_id"),
  status: text("status").notNull().default("pending"), // pending|paid|skipped
  serverSeq: integer("server_seq").notNull().default(0),
});

export const debts = sqliteTable("debts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("other"),
  principalCents: integer("principal_cents").notNull(),
  balanceCents: integer("balance_cents").notNull(),
  monthlyInterestRate: real("monthly_interest_rate").notNull().default(0),
  monthlyPaymentCents: integer("monthly_payment_cents"),
  startDate: text("start_date").notNull(),
  termMonths: integer("term_months"),
  linkedAccountId: text("linked_account_id"),
  status: text("status").notNull().default("active"), // active|paid_off
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const debtPayments = sqliteTable("debt_payments", {
  id: text("id").primaryKey(),
  debtId: text("debt_id").notNull(),
  date: text("date").notNull(),
  totalCents: integer("total_cents").notNull(),
  principalCents: integer("principal_cents").notNull(),
  interestCents: integer("interest_cents").notNull().default(0),
  feesCents: integer("fees_cents").notNull().default(0),
  transactionId: text("transaction_id"),
  createdAt: text("created_at").notNull(),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetAmountCents: integer("target_amount_cents").notNull(),
  currentAmountCents: integer("current_amount_cents").notNull().default(0),
  targetDate: text("target_date"),
  linkedAccountId: text("linked_account_id"),
  icon: text("icon"),
  status: text("status").notNull().default("active"), // active|completed
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  serverSeq: integer("server_seq").notNull().default(0),
});

export const goalContributions = sqliteTable("goal_contributions", {
  id: text("id").primaryKey(),
  goalId: text("goal_id").notNull(),
  date: text("date").notNull(),
  amountCents: integer("amount_cents").notNull(),
  transactionId: text("transaction_id"),
  createdAt: text("created_at").notNull(),
  serverSeq: integer("server_seq").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Infraestructura local (no existe en el backend): outbox de sincronización.

/** Cola de mutaciones pendientes de `POST /sync/push`. Reintenta con backoff;
 * 5 fallos la marca visible en Ajustes → Sincronización (PLAN-frontend §7). */
export const outboxMutations = sqliteTable("outbox_mutations", {
  clientMutationId: text("client_mutation_id").primaryKey(),
  entityType: text("entity_type").notNull(), // account|category|transaction|budget|budget_item
  entityId: text("entity_id").notNull(),
  op: text("op").notNull(), // upsert|delete
  payload: text("payload", { mode: "json" }).notNull(),
  clientUpdatedAt: text("client_updated_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
});

/** Fila única: cursor de `GET /sync/pull?since=`. */
export const syncState = sqliteTable("sync_state", {
  key: text("key").primaryKey(), // siempre "default"
  lastPulledServerSeq: integer("last_pulled_server_seq").notNull().default(0),
  lastSyncedAt: text("last_synced_at"),
});
