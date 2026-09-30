import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { createAccountLocally } from "@/data/repositories/accounts";
import { AccountFields } from "@/features/accounts/AccountFields";
import { buildAccountInputs, emptyAccountDraft, type AccountDraft } from "@/features/accounts/account-draft";
import { triggerSync } from "@/features/sync/sync-manager";
import { Button, Card, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function OnboardingScreen() {
  const router = useRouter();
  const { spacing } = useTokens();

  const [step, setStep] = useState<1 | 2>(1);
  const [drafts, setDrafts] = useState<AccountDraft[]>(() => [emptyAccountDraft()]);
  const [busy, setBusy] = useState(false);

  function updateDraft(i: number, patch: Partial<AccountDraft>) {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function finish() {
    setBusy(true);
    for (const d of drafts) {
      for (const input of buildAccountInputs(d)) await createAccountLocally(input);
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
          <Card key={i}>
            <AccountFields draft={d} onChange={(patch) => updateDraft(i, patch)} />
          </Card>
        ))}

        <Button
          label="+ Otra cuenta"
          variant="ghost"
          onPress={() => setDrafts((p) => [...p, emptyAccountDraft()])}
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
