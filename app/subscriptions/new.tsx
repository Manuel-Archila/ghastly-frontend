import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { createRecurringRule } from "@/data/api/commitments";
import { ApiError } from "@/data/api/client";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { listCategories, type Category } from "@/data/repositories/categories";
import { parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { Button, Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const FREQUENCIES = ["monthly", "weekly", "quarterly", "yearly"] as const;

export default function NewSubscriptionScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [chargedGtq, setChargedGtq] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [a, c] = await Promise.all([listAccounts(), listCategories("expense")]);
      setAccounts(a);
      setCategories(c);
      setAccountId(a[0]?.id ?? null);
    })();
  }, []);

  const cents = parseCentsFromInput(amount);
  // Sigue la moneda de la cuenta elegida — no es un campo libre (mismo
  // criterio que la captura rápida).
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? "GTQ";
  const needsFxRate = currency !== "GTQ";
  // No pedimos "la tasa de hoy" — se pide lo que el usuario ya vio en su
  // último cobro (banco/tarjeta) y de ahí se calcula la tasa (mismo
  // criterio que la captura rápida, ver quick-add.tsx).
  const chargedGtqCents = parseCentsFromInput(chargedGtq);
  const fxRate = chargedGtqCents !== null && cents !== null && cents > 0
    ? chargedGtqCents / cents
    : null;
  const fxRateValid = !needsFxRate || fxRate !== null;

  async function onSave() {
    if (!name.trim() || cents === null || !accountId || !fxRateValid) return;
    setBusy(true);
    setError(null);
    try {
      await createRecurringRule({
        accountId,
        categoryId,
        kind: "expense",
        name: name.trim(),
        amountCents: cents,
        currency,
        fxRate: needsFxRate && fxRate !== null ? fxRate : undefined,
        frequency,
        nextDueDate: todayIso(),
        autoCreate: false,
        reminderDaysBefore: 2,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Nueva suscripción" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Netflix" />
        <Input
          label="Monto"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" color="secondary">
            Frecuencia
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {FREQUENCIES.map((f) => (
              <Chip key={f} label={f} selected={frequency === f} onPress={() => setFrequency(f)} />
            ))}
          </View>
        </View>

        {accounts.length === 0 ? (
          <Text variant="body" color="secondary">
            Necesitás una cuenta primero. Creá una desde &ldquo;Más&rdquo;.
          </Text>
        ) : (
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
        )}

        {needsFxRate ? (
          <Input
            label="¿Cuánto te cobraron en quetzales la última vez? (banco o tarjeta)"
            value={chargedGtq}
            onChangeText={setChargedGtq}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        ) : null}

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

        {error ? (
          <Text variant="caption" style={{ color: colors.danger.fg }}>
            {error}
          </Text>
        ) : null}

        <Button
          label={busy ? "Guardando…" : "Guardar"}
          onPress={onSave}
          disabled={busy || !name.trim() || cents === null || !accountId || !fxRateValid}
        />
      </ScrollView>
    </Screen>
  );
}
