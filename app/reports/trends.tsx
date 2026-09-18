import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { LineChart } from "react-native-gifted-charts";

import { getTrends, type TrendsOut } from "@/data/api/reports";
import { Money } from "@/domain/money";
import { ReportsTabs } from "@/features/reports/ReportsTabs";
import { Button, Card, Screen, Skeleton, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const RANGES = [
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
];

export default function ReportsTrendsScreen() {
  const { spacing, colors } = useTokens();
  const [months, setMonths] = useState(6);

  const { data, isLoading, isError, refetch } = useQuery<TrendsOut>({
    queryKey: ["reports", "trends", months],
    queryFn: () => getTrends(months),
  });

  const periods = data?.periods ?? [];

  return (
    <Screen style={{ paddingTop: spacing[5] }}>
      <View style={{ paddingBottom: spacing[3] }}>
        <ReportsTabs active="trends" />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Text variant="title1">Tendencias</Text>

        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          {RANGES.map((r) => (
            <Button
              key={r.value}
              label={r.label}
              variant={months === r.value ? "primary" : "secondary"}
              fullWidth={false}
              onPress={() => setMonths(r.value)}
            />
          ))}
        </View>

        {isLoading ? (
          <Skeleton height={180} />
        ) : isError || !data ? (
          <View style={{ gap: spacing[3] }}>
            <Text variant="body" color="secondary">
              No se pudo cargar la tendencia.
            </Text>
            <Button label="Reintentar" onPress={() => void refetch()} />
          </View>
        ) : periods.length < 2 ? (
          <Text variant="body" color="secondary">
            Hace falta más de un mes de historial para ver una tendencia.
          </Text>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: spacing[4] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.income.fg }} />
                <Text variant="caption" color="secondary">
                  Ingreso
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.expense.fg }} />
                <Text variant="caption" color="secondary">
                  Gasto
                </Text>
              </View>
            </View>

            <LineChart
              data={periods.map((p) => ({ value: p.income_cents, label: p.period_start.slice(5, 7) }))}
              data2={periods.map((p) => ({ value: p.expense_cents }))}
              color={colors.income.fg}
              color2={colors.expense.fg}
              thickness={2}
              thickness2={2}
              curved
              hideDataPoints
              yAxisTextStyle={{ color: colors.text.tertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.text.tertiary, fontSize: 10 }}
              formatYLabel={(label) => new Money(Math.round(Number(label))).formatCompact()}
              noOfSections={4}
              rulesColor={colors.border.subtle}
              xAxisColor={colors.border.subtle}
              yAxisColor={colors.border.subtle}
              initialSpacing={8}
            />

            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <Card style={{ flex: 1, gap: spacing[1] }}>
                <Text variant="caption" color="secondary">
                  Promedio con aguinaldo/bono
                </Text>
                <Text variant="bodyStrong">
                  {new Money(data.avg_income_with_extraordinary_cents).format()}
                </Text>
              </Card>
              <Card style={{ flex: 1, gap: spacing[1] }}>
                <Text variant="caption" color="secondary">
                  Promedio solo recurrente
                </Text>
                <Text variant="bodyStrong">
                  {new Money(data.avg_income_recurring_cents).format()}
                </Text>
              </Card>
            </View>
            <Text variant="caption" color="tertiary">
              El segundo excluye ingresos extraordinarios (aguinaldo, bono 14) — es la base más
              realista para presupuestar un mes normal.
            </Text>

            <View style={{ gap: spacing[1] }}>
              {periods.map((p) => (
                <View
                  key={p.period_start}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: spacing[1],
                  }}
                >
                  <Text variant="body">{p.period_start.slice(0, 7)}</Text>
                  <Text variant="caption" style={{ color: colors.income.fg }}>
                    {new Money(p.income_cents).format()}
                  </Text>
                  <Text variant="caption" style={{ color: colors.expense.fg }}>
                    {new Money(p.expense_cents).format()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
