import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { listGoals, type Goal } from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { Button, FadeIn, ProgressBar, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function GoalsScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();
  const [goals, setGoals] = useState<Goal[]>([]);

  useFocusEffect(
    useCallback(() => {
      void listGoals().then(setGoals);
    }, []),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        <Text variant="title1">Metas</Text>
        <Button label="Nueva meta" onPress={() => router.push("/goals/new")} />

        {goals.map((g, index) => {
          const pct = Math.min(100, Math.round((g.currentAmountCents / g.targetAmountCents) * 100));
          return (
            <FadeIn key={g.id} delay={index * 30}>
              <Pressable
                onPress={() => router.push(`/goals/${g.id}`)}
                style={(state) => [
                  { gap: spacing[1], paddingVertical: spacing[2], opacity: state.pressed ? 0.6 : 1 },
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="body">{g.name}</Text>
                  <Text variant="bodyStrong">{pct}%</Text>
                </View>
                <ProgressBar percent={pct} color={colors.income.fg} />
                <Text variant="caption" color="tertiary">
                  {new Money(g.currentAmountCents).format()} de{" "}
                  {new Money(g.targetAmountCents).format()}
                </Text>
              </Pressable>
            </FadeIn>
          );
        })}

        {goals.length === 0 ? (
          <Text variant="body" color="secondary">
            No hay metas todavía.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
