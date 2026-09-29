import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";

import { recordDebtPayment } from "@/data/api/commitments";
import { errorMessageFor } from "@/data/api/error-messages";
import { api } from "@/data/api/client";
import { getDebt, type Debt } from "@/data/repositories/commitments";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { Money, parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import {
  Button,
  Chip,
  ChipGroup,
  HeroFigure,
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

interface AmortRow {
  number: number;
  payment_cents: number;
  principal_cents: number;
  interest_cents: number;
  remaining_balance_cents: number;
}

const AMORT_PREVIEW_ROWS = 6;

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing } = useTokens();

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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(errorMessageFor(e, "No se pudo registrar."));
    } finally {
      setBusy(false);
    }
  }

  if (!debt) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Deuda" }} />
        <ScreenState status="loading" skeleton="detail">{null}</ScreenState>
      </Screen>
    );
  }

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: debt.name }} />
      <HeroFigure label="Saldo" value={new Money(debt.balanceCents).format()} />

      <View style={{ gap: spacing[3] }}>
        <SectionHeader label="Registrar pago" />
        <Text variant="caption" color="secondary">
          El interés se separa solo.
        </Text>
        <Input
          label="Monto del pago"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <ChipGroup label="Pagar desde">
          {accounts.map((a) => (
            <Chip key={a.id} label={a.name} selected={fromId === a.id} onPress={() => setFromId(a.id)} />
          ))}
        </ChipGroup>
        {error ? <Notice tone="danger" text={error} /> : null}
        <Button label={busy ? "Registrando…" : "Registrar pago"} onPress={onPay} disabled={busy} />
      </View>

      {amort.length > 0 ? (
        <View>
          <SectionHeader label="Plan de amortización" />
          {amort.slice(0, AMORT_PREVIEW_ROWS).map((r, index, rows) => (
            <ListItem
              key={r.number}
              title={`Cuota ${r.number}`}
              subtitle={`Capital ${new Money(r.principal_cents).format()} · interés ${new Money(r.interest_cents).format()}`}
              trailing={<MoneyText cents={r.remaining_balance_cents} variant="caption" />}
              accessibilityLabel={`Cuota ${r.number}, saldo restante ${new Money(r.remaining_balance_cents).format()}`}
              last={index === rows.length - 1}
            />
          ))}
          {amort.length > AMORT_PREVIEW_ROWS ? (
            <Text variant="caption" color="secondary" style={{ paddingTop: spacing[2] }}>
              Se muestran las primeras {AMORT_PREVIEW_ROWS} de {amort.length} cuotas.
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollScreen>
  );
}
