import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { computeSubscriptionSummary, type SubscriptionSummary } from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { Button, FadeIn, Icon, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function SubscriptionsScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      void computeSubscriptionSummary().then(setSummary);
    }, []),
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: "Suscripciones" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        {summary ? (
          <View style={{ gap: spacing[1] }}>
            <Text variant="display">{new Money(summary.totalMonthlyCents).format()}/mes</Text>
            <Text variant="caption" color="secondary">
              {new Money(summary.totalAnnualizedCents).format()} al año
            </Text>
          </View>
        ) : null}

        <Button label="Nueva suscripción" onPress={() => router.push("/subscriptions/new")} />

        {summary?.items.map(({ rule, monthlyEquivalentCents, priceIncreased }, index) => (
          <FadeIn key={rule.id} delay={index * 30}>
            <Pressable onPress={() => router.push(`/subscriptions/${rule.id}`)}>
              <View
                style={{
                  gap: 2,
                  paddingVertical: spacing[2],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.subtle,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="body">{rule.name}</Text>
                  <Text variant="bodyStrong">{new Money(rule.amountCents).format()}</Text>
                </View>
                <Text variant="caption" color="tertiary">
                  {rule.frequency} · {new Money(monthlyEquivalentCents).format()}/mes · próximo{" "}
                  {rule.nextDueDate}
                </Text>
                {priceIncreased ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
                    <Icon name="warning-outline" size={14} color={colors.warning.fg} />
                    <Text variant="caption" style={{ color: colors.warning.fg }}>
                      subió de precio
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </FadeIn>
        ))}

        {summary && summary.items.length === 0 ? (
          <Text variant="body" color="secondary">
            No hay suscripciones activas.
          </Text>
        ) : null}

        {summary && summary.paused.length > 0 ? (
          <View style={{ gap: spacing[2] }}>
            <Text variant="caption" color="secondary">
              PAUSADAS
            </Text>
            {summary.paused.map((rule) => (
              <Pressable key={rule.id} onPress={() => router.push(`/subscriptions/${rule.id}`)}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: spacing[2],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.subtle,
                  }}
                >
                  <Text variant="body" color="secondary">
                    {rule.name}
                  </Text>
                  <Text variant="body" color="secondary">
                    {new Money(rule.amountCents).format()}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
