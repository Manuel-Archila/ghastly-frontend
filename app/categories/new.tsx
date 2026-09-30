import { useCallback, useState } from "react";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { createCategoryLocally, listCategories, type Category } from "@/data/repositories/categories";
import { CategoryForm, type CategoryFormValues } from "@/features/categories/CategoryForm";
import { triggerSync } from "@/features/sync/sync-manager";
import { FormScreen } from "@/ui/primitives";

function emptyValues(kind: "expense" | "income"): CategoryFormValues {
  return { name: "", kind, parentId: null, icon: null, color: null, isTaxDeductible: false };
}

export default function NewCategoryScreen() {
  const router = useRouter();
  // Quien abre esta pantalla sabe si necesita una categoría de gasto o de ingreso
  // (la pestaña activa, o el tipo del movimiento que se está registrando): el
  // formulario arranca en ese tipo en vez de siempre en "gasto".
  const params = useLocalSearchParams<{ kind?: string }>();
  const initialKind = params.kind === "income" ? "income" : "expense";
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void listCategories().then(setCategories);
    }, []),
  );

  async function onSubmit(values: CategoryFormValues) {
    setBusy(true);
    await createCategoryLocally({
      name: values.name,
      kind: values.kind,
      parentId: values.parentId,
      icon: values.icon,
      color: values.color,
      isTaxDeductible: values.isTaxDeductible,
    });
    triggerSync();
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nueva categoría" }} />
      <FormScreen>
        {categories ? (
          <CategoryForm
            categories={categories}
            initial={emptyValues(initialKind)}
            submitLabel="Crear categoría"
            busy={busy}
            onSubmit={(v) => void onSubmit(v)}
          />
        ) : null}
      </FormScreen>
    </>
  );
}
