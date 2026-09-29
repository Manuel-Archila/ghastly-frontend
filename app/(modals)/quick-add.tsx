import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { listAccounts, type Account } from "@/data/repositories/accounts";
import {
  listCategories,
  listMostUsedExpenseCategories,
  type Category,
} from "@/data/repositories/categories";
import {
  createTransactionLocally,
  findPossibleDuplicate,
} from "@/data/repositories/transactions";
import { isMissingRequiredCategory } from "@/domain/categoryRule";
import { Money, parseCentsFromInput } from "@/domain/money";
import type { TemplateOut } from "@/data/api/templates";
import { triggerSync } from "@/features/sync/sync-manager";
import { loadCachedTemplates, refreshTemplateCache } from "@/lib/templateCache";
import { todayIso } from "@/lib/dates";
import { Button, Chip, Input, KeypadNumeric, Notice, Screen, Text } from "@/ui/primitives";
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
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [pickedCategoryId, setPickedCategoryId] = useState<string | null>(null);
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

  // Al volver a la pantalla (por ejemplo, de crear la primera categoría) se
  // recargan cuentas y categorías.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void Promise.all([
        listAccounts(),
        listMostUsedExpenseCategories(6),
        listCategories("income"),
      ]).then(([accs, expenseCats, incomeCats]) => {
        if (cancelled) return;
        setAccounts(accs);
        setExpenseCategories(expenseCats);
        setIncomeCategories(incomeCats.slice(0, 6));
        setCategoriesLoaded(true);
        setAccountId((prev) => prev ?? accs[0]?.id ?? null);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // Un gasto no puede existir sin categoría (`domain/categoryRule.ts`). Para no
  // sumar un tap, la de gasto más usada queda preseleccionada; un ingreso puede
  // no llevar ninguna. Es un valor derivado: si la elegida ya no aplica al tipo
  // (se cambió de Gasto a Ingreso), se vuelve al valor por defecto.
  const categories = kind === "expense" ? expenseCategories : incomeCategories;
  const categoryId =
    pickedCategoryId && categories.some((c) => c.id === pickedCategoryId)
      ? pickedCategoryId
      : kind === "expense"
        ? (categories[0]?.id ?? null)
        : null;

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
    // Una plantilla de gasto sin categoría no se puede guardar de un tap.
    .filter((t) => !isMissingRequiredCategory(t.kind, t.category_id))
    .slice(0, 6);

  /** Un tap: guarda el gasto ya armado y cierra. */
  async function onTemplate(t: TemplateOut) {
    if (busy) return;
    setBusy(true);
    try {
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
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setWarning("No se pudo guardar. Probá de nuevo.");
      setBusy(false);
      return;
    }
    triggerSync();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const canSave =
    cents > 0 &&
    accountId !== null &&
    !busy &&
    !isMissingRequiredCategory(kind, categoryId) &&
    (!needsFxRate || fxRate !== null);

  async function save(): Promise<boolean> {
    if (cents <= 0 || accountId === null) return false;
    setBusy(true);
    setWarning(null);

    try {
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
      }
      return true;
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setWarning("No se pudo guardar. Probá de nuevo.");
      return false;
    } finally {
      setBusy(false);
    }
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
                // Un gasto siempre lleva categoría: tocar la elegida no la quita.
                onPress={() =>
                  setPickedCategoryId(kind === "expense" || categoryId !== c.id ? c.id : null)
                }
              />
            ))}
          </View>
        ) : categoriesLoaded && kind === "expense" ? (
          // La app arranca sin categorías: hay que crear la primera antes de
          // poder guardar un gasto.
          <View style={{ gap: spacing[2] }}>
            <Notice
              tone="info"
              text="Para registrar un gasto primero necesitás una categoría. Creá la primera."
            />
            <Button
              label="Crear una categoría"
              variant="secondary"
              onPress={() => router.push("/categories/new")}
            />
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
