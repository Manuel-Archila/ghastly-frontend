import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { createGoal } from "@/data/api/commitments";
import { ApiError } from "@/data/api/client";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { parseCentsFromInput } from "@/domain/money";
import { Button, Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function NewGoalScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listAccounts().then(setAccounts);
  }, []);

  async function onSave() {
    const targetAmountCents = parseCentsFromInput(target);
    if (!name.trim() || targetAmountCents === null) return;
    setBusy(true);
    setError(null);
    try {
      await createGoal({
        name: name.trim(),
        targetAmountCents,
        targetDate: null,
        linkedAccountId: linkedId,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear.");
      setBusy(false);
    }
  }

  return (
    <Screen style={{ paddingTop: spacing[5] }}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Text variant="title1">Nueva meta</Text>
        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Fondo de emergencia" />
        <Input label="Objetivo" value={target} onChangeText={setTarget} keyboardType="decimal-pad" />

        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" color="secondary">
            Cuenta enlazada (opcional — los aportes serán transferencias reales)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {accounts.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={linkedId === a.id}
                onPress={() => setLinkedId(linkedId === a.id ? null : a.id)}
              />
            ))}
          </View>
        </View>

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
