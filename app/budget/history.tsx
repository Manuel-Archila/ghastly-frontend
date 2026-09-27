import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
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
import { confirmDestructive } from "@/ui/confirm";
import { Button, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

function previousMonth(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

/**
 * Historial de presupuesto (PLAN-frontend §6.4): meses ya cerrados con su
 * gasto congelado por categoría. Cerrar un mes es una acción manual que
 * congela el período y calcula el rollover que arrastra al siguiente.
 */
export default function BudgetHistoryScreen() {
  const { spacing, colors } = useTokens();
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
      setNote(`Mes ${result.month} cerrado.`);
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
      `Reabrir ${month}`,
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
      setNote(`Mes ${month} reabierto.`);
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
    <Screen>
      <Stack.Screen options={{ title: "Historial" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}>
        {!alreadyClosed ? (
          <Button
            label={busy ? "Cerrando…" : `Cerrar ${previousMonth()}`}
            onPress={onClosePrevious}
            disabled={busy}
          />
        ) : null}

        {note ? (
          <Text variant="caption" color="secondary">
            {note}
          </Text>
        ) : null}

        {loaded && periods.length === 0 ? (
          <Text variant="body" color="secondary">
            Todavía no hay meses cerrados. Al cerrar un mes se congela su gasto y lo que sobró pasa al
            siguiente si tenés rollover activo.
          </Text>
        ) : null}

        {periods.map((period) => {
          const spent = period.items.reduce((s, i) => s + i.spent_cents, 0);
          const budgeted = period.items.reduce((s, i) => s + i.budgeted_cents, 0);
          return (
            <View key={period.month} style={{ gap: spacing[2] }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="title2">{period.month}</Text>
                <Text variant="bodyStrong">
                  {new Money(spent).format()} / {new Money(budgeted).format()}
                </Text>
              </View>
              {period.items.map((item) => (
                <View
                  key={item.category_id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.subtle,
                    paddingVertical: spacing[1],
                  }}
                >
                  <Text variant="body">{item.category_name || "Categoría"}</Text>
                  <Text variant="caption" color="tertiary">
                    {new Money(item.spent_cents).format()} / {new Money(item.budgeted_cents).format()}
                    {item.rollover_in_cents !== 0
                      ? `  ·  ${new Money(item.rollover_in_cents).format()} de arrastre`
                      : ""}
                  </Text>
                </View>
              ))}
              {period.month === latestClosed ? (
                <Button
                  label="Reabrir mes"
                  variant="secondary"
                  fullWidth={false}
                  disabled={busy}
                  onPress={() => void onReopen(period.month)}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
