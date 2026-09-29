import { useCallback, useState } from "react";
import { Switch, View } from "react-native";
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
import { getRecurringRule, type RecurringRule } from "@/data/repositories/commitments";
import { parseCentsFromInput } from "@/domain/money";
import { formatDateLabel, todayIso } from "@/lib/dates";
import { isMissingRequiredCategory } from "@/domain/categoryRule";
import { CategoryPicker } from "@/features/categories/CategoryPicker";
import { deferDelete } from "@/features/undo/deferred-delete";
import { confirmDestructive } from "@/ui/confirm";
import {
  Button,
  DateField,
  DetailRow,
  Input,
  Notice,
  Screen,
  ScreenState,
  ScrollScreen,
  SectionHeader,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [rule, setRule] = useState<RecurringRule | undefined>();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [autoCreate, setAutoCreate] = useState(false);
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
    setAutoCreate(r.autoCreate);
    setReminderDays(String(r.reminderDaysBefore));
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
        <ScreenState status="loading" skeleton="detail">{null}</ScreenState>
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
    if (isMissingRequiredCategory(rule.kind, categoryId)) return;
    await run("guardar", async () => {
      await updateRecurringRule(rule.id, {
        name: name.trim(),
        // No se puede quitar la categoría de un gasto (`domain/categoryRule.ts`).
        categoryId: categoryId ?? undefined,
        amountCents: cents!,
        autoCreate,
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
      `La próxima fecha pasa a la siguiente después de ${formatDateLabel(rule.nextDueDate)}. No se crea ningún movimiento.`,
      "Saltar",
    );
    if (!ok) return;
    await run("saltar", () => skipNextRecurringRule(rule.id));
  }

  async function onConfirm() {
    if (!rule) return;
    await run("confirmar", () => confirmRecurringRule(rule.id, confirmDate));
  }

  function onDelete() {
    if (!rule) return;
    // Sin diálogo: se oculta ya y el aviso ofrece Deshacer. El API se llama
    // cuando expira. Los movimientos que ya generó se conservan.
    const target = rule;
    deferDelete({
      entity: "subscription",
      id: target.id,
      message: `${target.name} eliminada`,
      failureMessage: "No se pudo eliminar la suscripción.",
      perform: () => deleteRecurringRule(target.id),
    });
    router.back();
  }

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: rule.name }} />
      {rule.status === "paused" ? <Notice tone="info" text="Esta suscripción está pausada." /> : null}

      <Input label="Nombre" value={name} onChangeText={setName} />
      <Input
        label={`Monto (${rule.currency})`}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <CategoryPicker
        kind={rule.kind as "expense" | "income"}
        value={categoryId}
        onChange={setCategoryId}
      />

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

      <Input
        label="Avisar con cuántos días de anticipación"
        value={reminderDays}
        onChangeText={setReminderDays}
        keyboardType="number-pad"
      />

      {error ? <Notice tone="danger" text={error} /> : null}

      <Button
        label={busy ? "Guardando…" : "Guardar"}
        onPress={onSave}
        disabled={
          busy ||
          !name.trim() ||
          cents === null ||
          !reminderValid ||
          isMissingRequiredCategory(rule.kind, categoryId)
        }
      />

      <View style={{ gap: spacing[3] }}>
        <SectionHeader label="Cobros" />
        <DetailRow label="Próximo cobro" value={formatDateLabel(rule.nextDueDate)} />

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
    </ScrollScreen>
  );
}
