import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";

import { contributeToGoal } from "@/data/api/commitments";
import { ApiError } from "@/data/api/client";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { listGoals, type Goal } from "@/data/repositories/commitments";
import { Money, parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { Button, Chip, Input, Screen, ScreenState, Text } from "@/ui/primitives";
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
      setError(e instanceof ApiError ? e.message : "No se pudo aportar.");
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
    <Screen>
      <Stack.Screen options={{ title: goal.name }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <View>
          <Text variant="display">{new Money(goal.currentAmountCents).format()}</Text>
          <Text variant="caption" color="secondary">
            de {new Money(goal.targetAmountCents).format()} · {pct}%
          </Text>
        </View>

        <View style={{ gap: spacing[2] }}>
          <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Monto a aportar" />
          {goal.linkedAccountId ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
              {accounts.map((a) => (
                <Chip key={a.id} label={a.name} selected={fromId === a.id} onPress={() => setFromId(a.id)} />
              ))}
            </View>
          ) : null}
          {error ? (
            <Text variant="caption" style={{ color: colors.danger.fg }}>
              {error}
            </Text>
          ) : null}
          <Button label={busy ? "Aportando…" : "Aportar"} onPress={onContribute} disabled={busy} />
        </View>
      </ScrollView>
    </Screen>
  );
}
