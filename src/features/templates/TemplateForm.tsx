import { useEffect, useState } from "react";
import { View } from "react-native";

import { listAccounts, type Account } from "@/data/repositories/accounts";
import { isMissingRequiredCategory } from "@/domain/categoryRule";
import { parseCentsFromInput } from "@/domain/money";
import { CategoryPicker } from "@/features/categories/CategoryPicker";
import { Button, Input, Notice, SegmentedControl, Select } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";
import { accountLabel } from "@/features/accounts/account-label";

export interface TemplateFormValues {
  name: string;
  kind: "expense" | "income";
  accountId: string | null;
  categoryId: string | null;
  amount: string;
  description: string;
}

export interface TemplateSubmit {
  name: string;
  kind: "expense" | "income";
  accountId: string;
  categoryId: string | null;
  amountCents: number;
  description: string | null;
}

export function TemplateForm({
  initial,
  submitLabel,
  busy,
  error,
  onSubmit,
}: {
  initial: TemplateFormValues;
  submitLabel: string;
  busy: boolean;
  error?: string | null;
  onSubmit: (values: TemplateSubmit) => void;
}) {
  const { spacing } = useTokens();
  const [values, setValues] = useState(initial);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    void listAccounts().then(setAccounts);
  }, []);

  function submit() {
    const cents = parseCentsFromInput(values.amount);
    if (values.name.trim() === "") return setLocalError("Poné un nombre.");
    if (!values.accountId) return setLocalError("Elegí una cuenta.");
    if (cents === null || cents <= 0) return setLocalError("Poné un monto mayor a cero.");
    if (isMissingRequiredCategory(values.kind, values.categoryId)) {
      return setLocalError("Elegí una categoría para el gasto.");
    }
    setLocalError(null);
    onSubmit({
      name: values.name.trim(),
      kind: values.kind,
      accountId: values.accountId,
      categoryId: values.categoryId,
      amountCents: cents,
      description: values.description.trim() === "" ? null : values.description.trim(),
    });
  }

  const shown = localError ?? error ?? null;

  return (
    <View style={{ gap: spacing[4] }}>
      <Input
        label="Nombre"
        value={values.name}
        onChangeText={(name) => setValues((p) => ({ ...p, name }))}
      />

      <SegmentedControl
        options={[
          { value: "expense", label: "Gasto" },
          { value: "income", label: "Ingreso" },
        ]}
        value={values.kind}
        // Cambiar el tipo invalida la categoría elegida (el servidor la revalida).
        onChange={(kind) => setValues((p) => ({ ...p, kind, categoryId: null }))}
      />

      <Input
        label="Monto"
        value={values.amount}
        onChangeText={(amount) => setValues((p) => ({ ...p, amount }))}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      <Select
        label="Cuenta"
        value={values.accountId}
        options={accounts.map((a) => ({ value: a.id, label: accountLabel(a) }))}
        onChange={(accountId) => setValues((p) => ({ ...p, accountId }))}
      />

      <CategoryPicker
        kind={values.kind}
        value={values.categoryId}
        onChange={(categoryId) => setValues((p) => ({ ...p, categoryId }))}
      />

      <Input
        label="Descripción (opcional)"
        value={values.description}
        onChangeText={(description) => setValues((p) => ({ ...p, description }))}
      />

      {shown ? <Notice tone="danger" text={shown} /> : null}
      <Button label={busy ? "Guardando…" : submitLabel} onPress={submit} disabled={busy} />
    </View>
  );
}
