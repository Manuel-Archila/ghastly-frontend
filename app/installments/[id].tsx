import { useCallback, useState } from "react";
import { View } from "react-native";
import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { deleteInstallmentPlan, payInstallment, updateInstallmentPlan } from "@/data/api/commitments";
import { errorMessageFor } from "@/data/api/error-messages";
import { listCategories, type Category } from "@/data/repositories/categories";
import {
  getInstallmentPlan,
  listInstallmentsForPlan,
  type Installment,
  type InstallmentPlan,
} from "@/data/repositories/commitments";
import { Money } from "@/domain/money";
import { formatDateLabel, todayIso } from "@/lib/dates";
import { deferDelete } from "@/features/undo/deferred-delete";
import {
  Button,
  Chip,
  ChipGroup,
  FadeIn,
  HeroFigure,
  Icon,
  Input,
  ListItem,
  MoneyText,
  Notice,
  Screen,
  ScreenState,
  ScrollScreen,
  SectionHeader,
  Text,
} from "@/ui/primitives";
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
      setError(errorMessageFor(e, "No se pudo pagar."));
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

  function onCancelPlan() {
    if (!plan) return;
    // Sin diálogo: se oculta ya y el aviso ofrece Deshacer. El API se llama
    // cuando expira; ahí las cuotas pendientes se eliminan y las que ya
    // pagaste quedan como historial.
    const target = plan;
    deferDelete({
      entity: "installment-plan",
      id: target.id,
      message: `Plan "${target.description}" cancelado`,
      failureMessage: "No se pudo cancelar el plan.",
      perform: () => deleteInstallmentPlan(target.id),
    });
    router.back();
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
    <ScrollScreen>
      <Stack.Screen options={{ title: plan.description }} />
      <HeroFigure label="Saldo pendiente" value={new Money(pendingTotal).format()} />

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
      {error ? <Notice tone="danger" text={error} /> : null}

      <View>
        <SectionHeader label="Cuotas" />
        {rows.map((r, index) => (
          <FadeIn key={r.id} delay={index * 20}>
            <ListItem
              icon={r.status === "paid" ? "checkmark-circle-outline" : "time-outline"}
              title={`Cuota ${r.number} de ${plan.installmentsCount}`}
              subtitle={`${formatDateLabel(r.dueDate)} · ${r.status === "paid" ? "pagada" : "pendiente"}`}
              trailing={<MoneyText cents={r.amountCents} />}
              last={index === rows.length - 1}
            />
          </FadeIn>
        ))}
      </View>

      <View style={{ gap: spacing[4] }}>
        <SectionHeader label="Detalles del plan" />
        <Input label="Descripción" value={description} onChangeText={setDescription} />
        <Input label="Comercio" value={merchant} onChangeText={setMerchant} placeholder="Opcional" />

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

        <Button
          label={busy ? "Guardando…" : "Guardar"}
          variant="secondary"
          onPress={onSave}
          disabled={busy || !description.trim()}
        />
        <Button label="Cancelar plan" variant="danger" onPress={onCancelPlan} disabled={busy} />
      </View>
    </ScrollScreen>
  );
}
