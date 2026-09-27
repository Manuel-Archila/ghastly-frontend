import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { errorMessageFor } from "@/data/api/error-messages";
import { listCategories, type Category } from "@/data/repositories/categories";
import {
  createBudgetLocally,
  getActiveBudget,
  listBudgetItems,
  removeBudgetItemLocally,
  setBudgetRolloverLocally,
  upsertBudgetItemLocally,
  type Budget,
} from "@/data/repositories/budgets";
import { effectiveParents, summarizeHierarchy } from "@/domain/budget";
import { flattenTree } from "@/domain/categoryTree";
import { parseCentsFromInput, Money } from "@/domain/money";
import { nestByParent } from "@/features/budget/nest";
import { triggerSync } from "@/features/sync/sync-manager";
import { confirmDestructive } from "@/ui/confirm";
import { Button, Chip, Icon, Input, Notice, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

/** Fila del editor: un ítem existente (`itemId`) o uno recién agregado. */
interface Row {
  key: string;
  itemId?: string;
  categoryId: string;
  amount: string;
  /** Monto guardado, para saber si cambió. */
  savedCents?: number;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function BudgetEditScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [budget, setBudget] = useState<Budget | undefined>();
  const [name, setName] = useState("Presupuesto mensual");
  const [rollover, setRollover] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Al volver de Categorías puede haber categorías nuevas: se recargan solo
  // las categorías, sin pisar lo que se está editando.
  useFocusEffect(
    useCallback(() => {
      void listCategories("expense").then(setCategories);
    }, []),
  );

  useEffect(() => {
    void (async () => {
      const existing = await getActiveBudget();
      if (existing) {
        setBudget(existing);
        setName(existing.name);
        setRollover(existing.rolloverEnabled);
        const items = await listBudgetItems(existing.id);
        setRows(
          items.map((it) => ({
            key: it.id,
            itemId: it.id,
            categoryId: it.categoryId,
            amount: centsToInput(it.amountCents),
            savedCents: it.amountCents,
          })),
        );
      }
      setLoaded(true);
    })();
  }, []);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Jerarquía en vivo: la advertencia aparece apenas los hijos se pasan,
  // sin esperar a guardar. Nunca bloquea.
  const view = useMemo(() => {
    const parentOf = effectiveParents(
      new Map(rows.map((r) => [r.categoryId, catById.get(r.categoryId)?.parentId ?? null])),
    );
    const budgeted = new Map(rows.map((r) => [r.categoryId, parseCentsFromInput(r.amount) ?? 0]));
    const summary = summarizeHierarchy(budgeted, parentOf);
    const nested = nestByParent(
      rows.map((r) => ({ ...r, parentCategoryId: parentOf.get(r.categoryId) ?? null })),
    );
    return { summary, nested, budgeted };
  }, [rows, catById]);

  // Categorías de gasto que AÚN no están en el presupuesto, agrupadas por padre.
  const available = useMemo(() => {
    const used = new Set(rows.map((r) => r.categoryId));
    const groups: { root: Category; options: Category[] }[] = [];
    for (const { category, depth } of flattenTree(categories)) {
      if (depth === 0) groups.push({ root: category, options: [] });
      if (!used.has(category.id)) groups[groups.length - 1]?.options.push(category);
    }
    return groups.filter((g) => g.options.length > 0);
  }, [categories, rows]);

  function addRow(categoryId: string) {
    setError(null);
    setRows((prev) => [...prev, { key: `new-${categoryId}`, categoryId, amount: "" }]);
  }

  async function onRemove(row: Row) {
    const label = catById.get(row.categoryId)?.name ?? "esta categoría";
    if (row.itemId) {
      const ok = await confirmDestructive(
        `Quitar ${label}`,
        "Los gastos ya registrados no se tocan: quedarán como “sin presupuesto”.",
        "Quitar",
      );
      if (!ok) return;
      await removeBudgetItemLocally(row.itemId);
      triggerSync();
    }
    setRows((prev) => prev.filter((r) => r.key !== row.key));
  }

  const invalid = rows.some((r) => parseCentsFromInput(r.amount) === null);

  async function onSave() {
    if (invalid) {
      setError("Poné un monto en cada categoría, o quitala del presupuesto.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const parsed = rows.map((r) => ({ row: r, cents: parseCentsFromInput(r.amount) as number }));
      if (budget) {
        for (const { row, cents } of parsed) {
          if (!row.itemId || row.savedCents !== cents) {
            await upsertBudgetItemLocally(budget.id, row.categoryId, cents, row.itemId);
          }
        }
        if (rollover !== budget.rolloverEnabled) {
          await setBudgetRolloverLocally(budget.id, rollover);
        }
      } else if (parsed.length > 0) {
        await createBudgetLocally({
          name: name.trim(),
          items: parsed.map((p) => ({ categoryId: p.row.categoryId, amountCents: p.cents })),
        });
      }
      triggerSync();
      router.back();
    } catch (e) {
      setError(errorMessageFor(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: budget ? "Editar presupuesto" : "Nuevo presupuesto" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        {!budget ? <Input label="Nombre" value={name} onChangeText={setName} /> : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: spacing[3] }}>
            <Text variant="body">Rollover</Text>
            <Text variant="caption" color="tertiary">
              Lo que sobra en una categoría pasa al mes siguiente.
            </Text>
          </View>
          <Switch value={rollover} onValueChange={setRollover} />
        </View>

        <View style={{ gap: spacing[3] }}>
          <Text variant="caption" color="secondary">
            EN EL PRESUPUESTO
          </Text>

          {loaded && rows.length === 0 ? (
            <Text variant="body" color="secondary">
              Todavía no hay categorías en el presupuesto. Agregá la primera abajo.
            </Text>
          ) : null}

          {view.nested.map(({ item: row, depth }) => {
            const category = catById.get(row.categoryId);
            const childrenSum = view.summary.childrenBudgeted.get(row.categoryId);
            const excess = view.summary.childrenExcess.get(row.categoryId) ?? 0;
            const cents = view.budgeted.get(row.categoryId) ?? 0;
            return (
              <View
                key={row.key}
                style={{
                  gap: spacing[2],
                  marginLeft: depth === 1 ? spacing[5] : 0,
                  paddingBottom: spacing[3],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.subtle,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing[2] }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={category?.name ?? "Categoría"}
                      value={row.amount}
                      onChangeText={(v) =>
                        setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, amount: v } : r)))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${category?.name ?? "categoría"} del presupuesto`}
                    onPress={() => void onRemove(row)}
                    style={({ pressed }) => ({
                      minWidth: 48,
                      minHeight: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Icon name="close-circle-outline" size={24} />
                  </Pressable>
                </View>

                {childrenSum !== undefined ? (
                  <Text variant="caption" color="secondary" style={{ fontVariant: ["tabular-nums"] }}>
                    Subcategorías: {new Money(childrenSum).format()} de {new Money(cents).format()}
                  </Text>
                ) : null}
                {excess > 0 ? (
                  <Notice
                    text={`Las subcategorías suman ${new Money(excess).format()} más que el tope de ${category?.name ?? "la categoría"}.`}
                  />
                ) : null}
              </View>
            );
          })}

          <Text variant="caption" color="tertiary" style={{ fontVariant: ["tabular-nums"] }}>
            Presupuestado total: {new Money(view.summary.rootTotalCents).format()}
          </Text>
        </View>

        <View style={{ gap: spacing[3] }}>
          <Text variant="caption" color="secondary">
            AGREGAR CATEGORÍA
          </Text>

          {categories.length === 0 ? (
            <View style={{ gap: spacing[2] }}>
              <Text variant="body" color="secondary">
                Todavía no tenés categorías de gasto.
              </Text>
              <Button label="Ir a categorías" variant="secondary" onPress={() => router.push("/categories")} />
            </View>
          ) : available.length === 0 ? (
            <Text variant="body" color="secondary">
              Ya están todas las categorías de gasto en el presupuesto.
            </Text>
          ) : (
            available.map(({ root, options }) => (
              <View key={root.id} style={{ gap: spacing[2] }}>
                <Text variant="caption" color="tertiary">
                  {root.name}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
                  {options.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.parentId ? c.name : options.length > 1 ? `${c.name} (todo)` : c.name}
                      accessibilityLabel={`Agregar ${c.name}`}
                      onPress={() => addRow(c.id)}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
          {categories.length > 0 ? (
            <Button
              label="Administrar categorías"
              variant="ghost"
              onPress={() => router.push("/categories")}
            />
          ) : null}
        </View>

        {error ? <Notice tone="danger" text={error} /> : null}

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={busy} />
      </ScrollView>
    </Screen>
  );
}
