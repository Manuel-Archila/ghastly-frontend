import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

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

export default function NewAccountScreen() {
  const router = useRouter();
  const { spacing } = useTokens();

  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [currency, setCurrency] = useState("GTQ");
  const [balance, setBalance] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!name.trim()) return;
    setBusy(true);
    await createAccountLocally({
      name: name.trim(),
      type,
      currency,
      initialBalanceCents: parseCentsFromInput(balance) ?? 0,
    });
    triggerSync();
    router.back();
  }

  return (
    <Screen style={{ gap: spacing[4], paddingTop: spacing[5] }}>
      <Text variant="title1">Nueva cuenta</Text>
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

      <Button
        label={busy ? "Guardando…" : "Guardar"}
        onPress={onSubmit}
        disabled={busy || !name.trim()}
      />
    </Screen>
  );
}
