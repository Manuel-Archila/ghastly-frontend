import { useState } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { errorMessageFor } from "@/data/api/error-messages";
import { deleteTemplate, updateTemplate, type TemplatePatch } from "@/data/api/templates";
import { runSync } from "@/data/sync";
import { TemplateForm, type TemplateSubmit } from "@/features/templates/TemplateForm";
import { useInvalidateTemplates, useTemplates } from "@/features/templates/useTemplates";
import { deferDelete } from "@/features/undo/deferred-delete";
import { Button, Screen, ScreenState, ScrollScreen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing } = useTokens();
  const { templates, isLoading } = useTemplates();
  const invalidate = useInvalidateTemplates();
  const template = templates.find((t) => t.id === id);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!template) {
    return (
      <Screen style={{ paddingTop: spacing[4] }}>
        <Stack.Screen options={{ title: "Plantilla" }} />
        {isLoading ? (
          <ScreenState status="loading" skeleton="detail">{null}</ScreenState>
        ) : (
          <Text variant="body" color="secondary">
            Ya no existe.
          </Text>
        )}
      </Screen>
    );
  }
  const current = template;

  async function onSubmit(v: TemplateSubmit) {
    const patch: TemplatePatch = {};
    if (v.name !== current.name) patch.name = v.name;
    if (v.accountId !== current.account_id) patch.account_id = v.accountId;
    if (v.amountCents !== current.amount_cents) patch.amount_cents = v.amountCents;
    if (v.description !== current.description) patch.description = v.description;
    // Cambiar el tipo revalida la categoría que ya tenía: van en el mismo PATCH.
    if (v.kind !== current.kind) patch.kind = v.kind;
    if (v.kind !== current.kind || v.categoryId !== current.category_id) {
      patch.category_id = v.categoryId;
    }
    if (Object.keys(patch).length === 0) return router.back();

    setBusy(true);
    setError(null);
    try {
      await runSync().catch(() => {});
      await updateTemplate(current.id, patch);
      await invalidate();
      router.back();
    } catch (e) {
      setError(errorMessageFor(e));
      setBusy(false);
    }
  }

  function onDelete() {
    // Sin diálogo: se oculta ya y el aviso ofrece Deshacer. El API se llama
    // cuando el aviso expira. Los movimientos creados con ella no cambian.
    deferDelete({
      entity: "template",
      id: current.id,
      message: `${current.name} eliminada`,
      failureMessage: "No se pudo eliminar la plantilla.",
      perform: async () => {
        await deleteTemplate(current.id);
        await invalidate();
      },
    });
    router.back();
  }

  return (
    <ScrollScreen gap={6}>
      <Stack.Screen options={{ title: current.name }} />
      <TemplateForm
        initial={{
          name: current.name,
          kind: current.kind,
          accountId: current.account_id,
          categoryId: current.category_id,
          amount: (current.amount_cents / 100).toFixed(2),
          description: current.description ?? "",
        }}
        submitLabel="Guardar"
        busy={busy}
        error={error}
        onSubmit={(v) => void onSubmit(v)}
      />
      <View style={{ gap: spacing[2] }}>
        <Button label="Eliminar plantilla" variant="danger" disabled={busy} onPress={onDelete} />
      </View>
    </ScrollScreen>
  );
}
