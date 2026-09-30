import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import type { Ionicons } from "@expo/vector-icons";

import type { UpcomingItemOut, UpcomingSourceType } from "@/data/api/reports";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { countPendingOutbox } from "@/data/repositories/transactions";
import { runSync } from "@/data/sync";
import { computeCurrentCycle } from "@/domain/creditCycle";
import { Money } from "@/domain/money";
import { useDashboard } from "@/features/reports/useDashboard";
import { clampDay, daysBetween, todayIso } from "@/lib/dates";
import { getHiddenAccountIds } from "@/lib/hiddenAccounts";
import {
  Button,
  Card,
  FadeIn,
  HeroFigure,
  ListItem,
  MoneyText,
  Notice,
  ProgressBar,
  ProgressRow,
  Screen,
  SectionHeader,
  Skeleton,
  StatCard,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";
import { useCountUp } from "@/ui/useCountUp";
import { accountLabel } from "@/features/accounts/account-label";

const LIABILITY_TYPES = new Set(["credit_card", "loan"]);

const UPCOMING_ICON: Record<UpcomingSourceType, keyof typeof Ionicons.glyphMap> = {
  installment: "layers-outline",
  recurring: "repeat-outline",
  card_statement: "card-outline",
  card_payment: "card-outline",
  debt_payment: "trending-down-outline",
};

function currentMonth(): string {
  return todayIso().slice(0, 7);
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const label = new Date(year, m - 1, 1).toLocaleDateString("es-GT", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function daysRemainingInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number);
  const lastDay = clampDay(year, m, 31);
  return Math.max(0, daysBetween(todayIso(), lastDay));
}

/** "Vas bien" es el caso normal; nunca un juicio moral si no (CLAUDE.md
 * regla 4: la app muestra el dato y la proyección, no reta al usuario). */
function projectionMessage(projectedCents: number, budgetedCents: number, daysLeft: number): string {
  const daysText = daysLeft === 1 ? "1 día" : `${daysLeft} días`;
  if (budgetedCents <= 0) return `Quedan ${daysText}`;
  const overBy = projectedCents - budgetedCents;
  if (overBy <= 0) return `Vas bien · quedan ${daysText}`;
  return `Al ritmo actual, ${new Money(overBy).format()} arriba del presupuesto · quedan ${daysText}`;
}

function dueDateLabel(dueDateIso: string): string {
  const diff = daysBetween(todayIso(), dueDateIso);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  return `día ${Number(dueDateIso.slice(8, 10))}`;
}

export default function TodayScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();
  const month = currentMonth();
  const { dashboard, anomalies, isLoading, isError, refetch } = useDashboard(month);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadLocal = useCallback(async () => {
    const [accs, count, hiddenIds] = await Promise.all([
      listAccounts(),
      countPendingOutbox(),
      getHiddenAccountIds(),
    ]);
    setAccounts(accs.filter((a) => !hiddenIds.has(a.id)));
    setPending(count);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLocal();
    }, [loadLocal]),
  );

  const onRefresh = useCallback(async () => {
    setSyncing(true);
    try {
      await runSync();
      await Promise.all([loadLocal(), refetch()]);
    } finally {
      setSyncing(false);
    }
  }, [loadLocal, refetch]);

  // Antes de los return tempranos (reglas de hooks).
  const availableCents = useCountUp(dashboard?.budget?.total_available_cents ?? null);

  if (isLoading && !dashboard) {
    return <DashboardSkeleton />;
  }

  if (isError || !dashboard) {
    return (
      <Screen style={{ paddingTop: spacing[4], gap: spacing[4], justifyContent: "center" }}>
        <Text variant="body" color="secondary">
          No se pudo cargar el resumen de hoy.
        </Text>
        <Button label="Reintentar" onPress={() => void refetch()} />
      </Screen>
    );
  }

  const { budget, cashflow, top_categories: topCategories, upcoming } = dashboard;
  const topAnomaly = anomalies[0];
  const overallPercent =
    budget && budget.total_budgeted_cents > 0
      ? Math.round((budget.total_spent_cents / budget.total_budgeted_cents) * 100)
      : 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={onRefresh} />}
      >
        <View style={{ gap: spacing[1] }}>
          <Text variant="title2">{monthLabel(dashboard.month)}</Text>
          {pending > 0 ? (
            <Text variant="caption" style={{ color: colors.warning.fg }}>
              {pending} sin sincronizar
            </Text>
          ) : null}
        </View>

        {budget ? (
          <View style={{ gap: spacing[2] }}>
            <HeroFigure
              label="Disponible este mes"
              value={new Money(availableCents ?? budget.total_available_cents).format()}
              subtitle={`${overallPercent} % del presupuesto`}
            />
            <ProgressBar percent={overallPercent} />
            <Text variant="caption" color="secondary">
              {projectionMessage(
                budget.global_projected_cents,
                budget.total_budgeted_cents,
                daysRemainingInMonth(dashboard.month),
              )}
            </Text>
          </View>
        ) : (
          <Card style={{ gap: spacing[3] }}>
            <Text variant="body" color="secondary">
              Creá un presupuesto para ver cuánto te queda este mes.
            </Text>
            <Button label="Crear presupuesto" onPress={() => router.push("/budget/edit")} />
          </Card>
        )}

        <View style={{ flexDirection: "row", gap: spacing[3] }}>
          <StatCard label="Ingresos" cents={cashflow.income_cents} kind="income" />
          <StatCard label="Gastos" cents={cashflow.expense_cents} kind="expense" />
        </View>

        {dashboard.receivable_cents > 0 ? (
          <Card style={{ paddingVertical: spacing[1] }}>
            <ListItem
              icon="people-outline"
              title="Me deben"
              trailing={<MoneyText cents={dashboard.receivable_cents} />}
              accessibilityLabel={`Me deben ${new Money(dashboard.receivable_cents).format()}`}
              onPress={() => router.push("/receivables")}
              last
            />
          </Card>
        ) : null}

        {accounts.length > 0 ? (
          <View style={{ gap: spacing[2] }}>
            <SectionHeader label="Cuentas" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: spacing[3] }}>
                {accounts.map((a, index) => (
                  <FadeIn key={a.id} delay={index * 40}>
                    <AccountCard account={a} />
                  </FadeIn>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {upcoming.length > 0 ? (
          <View style={{ gap: spacing[2] }}>
            <SectionHeader label="Próximos vencimientos" />
            {upcoming.map((item, index) => (
              <FadeIn key={`${item.source_type}-${item.source_id}`} delay={index * 30}>
                <UpcomingRow item={item} />
              </FadeIn>
            ))}
          </View>
        ) : null}

        {topCategories.length > 0 ? (
          <View style={{ gap: spacing[3] }}>
            <SectionHeader label="En qué se fue" />
            {topCategories.map((cat, index) => {
              const percent =
                cashflow.expense_cents > 0
                  ? Math.round((cat.net_spent_cents / cashflow.expense_cents) * 100)
                  : 0;
              return (
                <FadeIn key={cat.category_id} delay={index * 30}>
                  <ProgressRow
                    label={cat.category_name}
                    percent={percent}
                    valueText={new Money(cat.net_spent_cents).format()}
                    color={colors.accent.bg}
                  />
                </FadeIn>
              );
            })}
          </View>
        ) : null}

        {topAnomaly ? (
          <Notice
            tone="info"
            text={`${topAnomaly.category_name}: ${topAnomaly.percent_increase} % más que tu promedio.`}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function AccountCard({ account }: { account: Account }) {
  const { spacing } = useTokens();
  const isLiability = LIABILITY_TYPES.has(account.type);
  const router = useRouter();
  const cycle =
    account.type === "credit_card" && account.statementDay != null && account.paymentDueDay != null
      ? computeCurrentCycle(todayIso(), account.statementDay, account.paymentDueDay)
      : null;

  const card = (
    <Card style={{ gap: spacing[1], minWidth: spacing[10] * 4 }}>
      <Text variant="body" numberOfLines={1}>
        {accountLabel(account)}
      </Text>
      <MoneyText cents={account.currentBalanceCents} currency={account.currency} />
      {isLiability ? (
        <Text variant="caption" color="secondary">
          Por pagar
        </Text>
      ) : null}
      {cycle ? (
        <Text variant="caption" color="secondary">
          Corte en {cycle.daysUntilStatement} {cycle.daysUntilStatement === 1 ? "día" : "días"}
        </Text>
      ) : null}
    </Card>
  );

  if (account.type !== "credit_card") return card;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/accounts/${account.id}/statement`)}
    >
      {card}
    </Pressable>
  );
}

function UpcomingRow({ item }: { item: UpcomingItemOut }) {
  return (
    <ListItem
      icon={UPCOMING_ICON[item.source_type]}
      title={item.name}
      subtitle={dueDateLabel(item.due_date)}
      trailing={<MoneyText cents={item.amount_cents} />}
    />
  );
}

function DashboardSkeleton() {
  const { spacing } = useTokens();
  return (
    <Screen>
      <View style={{ gap: spacing[5], paddingVertical: spacing[4] }}>
        <Skeleton width={140} height={24} />
        <View style={{ gap: spacing[2] }}>
          <Skeleton width={180} height={14} />
          <Skeleton width={220} height={40} />
          <Skeleton height={6} />
        </View>
        <View style={{ flexDirection: "row", gap: spacing[3] }}>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
        <Skeleton height={90} />
        <Skeleton height={120} />
      </View>
    </Screen>
  );
}
