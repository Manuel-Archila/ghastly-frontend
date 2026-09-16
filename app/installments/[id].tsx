import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { payInstallment } from "@/data/api/commitments";
import { ApiError } from "@/data/api/client";
import {
  getInstallmentPlan,
  listInstallmentsForPlan,
  type Installment,
  type InstallmentPlan,
} from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { Button, FadeIn, Icon, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function InstallmentPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [plan, setPlan] = useState<InstallmentPlan | undefined>();
  const [rows, setRows] = useState<Installment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, list] = await Promise.all([getInstallmentPlan(id), listInstallmentsForPlan(id)]);
    setPlan(p);
    setRows(list);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pending = rows.filter((r) => r.status === "pending");
  const pendingTotal = pending.reduce((s, r) => s + r.amountCents, 0);
  const nextDue = pending[0];

  async function onPay() {
    if (!nextDue) return;
    setBusy(true);
    setError(null);
    try {
      await payInstallment(nextDue.id, todayIso());
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo pagar.");
    } finally {
      setBusy(false);
    }
  }

  if (!plan) {
    return (
      <Screen style={{ paddingTop: spacing[5] }}>
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingTop: spacing[5] }}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Button label="Volver" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        <Text variant="title1">{plan.description}</Text>
        <View>
          <Text variant="caption" color="secondary">
            Saldo pendiente
          </Text>
          <Text variant="display">{new Money(pendingTotal).format()}</Text>
        </View>

        {nextDue ? (
          <Button
            label={busy ? "Registrando…" : `Pagar cuota ${nextDue.number} · ${new Money(nextDue.amountCents).format()}`}
            onPress={onPay}
            disabled={busy}
          />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <Icon name="sparkles-outline" color={colors.income.fg} />
            <Text variant="body" color="secondary">
              Todas las cuotas pagadas
            </Text>
          </View>
        )}
        {error ? (
          <Text variant="caption" style={{ color: colors.danger.fg }}>
            {error}
          </Text>
        ) : null}

        <View style={{ gap: spacing[1] }}>
          {rows.map((r, index) => (
            <FadeIn key={r.id} delay={index * 20}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: spacing[1],
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
                  {r.status === "paid" ? (
                    <Icon name="checkmark-circle-outline" size={16} color={colors.text.tertiary} />
                  ) : null}
                  <Text
                    variant="body"
                    style={{
                      color: r.status === "paid" ? colors.text.tertiary : colors.text.primary,
                    }}
                  >
                    {r.number}/{plan.installmentsCount} · {r.dueDate}
                  </Text>
                </View>
                <Text
                  variant="bodyStrong"
                  style={{ color: r.status === "paid" ? colors.text.tertiary : colors.text.primary }}
                >
                  {new Money(r.amountCents).format()}
                </Text>
              </View>
            </FadeIn>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
