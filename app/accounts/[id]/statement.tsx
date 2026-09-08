import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getAccount, type Account } from "@/data/repositories/accounts";
import { computeCurrentCycle, type CreditCycle } from "@/domain/creditCycle";
import { Money } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { Button, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

/** Detalle de tarjeta — modelo mental distinto: lo consumido en el corte,
 * cuándo corta, cuándo se paga (PLAN-frontend §6.6). */
export default function StatementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [account, setAccount] = useState<Account | undefined>();
  const [cycle, setCycle] = useState<CreditCycle | null>(null);

  useEffect(() => {
    void getAccount(id).then((a) => {
      setAccount(a);
      if (a?.statementDay && a?.paymentDueDay) {
        setCycle(computeCurrentCycle(todayIso(), a.statementDay, a.paymentDueDay));
      }
    });
  }, [id]);

  if (!account) {
    return (
      <Screen style={{ paddingTop: spacing[5] }}>
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingTop: spacing[5], gap: spacing[4] }}>
      <Button label="Volver" variant="ghost" fullWidth={false} onPress={() => router.back()} />
      <Text variant="title1">{account.name}</Text>

      <View>
        <Text variant="caption" color="secondary">
          Debés en la tarjeta
        </Text>
        <Text variant="display" style={{ color: colors.expense.fg }}>
          {new Money(account.currentBalanceCents).format()}
        </Text>
        {account.creditLimitCents ? (
          <Text variant="caption" color="tertiary">
            de {new Money(account.creditLimitCents).format()} de límite
          </Text>
        ) : null}
      </View>

      {cycle ? (
        <View style={{ gap: spacing[2] }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="caption" color="secondary">
              Corte
            </Text>
            <Text variant="body">
              {cycle.statementDate} ({cycle.daysUntilStatement} días)
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="caption" color="secondary">
              Pago máximo
            </Text>
            <Text variant="body">
              {cycle.paymentDueDate} ({cycle.daysUntilPaymentDue} días)
            </Text>
          </View>
        </View>
      ) : (
        <Text variant="caption" color="tertiary">
          Configurá día de corte y de pago en la cuenta para ver el ciclo.
        </Text>
      )}

      <Button label="Registrar pago" onPress={() => router.push("/(modals)/transfer")} />
    </Screen>
  );
}
