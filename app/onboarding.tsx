import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { createAccountLocally } from "@/data/repositories/accounts";
import { triggerSync } from "@/features/sync/sync-manager";
import { parseCentsFromInput } from "@/domain/money";
import { Button, Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const TYPES = [
  { value: "checking", label: "Monetaria" },
  { value: "savings", label: "Ahorro" },
  { value: "cash", label: "Efectivo" },
  { value: "credit_card", label: "Tarjeta" },
];

interface AccountDraft {
  name: string;
  type: string;
  balance: string;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [step, setStep] = useState<1 | 2>(1);
  const [drafts, setDrafts] = useState<AccountDraft[]>([{ name: "", type: "checking", balance: "" }]);
  const [busy, setBusy] = useState(false);

  function updateDraft(i: number, patch: Partial<AccountDraft>) {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function finish() {
    setBusy(true);
    for (const d of drafts) {
      if (!d.name.trim()) continue;
      await createAccountLocally({
        name: d.name.trim(),
        type: d.type,
        initialBalanceCents: parseCentsFromInput(d.balance) ?? 0,
      });
    }
    triggerSync();
    router.replace("/(tabs)");
  }

  if (step === 1) {
    return (
      <Screen style={{ justifyContent: "center", gap: spacing[5] }}>
        <View style={{ gap: spacing[2] }}>
          <Text variant="title1">Bienvenida a Ghastly</Text>
          <Text variant="body" color="secondary">
            Registrá un gasto en menos de 10 segundos. Empecemos con lo básico.
          </Text>
        </View>

        <Button label="Siguiente: tus cuentas" onPress={() => setStep(2)} />
        <Button label="Saltar por ahora" variant="ghost" onPress={() => router.replace("/(tabs)")} />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingTop: spacing[5] }}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Text variant="title1">Tus cuentas</Text>
        <Text variant="body" color="secondary">
          Agregá las cuentas y tarjetas que usás, con su saldo actual.
        </Text>

        {drafts.map((d, i) => (
          <View
            key={i}
            style={{
              gap: spacing[2],
              paddingBottom: spacing[3],
              borderBottomWidth: 1,
              borderBottomColor: colors.border.subtle,
            }}
          >
            <Input
              label="Nombre"
              value={d.name}
              onChangeText={(v) => updateDraft(i, { name: v })}
              placeholder="BAC Monetaria"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
              {TYPES.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  selected={d.type === t.value}
                  onPress={() => updateDraft(i, { type: t.value })}
                />
              ))}
            </View>
            <Input
              label="Saldo actual"
              value={d.balance}
              onChangeText={(v) => updateDraft(i, { balance: v })}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
        ))}

        <Button
          label="+ Otra cuenta"
          variant="ghost"
          onPress={() => setDrafts((p) => [...p, { name: "", type: "checking", balance: "" }])}
        />

        <Button
          label={busy ? "Guardando…" : "Listo, entrar"}
          onPress={finish}
          disabled={busy || !drafts.some((d) => d.name.trim())}
        />
      </ScrollView>
    </Screen>
  );
}
