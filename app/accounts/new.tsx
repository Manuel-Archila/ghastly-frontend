import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { createAccountLocally } from "@/data/repositories/accounts";
import { parseCentsFromInput } from "@/domain/money";
import { triggerSync } from "@/features/sync/sync-manager";
import { Button, Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const TYPES: { value: string; label: string }[] = [
  { value: "checking", label: "Monetaria" },
  { value: "savings", label: "Ahorro" },
  { value: "cash", label: "Efectivo" },
  { value: "credit_card", label: "Tarjeta" },
  { value: "digital_wallet", label: "Billetera" },
];

const CURRENCIES = ["GTQ", "USD"];

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

export default function NewAccountScreen() {
  const router = useRouter();
  const { spacing } = useTokens();

  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [currency, setCurrency] = useState("GTQ");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [statementDay, setStatementDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minimumPaymentPercent, setMinimumPaymentPercent] = useState("");
  const [busy, setBusy] = useState(false);

  const isCreditCard = type === "credit_card";

  async function onSubmit() {
    if (!name.trim()) return;
    setBusy(true);
    await createAccountLocally({
      name: name.trim(),
      type,
      currency,
      initialBalanceCents: parseCentsFromInput(balance) ?? 0,
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
      <Stack.Screen options={{ title: "Nueva cuenta" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
      <Input label="Nombre" value={name} onChangeText={setName} placeholder="BAC Monetaria" />

      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" color="secondary">
          Tipo
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {TYPES.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              selected={type === t.value}
              onPress={() => setType(t.value)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" color="secondary">
          Moneda
        </Text>
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          {CURRENCIES.map((c) => (
            <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </View>
      </View>

      <Input
        label={`Saldo actual (${currency})`}
        value={balance}
        onChangeText={setBalance}
        keyboardType="decimal-pad"
        placeholder="0.00"
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

      <Button
        label={busy ? "Guardando…" : "Guardar"}
        onPress={onSubmit}
        disabled={busy || !name.trim()}
      />
      </ScrollView>
    </Screen>
  );
}
