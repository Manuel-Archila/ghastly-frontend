import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
// Import directo al submódulo — ver la nota en reports/trends.tsx: evita
// que el barrel de la librería arrastre BarChart y su dependencia opcional
// de expo-linear-gradient, que esta app no usa ni tiene instalada.
import { PieChart } from "react-native-gifted-charts/dist/PieChart";
import { Stack, useRouter } from "expo-router";

import { ReportsTabs } from "@/features/reports/ReportsTabs";
import { useCategoryBreakdown } from "@/features/reports/useCategoryBreakdown";
import { categoryColorFor } from "@/lib/categoryColor";
import { Money } from "@/domain/money";
import { Button, Chip, FadeIn, Icon, Screen, Skeleton, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const MAX_SLICES = 6;

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
  return new Date().toISOString().slice(0, 7);
}

export default function ReportsCategoriesScreen() {
  const router = useRouter();
  const { spacing, colors, minTouchTarget } = useTokens();
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

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            onPress={() => setMonth((m) => shiftMonth(m, -1))}
            style={{ minWidth: minTouchTarget, minHeight: minTouchTarget, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="chevron-back" size={22} color={colors.text.primary} />
          </Pressable>
          <Text variant="bodyStrong">{month}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
            onPress={() => setMonth((m) => shiftMonth(m, 1))}
            style={{ minWidth: minTouchTarget, minHeight: minTouchTarget, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="chevron-forward" size={22} color={colors.text.primary} />
          </Pressable>
        </View>

        {isLoading ? (
          <Skeleton height={220} radius={110} />
        ) : isError ? (
          <View style={{ gap: spacing[3] }}>
            <Text variant="body" color="secondary">
              No se pudo cargar el desglose.
            </Text>
            <Button label="Reintentar" onPress={() => void refetch()} />
          </View>
        ) : items.length === 0 ? (
          <Text variant="body" color="secondary">
            No hay {kind === "expense" ? "gastos" : "ingresos"} en {month}.
          </Text>
        ) : (
          <>
            <View style={{ alignItems: "center", paddingVertical: spacing[3] }}>
              <PieChart data={pieData} donut radius={100} innerRadius={65} />
              <Text variant="caption" color="secondary" style={{ marginTop: spacing[2] }}>
                Total: {new Money(data!.total_cents).format()}
              </Text>
            </View>

            <View style={{ gap: spacing[1] }}>
              {top.map((item, index) => (
                <FadeIn key={item.category_id} delay={index * 30}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.category_name}, ${item.percent_of_total}%, ${new Money(item.amount_cents).format()}`}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/transactions",
                        params: { categoryId: item.category_id, categoryName: item.category_name },
                      })
                    }
                    style={(state) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing[2],
                        paddingVertical: spacing[2],
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border.subtle,
                        opacity: state.pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: sliceColor(item.category_id),
                      }}
                    />
                    <Text variant="body" style={{ flex: 1 }}>
                      {item.category_name}
                    </Text>
                    <Text variant="caption" color="tertiary">
                      {item.percent_of_total}%
                    </Text>
                    <Text variant="bodyStrong">{new Money(item.amount_cents).format()}</Text>
                  </Pressable>
                </FadeIn>
              ))}
              {otherCents > 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[2],
                    paddingVertical: spacing[2],
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.categoricalOther,
                    }}
                  />
                  <Text variant="body" color="secondary" style={{ flex: 1 }}>
                    Otros
                  </Text>
                  <Text variant="bodyStrong">{new Money(otherCents).format()}</Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
