import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { createRecurringRule } from "@/data/api/commitments";
import { ApiError } from "@/data/api/client";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { listCategories, type Category } from "@/data/repositories/categories";
import { parseCentsFromInput } from "@/domain/money";
import { frequencyLabel } from "@/features/subscriptions/frequency-label";
import { addDays, todayIso } from "@/lib/dates";
import { Chip, ChipGroup, DateField, FormScreen, Input, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const FREQUENCIES = ["monthly", "weekly", "quarterly", "yearly"] as const;

export default function NewSubscriptionScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();
  const quickDates = [
    { label: "Hoy", days: 0 },
    { label: "En 7 días", days: 7 },
    { label: "En 15 días", days: 15 },
    { label: "En 30 días", days: 30 },
  ];

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [chargedGtq, setChargedGtq] = useState("");
  const [nextDueDate, setNextDueDate] = useState(todayIso());
  const [autoCreate, setAutoCreate] = useState(false);
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
        nextDueDate,
        autoCreate,
        reminderDaysBefore: 2,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear.");
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nueva suscripción" }} />
      <FormScreen
        error={error}
        submitLabel="Guardar"
        onSubmit={onSave}
        busy={busy}
        submitDisabled={!name.trim() || cents === null || !accountId || !fxRateValid}
      >
        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Netflix" />
        <Input
          label="Monto"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <ChipGroup label="Frecuencia">
          {FREQUENCIES.map((f) => (
            <Chip key={f} label={frequencyLabel(f)} selected={frequency === f} onPress={() => setFrequency(f)} />
          ))}
        </ChipGroup>

        <DateField label="Próximo cobro" value={nextDueDate} onChange={setNextDueDate} />
        <ChipGroup>
          {quickDates.map(({ label, days }) => {
            const date = addDays(todayIso(), days);
            return (
              <Chip
                key={label}
                label={label}
                selected={nextDueDate === date}
                onPress={() => setNextDueDate(date)}
              />
            );
          })}
        </ChipGroup>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, paddingRight: spacing[3] }}>
            <Text variant="body">Cobrarse sola</Text>
            <Text variant="caption" color="secondary">
              {autoCreate
                ? "Se registra el gasto solo cada vez que toca, sin avisar."
                : "Solo avisa; tú confirmás el gasto cada vez que te cobren."}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Cobrarse sola"
            value={autoCreate}
            onValueChange={setAutoCreate}
            trackColor={{ false: colors.border.control, true: colors.accent.bg }}
          />
        </View>

        {accounts.length === 0 ? (
          <Text variant="body" color="secondary">
            Necesitás una cuenta primero. Creá una desde &ldquo;Más&rdquo;.
          </Text>
        ) : (
          <ChipGroup label="Cuenta">
            {accounts.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={accountId === a.id}
                onPress={() => setAccountId(a.id)}
              />
            ))}
          </ChipGroup>
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
          <ChipGroup label="Categoría">
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
              />
            ))}
          </ChipGroup>
        ) : null}
      </FormScreen>
    </>
  );
}
