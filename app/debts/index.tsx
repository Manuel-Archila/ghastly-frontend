import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { listDebts, type Debt } from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import {
  Button,
  FadeIn,
  HeroFigure,
  ListItem,
  MoneyText,
  Screen,
  ScreenState,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function DebtsScreen() {
  const router = useRouter();
  const { spacing } = useTokens();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void listDebts().then((d) => {
        setDebts(d);
        setLoaded(true);
      });
    }, []),
  );

  const total = debts.reduce((s, d) => s + d.balanceCents, 0);
  const status = !loaded ? "loading" : debts.length === 0 ? "empty" : "data";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Deudas" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}>
        <HeroFigure label="Total que debés" value={new Money(total).format()} />

        <ScreenState
          status={status}
          empty={{
            message: "No hay deudas registradas.",
            icon: "trending-down-outline",
            actionLabel: "Nueva deuda",
            onAction: () => router.push("/debts/new"),
          }}
        >
          {debts.map((d, index) => (
            <FadeIn key={d.id} delay={index * 30}>
              <ListItem
                title={d.name}
                subtitle={`de ${new Money(d.principalCents).format()} · ${(d.monthlyInterestRate * 100).toFixed(2)} %/mes${d.status === "paid_off" ? " · pagada" : ""}`}
                trailing={<MoneyText cents={d.balanceCents} />}
                accessibilityLabel={`${d.name}, saldo ${new Money(d.balanceCents).format()}`}
                onPress={() => router.push(`/debts/${d.id}`)}
                last={index === debts.length - 1}
              />
            </FadeIn>
          ))}
          <Button label="Nueva deuda" onPress={() => router.push("/debts/new")} />
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
