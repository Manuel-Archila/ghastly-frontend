import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { recordDebtPayment } from "@/data/api/commitments";
import { ApiError, api } from "@/data/api/client";
import { getDebt, type Debt } from "@/data/repositories/commitments";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { Money, parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { Button, Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

interface AmortRow {
  number: number;
  payment_cents: number;
  principal_cents: number;
  interest_cents: number;
  remaining_balance_cents: number;
}

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [debt, setDebt] = useState<Debt | undefined>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [amort, setAmort] = useState<AmortRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setDebt(await getDebt(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void listAccounts().then((a) => {
      setAccounts(a);
      setFromId(a[0]?.id ?? null);
    });
    void api
      .get<{ rows: AmortRow[] }>(`/debts/${id}/amortization`)
      .then((d) => setAmort(d.rows))
      .catch(() => setAmort([]));
  }, [id]);

  async function onPay() {
    const cents = parseCentsFromInput(amount);
    if (cents === null || !fromId) return;
    setBusy(true);
    setError(null);
    try {
      await recordDebtPayment(id, {
        fromAccountId: fromId,
        dateIso: todayIso(),
        totalCents: cents,
        feesCents: 0,
      });
      setAmount("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo registrar.");
    } finally {
      setBusy(false);
    }
  }

  if (!debt) {
    return (
      <Screen style={{ paddingTop: spacing[5] }}>
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingTop: spacing[5] }}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Button label="Volver" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        <Text variant="title1">{debt.name}</Text>
        <View>
          <Text variant="caption" color="secondary">
            Saldo
          </Text>
          <Text variant="display" style={{ color: colors.expense.fg }}>
            {new Money(debt.balanceCents).format()}
          </Text>
        </View>

        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" color="secondary">
            Registrar pago (el interés se separa solo)
          </Text>
          <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Monto del pago" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} selected={fromId === a.id} onPress={() => setFromId(a.id)} />
            ))}
          </View>
          {error ? (
            <Text variant="caption" style={{ color: colors.danger.fg }}>
              {error}
            </Text>
          ) : null}
          <Button label={busy ? "Registrando…" : "Registrar pago"} onPress={onPay} disabled={busy} />
        </View>

        {amort.length > 0 ? (
          <View style={{ gap: spacing[1] }}>
            <Text variant="caption" color="secondary">
              PLAN DE AMORTIZACIÓN
            </Text>
            {amort.slice(0, 6).map((r) => (
              <View key={r.number} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="caption">
                  #{r.number} · cap {new Money(r.principal_cents).format()} · int{" "}
                  {new Money(r.interest_cents).format()}
                </Text>
                <Text variant="caption">{new Money(r.remaining_balance_cents).format()}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
