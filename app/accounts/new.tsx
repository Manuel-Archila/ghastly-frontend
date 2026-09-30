import { useState } from "react";
import { Stack, useRouter } from "expo-router";

import { createAccountLocally } from "@/data/repositories/accounts";
import { AccountFields } from "@/features/accounts/AccountFields";
import { buildAccountInputs, emptyAccountDraft, type AccountDraft } from "@/features/accounts/account-draft";
import { triggerSync } from "@/features/sync/sync-manager";
import { FormScreen } from "@/ui/primitives";

export default function NewAccountScreen() {
  const router = useRouter();

  const [draft, setDraft] = useState<AccountDraft>(emptyAccountDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    const inputs = buildAccountInputs(draft);
    if (inputs.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const input of inputs) await createAccountLocally(input);
      triggerSync();
      router.back();
    } catch {
      setError("No se pudo guardar la cuenta. Intentá de nuevo.");
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nueva cuenta" }} />
      <FormScreen
        error={error}
        submitLabel="Guardar"
        onSubmit={onSubmit}
        busy={busy}
        submitDisabled={!draft.name.trim()}
      >
        <AccountFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      </FormScreen>
    </>
  );
}
