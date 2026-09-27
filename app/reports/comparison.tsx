import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack } from "expo-router";

import { ReportsTabs } from "@/features/reports/ReportsTabs";
import { useComparison } from "@/features/reports/useComparison";
import { Money } from "@/domain/money";
import { Button, Card, Chip, Screen, Skeleton, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

type Preset = "prev_month" | "prev_year";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function currentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-GT", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ReportsComparisonScreen() {
  const { spacing, colors } = useTokens();
  const [preset, setPreset] = useState<Preset>("prev_month");

  const current = currentMonthString();
  const reference = preset === "prev_month" ? shiftMonth(current, -1) : shiftMonth(current, -12);

  const { data, isLoading, isError, refetch } = useComparison(reference, current);

  function deltaColor(percent: number | null): string {
    if (percent === null) return colors.text.secondary;
    return percent > 0 ? colors.expense.fg : colors.income.fg;
  }

  function formatDelta(percent: number | null): string {
    if (percent === null) return "sin datos el mes base";
    return `${percent > 0 ? "+" : ""}${percent}%`;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Comparativo" }} />
      <View style={{ paddingBottom: spacing[3] }}>
        <ReportsTabs active="comparison" />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          <Chip
            label="vs. mes anterior"
            selected={preset === "prev_month"}
            onPress={() => setPreset("prev_month")}
          />
          <Chip
            label="vs. mismo mes año pasado"
            selected={preset === "prev_year"}
            onPress={() => setPreset("prev_year")}
          />
        </View>

        {isLoading ? (
          <Skeleton height={180} />
        ) : isError || !data ? (
          <View style={{ gap: spacing[3] }}>
            <Text variant="body" color="secondary">
              No se pudo cargar la comparación.
            </Text>
            <Button label="Reintentar" onPress={() => void refetch()} />
          </View>
        ) : (
          <>
            <Text variant="caption" color="secondary">
              {monthLabel(data.b_month)} vs. {monthLabel(data.a_month)}
            </Text>

            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <Card style={{ flex: 1, gap: spacing[1] }}>
                <Text variant="caption" color="secondary">
                  Ingresos
                </Text>
                <Text variant="bodyStrong">{new Money(data.b_income_cents).format()}</Text>
                <Text variant="caption" style={{ color: deltaColor(data.income_change_percent) }}>
                  {formatDelta(data.income_change_percent)}
                </Text>
              </Card>
              <Card style={{ flex: 1, gap: spacing[1] }}>
                <Text variant="caption" color="secondary">
                  Gastos
                </Text>
                <Text variant="bodyStrong">{new Money(data.b_expense_cents).format()}</Text>
                <Text
                  variant="caption"
                  style={{ color: deltaColor(data.expense_change_percent) }}
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
              <View style={{ gap: spacing[1] }}>
                <Text variant="caption" color="secondary">
                  POR CATEGORÍA
                </Text>
                {data.categories.map((item) => (
                  <View
                    key={item.category_id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: spacing[2],
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.subtle,
                    }}
                  >
                    <Text variant="body" style={{ flex: 1 }}>
                      {item.category_name}
                    </Text>
                    <Text variant="bodyStrong">{new Money(item.b_amount_cents).format()}</Text>
                    <Text
                      variant="caption"
                      style={{ color: deltaColor(item.percent_change), marginLeft: spacing[2] }}
                    >
                      {formatDelta(item.percent_change)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
