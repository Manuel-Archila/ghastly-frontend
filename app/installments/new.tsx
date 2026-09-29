import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { createInstallmentPlan } from "@/data/api/commitments";
import { errorMessageFor } from "@/data/api/error-messages";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { generateInstallmentSchedule } from "@/domain/installments";
import { Money, parseCentsFromInput } from "@/domain/money";
import { formatDateLabel, todayIso } from "@/lib/dates";
import {
  Chip,
  ChipGroup,
  DateField,
  FormScreen,
  Input,
  SectionHeader,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function NewInstallmentPlanScreen() {
  const router = useRouter();
  const { spacing } = useTokens();

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
      setError(errorMessageFor(e, "No se pudo crear."));
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nuevo plan de cuotas" }} />
      <FormScreen
        error={error}
        submitLabel="Guardar"
        onSubmit={onSave}
        busy={busy}
        submitDisabled={preview.length === 0 || !description.trim() || !accountId}
      >
        <Input label="Descripción" value={description} onChangeText={setDescription} placeholder="Celular" />
        <Input
          label="Monto total"
          value={total}
          onChangeText={setTotal}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Input label="Número de cuotas" value={count} onChangeText={setCount} keyboardType="number-pad" />
        <DateField label="Primera cuota" value={firstPaymentDate} onChange={setFirstPaymentDate} />

        <ChipGroup label="Cuenta">
          {accounts.map((a) => (
            <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
          ))}
        </ChipGroup>

        {preview.length > 0 ? (
          <View style={{ gap: spacing[1] }}>
            <SectionHeader label="Calendario" />
            <Text variant="caption" color="secondary">
              Esta compra no cuenta como gasto de este mes. Solo la cuota de{" "}
              {new Money(preview[0].amountCents).format()} afecta tu presupuesto.
            </Text>
            {preview.slice(0, 4).map((e) => (
              <View key={e.number} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="caption">
                  {e.number}/{preview.length} · {formatDateLabel(e.dueDate)}
                </Text>
                <Text variant="caption">{new Money(e.amountCents).format()}</Text>
              </View>
            ))}
            {preview.length > 4 ? (
              <Text variant="caption" color="secondary">
                … +{preview.length - 4} más
              </Text>
            ) : null}
          </View>
        ) : null}
      </FormScreen>
    </>
  );
}
