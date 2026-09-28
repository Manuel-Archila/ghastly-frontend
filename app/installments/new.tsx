import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { createInstallmentPlan } from "@/data/api/commitments";
import { ApiError } from "@/data/api/client";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { generateInstallmentSchedule } from "@/domain/installments";
import { Money, parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { Button, Chip, DateField, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function NewInstallmentPlanScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [description, setDescription] = useState("");
  const [total, setTotal] = useState("");
  const [count, setCount] = useState("12");
  const [firstPaymentDate, setFirstPaymentDate] = useState(todayIso());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listAccounts().then((a) => {
      setAccounts(a);
      setAccountId(a[0]?.id ?? null);
    });
  }, []);

  const totalCents = parseCentsFromInput(total);
  const countNum = Number(count);

  const preview = useMemo(() => {
    if (totalCents === null || !Number.isInteger(countNum) || countNum < 1 || countNum > 60) {
      return [];
    }
    return generateInstallmentSchedule(totalCents, countNum, firstPaymentDate);
  }, [totalCents, countNum, firstPaymentDate]);

  async function onSave() {
    if (!description.trim() || totalCents === null || !accountId || preview.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await createInstallmentPlan({
        accountId,
        categoryId: null,
        description: description.trim(),
        totalAmountCents: totalCents,
        installmentsCount: countNum,
        firstPaymentDate,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Nuevo plan de cuotas" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Input label="Descripción" value={description} onChangeText={setDescription} placeholder="Celular" />
        <Input
          label="Monto total"
          value={total}
          onChangeText={setTotal}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Input label="Número de cuotas" value={count} onChangeText={setCount} keyboardType="number-pad" />
        <DateField
          label="Primera cuota"
          value={firstPaymentDate}
          onChange={setFirstPaymentDate}
        />

        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" color="secondary">
            Cuenta
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
            ))}
          </View>
        </View>

        {preview.length > 0 ? (
          <View style={{ gap: spacing[1] }}>
            <Text variant="caption" color="secondary">
              CALENDARIO
            </Text>
            <Text variant="caption" color="tertiary">
              Esta compra no cuenta como gasto de este mes. Solo la cuota de{" "}
              {new Money(preview[0].amountCents).format()} afecta tu presupuesto.
            </Text>
            {preview.slice(0, 4).map((e) => (
              <View key={e.number} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="caption">
                  {e.number}/{preview.length} · {e.dueDate}
                </Text>
                <Text variant="caption">{new Money(e.amountCents).format()}</Text>
              </View>
            ))}
            {preview.length > 4 ? (
              <Text variant="caption" color="tertiary">
                … +{preview.length - 4} más
              </Text>
            ) : null}
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
          disabled={busy || preview.length === 0 || !description.trim() || !accountId}
        />
      </ScrollView>
    </Screen>
  );
}
