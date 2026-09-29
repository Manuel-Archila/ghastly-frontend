import { useState } from "react";
import { Stack, useRouter } from "expo-router";

import { errorMessageFor } from "@/data/api/error-messages";
import { createTemplate } from "@/data/api/templates";
import { runSync } from "@/data/sync";
import { TemplateForm, type TemplateSubmit } from "@/features/templates/TemplateForm";
import { useInvalidateTemplates } from "@/features/templates/useTemplates";
import { uuidv7 } from "@/lib/uuid";
import { FormScreen } from "@/ui/primitives";

export default function NewTemplateScreen() {
  const router = useRouter();
  const invalidate = useInvalidateTemplates();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(v: TemplateSubmit) {
    setBusy(true);
    setError(null);
    try {
      // Cuenta/categoría creadas sin conexión tienen que existir en el servidor.
      await runSync().catch(() => {});
      await createTemplate({
        id: uuidv7(),
        name: v.name,
        account_id: v.accountId,
        category_id: v.categoryId,
        kind: v.kind,
        amount_cents: v.amountCents,
        description: v.description,
      });
      await invalidate();
      router.back();
    } catch (e) {
      setError(errorMessageFor(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nueva plantilla" }} />
      <FormScreen>
        <TemplateForm
          initial={{
            name: "",
            kind: "expense",
            accountId: null,
            categoryId: null,
            amount: "",
            description: "",
          }}
          submitLabel="Crear plantilla"
          busy={busy}
          error={error}
          onSubmit={(v) => void onSubmit(v)}
        />
      </FormScreen>
    </>
  );
}
