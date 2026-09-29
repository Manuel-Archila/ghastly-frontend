import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { deleteInstallmentPlan, payInstallment, updateInstallmentPlan } from "@/data/api/commitments";
import { ApiError } from "@/data/api/client";
import { errorMessageFor } from "@/data/api/error-messages";
import { listCategories, type Category } from "@/data/repositories/categories";
import {
  getInstallmentPlan,
  listInstallmentsForPlan,
  type Installment,
  type InstallmentPlan,
} from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { confirmDestructive } from "@/ui/confirm";
import { Button, Chip, FadeIn, Icon, Input, Screen, ScreenState, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function InstallmentPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [plan, setPlan] = useState<InstallmentPlan | undefined>();
  const [rows, setRows] = useState<Installment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, list, cats] = await Promise.all([
      getInstallmentPlan(id),
      listInstallmentsForPlan(id),
      listCategories("expense"),
    ]);
    setPlan(p);
    setRows(list);
    setCategories(cats);
    if (p) {
      setDescription(p.description);
      setMerchant(p.merchant ?? "");
      setCategoryId(p.categoryId);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pending = rows.filter((r) => r.status === "pending");
  const pendingTotal = pending.reduce((s, r) => s + r.amountCents, 0);
  const nextDue = pending[0];

  async function onPay() {
    if (!nextDue) return;
    setBusy(true);
    setError(null);
    try {
      await payInstallment(nextDue.id, todayIso());
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : "No se pudo pagar.");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!plan || !description.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateInstallmentPlan(plan.id, {
        description: description.trim(),
        merchant: merchant.trim() || null,
        categoryId,
      });
      await load();
    } catch (e) {
      setError(errorMessageFor(e, "No se pudo guardar."));
    } finally {
      setBusy(false);
    }
  }

  async function onCancelPlan() {
    if (!plan) return;
    const ok = await confirmDestructive(
      "Cancelar plan de cuotas",
      "Las cuotas pendientes se eliminan; las que ya pagaste quedan como historial.",
      "Cancelar plan",
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await deleteInstallmentPlan(plan.id);
      router.back();
    } catch (e) {
      setError(errorMessageFor(e, "No se pudo cancelar."));
      setBusy(false);
    }
  }

  if (!plan) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Plan de cuotas" }} />
        <ScreenState status="loading" skeleton="detail">{null}</ScreenState>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: plan.description }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <View>
          <Text variant="caption" color="secondary">
            Saldo pendiente
          </Text>
          <Text variant="display">{new Money(pendingTotal).format()}</Text>
        </View>

        {nextDue ? (
          <Button
            label={busy ? "Registrando…" : `Pagar cuota ${nextDue.number} · ${new Money(nextDue.amountCents).format()}`}
            onPress={onPay}
            disabled={busy}
          />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <Icon name="sparkles-outline" color={colors.income.fg} />
            <Text variant="body" color="secondary">
              Todas las cuotas pagadas
            </Text>
          </View>
        )}
        {error ? (
          <Text variant="caption" style={{ color: colors.danger.fg }}>
            {error}
          </Text>
        ) : null}

        <View style={{ gap: spacing[1] }}>
          {rows.map((r, index) => (
            <FadeIn key={r.id} delay={index * 20}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: spacing[1],
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
                  {r.status === "paid" ? (
                    <Icon name="checkmark-circle-outline" size={16} color={colors.text.tertiary} />
                  ) : null}
                  <Text
                    variant="body"
                    style={{
                      color: r.status === "paid" ? colors.text.tertiary : colors.text.primary,
                    }}
                  >
                    {r.number}/{plan.installmentsCount} · {r.dueDate}
                  </Text>
                </View>
                <Text
                  variant="bodyStrong"
                  style={{ color: r.status === "paid" ? colors.text.tertiary : colors.text.primary }}
                >
                  {new Money(r.amountCents).format()}
                </Text>
              </View>
            </FadeIn>
          ))}
        </View>

        <View style={{ gap: spacing[4], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border.subtle }}>
          <Input label="Descripción" value={description} onChangeText={setDescription} />
          <Input label="Comercio" value={merchant} onChangeText={setMerchant} placeholder="Opcional" />

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

          <Button
            label={busy ? "Guardando…" : "Guardar"}
            variant="secondary"
            onPress={onSave}
            disabled={busy || !description.trim()}
          />
          <Button label="Cancelar plan" variant="danger" onPress={onCancelPlan} disabled={busy} />
        </View>
      </ScrollView>
    </Screen>
  );
}
