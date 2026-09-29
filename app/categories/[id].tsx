import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { mergeCategory, setCategoryParent } from "@/data/api/categories";
import { errorMessageFor } from "@/data/api/error-messages";
import {
  archiveCategoryLocally,
  listCategoriesForManagement,
  reorderCategoriesLocally,
  setCategoryParentLocally,
  updateCategoryLocally,
  type Category,
} from "@/data/repositories/categories";
import { pullChanges, runSync } from "@/data/sync";
import { CategoryForm, type CategoryFormValues } from "@/features/categories/CategoryForm";
import { triggerSync } from "@/features/sync/sync-manager";
import { confirmDestructive } from "@/ui/confirm";
import {
  Button,
  Chip,
  ChipGroup,
  Notice,
  Screen,
  ScrollScreen,
  SectionHeader,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing } = useTokens();

  const [all, setAll] = useState<Category[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeInto, setMergeInto] = useState<string | null>(null);

  const load = useCallback(async () => setAll(await listCategoriesForManagement(true)), []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const category = all?.find((c) => c.id === id);
  const live = useMemo(() => (all ?? []).filter((c) => !c.isArchived), [all]);
  const siblings = useMemo(
    () =>
      category
        ? live.filter((c) => c.kind === category.kind && c.parentId === category.parentId)
        : [],
    [live, category],
  );
  const mergeTargets = useMemo(
    () => (category ? live.filter((c) => c.kind === category.kind && c.id !== category.id) : []),
    [live, category],
  );

  if (!all) return <Screen />;
  if (!category) {
    return (
      <Screen style={{ paddingTop: spacing[4] }}>
        <Stack.Screen options={{ title: "Categoría" }} />
        <Text variant="body" color="secondary">
          Esta categoría ya no existe.
        </Text>
      </Screen>
    );
  }

  const position = siblings.findIndex((c) => c.id === category.id);

  async function onSubmit(values: CategoryFormValues) {
    if (!category) return;
    setBusy(true);
    setError(null);
    try {
      // El padre NO viaja por sync: es online y lo valida el servidor.
      if (values.parentId !== category.parentId) {
        await runSync().catch(() => {}); // que el servidor ya conozca la categoría
        await setCategoryParent(category.id, values.parentId);
        await setCategoryParentLocally(category.id, values.parentId);
      }
      const edit: Parameters<typeof updateCategoryLocally>[1] = {};
      if (values.name !== category.name) edit.name = values.name;
      if (values.icon !== category.icon) edit.icon = values.icon;
      if (values.color !== category.color) edit.color = values.color;
      if (values.isTaxDeductible !== category.isTaxDeductible) {
        edit.isTaxDeductible = values.isTaxDeductible;
      }
      if (Object.keys(edit).length > 0) await updateCategoryLocally(category.id, edit);
      triggerSync();
      router.back();
    } catch (e) {
      setError(errorMessageFor(e));
      setBusy(false);
    }
  }

  async function onMove(delta: -1 | 1) {
    const ids = siblings.map((c) => c.id);
    const target = position + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[position], ids[target]] = [ids[target], ids[position]];
    await reorderCategoriesLocally(ids);
    triggerSync();
    await load();
  }

  async function onArchive() {
    if (!category) return;
    const ok = await confirmDestructive(
      `Archivar ${category.name}`,
      "Deja de aparecer para elegirla y se quita de los presupuestos. Los movimientos ya registrados se conservan.",
      "Archivar",
    );
    if (!ok) return;
    await archiveCategoryLocally(category.id);
    triggerSync();
    router.back();
  }

  async function onMerge() {
    if (!category || !mergeInto) return;
    const target = live.find((c) => c.id === mergeInto);
    const ok = await confirmDestructive(
      `Fusionar ${category.name}`,
      `Todos sus movimientos pasan a ${target?.name ?? "la categoría destino"}, y su monto de presupuesto se SUMA al de esa categoría. ${category.name} desaparece.`,
      "Fusionar",
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await runSync().catch(() => {});
      await mergeCategory(category.id, mergeInto);
      await pullChanges();
      router.back();
    } catch (e) {
      setError(errorMessageFor(e));
      setBusy(false);
    }
  }

  if (category.isArchived) {
    return (
      <Screen style={{ paddingTop: spacing[4], gap: spacing[3] }}>
        <Stack.Screen options={{ title: category.name }} />
        <Text variant="body" color="secondary">
          Esta categoría está archivada. Sus movimientos se conservan.
        </Text>
      </Screen>
    );
  }

  return (
    <ScrollScreen gap={6}>
      <Stack.Screen options={{ title: category.name }} />
      <CategoryForm
        categories={live}
        editingId={category.id}
        lockKind
        initial={{
          name: category.name,
          kind: category.kind as "expense" | "income",
          parentId: category.parentId,
          icon: category.icon,
          color: category.color,
          isTaxDeductible: category.isTaxDeductible,
        }}
        submitLabel="Guardar"
        busy={busy}
        error={error}
        onSubmit={(v) => void onSubmit(v)}
      />

      {siblings.length > 1 ? (
        <View style={{ gap: spacing[2] }}>
          <SectionHeader label="Orden" />
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <Button
              label="Subir"
              variant="secondary"
              fullWidth={false}
              disabled={position <= 0}
              onPress={() => void onMove(-1)}
            />
            <Button
              label="Bajar"
              variant="secondary"
              fullWidth={false}
              disabled={position >= siblings.length - 1}
              onPress={() => void onMove(1)}
            />
          </View>
        </View>
      ) : null}

      {mergeTargets.length > 0 ? (
        <View style={{ gap: spacing[2] }}>
          <SectionHeader label="Fusionar en otra" />
          <Text variant="caption" color="secondary">
            Mueve todos los movimientos y suma el monto de presupuesto a la categoría destino.
            Necesita conexión.
          </Text>
          <ChipGroup>
            {mergeTargets.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                selected={mergeInto === c.id}
                onPress={() => setMergeInto(mergeInto === c.id ? null : c.id)}
              />
            ))}
          </ChipGroup>
          <Button
            label="Fusionar"
            variant="secondary"
            disabled={!mergeInto || busy}
            onPress={() => void onMerge()}
          />
        </View>
      ) : null}

      <View style={{ gap: spacing[2] }}>
        <Notice text="Al archivarla se quita de los presupuestos; los gastos ya registrados no cambian." />
        <Button label="Archivar categoría" variant="danger" onPress={() => void onArchive()} />
      </View>
    </ScrollScreen>
  );
}
