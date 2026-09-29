import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import {
  computeInstallmentCommitment,
  listInstallmentPlans,
  type InstallmentPlan,
} from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { useDeleteVersion, useIsHiddenByDelete } from "@/features/undo/deferred-delete";
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
  const [allPlans, setAllPlans] = useState<InstallmentPlan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [commitment, setCommitment] = useState({ monthlyCommitmentCents: 0, totalLiabilityCents: 0 });
  const isHidden = useIsHiddenByDelete();
  const deleteVersion = useDeleteVersion();

  const load = useCallback(() => {
    void listInstallmentPlans().then((p) => {
      setAllPlans(p);
      setLoaded(true);
    });
  }, []);

  useFocusEffect(load);

  // Se recarga también cada vez que termina un borrado.
  useEffect(() => {
    if (deleteVersion > 0) load();
  }, [deleteVersion, load]);

  // Lo que está por cancelarse (aviso de Deshacer en curso) ya no se muestra.
  const plans = useMemo(
    () => allPlans.filter((p) => !isHidden("installment-plan", p.id)),
    [allPlans, isHidden],
  );

  // El compromiso del mes no cuenta los planes ocultos. Se identifican por una
  // clave de texto para que el efecto solo corra cuando cambia el conjunto.
  const hiddenPlanIds = allPlans
    .filter((p) => isHidden("installment-plan", p.id))
    .map((p) => p.id)
    .sort()
    .join(",");
  useEffect(() => {
    if (!loaded) return;
    const exclude = new Set(hiddenPlanIds ? hiddenPlanIds.split(",") : []);
    void computeInstallmentCommitment(exclude).then(setCommitment);
  }, [loaded, allPlans, hiddenPlanIds]);

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
