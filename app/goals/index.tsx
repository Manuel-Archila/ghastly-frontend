import { useCallback, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { listGoals, type Goal } from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { Button, FadeIn, HeroFigure, ProgressRow, Screen, ScreenState } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function GoalsScreen() {
  const router = useRouter();
  const { spacing, colors, minTouchTarget, opacity } = useTokens();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void listGoals().then((g) => {
        setGoals(g);
        setLoaded(true);
      });
    }, []),
  );

  const saved = goals.reduce((s, g) => s + g.currentAmountCents, 0);
  const target = goals.reduce((s, g) => s + g.targetAmountCents, 0);
  const status = !loaded ? "loading" : goals.length === 0 ? "empty" : "data";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Metas" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}>
        <HeroFigure
          label="Ahorrado en metas"
          value={new Money(saved).format()}
          subtitle={target > 0 ? `de ${new Money(target).format()}` : undefined}
        />

        <ScreenState
          status={status}
          empty={{
            message: "No hay metas todavía.",
            icon: "flag-outline",
            actionLabel: "Nueva meta",
            onAction: () => router.push("/goals/new"),
          }}
        >
          {goals.map((g, index) => {
            const pct = Math.min(
              100,
              Math.round((g.currentAmountCents / g.targetAmountCents) * 100),
            );
            return (
              <FadeIn key={g.id} delay={index * 30}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${g.name}, ${pct} % de ${new Money(g.targetAmountCents).format()}`}
                  onPress={() => router.push(`/goals/${g.id}`)}
                  style={({ pressed }) => ({
                    minHeight: minTouchTarget,
                    justifyContent: "center",
                    paddingVertical: spacing[2],
                    opacity: pressed ? opacity.pressedSubtle : 1,
                  })}
                >
                  <ProgressRow
                    label={g.name}
                    percent={pct}
                    valueText={`${pct} %`}
                    caption={`${new Money(g.currentAmountCents).format()} de ${new Money(g.targetAmountCents).format()}`}
                    color={colors.income.fg}
                  />
                </Pressable>
              </FadeIn>
            );
          })}
          <Button label="Nueva meta" onPress={() => router.push("/goals/new")} />
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
