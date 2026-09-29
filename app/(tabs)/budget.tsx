import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { computeBudgetCurrent, type BudgetCurrent } from "@/data/repositories/budgets";
import { Money } from "@/domain/money";
import { nestByParent } from "@/features/budget/nest";
import { formatMonthLabel, todayIso } from "@/lib/dates";
import {
  Button,
  FadeIn,
  HeroFigure,
  ListItem,
  MoneyText,
  Notice,
  ProgressBar,
  ProgressRow,
  Screen,
  ScreenHeader,
  ScreenState,
  SectionHeader,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

function currentMonth(): string {
  return todayIso().slice(0, 7);
}

export default function BudgetScreen() {
  const router = useRouter();
  const { spacing } = useTokens();
  const month = currentMonth();
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

  const status = !loaded ? "loading" : !data ? "empty" : "data";
  const overallPercent =
    data && data.totalBudgetedCents > 0
      ? Math.round((data.totalSpentCents / data.totalBudgetedCents) * 100)
      : 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingBottom: spacing[8] }}>
        <ScreenHeader title="Presupuesto" subtitle={formatMonthLabel(month)} />
        <ScreenState
          status={status}
          skeleton="detail"
          empty={{
            message: "Todavía no hay un presupuesto. Creá uno con montos por categoría.",
            icon: "pie-chart-outline",
            actionLabel: "Crear presupuesto",
            onAction: () => router.push("/budget/edit"),
          }}
        >
          {data ? (
            <>
              <View style={{ gap: spacing[2] }}>
                <HeroFigure
                  label="Disponible este mes"
                  value={new Money(data.totalAvailableCents).format()}
                  subtitle={`${new Money(data.totalSpentCents).format()} de ${new Money(data.totalBudgetedCents).format()} · ${overallPercent} %`}
                />
                <ProgressBar percent={overallPercent} />
                <Text variant="caption" color="secondary">
                  Proyección al cierre: {new Money(data.globalProjectedCents).format()}
                </Text>
              </View>

              <View style={{ gap: spacing[4] }}>
                <SectionHeader label="Por categoría" />
                {nestByParent(data.items).map(({ item, depth }, index) => (
                  <FadeIn key={item.categoryId} delay={index * 30}>
                    <View style={{ gap: spacing[2], marginLeft: depth === 1 ? spacing[5] : 0 }}>
                      <ProgressRow
                        label={item.categoryName}
                        percent={item.percentConsumed}
                        valueText={`${item.percentConsumed} %`}
                        caption={
                          `${new Money(item.spentCents).format()} de ${new Money(item.budgetedCents).format()}` +
                          (item.availableCents >= 0
                            ? ` · ${new Money(item.availableCents).format()} disponibles · ~${new Money(item.suggestedDailyPaceCents).format()}/día`
                            : ` · ${new Money(-item.availableCents).format()} sobre el límite`)
                        }
                      />
                      {item.childrenBudgetedCents > 0 ? (
                        <Text variant="caption" color="tertiary">
                          Incluye subcategorías · repartidas{" "}
                          {new Money(item.childrenBudgetedCents).format()}
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
              </View>

              {data.unbudgeted.length > 0 ? (
                <View>
                  <SectionHeader label="Sin presupuesto" />
                  {data.unbudgeted.map((u, index) => (
                    <ListItem
                      key={u.categoryId}
                      title={u.categoryName || "Categoría"}
                      trailing={<MoneyText cents={u.spentCents} kind="expense" />}
                      last={index === data.unbudgeted.length - 1}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ gap: spacing[2] }}>
                <Button
                  label="Editar presupuesto"
                  variant="secondary"
                  onPress={() => router.push("/budget/edit")}
                />
                <Button
                  label="Historial y cierre de mes"
                  variant="ghost"
                  onPress={() => router.push("/budget/history")}
                />
              </View>
            </>
          ) : null}
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
