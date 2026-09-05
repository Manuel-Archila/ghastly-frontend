import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { listAccounts, type Account } from "@/data/repositories/accounts";
import { listMostUsedExpenseCategories, type Category } from "@/data/repositories/categories";
import {
  createTransactionLocally,
  findPossibleDuplicate,
} from "@/data/repositories/transactions";
import { Money, parseCentsFromInput } from "@/domain/money";
import { Button, Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Captura rápida — versión funcional de Fase 1. El teclado numérico
 * propio, los háptics y el "guardar y abrir otro" del wireframe
 * (PLAN-frontend §6.1) llegan en el pulido de UI; acá está la ruta de
 * datos completa: escribe local + encola outbox, se actualiza al
 * instante, advierte duplicado sin bloquear.
 */
export default function QuickAddScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [accs, cats] = await Promise.all([
        listAccounts(),
        listMostUsedExpenseCategories(6),
      ]);
      setAccounts(accs);
      setCategories(cats);
      setAccountId(accs[0]?.id ?? null);
    })();
  }, []);

  const cents = parseCentsFromInput(amount);
  const canSave = cents !== null && accountId !== null && !busy;

  async function onSave() {
    if (cents === null || accountId === null) return;
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

    if (dup) {
      setWarning(`¿Repetido? Registraste ${new Money(cents).format()} hace unos minutos.`);
      setBusy(false);
      return;
    }
    router.back();
  }

  return (
    <Screen style={{ paddingTop: spacing[4] }}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <Chip label="Gasto" selected={kind === "expense"} onPress={() => setKind("expense")} />
            <Chip label="Ingreso" selected={kind === "income"} onPress={() => setKind("income")} />
          </View>
          <Button label="Cerrar" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        </View>

        <View style={{ alignItems: "center", paddingVertical: spacing[4] }}>
          <Text
            variant="display"
            style={{ color: kind === "expense" ? colors.expense.fg : colors.income.fg }}
          >
            {cents !== null ? new Money(cents).format() : "Q 0.00"}
          </Text>
        </View>

        <Input
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          autoFocus
          placeholder="Monto"
          style={{ textAlign: "center" }}
        />

        {categories.length > 0 ? (
          <View style={{ gap: spacing[2] }}>
            <Text variant="caption" color="secondary">
              Categoría
            </Text>
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
          </View>
        ) : null}

        {accounts.length > 0 ? (
          <View style={{ gap: spacing[2] }}>
            <Text variant="caption" color="secondary">
              Cuenta
            </Text>
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

        {warning ? (
          <Text variant="caption" style={{ color: colors.warning.fg }}>
            {warning}
          </Text>
        ) : null}

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={!canSave} />
      </ScrollView>
    </Screen>
  );
}
