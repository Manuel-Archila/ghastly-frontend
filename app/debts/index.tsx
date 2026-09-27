import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { listDebts, type Debt } from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { Button, FadeIn, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function DebtsScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();
  const [debts, setDebts] = useState<Debt[]>([]);

  useFocusEffect(
    useCallback(() => {
      void listDebts().then(setDebts);
    }, []),
  );

  const total = debts.reduce((s, d) => s + d.balanceCents, 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: "Deudas" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        <View>
          <Text variant="caption" color="secondary">
            Total que debés
          </Text>
          <Text variant="display" style={{ color: colors.expense.fg }}>
            {new Money(total).format()}
          </Text>
        </View>
        <Button label="Nueva deuda" onPress={() => router.push("/debts/new")} />

        {debts.map((d, index) => (
          <FadeIn key={d.id} delay={index * 30}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${d.name}, saldo ${new Money(d.balanceCents).format()}`}
              onPress={() => router.push(`/debts/${d.id}`)}
              style={(state) => [
                {
                  paddingVertical: spacing[2],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.subtle,
                  opacity: state.pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body">{d.name}</Text>
                <Text variant="bodyStrong">{new Money(d.balanceCents).format()}</Text>
              </View>
              <Text variant="caption" color="tertiary">
                de {new Money(d.principalCents).format()} ·{" "}
                {(d.monthlyInterestRate * 100).toFixed(2)}%/mes
                {d.status === "paid_off" ? " · pagada ✓" : ""}
              </Text>
            </Pressable>
          </FadeIn>
        ))}

        {debts.length === 0 ? (
          <Text variant="body" color="secondary">
            No hay deudas registradas.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
