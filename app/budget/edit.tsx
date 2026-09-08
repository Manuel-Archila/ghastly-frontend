import { useEffect, useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { useRouter } from "expo-router";

import { listCategories, type Category } from "@/data/repositories/categories";
import {
  createBudgetLocally,
  getActiveBudget,
  listBudgetItems,
  setBudgetRolloverLocally,
  upsertBudgetItemLocally,
  type Budget,
  type BudgetItem,
} from "@/data/repositories/budgets";
import { parseCentsFromInput, Money } from "@/domain/money";
import { triggerSync } from "@/features/sync/sync-manager";
import { Button, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function BudgetEditScreen() {
  const router = useRouter();
  const { spacing } = useTokens();

  const [budget, setBudget] = useState<Budget | undefined>();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [name, setName] = useState("Presupuesto mensual");
  const [rollover, setRollover] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const existing = await getActiveBudget();
      const cats = await listCategories("expense");
      setCategories(cats);
      if (existing) {
        setBudget(existing);
        setName(existing.name);
        setRollover(existing.rolloverEnabled);
        const budgetItems = await listBudgetItems(existing.id);
        setItems(budgetItems);
        const prefilled: Record<string, string> = {};
        for (const it of budgetItems) {
          prefilled[it.categoryId] = (it.amountCents / 100).toFixed(2);
        }
        setAmounts(prefilled);
      }
    })();
  }, []);

  const itemByCategory = new Map(items.map((i) => [i.categoryId, i]));

  async function onSave() {
    setBusy(true);
    const parsed = categories
      .map((c) => ({ categoryId: c.id, amountCents: parseCentsFromInput(amounts[c.id] ?? "") }))
      .filter((i): i is { categoryId: string; amountCents: number } => i.amountCents !== null);

    if (budget) {
      for (const p of parsed) {
        const existing = itemByCategory.get(p.categoryId);
        if (!existing || existing.amountCents !== p.amountCents) {
          await upsertBudgetItemLocally(budget.id, p.categoryId, p.amountCents, existing?.id);
        }
      }
      if (rollover !== budget.rolloverEnabled) {
        await setBudgetRolloverLocally(budget.id, rollover);
      }
    } else if (parsed.length > 0) {
      await createBudgetLocally({ name: name.trim(), items: parsed });
    }
    triggerSync();
    router.back();
  }

  return (
    <Screen style={{ paddingTop: spacing[5] }}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Text variant="title1">{budget ? "Editar presupuesto" : "Nuevo presupuesto"}</Text>
        {!budget ? <Input label="Nombre" value={name} onChangeText={setName} /> : null}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, paddingRight: spacing[3] }}>
            <Text variant="body">Rollover</Text>
            <Text variant="caption" color="tertiary">
              Lo que sobra en una categoría pasa al mes siguiente.
            </Text>
          </View>
          <Switch value={rollover} onValueChange={setRollover} />
        </View>

        {categories.length === 0 ? (
          <Text variant="body" color="secondary">
            Necesitás categorías primero. Traelas desde la pestaña Hoy.
          </Text>
        ) : (
          categories.map((c) => (
            <Input
              key={c.id}
              label={c.name}
              value={amounts[c.id] ?? ""}
              onChangeText={(v) => setAmounts((prev) => ({ ...prev, [c.id]: v }))}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          ))
        )}

        {budget ? (
          <Text variant="caption" color="tertiary">
            Presupuestado total actual:{" "}
            {new Money(items.reduce((s, i) => s + i.amountCents, 0)).format()}
          </Text>
        ) : null}

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={busy} />
      </ScrollView>
    </Screen>
  );
}
