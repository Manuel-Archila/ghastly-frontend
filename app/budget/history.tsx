import { useCallback, useState } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";

import { ApiError } from "@/data/api/client";
import {
  closeBudgetPeriod,
  getBudgetHistory,
  reopenBudgetPeriod,
  type HistoryPeriod,
} from "@/data/api/budgets";
import { errorMessageFor } from "@/data/api/error-messages";
import { getActiveBudget } from "@/data/repositories/budgets";
import { Money } from "@/domain/money";
import { addMonthsClamped, formatMonthLabel, todayIso } from "@/lib/dates";
import { confirmDestructive } from "@/ui/confirm";
import { Button, EmptyState, ListItem, ScrollScreen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

/** Mes anterior al actual, en el calendario local (no el UTC: en Guatemala el
 * mes UTC ya cambió desde las 18:00 del último día). */
function previousMonth(): string {
  return addMonthsClamped(`${todayIso().slice(0, 7)}-01`, -1).slice(0, 7);
}

/**
 * Historial de presupuesto (PLAN-frontend §6.4): meses ya cerrados con su
 * gasto congelado por categoría. Cerrar un mes es una acción manual que
 * congela el período y calcula el rollover que arrastra al siguiente.
 */
export default function BudgetHistoryScreen() {
  const { spacing } = useTokens();
  const [periods, setPeriods] = useState<HistoryPeriod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const budget = await getActiveBudget();
    if (!budget) {
      setPeriods([]);
      setLoaded(true);
      return;
    }
    try {
      const { periods: p } = await getBudgetHistory(budget.id);
      setPeriods(p);
      setNote(null);
    } catch (e) {
      setNote(errorMessageFor(e, "No se pudo cargar el historial."));
    }
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onClosePrevious() {
    const budget = await getActiveBudget();
    if (!budget) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await closeBudgetPeriod(budget.id, previousMonth());
      setNote(`${formatMonthLabel(result.month)} cerrado.`);
      await load();
    } catch (e) {
      setNote(errorMessageFor(e, "No se pudo cerrar el mes."));
    }
    setBusy(false);
  }

  // Solo el mes cerrado más reciente se puede reabrir: si hay uno posterior
  // cerrado, el servidor responde `LATER_PERIOD_CLOSED`.
  const latestClosed = periods.reduce<string | null>(
    (latest, p) => (latest === null || p.month > latest ? p.month : latest),
    null,
  );

  async function onReopen(month: string) {
    const ok = await confirmDestructive(
      `Reabrir ${formatMonthLabel(month)}`,
      "El mes se vuelve a calcular en vivo: se pierde el cierre congelado y su arrastre al mes siguiente.",
      "Reabrir",
    );
    if (!ok) return;
    const budget = await getActiveBudget();
    if (!budget) return;
    setBusy(true);
    setNote(null);
    try {
      await reopenBudgetPeriod(budget.id, month);
      setNote(`${formatMonthLabel(month)} reabierto.`);
      await load();
    } catch (e) {
      setNote(errorMessageFor(e, "No se pudo reabrir el mes."));
      // Si ya no estaba cerrado, la lista quedó vieja: se refresca.
      if (e instanceof ApiError && e.code === "PERIOD_NOT_FOUND") await load();
    }
    setBusy(false);
  }

  const alreadyClosed = periods.some((p) => p.month === previousMonth());

  return (
    <ScrollScreen gap={5}>
      <Stack.Screen options={{ title: "Historial" }} />
      {!alreadyClosed ? (
        <Button
          label={busy ? "Cerrando…" : `Cerrar ${formatMonthLabel(previousMonth())}`}
          onPress={onClosePrevious}
          disabled={busy}
        />
      ) : null}

      {note ? (
        <Text variant="caption" color="secondary" accessibilityLiveRegion="polite">
          {note}
        </Text>
      ) : null}

      {loaded && periods.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          message="Todavía no hay meses cerrados. Al cerrar un mes se congela su gasto y lo que sobró pasa al siguiente si tenés rollover activo."
        />
      ) : null}

      {periods.map((period) => {
        const spent = period.items.reduce((s, i) => s + i.spent_cents, 0);
        const budgeted = period.items.reduce((s, i) => s + i.budgeted_cents, 0);
        return (
          <View key={period.month}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: spacing[2],
                paddingBottom: spacing[1],
              }}
            >
              <Text variant="title2" accessibilityRole="header" style={{ flexShrink: 1 }}>
                {formatMonthLabel(period.month)}
              </Text>
              <Text variant="bodyStrong">
                {new Money(spent).format()} / {new Money(budgeted).format()}
              </Text>
            </View>
            {period.items.map((item, index) => (
              <ListItem
                key={item.category_id}
                title={item.category_name || "Categoría"}
                subtitle={
                  item.rollover_in_cents !== 0
                    ? `${new Money(item.rollover_in_cents).format()} de arrastre`
                    : undefined
                }
                trailing={
                  <Text variant="caption" color="secondary">
                    {new Money(item.spent_cents).format()} / {new Money(item.budgeted_cents).format()}
                  </Text>
                }
                last={index === period.items.length - 1 && period.month !== latestClosed}
              />
            ))}
            {period.month === latestClosed ? (
              <View style={{ paddingTop: spacing[2] }}>
                <Button
                  label="Reabrir mes"
                  variant="secondary"
                  fullWidth={false}
                  disabled={busy}
                  onPress={() => void onReopen(period.month)}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollScreen>
  );
}
