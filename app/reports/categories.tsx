import { useState } from "react";
import { ScrollView, View } from "react-native";
// Import directo al submódulo — ver la nota en reports/trends.tsx: evita
// que el barrel de la librería arrastre BarChart y su dependencia opcional
// de expo-linear-gradient, que esta app no usa ni tiene instalada.
import { PieChart } from "react-native-gifted-charts/dist/PieChart";
import { Stack, useRouter } from "expo-router";

import { ReportsTabs } from "@/features/reports/ReportsTabs";
import { useCategoryBreakdown } from "@/features/reports/useCategoryBreakdown";
import { categoryColorFor } from "@/lib/categoryColor";
import { Money } from "@/domain/money";
import { formatMonthLabel, todayIso } from "@/lib/dates";
import {
  Chip,
  Dot,
  FadeIn,
  ListItem,
  MoneyText,
  MonthSwitcher,
  Screen,
  ScreenState,
  Skeleton,
  Text,
} from "@/ui/primitives";
import { motion, useTokens } from "@/ui/tokens";
import { useReducedMotion } from "@/ui/useReducedMotion";

const MAX_SLICES = 6;
const DONUT_RADIUS = 100;
const DONUT_INNER_RADIUS = 65;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

function currentMonthString(): string {
  return todayIso().slice(0, 7);
}

export default function ReportsCategoriesScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();
  const reduceMotion = useReducedMotion();
  const [month, setMonth] = useState(currentMonthString());
  const [kind, setKind] = useState<"expense" | "income">("expense");

  const { from, to } = monthBounds(month);
  const { data, isLoading, isError, refetch } = useCategoryBreakdown(from, to, kind);

  const items = data?.items ?? [];
  const top = items.slice(0, MAX_SLICES);
  const otherCents = items.slice(MAX_SLICES).reduce((s, i) => s + i.amount_cents, 0);

  const sliceColor = (categoryId: string) => categoryColorFor(categoryId, colors);

  const pieData = [
    ...top.map((i) => ({ value: i.amount_cents, color: sliceColor(i.category_id), text: "" })),
    ...(otherCents > 0 ? [{ value: otherCents, color: colors.categoricalOther, text: "" }] : []),
  ];

  const status = isLoading ? "loading" : isError ? "error" : items.length === 0 ? "empty" : "data";
  const noun = kind === "expense" ? "gastos" : "ingresos";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Categorías" }} />
      <View style={{ paddingBottom: spacing[3] }}>
        <ReportsTabs active="categories" />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          <Chip label="Gasto" selected={kind === "expense"} onPress={() => setKind("expense")} />
          <Chip label="Ingreso" selected={kind === "income"} onPress={() => setKind("income")} />
        </View>

        <MonthSwitcher
          label={formatMonthLabel(month)}
          onPrev={() => setMonth((m) => shiftMonth(m, -1))}
          onNext={() => setMonth((m) => shiftMonth(m, 1))}
        />

        <ScreenState
          status={status}
          loading={<Skeleton height={DONUT_RADIUS * 2} radius={DONUT_RADIUS} />}
          error="No se pudo cargar el desglose."
          onRetry={() => void refetch()}
          empty={{ message: `No hay ${noun} en ${formatMonthLabel(month)}.`, icon: "pie-chart-outline" }}
        >
          <View style={{ alignItems: "center", paddingVertical: spacing[3] }}>
            <PieChart
              data={pieData}
              donut
              radius={DONUT_RADIUS}
              innerRadius={DONUT_INNER_RADIUS}
              isAnimated={!reduceMotion}
              animationDuration={motion.duration.count}
              // La cifra grande de la pantalla va en el centro. El desglose
              // exacto está en la lista de abajo, como pide el wireframe.
              centerLabelComponent={() => (
                <View
                  style={{
                    width: DONUT_INNER_RADIUS * 2 - spacing[4],
                    alignItems: "center",
                  }}
                >
                  <Text variant="caption" color="secondary">
                    Total
                  </Text>
                  <Text variant="title2" adjustsFontSizeToFit numberOfLines={1}>
                    {new Money(data?.total_cents ?? 0).format()}
                  </Text>
                </View>
              )}
            />
          </View>

          <View>
            {top.map((item, index) => (
              <FadeIn key={item.category_id} delay={index * 30}>
                <ListItem
                  leading={<Dot color={sliceColor(item.category_id)} size="md" />}
                  title={item.category_name}
                  trailing={
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing[2] }}>
                      <Text variant="caption" color="secondary">
                        {item.percent_of_total} %
                      </Text>
                      <MoneyText cents={item.amount_cents} />
                    </View>
                  }
                  accessibilityLabel={`${item.category_name}, ${item.percent_of_total} %, ${new Money(item.amount_cents).format()}`}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/transactions",
                      params: { categoryId: item.category_id, categoryName: item.category_name },
                    })
                  }
                  last={otherCents === 0 && index === top.length - 1}
                />
              </FadeIn>
            ))}
            {otherCents > 0 ? (
              <ListItem
                leading={<Dot color={colors.categoricalOther} size="md" />}
                title="Otros"
                trailing={<MoneyText cents={otherCents} />}
                last
              />
            ) : null}
          </View>
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
