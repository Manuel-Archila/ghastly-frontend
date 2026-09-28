import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  confirmRecurringRule,
  deleteRecurringRule,
  pauseRecurringRule,
  resumeRecurringRule,
  skipNextRecurringRule,
  updateRecurringRule,
} from "@/data/api/commitments";
import { errorMessageFor } from "@/data/api/error-messages";
import { listCategories, type Category } from "@/data/repositories/categories";
import { getRecurringRule, type RecurringRule } from "@/data/repositories/commitments";
import { parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { confirmDestructive } from "@/ui/confirm";
import { Button, Chip, DateField, Input, Notice, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [rule, setRule] = useState<RecurringRule | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [reminderDays, setReminderDays] = useState("2");
  const [confirmDate, setConfirmDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await getRecurringRule(id);
    if (!r) return;
    setRule(r);
    setName(r.name);
    setAmount((r.amountCents / 100).toFixed(2));
    setCategoryId(r.categoryId);
    setReminderDays(String(r.reminderDaysBefore));
    setCategories(await listCategories(r.kind as "expense" | "income"));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!rule) {
    return (
      <Screen style={{ paddingTop: spacing[4] }}>
        <Stack.Screen options={{ title: "Suscripción" }} />
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  const cents = parseCentsFromInput(amount);
  const reminderDaysNum = Number(reminderDays);
  const reminderValid = Number.isInteger(reminderDaysNum) && reminderDaysNum >= 0;

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(errorMessageFor(e, `No se pudo ${label}.`));
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!rule || !name.trim() || cents === null || !reminderValid) return;
    await run("guardar", async () => {
      await updateRecurringRule(rule.id, {
        name: name.trim(),
        categoryId,
        amountCents: cents!,
        reminderDaysBefore: reminderDaysNum,
      });
    });
  }

  async function onTogglePause() {
    if (!rule) return;
    await run(rule.status === "active" ? "pausar" : "reanudar", () =>
      rule.status === "active" ? pauseRecurringRule(rule.id) : resumeRecurringRule(rule.id),
    );
  }

  async function onSkipNext() {
    if (!rule) return;
    const ok = await confirmDestructive(
      "Saltar próxima ocurrencia",
      `La próxima fecha pasa a la siguiente después de ${rule.nextDueDate}. No se crea ningún movimiento.`,
      "Saltar",
    );
    if (!ok) return;
    await run("saltar", () => skipNextRecurringRule(rule.id));
  }

  async function onConfirm() {
    if (!rule) return;
    await run("confirmar", () => confirmRecurringRule(rule.id, confirmDate));
  }

  async function onDelete() {
    if (!rule) return;
    const ok = await confirmDestructive(
      `Eliminar ${rule.name}`,
      "Se deja de cobrar. Los movimientos que ya generó se conservan.",
      "Eliminar",
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteRecurringRule(rule.id);
      router.back();
    } catch (e) {
      setError(errorMessageFor(e, "No se pudo eliminar."));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: rule.name }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4], paddingBottom: spacing[8] }}>
        {rule.status === "paused" ? <Notice text="Esta suscripción está pausada." /> : null}

        <Input label="Nombre" value={name} onChangeText={setName} />
        <Input
          label={`Monto (${rule.currency})`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
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

        <Input
          label="Avisar con cuántos días de anticipación"
          value={reminderDays}
          onChangeText={setReminderDays}
          keyboardType="number-pad"
        />

        {error ? (
          <Text variant="caption" style={{ color: colors.danger.fg }}>
            {error}
          </Text>
        ) : null}

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={busy || !name.trim() || cents === null || !reminderValid} />

        <View style={{ gap: spacing[3], paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border.subtle }}>
          <Text variant="caption" color="secondary">
            Próximo cobro: {rule.nextDueDate}
          </Text>

          {!rule.autoCreate && rule.status === "active" ? (
            <View style={{ gap: spacing[2] }}>
              <DateField label="Confirmar cobro del" value={confirmDate} onChange={setConfirmDate} />
              <Button
                label="Confirmar cobro (crea el movimiento)"
                variant="secondary"
                onPress={onConfirm}
                disabled={busy}
              />
            </View>
          ) : null}

          <Button
            label={rule.status === "active" ? "Pausar" : "Reanudar"}
            variant="secondary"
            onPress={onTogglePause}
            disabled={busy}
          />
          {rule.status === "active" ? (
            <Button label="Saltar próxima ocurrencia" variant="secondary" onPress={onSkipNext} disabled={busy} />
          ) : null}
          <Button label="Eliminar suscripción" variant="danger" onPress={onDelete} disabled={busy} />
        </View>
      </ScrollView>
    </Screen>
  );
}
