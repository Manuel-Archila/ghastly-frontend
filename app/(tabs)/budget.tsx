import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { computeBudgetCurrent, type BudgetCurrent } from "@/data/repositories/budgets";
import { Money } from "@/domain/money";
import { nestByParent } from "@/features/budget/nest";
import { Button, FadeIn, Notice, ProgressBar, Screen, Text, semaphoreColor } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function BudgetScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();
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

        {nestByParent(data.items).map(({ item, depth }, index) => (
          <FadeIn key={item.categoryId} delay={index * 30}>
            <View style={{ gap: spacing[1], marginLeft: depth === 1 ? spacing[5] : 0 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant={depth === 1 ? "body" : "bodyStrong"}>{item.categoryName}</Text>
                <Text
                  variant="bodyStrong"
                  style={{ color: semaphoreColor(item.percentConsumed, colors) }}
                >
                  {item.percentConsumed}%
                </Text>
              </View>
              <ProgressBar percent={item.percentConsumed} />
              <Text variant="caption" color="tertiary">
                {new Money(item.spentCents).format()} / {new Money(item.budgetedCents).format()}
                {item.availableCents >= 0
                  ? `  ·  ${new Money(item.availableCents).format()} disponibles  ·  ~${new Money(item.suggestedDailyPaceCents).format()}/día`
                  : `  ·  ${new Money(-item.availableCents).format()} sobre el límite`}
              </Text>
              {item.childrenBudgetedCents > 0 ? (
                <Text variant="caption" color="tertiary">
                  Incluye subcategorías · repartidas {new Money(item.childrenBudgetedCents).format()}
                </Text>
              ) : null}
              {item.childrenExcessCents > 0 ? (
                <Notice
                  text={`Las subcategorías suman ${new Money(item.childrenExcessCents).format()} más que el tope de ${item.categoryName}.`}
                />
              ) : null}
            </View>
          </FadeIn>
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
