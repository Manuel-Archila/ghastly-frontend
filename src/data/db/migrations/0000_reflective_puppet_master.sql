CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency` text DEFAULT 'GTQ' NOT NULL,
	`institution` text,
	`last_four` text,
	`initial_balance_cents` integer DEFAULT 0 NOT NULL,
	`current_balance_cents` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`color` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`credit_limit_cents` integer,
	`statement_day` integer,
	`payment_due_day` integer,
	`interest_rate` real,
	`balance_recalculated_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `budget_items` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`category_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`rollover_enabled` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`period_type` text DEFAULT 'monthly' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`rollover_enabled` integer DEFAULT false NOT NULL,
	`global_limit_cents` integer,
	`income_basis` text DEFAULT 'fixed' NOT NULL,
	`fixed_income_cents` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`parent_id` text,
	`icon` text,
	`color` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`is_tax_deductible` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `debt_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`debt_id` text NOT NULL,
	`date` text NOT NULL,
	`total_cents` integer NOT NULL,
	`principal_cents` integer NOT NULL,
	`interest_cents` integer DEFAULT 0 NOT NULL,
	`fees_cents` integer DEFAULT 0 NOT NULL,
	`transaction_id` text,
	`created_at` text NOT NULL,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'other' NOT NULL,
	`principal_cents` integer NOT NULL,
	`balance_cents` integer NOT NULL,
	`monthly_interest_rate` real DEFAULT 0 NOT NULL,
	`monthly_payment_cents` integer,
	`start_date` text NOT NULL,
	`term_months` integer,
	`linked_account_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goal_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`transaction_id` text,
	`created_at` text NOT NULL,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_amount_cents` integer NOT NULL,
	`current_amount_cents` integer DEFAULT 0 NOT NULL,
	`target_date` text,
	`linked_account_id` text,
	`icon` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `installment_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`description` text NOT NULL,
	`merchant` text,
	`total_amount_cents` integer NOT NULL,
	`installments_count` integer NOT NULL,
	`first_payment_date` text NOT NULL,
	`monthly_interest_rate` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `installments` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`number` integer NOT NULL,
	`due_date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`principal_cents` integer NOT NULL,
	`interest_cents` integer DEFAULT 0 NOT NULL,
	`paid_at` text,
	`transaction_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox_mutations` (
	`client_mutation_id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text NOT NULL,
	`client_updated_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurring_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'GTQ' NOT NULL,
	`frequency` text NOT NULL,
	`interval` integer DEFAULT 1 NOT NULL,
	`next_due_date` text NOT NULL,
	`end_date` text,
	`auto_create` integer DEFAULT true NOT NULL,
	`reminder_days_before` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_generated_at` text,
	`last_amount_cents` integer,
	`price_history` text DEFAULT '[]' NOT NULL,
	`is_extraordinary` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`last_pulled_server_seq` integer DEFAULT 0 NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'GTQ' NOT NULL,
	`fx_rate` real,
	`base_amount_cents` integer,
	`date` text NOT NULL,
	`description` text,
	`merchant` text,
	`notes` text,
	`transfer_group_id` text,
	`transfer_direction` text,
	`refund_of_id` text,
	`is_reconciled` integer DEFAULT false NOT NULL,
	`is_tax_relevant` integer DEFAULT false NOT NULL,
	`is_extraordinary` integer DEFAULT false NOT NULL,
	`affects_closed_period` integer DEFAULT false NOT NULL,
	`receipt_key` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`installment_id` text,
	`recurring_rule_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer DEFAULT 0 NOT NULL
);
