import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
// Import directo al submódulo, no al barrel de la librería: el barrel
// re-exporta BarChart, que carga un wrapper que hace `require('expo-linear-
// -gradient')` a nivel de módulo y explota si el paquete no está instalado
// — algo que esta app nunca necesita porque no usa BarChart. LineChart usa
// el gradiente de `react-native-svg` (ya instalado), no ese wrapper.
import { LineChart } from "react-native-gifted-charts/dist/LineChart";

import { getTrends, type TrendsOut } from "@/data/api/reports";
import { Money } from "@/domain/money";
import { ReportsTabs } from "@/features/reports/ReportsTabs";
import { formatMonthLabel } from "@/lib/dates";
import {
  Card,
  Dot,
  MoneyText,
  Screen,
  ScreenState,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  Text,
} from "@/ui/primitives";
import { motion, useTokens } from "@/ui/tokens";
import { useReducedMotion } from "@/ui/useReducedMotion";

type Range = "6" | "12";

const RANGES: { value: Range; label: string }[] = [
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
];

export default function ReportsTrendsScreen() {
  const { spacing, colors, typography } = useTokens();
  const reduceMotion = useReducedMotion();
  const [range, setRange] = useState<Range>("6");

  const { data, isLoading, isError, refetch } = useQuery<TrendsOut>({
    queryKey: ["reports", "trends", range],
    queryFn: () => getTrends(Number(range)),
  });

  const periods = data?.periods ?? [];
  const status = isLoading
    ? "loading"
    : isError || !data
      ? "error"
      : periods.length < 2
        ? "empty"
        : "data";
  const axisText = { color: colors.text.secondary, fontSize: typography.micro.fontSize };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Tendencias" }} />
      <View style={{ paddingBottom: spacing[3] }}>
        <ReportsTabs active="trends" />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <SegmentedControl options={RANGES} value={range} onChange={setRange} />

        <ScreenState
          status={status}
          loading={<Skeleton height={180} />}
          error="No se pudo cargar la tendencia."
          onRetry={() => void refetch()}
          empty={{
            message: "Hace falta más de un mes de historial para ver una tendencia.",
            icon: "trending-up-outline",
          }}
        >
          <View style={{ flexDirection: "row", gap: spacing[4] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
              <Dot color={colors.income.fg} />
              <Text variant="caption" color="secondary">
                Ingreso
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
              <Dot color={colors.expense.fg} />
              <Text variant="caption" color="secondary">
                Gasto
              </Text>
            </View>
          </View>

          <LineChart
            isAnimated={!reduceMotion}
            animationDuration={motion.duration.count}
            data={periods.map((p) => ({ value: p.income_cents, label: p.period_start.slice(5, 7) }))}
            data2={periods.map((p) => ({ value: p.expense_cents }))}
            color={colors.income.fg}
            color2={colors.expense.fg}
            thickness={2}
            thickness2={2}
            curved
            hideDataPoints
            yAxisTextStyle={axisText}
            xAxisLabelTextStyle={axisText}
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
              <MoneyText cents={data?.avg_income_with_extraordinary_cents ?? 0} />
            </Card>
            <Card style={{ flex: 1, gap: spacing[1] }}>
              <Text variant="caption" color="secondary">
                Promedio solo recurrente
              </Text>
              <MoneyText cents={data?.avg_income_recurring_cents ?? 0} />
            </Card>
          </View>
          <Text variant="caption" color="secondary">
            El segundo excluye ingresos extraordinarios (aguinaldo, bono 14) — es la base más
            realista para presupuestar un mes normal.
          </Text>

          <View style={{ gap: spacing[1] }}>
            <SectionHeader label="Mes a mes" />
            {periods.map((p) => (
              <View
                key={p.period_start}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: spacing[2],
                  paddingVertical: spacing[1],
                }}
              >
                <Text variant="body" style={{ flex: 1 }}>
                  {formatMonthLabel(p.period_start)}
                </Text>
                <MoneyText cents={p.income_cents} kind="income" variant="caption" />
                <MoneyText cents={p.expense_cents} kind="expense" variant="caption" />
              </View>
            ))}
          </View>
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
