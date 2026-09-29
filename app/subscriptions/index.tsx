import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { computeSubscriptionSummary, type SubscriptionSummary } from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { frequencyLabel } from "@/features/subscriptions/frequency-label";
import { useDeleteVersion, useIsHiddenByDelete } from "@/features/undo/deferred-delete";
import { formatDateLabel } from "@/lib/dates";
import {
  Button,
  FadeIn,
  HeroFigure,
  Icon,
  ListItem,
  MoneyText,
  Screen,
  ScreenState,
  SectionHeader,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function SubscriptionsScreen() {
  const router = useRouter();
  const { spacing, colors, iconSize } = useTokens();
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);

  const isHidden = useIsHiddenByDelete();
  const deleteVersion = useDeleteVersion();

  const load = useCallback(() => {
    void computeSubscriptionSummary().then(setSummary);
  }, []);

  useFocusEffect(load);

  // También se recarga cada vez que termina un borrado (la lista abierta tiene
  // el registro viejo en memoria).
  useEffect(() => {
    if (deleteVersion > 0) load();
  }, [deleteVersion, load]);

  // Lo que está por borrarse (aviso de Deshacer en curso) ya no se muestra ni
  // cuenta en los totales.
  const view = useMemo(() => {
    if (!summary) return null;
    const items = summary.items.filter((i) => !isHidden("subscription", i.rule.id));
    const paused = summary.paused.filter((r) => !isHidden("subscription", r.id));
    const totalMonthlyCents = items.reduce((sum, i) => sum + i.monthlyEquivalentCents, 0);
    return { items, paused, totalMonthlyCents, totalAnnualizedCents: totalMonthlyCents * 12 };
  }, [summary, isHidden]);

  const status = !view
    ? "loading"
    : view.items.length === 0 && view.paused.length === 0
      ? "empty"
      : "data";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Suscripciones" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}>
        {view ? (
          <HeroFigure
            label="Costo mensual"
            value={new Money(view.totalMonthlyCents).format()}
            subtitle={`${new Money(view.totalAnnualizedCents).format()} al año`}
          />
        ) : null}

        <ScreenState
          status={status}
          empty={{
            message: "No hay suscripciones activas.",
            icon: "repeat-outline",
            actionLabel: "Nueva suscripción",
            onAction: () => router.push("/subscriptions/new"),
          }}
        >
          {view && view.items.length === 0 ? (
            <Text variant="body" color="secondary">
              No hay suscripciones activas.
            </Text>
          ) : null}

          {view?.items.map(({ rule, monthlyEquivalentCents, priceIncreased }, index) => (
            <FadeIn key={rule.id} delay={index * 30}>
              <ListItem
                title={rule.name}
                subtitle={`${frequencyLabel(rule.frequency)} · ${new Money(monthlyEquivalentCents).format()}/mes · próximo ${formatDateLabel(rule.nextDueDate)}`}
                trailing={<MoneyText cents={rule.amountCents} />}
                onPress={() => router.push(`/subscriptions/${rule.id}`)}
                last={!priceIncreased}
              />
              {priceIncreased ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[1],
                    paddingBottom: spacing[2],
                  }}
                >
                  <Icon name="warning-outline" size={iconSize.sm} color={colors.warning.fg} />
                  <Text variant="caption" style={{ color: colors.warning.fg }}>
                    Subió de precio
                  </Text>
                </View>
              ) : null}
            </FadeIn>
          ))}

          {view && view.paused.length > 0 ? (
            <View>
              <SectionHeader label="Pausadas" />
              {view.paused.map((rule, index) => (
                <ListItem
                  key={rule.id}
                  title={rule.name}
                  subtitle={frequencyLabel(rule.frequency)}
                  trailing={<MoneyText cents={rule.amountCents} variant="body" />}
                  onPress={() => router.push(`/subscriptions/${rule.id}`)}
                  last={index === view.paused.length - 1}
                />
              ))}
            </View>
          ) : null}

          <Button label="Nueva suscripción" onPress={() => router.push("/subscriptions/new")} />
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
