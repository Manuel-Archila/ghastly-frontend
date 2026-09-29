import { useRouter, Stack } from "expo-router";

import { Money } from "@/domain/money";
import { useTemplates } from "@/features/templates/useTemplates";
import {
  Button,
  FadeIn,
  ListItem,
  MoneyText,
  ScreenState,
  ScrollScreen,
} from "@/ui/primitives";

export default function TemplatesScreen() {
  const router = useRouter();
  const { templates, isLoading, isError, refetch } = useTemplates();

  const status = isLoading ? "loading" : isError ? "error" : templates.length === 0 ? "empty" : "data";

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: "Plantillas" }} />
      <ScreenState
        status={status}
        error="No se pudo cargar. Se necesita conexión."
        onRetry={() => void refetch()}
        empty={{
          message: "Todavía no tenés plantillas. Guardá ahí tus gastos de siempre (el almuerzo, el bus).",
          icon: "flash-outline",
          actionLabel: "Nueva plantilla",
          onAction: () => router.push("/templates/new"),
        }}
      >
        {templates.map((t, index) => (
          <FadeIn key={t.id} delay={index * 30}>
            <ListItem
              title={t.name}
              subtitle={`${t.use_count} ${t.use_count === 1 ? "uso" : "usos"}`}
              trailing={<MoneyText cents={t.amount_cents} />}
              accessibilityLabel={`${t.name}, ${new Money(t.amount_cents).format()}`}
              onPress={() => router.push(`/templates/${t.id}`)}
              last={index === templates.length - 1}
            />
          </FadeIn>
        ))}
        <Button label="Nueva plantilla" onPress={() => router.push("/templates/new")} />
      </ScreenState>
    </ScrollScreen>
  );
}
