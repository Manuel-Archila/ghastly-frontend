import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { listCategories, type Category } from "@/data/repositories/categories";
import { flattenTree } from "@/domain/categoryTree";
import { Button, Select, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export interface CategoryPickerProps {
  kind: "expense" | "income";
  value: string | null;
  onChange: (categoryId: string) => void;
  label?: string;
}

/**
 * Selector de categoría para formularios. Aplica la regla "un gasto o un ingreso
 * no pueden existir sin categoría" (`domain/categoryRule.ts`) en un solo lugar:
 *
 * - La categoría es obligatoria en ambos tipos: tocar la ya elegida NO la quita.
 * - Sin categorías de ese tipo todavía (la app arranca sin ninguna), no se puede
 *   guardar, así que en vez de un selector vacío ofrece ir a crear la primera. La
 *   pantalla de creación se abre ya en el tipo correcto (gasto o ingreso).
 *
 * Recarga al volver a la pantalla, para que la categoría recién creada aparezca.
 */
export function CategoryPicker({ kind, value, onChange, label = "Categoría" }: CategoryPickerProps) {
  const router = useRouter();
  const { spacing } = useTokens();
  const [categories, setCategories] = useState<Category[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      void listCategories(kind).then(setCategories);
    }, [kind]),
  );

  // Hasta la primera lectura no se muestra nada: evita el parpadeo de "no tenés".
  if (categories === null) return null;

  if (categories.length === 0) {
    const noun = kind === "expense" ? "gasto" : "ingreso";
    return (
      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" color="secondary">
          {label}
        </Text>
        <Text variant="body" color="secondary">
          {`Todavía no tenés categorías de ${noun}. Creá una para poder guardar este ${noun}.`}
        </Text>
        <Button
          label="Crear una categoría"
          variant="secondary"
          fullWidth={false}
          onPress={() => router.push({ pathname: "/categories/new", params: { kind } })}
        />
      </View>
    );
  }

  return (
    <Select
      label={label}
      value={value}
      options={flattenTree(categories).map(({ category, depth }) => ({
        value: category.id,
        label: category.name,
        depth,
      }))}
      onChange={onChange}
    />
  );
}
