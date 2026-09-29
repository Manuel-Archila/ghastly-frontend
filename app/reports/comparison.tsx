import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack } from "expo-router";

import { ReportsTabs } from "@/features/reports/ReportsTabs";
import { useComparison } from "@/features/reports/useComparison";
import { formatMonthLabel, todayIso } from "@/lib/dates";
import {
  Card,
  ListItem,
  MoneyText,
  Screen,
  ScreenState,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

type Preset = "prev_month" | "prev_year";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "prev_month", label: "vs. mes anterior" },
  { value: "prev_year", label: "vs. año pasado" },
];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function currentMonthString(): string {
  return todayIso().slice(0, 7);
}

/** Con signo explícito (U+2212 para el menos): el cambio nunca depende solo del color. */
function formatDelta(percent: number | null): string {
  if (percent === null) return "sin datos el mes base";
  if (percent === 0) return "0 %";
  return `${percent > 0 ? "+" : "−"}${Math.abs(percent)} %`;
}

export default function ReportsComparisonScreen() {
  const { spacing, colors } = useTokens();
  const [preset, setPreset] = useState<Preset>("prev_month");

  const current = currentMonthString();
  const reference = preset === "prev_month" ? shiftMonth(current, -1) : shiftMonth(current, -12);

  const { data, isLoading, isError, refetch } = useComparison(reference, current);

  /** Subir un gasto es malo (rojo); subir un ingreso es bueno (verde). */
  function deltaColor(percent: number | null, kind: "income" | "expense"): string {
    if (percent === null || percent === 0) return colors.text.secondary;
    const up = percent > 0;
    const good = kind === "income" ? up : !up;
    return good ? colors.income.fg : colors.expense.fg;
  }

  const status = isLoading ? "loading" : isError || !data ? "error" : "data";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Comparativo" }} />
      <View style={{ paddingBottom: spacing[3] }}>
        <ReportsTabs active="comparison" />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <SegmentedControl options={PRESETS} value={preset} onChange={setPreset} />

        <ScreenState
          status={status}
          loading={<Skeleton height={180} />}
          error="No se pudo cargar la comparación."
          onRetry={() => void refetch()}
        >
          {data ? (
            <>
              <Text variant="caption" color="secondary">
                {formatMonthLabel(data.b_month)} vs. {formatMonthLabel(data.a_month)}
              </Text>

              <View style={{ flexDirection: "row", gap: spacing[3] }}>
                <Card style={{ flex: 1, gap: spacing[1] }}>
                  <Text variant="caption" color="secondary">
                    Ingresos
                  </Text>
                  <MoneyText cents={data.b_income_cents} kind="income" />
                  <Text
                    variant="caption"
                    style={{ color: deltaColor(data.income_change_percent, "income") }}
                  >
                    {formatDelta(data.income_change_percent)}
                  </Text>
                </Card>
                <Card style={{ flex: 1, gap: spacing[1] }}>
                  <Text variant="caption" color="secondary">
                    Gastos
                  </Text>
                  <MoneyText cents={data.b_expense_cents} kind="expense" />
                  <Text
                    variant="caption"
                    style={{ color: deltaColor(data.expense_change_percent, "expense") }}
                  >
                    {formatDelta(data.expense_change_percent)}
                  </Text>
                </Card>
              </View>

              {data.categories.length === 0 ? (
                <Text variant="body" color="secondary">
                  Sin gastos en ninguno de los dos meses.
                </Text>
              ) : (
                <View>
                  <SectionHeader label="Por categoría" />
                  {data.categories.map((item, index) => (
                    <ListItem
                      key={item.category_id}
                      title={item.category_name}
                      trailing={
                        <View style={{ alignItems: "flex-end" }}>
                          <MoneyText cents={item.b_amount_cents} kind="expense" />
                          <Text
                            variant="caption"
                            style={{ color: deltaColor(item.percent_change, "expense") }}
                          >
                            {formatDelta(item.percent_change)}
                          </Text>
                        </View>
                      }
                      last={index === data.categories.length - 1}
                    />
                  ))}
                </View>
              )}
            </>
          ) : null}
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
