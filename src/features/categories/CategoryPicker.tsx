import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { listCategories, type Category } from "@/data/repositories/categories";
import { requiresCategory } from "@/domain/categoryRule";
import { Button, Chip, ChipGroup, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export interface CategoryPickerProps {
  kind: "expense" | "income";
  value: string | null;
  onChange: (categoryId: string | null) => void;
  label?: string;
}

/**
 * Selector de categoría para formularios. Aplica la regla "un gasto no puede
 * existir sin categoría" (`domain/categoryRule.ts`) en un solo lugar:
 *
 * - Gasto: la categoría es obligatoria. Tocar la ya elegida NO la quita.
 * - Ingreso: es opcional; hay un chip "Ninguna" y tocar la elegida la quita.
 * - Sin categorías todavía (la app arranca sin ninguna): un gasto no se puede
 *   guardar, así que en vez de un selector vacío ofrece ir a crear la primera.
 *
 * Recarga al volver a la pantalla, para que la categoría recién creada aparezca.
 */
export function CategoryPicker({ kind, value, onChange, label = "Categoría" }: CategoryPickerProps) {
  const router = useRouter();
  const { spacing } = useTokens();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const required = requiresCategory(kind);

  useFocusEffect(
    useCallback(() => {
      void listCategories(kind).then(setCategories);
    }, [kind]),
  );

  // Hasta la primera lectura no se muestra nada: evita el parpadeo de "no tenés".
  if (categories === null) return null;

  if (categories.length === 0) {
    if (!required) return null;
    return (
      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" color="secondary">
          {label}
        </Text>
        <Text variant="body" color="secondary">
          Todavía no tenés categorías de gasto. Creá una para poder guardar este gasto.
        </Text>
        <Button
          label="Crear una categoría"
          variant="secondary"
          fullWidth={false}
          onPress={() => router.push("/categories/new")}
        />
      </View>
    );
  }

  return (
    <ChipGroup label={label}>
      {required ? null : (
        <Chip label="Ninguna" selected={value === null} onPress={() => onChange(null)} />
      )}
      {categories.map((c) => (
        <Chip
          key={c.id}
          label={c.name}
          selected={value === c.id}
          onPress={() => onChange(required ? c.id : value === c.id ? null : c.id)}
        />
      ))}
    </ChipGroup>
  );
}
