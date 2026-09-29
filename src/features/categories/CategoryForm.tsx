import { useState } from "react";
import { Pressable, Switch, View } from "react-native";

import { validateParent, type ParentError } from "@/domain/categoryTree";
import type { Category } from "@/data/repositories/categories";
import { asIconName, CATEGORY_ICON_PRESETS } from "@/features/categories/presets";
import { Button, Chip, Icon, Input, Notice, SegmentedControl, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export interface CategoryFormValues {
  name: string;
  kind: "expense" | "income";
  parentId: string | null;
  icon: string | null;
  color: string | null;
  isTaxDeductible: boolean;
}

const PARENT_ERRORS: Record<ParentError, string> = {
  CATEGORY_TOO_DEEP:
    "Las categorías admiten solo dos niveles: una subcategoría no puede tener otras adentro, y una que ya tiene subcategorías no puede volverse subcategoría.",
  CATEGORY_KIND_MISMATCH: "La categoría y su padre tienen que ser del mismo tipo.",
  CATEGORY_SELF_PARENT: "Una categoría no puede ser su propio padre.",
};

export interface CategoryFormProps {
  /** Categorías vigentes, para elegir padre y validar. */
  categories: Category[];
  initial: CategoryFormValues;
  /** `id` de la categoría que se edita; ausente al crear. */
  editingId?: string;
  /** El tipo no se cambia al editar (el servidor exige mismo tipo en el árbol). */
  lockKind?: boolean;
  submitLabel: string;
  busy: boolean;
  error?: string | null;
  onSubmit: (values: CategoryFormValues) => void;
}

export function CategoryForm({
  categories,
  initial,
  editingId,
  lockKind = false,
  submitLabel,
  busy,
  error,
  onSubmit,
}: CategoryFormProps) {
  const { colors, spacing, minTouchTarget, radii } = useTokens();
  const [values, setValues] = useState<CategoryFormValues>(initial);
  const [localError, setLocalError] = useState<string | null>(null);

  const set = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const roots = categories.filter(
    (c) => c.parentId === null && c.kind === values.kind && c.id !== editingId,
  );

  function submit() {
    if (values.name.trim() === "") {
      setLocalError("Poné un nombre.");
      return;
    }
    const nodes = categories.map((c) => ({ id: c.id, parentId: c.parentId, kind: c.kind }));
    const id = editingId ?? "__new__";
    if (!editingId) nodes.push({ id, parentId: null, kind: values.kind });
    else {
      // El tipo de la edición es el que se ve en el formulario.
      const self = nodes.find((n) => n.id === id);
      if (self) self.kind = values.kind;
    }
    const problem = validateParent(id, values.parentId, nodes);
    if (problem) {
      setLocalError(PARENT_ERRORS[problem]);
      return;
    }
    setLocalError(null);
    onSubmit({ ...values, name: values.name.trim() });
  }

  const shownError = localError ?? error ?? null;

  return (
    <View style={{ gap: spacing[4] }}>
      <Input label="Nombre" value={values.name} onChangeText={(v) => set("name", v)} />

      {!lockKind ? (
        <SegmentedControl
          options={[
            { value: "expense", label: "Gasto" },
            { value: "income", label: "Ingreso" },
          ]}
          value={values.kind}
          onChange={(v) => setValues((prev) => ({ ...prev, kind: v, parentId: null }))}
        />
      ) : null}

      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" color="secondary">
          CATEGORÍA PADRE
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          <Chip label="Ninguna" selected={values.parentId === null} onPress={() => set("parentId", null)} />
          {roots.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={values.parentId === c.id}
              onPress={() => set("parentId", c.id)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" color="secondary">
          ÍCONO
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {CATEGORY_ICON_PRESETS.map((name) => {
            const selected = asIconName(values.icon) === name;
            return (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`Ícono ${name.replace("-outline", "")}`}
                accessibilityState={{ selected }}
                onPress={() => set("icon", selected ? null : name)}
                style={{
                  width: minTouchTarget,
                  height: minTouchTarget,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: selected ? colors.accent.bg : colors.border.control,
                  backgroundColor: selected ? colors.bg.sunken : colors.bg.surface,
                }}
              >
                <Icon name={name} color={selected ? colors.accent.bg : undefined} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" color="secondary">
          COLOR
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {colors.categorical.map((hex, index) => {
            const selected = values.color === hex;
            return (
              <Pressable
                key={hex}
                accessibilityRole="button"
                accessibilityLabel={`Color ${index + 1}`}
                accessibilityState={{ selected }}
                onPress={() => set("color", selected ? null : hex)}
                style={{
                  width: minTouchTarget,
                  height: minTouchTarget,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radii.sm,
                  backgroundColor: hex,
                }}
              >
                {selected ? <Icon name="checkmark" color={colors.text.inverse} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="body" style={{ flex: 1, paddingRight: spacing[3] }}>
          Deducible de impuestos
        </Text>
        <Switch value={values.isTaxDeductible} onValueChange={(v) => set("isTaxDeductible", v)} />
      </View>

      {shownError ? <Notice tone="danger" text={shownError} /> : null}

      <Button label={busy ? "Guardando…" : submitLabel} onPress={submit} disabled={busy} />
    </View>
  );
}
