import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";

import { createGoal } from "@/data/api/commitments";
import { errorMessageFor } from "@/data/api/error-messages";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { parseCentsFromInput } from "@/domain/money";
import { Chip, ChipGroup, FormScreen, Input } from "@/ui/primitives";
import { accountLabel } from "@/features/accounts/account-label";

export default function NewGoalScreen() {
  const router = useRouter();

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
      setError(errorMessageFor(e, "No se pudo crear."));
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nueva meta" }} />
      <FormScreen error={error} submitLabel="Guardar" onSubmit={onSave} busy={busy}>
        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Fondo de emergencia" />
        <Input label="Objetivo" value={target} onChangeText={setTarget} keyboardType="decimal-pad" />

        <ChipGroup label="Cuenta enlazada (opcional — los aportes serán transferencias reales)">
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={accountLabel(a)}
              selected={linkedId === a.id}
              onPress={() => setLinkedId(linkedId === a.id ? null : a.id)}
            />
          ))}
        </ChipGroup>
      </FormScreen>
    </>
  );
}
