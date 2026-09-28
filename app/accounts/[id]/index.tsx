import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { getAccount, updateAccountLocally, type Account } from "@/data/repositories/accounts";
import { parseCentsFromInput } from "@/domain/money";
import { triggerSync } from "@/features/sync/sync-manager";
import { Button, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

/** Convierte un `Decimal` de porcentaje ("2.5") a texto de input, o "". */
function pctToInput(value: number | null): string {
  return value === null || value === undefined ? "" : String(value);
}

function parsePercent(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseDay(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : null;
}

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing } = useTokens();

  const [account, setAccount] = useState<Account | undefined>();
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [statementDay, setStatementDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minimumPaymentPercent, setMinimumPaymentPercent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const a = await getAccount(id);
      if (!a) return;
      setAccount(a);
      setName(a.name);
      setInstitution(a.institution ?? "");
      setLastFour(a.lastFour ?? "");
      setCreditLimit(a.creditLimitCents !== null ? (a.creditLimitCents / 100).toFixed(2) : "");
      setStatementDay(a.statementDay !== null ? String(a.statementDay) : "");
      setPaymentDueDay(a.paymentDueDay !== null ? String(a.paymentDueDay) : "");
      setInterestRate(pctToInput(a.interestRate));
      setMinimumPaymentPercent(pctToInput(a.minimumPaymentPercent));
    })();
  }, [id]);

  if (!account) {
    return (
      <Screen style={{ paddingTop: spacing[4] }}>
        <Stack.Screen options={{ title: "Cuenta" }} />
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  const isCreditCard = account.type === "credit_card";

  async function onSave() {
    if (!name.trim() || !account) return;
    setBusy(true);
    await updateAccountLocally(account.id, {
      name: name.trim(),
      institution: institution.trim() || null,
      lastFour: lastFour.trim() || null,
      ...(isCreditCard
        ? {
            creditLimitCents: parseCentsFromInput(creditLimit),
            statementDay: parseDay(statementDay),
            paymentDueDay: parseDay(paymentDueDay),
            interestRate: parsePercent(interestRate),
            minimumPaymentPercent: parsePercent(minimumPaymentPercent),
          }
        : {}),
    });
    triggerSync();
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Editar cuenta" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4], paddingBottom: spacing[8] }}>
        <Input label="Nombre" value={name} onChangeText={setName} />
        <Input label="Institución" value={institution} onChangeText={setInstitution} placeholder="BAC, G&T, ..." />
        <Input
          label="Últimos 4 dígitos"
          value={lastFour}
          onChangeText={setLastFour}
          keyboardType="number-pad"
          maxLength={4}
        />

        {isCreditCard ? (
          <View style={{ gap: spacing[4] }}>
            <Input
              label="Límite de crédito"
              value={creditLimit}
              onChangeText={setCreditLimit}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <Input
              label="Día de corte"
              value={statementDay}
              onChangeText={setStatementDay}
              keyboardType="number-pad"
              placeholder="1-31"
            />
            <Input
              label="Día de pago"
              value={paymentDueDay}
              onChangeText={setPaymentDueDay}
              keyboardType="number-pad"
              placeholder="1-31"
            />
            <Input
              label="Tasa de interés anual (%)"
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="decimal-pad"
              placeholder="0.0"
            />
            <Input
              label="Pago mínimo (% del saldo)"
              value={minimumPaymentPercent}
              onChangeText={setMinimumPaymentPercent}
              keyboardType="decimal-pad"
              placeholder="0.0"
            />
          </View>
        ) : null}

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={busy || !name.trim()} />
      </ScrollView>
    </Screen>
  );
}
