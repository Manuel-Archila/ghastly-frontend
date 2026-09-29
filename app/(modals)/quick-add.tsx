import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";

import { listAccounts, type Account } from "@/data/repositories/accounts";
import { listMostUsedExpenseCategories, type Category } from "@/data/repositories/categories";
import {
  createTransactionLocally,
  findPossibleDuplicate,
} from "@/data/repositories/transactions";
import { Money, parseCentsFromInput } from "@/domain/money";
import type { TemplateOut } from "@/data/api/templates";
import { triggerSync } from "@/features/sync/sync-manager";
import { loadCachedTemplates, refreshTemplateCache } from "@/lib/templateCache";
import { todayIso } from "@/lib/dates";
import { Button, Chip, Input, KeypadNumeric, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

function today(): string {
  return todayIso();
}

/**
 * Captura rápida (PLAN-frontend §6.1). Abre con el teclado propio visible;
 * chips de categoría por uso real; guardar cierra con háptico de éxito.
 * Long-press en Guardar → guardar y abrir otro.
 */
export default function QuickAddScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<"expense" | "income">(
    params.kind === "income" ? "income" : "expense",
  );
  const [cents, setCents] = useState(0);
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [chargedGtq, setChargedGtq] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [templates, setTemplates] = useState<TemplateOut[]>([]);

  // La transacción sigue SIEMPRE la moneda de la cuenta elegida — no es un
  // campo libre (evita el caso raro, que el backend permite pero rompería
  // el saldo de la cuenta, de mezclar monedas entre cuenta y transacción).
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currency = selectedAccount?.currency ?? "GTQ";
  const needsFxRate = currency !== "GTQ";
  // No le pedimos "la tasa de hoy" — nadie la sabe de memoria. Le pedimos lo
  // que SÍ ve (cuánto le debitaron en quetzales, del banco/tarjeta) y de ahí
  // sacamos la tasa nosotros: fx_rate = GTQ debitado / monto en la moneda
  // extranjera. Matemáticamente da exactamente lo mismo.
  const chargedGtqCents = parseCentsFromInput(chargedGtq);
  const fxRate = chargedGtqCents !== null && cents > 0 ? chargedGtqCents / cents : null;

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

  // Chips de plantillas: primero la caché (instantáneo, funciona sin red) y
  // en segundo plano se refresca. Solo las de una cuenta local en GTQ: en
  // otra moneda hace falta la tasa y ya no sería un tap.
  useEffect(() => {
    let cancelled = false;
    void loadCachedTemplates().then((cached) => !cancelled && setTemplates(cached));
    void refreshTemplateCache().then((fresh) => fresh && !cancelled && setTemplates(fresh));
    return () => {
      cancelled = true;
    };
  }, []);

  const usableTemplates = templates
    .filter((t) => accounts.some((a) => a.id === t.account_id && a.currency === "GTQ"))
    .slice(0, 6);

  /** Un tap: guarda el gasto ya armado y cierra. */
  async function onTemplate(t: TemplateOut) {
    if (busy) return;
    setBusy(true);
    await createTransactionLocally({
      accountId: t.account_id,
      categoryId: t.category_id,
      kind: t.kind,
      amountCents: t.amount_cents,
      date: today(),
      description: t.description ?? t.name,
      currency: "GTQ",
      templateId: t.id,
    });
    triggerSync();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const canSave = cents > 0 && accountId !== null && !busy && (!needsFxRate || fxRate !== null);

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
      currency,
      fxRate: needsFxRate && fxRate !== null ? fxRate : undefined,
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
      setChargedGtq("");
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
            {/* La transferencia tiene su propia pantalla (dos cuentas, sin categoría). */}
            <Chip label="Transferencia" onPress={() => router.replace("/(modals)/transfer")} />
          </View>
          <Button label="Cerrar" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        </View>

        {usableTemplates.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              {usableTemplates.map((t) => (
                <Chip
                  key={t.id}
                  label={`${t.name} · ${new Money(t.amount_cents).format()}`}
                  accessibilityLabel={`Guardar ${t.name}, ${new Money(t.amount_cents).format()}`}
                  disabled={busy}
                  onPress={() => void onTemplate(t)}
                />
              ))}
            </View>
          </ScrollView>
        ) : null}

        <View style={{ alignItems: "center", paddingVertical: spacing[3] }}>
          <Text
            variant="display"
            style={{ color: kind === "expense" ? colors.expense.fg : colors.income.fg }}
          >
            {new Money(Math.abs(cents), currency).format()}
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

        {needsFxRate ? (
          <Input
            label="¿Cuánto te debitaron en quetzales? (del banco o la tarjeta)"
            value={chargedGtq}
            onChangeText={setChargedGtq}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        ) : null}

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
