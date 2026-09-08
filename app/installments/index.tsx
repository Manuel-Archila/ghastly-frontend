import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import {
  computeInstallmentCommitment,
  listInstallmentPlans,
  type InstallmentPlan,
} from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { Button, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function InstallmentsScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [commitment, setCommitment] = useState({ monthlyCommitmentCents: 0, totalLiabilityCents: 0 });

  useFocusEffect(
    useCallback(() => {
      void Promise.all([listInstallmentPlans(), computeInstallmentCommitment()]).then(([p, c]) => {
        setPlans(p);
        setCommitment(c);
      });
    }, []),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        <Text variant="title1">Cuotas</Text>

        <View style={{ flexDirection: "row", gap: spacing[4] }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="secondary">
              Compromiso este mes
            </Text>
            <Text variant="title2">{new Money(commitment.monthlyCommitmentCents).format()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="secondary">
              Pasivo total
            </Text>
            <Text variant="title2">{new Money(commitment.totalLiabilityCents).format()}</Text>
          </View>
        </View>

        <Button label="Nuevo plan de cuotas" onPress={() => router.push("/installments/new")} />

        {plans.map((plan) => (
          <Pressable
            key={plan.id}
            onPress={() => router.push(`/installments/${plan.id}`)}
            style={{
              paddingVertical: spacing[2],
              borderBottomWidth: 1,
              borderBottomColor: colors.border.subtle,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="body">{plan.description}</Text>
              <Text variant="bodyStrong">{new Money(plan.totalAmountCents).format()}</Text>
            </View>
            <Text variant="caption" color="tertiary">
              {plan.installmentsCount} cuotas · desde {plan.firstPaymentDate}
            </Text>
          </Pressable>
        ))}

        {plans.length === 0 ? (
          <Text variant="body" color="secondary">
            No hay planes de cuotas activos.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
