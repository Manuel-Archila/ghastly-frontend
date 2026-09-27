import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { createCategoryLocally, listCategories, type Category } from "@/data/repositories/categories";
import { CategoryForm, type CategoryFormValues } from "@/features/categories/CategoryForm";
import { triggerSync } from "@/features/sync/sync-manager";
import { Screen } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const EMPTY: CategoryFormValues = {
  name: "",
  kind: "expense",
  parentId: null,
  icon: null,
  color: null,
  isTaxDeductible: false,
};

export default function NewCategoryScreen() {
  const router = useRouter();
  const { spacing } = useTokens();
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
    <Screen>
      <Stack.Screen options={{ title: "Nueva categoría" }} />
      <ScrollView contentContainerStyle={{ paddingVertical: spacing[4], paddingBottom: spacing[8] }}>
        {categories ? (
          <CategoryForm
            categories={categories}
            initial={EMPTY}
            submitLabel="Crear categoría"
            busy={busy}
            onSubmit={(v) => void onSubmit(v)}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
