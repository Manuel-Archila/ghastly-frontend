import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import {
  computeInstallmentCommitment,
  listInstallmentPlans,
  type InstallmentPlan,
} from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { formatDateLabel } from "@/lib/dates";
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

export default function InstallmentsScreen() {
  const router = useRouter();
  const { spacing } = useTokens();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [commitment, setCommitment] = useState({ monthlyCommitmentCents: 0, totalLiabilityCents: 0 });

  useFocusEffect(
    useCallback(() => {
      void Promise.all([listInstallmentPlans(), computeInstallmentCommitment()]).then(([p, c]) => {
        setPlans(p);
        setCommitment(c);
        setLoaded(true);
      });
    }, []),
  );

  const status = !loaded ? "loading" : plans.length === 0 ? "empty" : "data";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Cuotas" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}>
        <HeroFigure
          label="Compromiso este mes"
          value={new Money(commitment.monthlyCommitmentCents).format()}
          subtitle={`Pasivo total ${new Money(commitment.totalLiabilityCents).format()}`}
        />

        <ScreenState
          status={status}
          empty={{
            message: "No hay planes de cuotas activos.",
            icon: "layers-outline",
            actionLabel: "Nuevo plan de cuotas",
            onAction: () => router.push("/installments/new"),
          }}
        >
          {plans.map((plan, index) => (
            <FadeIn key={plan.id} delay={index * 30}>
              <ListItem
                title={plan.description}
                subtitle={`${plan.installmentsCount} cuotas · desde ${formatDateLabel(plan.firstPaymentDate)}`}
                trailing={<MoneyText cents={plan.totalAmountCents} />}
                onPress={() => router.push(`/installments/${plan.id}`)}
                accessibilityLabel={`${plan.description}, ${new Money(plan.totalAmountCents).format()}`}
                last={index === plans.length - 1}
              />
            </FadeIn>
          ))}
          <Button label="Nuevo plan de cuotas" onPress={() => router.push("/installments/new")} />
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
