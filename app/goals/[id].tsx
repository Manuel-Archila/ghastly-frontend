import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";

import { contributeToGoal } from "@/data/api/commitments";
import { errorMessageFor } from "@/data/api/error-messages";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { listGoals, type Goal } from "@/data/repositories/commitments";
import { Money, parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import {
  Button,
  Chip,
  ChipGroup,
  HeroFigure,
  Input,
  Notice,
  ProgressBar,
  Screen,
  ScreenState,
  ScrollScreen,
  SectionHeader,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing, colors } = useTokens();

  const [goal, setGoal] = useState<Goal | undefined>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const all = await listGoals();
    setGoal(all.find((g) => g.id === id));
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
  }, []);

  async function onContribute() {
    const cents = parseCentsFromInput(amount);
    if (cents === null) return;
    setBusy(true);
    setError(null);
    try {
      await contributeToGoal(id, {
        amountCents: cents,
        dateIso: todayIso(),
        fromAccountId: goal?.linkedAccountId ? fromId : null,
      });
      setAmount("");
      await load();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(errorMessageFor(e, "No se pudo aportar."));
    } finally {
      setBusy(false);
    }
  }

  if (!goal) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Meta" }} />
        <ScreenState status="loading" skeleton="detail">{null}</ScreenState>
      </Screen>
    );
  }

  const pct = Math.min(100, Math.round((goal.currentAmountCents / goal.targetAmountCents) * 100));

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: goal.name }} />
      <View style={{ gap: spacing[2] }}>
        <HeroFigure
          label="Ahorrado"
          value={new Money(goal.currentAmountCents).format()}
          subtitle={`de ${new Money(goal.targetAmountCents).format()} · ${pct} %`}
        />
        <ProgressBar percent={pct} color={colors.income.fg} />
      </View>

      <View style={{ gap: spacing[3] }}>
        <SectionHeader label="Aportar" />
        <Input
          label="Monto a aportar"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        {goal.linkedAccountId ? (
          <ChipGroup label="Desde la cuenta">
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} selected={fromId === a.id} onPress={() => setFromId(a.id)} />
            ))}
          </ChipGroup>
        ) : null}
        {error ? <Notice tone="danger" text={error} /> : null}
        <Button label={busy ? "Aportando…" : "Aportar"} onPress={onContribute} disabled={busy} />
      </View>
    </ScrollScreen>
  );
}
