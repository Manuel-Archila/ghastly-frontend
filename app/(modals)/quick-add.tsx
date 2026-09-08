import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { listAccounts, type Account } from "@/data/repositories/accounts";
import { listMostUsedExpenseCategories, type Category } from "@/data/repositories/categories";
import {
  createTransactionLocally,
  findPossibleDuplicate,
} from "@/data/repositories/transactions";
import { Money } from "@/domain/money";
import { triggerSync } from "@/features/sync/sync-manager";
import { Button, Chip, Input, KeypadNumeric, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Captura rápida (PLAN-frontend §6.1). Abre con el teclado propio visible;
 * chips de categoría por uso real; guardar cierra con háptico de éxito.
 * Long-press en Guardar → guardar y abrir otro.
 */
export default function QuickAddScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [cents, setCents] = useState(0);
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listAccounts(), listMostUsedExpenseCategories(6)]).then(([accs, cats]) => {
      if (cancelled) return;
      setAccounts(accs);
      setCategories(cats);
      setAccountId((prev) => prev ?? accs[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = cents > 0 && accountId !== null && !busy;

  async function save(): Promise<boolean> {
    if (cents <= 0 || accountId === null) return false;
    setBusy(true);
    setWarning(null);

    const dup = await findPossibleDuplicate(accountId, cents);
    await createTransactionLocally({
      accountId,
      categoryId,
      kind,
      amountCents: cents,
      date: today(),
      description: description.trim() || null,
    });
    triggerSync();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (dup) {
      setWarning(`¿Repetido? Registraste ${new Money(cents).format()} hace unos minutos.`);
      setBusy(false);
      return true;
    }
    setBusy(false);
    return true;
  }

  async function onSave() {
    if (await save()) router.back();
  }

  async function onSaveAndNext() {
    if (await save()) {
      setCents(0);
      setDescription("");
      setResetKey((k) => k + 1);
    }
  }

  return (
    <Screen style={{ paddingTop: spacing[4] }}>
      <ScrollView
        contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <Chip label="Gasto" selected={kind === "expense"} onPress={() => setKind("expense")} />
            <Chip label="Ingreso" selected={kind === "income"} onPress={() => setKind("income")} />
          </View>
          <Button label="Cerrar" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        </View>

        <View style={{ alignItems: "center", paddingVertical: spacing[3] }}>
          <Text
            variant="display"
            style={{ color: kind === "expense" ? colors.expense.fg : colors.income.fg }}
          >
            {new Money(Math.abs(cents)).format()}
          </Text>
        </View>

        {categories.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
              />
            ))}
          </View>
        ) : null}

        {accounts.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {accounts.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={accountId === a.id}
                onPress={() => setAccountId(a.id)}
              />
            ))}
          </View>
        ) : (
          <Text variant="body" color="secondary">
            Primero creá una cuenta desde la pestaña Hoy.
          </Text>
        )}

        <Input
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Súper, Uber…"
        />

        <KeypadNumeric key={resetKey} onChange={setCents} />

        {warning ? (
          <Text variant="caption" style={{ color: colors.warning.fg }}>
            {warning}
          </Text>
        ) : null}

        <Button
          label={busy ? "Guardando…" : "Guardar"}
          onPress={onSave}
          onLongPress={onSaveAndNext}
          disabled={!canSave}
        />
        <Text variant="caption" color="tertiary" style={{ textAlign: "center" }}>
          Mantené presionado Guardar para registrar otro seguido
        </Text>
      </ScrollView>
    </Screen>
  );
}
