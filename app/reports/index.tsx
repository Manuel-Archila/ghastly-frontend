import { ScrollView, View } from "react-native";
import { Stack } from "expo-router";
// Import directo al submódulo — ver la nota en reports/trends.tsx: evita
// que el barrel de la librería arrastre BarChart y su dependencia opcional
// de expo-linear-gradient, que esta app no usa ni tiene instalada.
import { LineChart } from "react-native-gifted-charts/dist/LineChart";

import { ReportsTabs } from "@/features/reports/ReportsTabs";
import { useSummary } from "@/features/reports/useSummary";
import { Money } from "@/domain/money";
import { Button, Card, Screen, Skeleton, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function ReportsSummaryScreen() {
  const { spacing, colors } = useTokens();
  const { netWorth, savingsRate, currentMonth, isLoading, isError, refetch } = useSummary();

  return (
    <Screen>
      <Stack.Screen options={{ title: "Reportes" }} />
      <View style={{ paddingBottom: spacing[3] }}>
        <ReportsTabs active="summary" />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingBottom: spacing[8] }}>
        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <Skeleton height={140} />
            <Skeleton height={80} />
          </View>
        ) : isError ? (
          <View style={{ gap: spacing[3] }}>
            <Text variant="body" color="secondary">
              No se pudo cargar el resumen.
            </Text>
            <Button label="Reintentar" onPress={() => void refetch()} />
          </View>
        ) : (
          <>
            <View style={{ gap: spacing[2] }}>
              <Text variant="caption" color="secondary">
                PATRIMONIO NETO — ÚLTIMOS 12 MESES
              </Text>
              {!netWorth || netWorth.points.length < 2 ? (
                <Text variant="body" color="secondary">
                  Hace falta más de un mes de historial para ver la evolución.
                </Text>
              ) : (
                <>
                  <LineChart
                    data={netWorth.points.map((p) => ({ value: p.amount_cents, label: p.month.slice(5) }))}
                    color={colors.accent.bg}
                    thickness={2}
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
                  <Text variant="bodyStrong">
                    Hoy: {new Money(netWorth.points[netWorth.points.length - 1].amount_cents).format()}
                  </Text>
                </>
              )}
            </View>

            {currentMonth ? (
              <View style={{ flexDirection: "row", gap: spacing[3] }}>
                <Card style={{ flex: 1, gap: spacing[1] }}>
                  <Text variant="caption" color="secondary">
                    Ingresos este mes
                  </Text>
                  <Text variant="bodyStrong" style={{ color: colors.income.fg }}>
                    {new Money(currentMonth.income_cents).format()}
                  </Text>
                </Card>
                <Card style={{ flex: 1, gap: spacing[1] }}>
                  <Text variant="caption" color="secondary">
                    Gastos este mes
                  </Text>
                  <Text variant="bodyStrong" style={{ color: colors.expense.fg }}>
                    {new Money(currentMonth.expense_cents).format()}
                  </Text>
                </Card>
              </View>
            ) : null}

            <View style={{ gap: spacing[2] }}>
              <Text variant="caption" color="secondary">
                TASA DE AHORRO
              </Text>
              {!savingsRate || savingsRate.points.length === 0 ? (
                <Text variant="body" color="secondary">
                  Todavía no hay datos suficientes.
                </Text>
              ) : (
                <Card style={{ gap: spacing[2] }}>
                  {savingsRate.points.slice(-6).map((p) => (
                    <View
                      key={p.month}
                      style={{ flexDirection: "row", justifyContent: "space-between" }}
                    >
                      <Text variant="body">{p.month}</Text>
                      <Text variant="bodyStrong">
                        {p.savings_rate_percent === null ? "—" : `${p.savings_rate_percent}%`}
                      </Text>
                    </View>
                  ))}
                </Card>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
