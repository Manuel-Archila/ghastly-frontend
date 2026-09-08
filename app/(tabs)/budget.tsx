import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { computeBudgetCurrent, type BudgetCurrent } from "@/data/repositories/budgets";
import { Money } from "@/domain/money";
import { Button, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function barColor(percent: number, colors: ReturnType<typeof useTokens>["colors"]): string {
  if (percent > 100) return colors.danger.fg;
  if (percent >= 80) return colors.warning.fg;
  return colors.income.fg;
}

export default function BudgetScreen() {
  const router = useRouter();
  const { spacing, colors, radii } = useTokens();
  const [data, setData] = useState<BudgetCurrent | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void computeBudgetCurrent(currentMonth()).then((d) => {
        setData(d);
        setLoaded(true);
      });
    }, []),
  );

  if (loaded && !data) {
    return (
      <Screen style={{ paddingTop: spacing[4], gap: spacing[4] }}>
        <Text variant="title1">Presupuesto</Text>
        <Text variant="body" color="secondary">
          Todavía no hay un presupuesto. Creá uno con montos por categoría.
        </Text>
        <Button label="Crear presupuesto" onPress={() => router.push("/budget/edit")} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen style={{ paddingTop: spacing[4] }}>
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  const overallPercent =
    data.totalBudgetedCents > 0
      ? Math.round((data.totalSpentCents / data.totalBudgetedCents) * 100)
      : 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}>
        <View style={{ gap: spacing[1] }}>
          <Text variant="title2">{data.month}</Text>
          <Text variant="display">{new Money(data.totalAvailableCents).format()}</Text>
          <Text variant="caption" color="secondary">
            {new Money(data.totalSpentCents).format()} de {new Money(data.totalBudgetedCents).format()}
            {"  ·  "}
            {overallPercent}%
          </Text>
          <Text variant="caption" color="secondary">
            Proyección: {new Money(data.globalProjectedCents).format()}
          </Text>
        </View>

        {data.items.map((item) => (
          <View key={item.categoryId} style={{ gap: spacing[1] }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="body">{item.categoryName}</Text>
              <Text variant="bodyStrong" style={{ color: barColor(item.percentConsumed, colors) }}>
                {item.percentConsumed}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.bg.sunken, borderRadius: radii.sm }}>
              <View
                style={{
                  height: 6,
                  width: `${Math.min(100, item.percentConsumed)}%`,
                  backgroundColor: barColor(item.percentConsumed, colors),
                  borderRadius: radii.sm,
                }}
              />
            </View>
            <Text variant="caption" color="tertiary">
              {new Money(item.spentCents).format()} / {new Money(item.budgetedCents).format()}
              {item.availableCents >= 0
                ? `  ·  ${new Money(item.availableCents).format()} disponibles  ·  ~${new Money(item.suggestedDailyPaceCents).format()}/día`
                : `  ·  ${new Money(-item.availableCents).format()} sobre el límite`}
            </Text>
          </View>
        ))}

        {data.unbudgeted.length > 0 ? (
          <View style={{ gap: spacing[2] }}>
            <Text variant="caption" color="secondary">
              SIN PRESUPUESTO
            </Text>
            {data.unbudgeted.map((u) => (
              <View key={u.categoryId} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body">{u.categoryName || "Categoría"}</Text>
                <Text variant="bodyStrong">{new Money(u.spentCents).format()}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Button label="Editar presupuesto" variant="ghost" onPress={() => router.push("/budget/edit")} />
        <Button label="Historial y cierre de mes" variant="ghost" onPress={() => router.push("/budget/history")} />
      </ScrollView>
    </Screen>
  );
}
