import { useState } from "react";
import { Stack, useRouter } from "expo-router";

import { createDebt } from "@/data/api/commitments";
import { errorMessageFor } from "@/data/api/error-messages";
import { parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { FormScreen, Input } from "@/ui/primitives";

export default function NewDebtScreen() {
  const router = useRouter();

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
      setError(errorMessageFor(e, "No se pudo crear."));
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nueva deuda" }} />
      <FormScreen error={error} submitLabel="Guardar" onSubmit={onSave} busy={busy}>
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
      </FormScreen>
    </>
  );
}
