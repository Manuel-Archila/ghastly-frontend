import { ScrollView, View } from "react-native";
import { Stack } from "expo-router";
// Import directo al submódulo — ver la nota en reports/trends.tsx: evita
// que el barrel de la librería arrastre BarChart y su dependencia opcional
// de expo-linear-gradient, que esta app no usa ni tiene instalada.
import { LineChart } from "react-native-gifted-charts/dist/LineChart";

import { ReportsTabs } from "@/features/reports/ReportsTabs";
import { useSummary } from "@/features/reports/useSummary";
import { Money } from "@/domain/money";
import { formatMonthLabel } from "@/lib/dates";
import {
  Card,
  HeroFigure,
  ListItem,
  Screen,
  ScreenState,
  SectionHeader,
  Skeleton,
  StatCard,
  Text,
} from "@/ui/primitives";
import { motion, useTokens } from "@/ui/tokens";
import { useReducedMotion } from "@/ui/useReducedMotion";

export default function ReportsSummaryScreen() {
  const { spacing, colors, typography } = useTokens();
  const reduceMotion = useReducedMotion();
  const { netWorth, savingsRate, currentMonth, isLoading, isError, refetch } = useSummary();

  const status = isLoading ? "loading" : isError ? "error" : "data";
  const points = netWorth?.points ?? [];
  const axisText = { color: colors.text.secondary, fontSize: typography.micro.fontSize };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Reportes" }} />
      <View style={{ paddingBottom: spacing[3] }}>
        <ReportsTabs active="summary" />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingBottom: spacing[8] }}>
        <ScreenState
          status={status}
          loading={
            <View style={{ gap: spacing[3] }}>
              <Skeleton height={140} />
              <Skeleton height={80} />
            </View>
          }
          error="No se pudo cargar el resumen."
          onRetry={() => void refetch()}
        >
          <View style={{ gap: spacing[2] }}>
            {points.length < 2 ? (
              <>
                <SectionHeader label="Patrimonio neto" />
                <Text variant="body" color="secondary">
                  Hace falta más de un mes de historial para ver la evolución.
                </Text>
              </>
            ) : (
              <>
                <HeroFigure
                  label="Patrimonio neto hoy"
                  value={new Money(points[points.length - 1].amount_cents).format()}
                  subtitle="Últimos 12 meses"
                />
                <LineChart
                  isAnimated={!reduceMotion}
                  animationDuration={motion.duration.count}
                  data={points.map((p) => ({ value: p.amount_cents, label: p.month.slice(5) }))}
                  color={colors.accent.bg}
                  thickness={2}
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
              </>
            )}
          </View>

          {currentMonth ? (
            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <StatCard label="Ingresos este mes" cents={currentMonth.income_cents} kind="income" />
              <StatCard label="Gastos este mes" cents={currentMonth.expense_cents} kind="expense" />
            </View>
          ) : null}

          <View style={{ gap: spacing[2] }}>
            <SectionHeader label="Tasa de ahorro" />
            {!savingsRate || savingsRate.points.length === 0 ? (
              <Text variant="body" color="secondary">
                Todavía no hay datos suficientes.
              </Text>
            ) : (
              <Card style={{ paddingVertical: spacing[1] }}>
                {savingsRate.points.slice(-6).map((p, index, arr) => (
                  <ListItem
                    key={p.month}
                    title={formatMonthLabel(p.month)}
                    trailing={
                      <Text variant="bodyStrong">
                        {p.savings_rate_percent === null ? "—" : `${p.savings_rate_percent} %`}
                      </Text>
                    }
                    last={index === arr.length - 1}
                  />
                ))}
              </Card>
            )}
          </View>
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
