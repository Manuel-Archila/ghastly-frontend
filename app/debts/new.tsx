import { useState } from "react";
import { ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";

import { createDebt } from "@/data/api/commitments";
import { ApiError } from "@/data/api/client";
import { parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { Button, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function NewDebtScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("1"); // % mensual
  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    const principalCents = parseCentsFromInput(principal);
    if (!name.trim() || principalCents === null) return;
    setBusy(true);
    setError(null);
    try {
      await createDebt({
        name: name.trim(),
        type: "personal_loan",
        principalCents,
        monthlyInterestRate: Number(rate) / 100 || 0,
        startDate: todayIso(),
        termMonths: term ? Number(term) : null,
        linkedAccountId: null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Nueva deuda" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Préstamo carro" />
        <Input
          label="Monto original"
          value={principal}
          onChangeText={setPrincipal}
          keyboardType="decimal-pad"
        />
        <Input label="Tasa mensual (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
        <Input
          label="Plazo en meses (opcional)"
          value={term}
          onChangeText={setTerm}
          keyboardType="number-pad"
        />
        {error ? (
          <Text variant="caption" style={{ color: colors.danger.fg }}>
            {error}
          </Text>
        ) : null}
        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={busy} />
      </ScrollView>
    </Screen>
  );
}
