import { Pressable, ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Money } from "@/domain/money";
import { useTemplates } from "@/features/templates/useTemplates";
import { Button, FadeIn, Icon, Screen, Skeleton, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function TemplatesScreen() {
  const router = useRouter();
  const { spacing, colors, minTouchTarget } = useTokens();
  const { templates, isLoading, isError, refetch } = useTemplates();

  return (
    <Screen>
      <Stack.Screen options={{ title: "Plantillas" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <Skeleton height={48} />
            <Skeleton height={48} />
          </View>
        ) : isError ? (
          <View style={{ gap: spacing[3] }}>
            <Text variant="body" color="secondary">
              No se pudo cargar. Se necesita conexión.
            </Text>
            <Button label="Reintentar" onPress={() => void refetch()} />
          </View>
        ) : templates.length === 0 ? (
          <Text variant="body" color="secondary">
            Todavía no tenés plantillas. Guardá ahí tus gastos de siempre (el almuerzo, el bus).
          </Text>
        ) : (
          templates.map((t, index) => (
            <FadeIn key={t.id} delay={index * 30}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/templates/${t.id}`)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[3],
                  minHeight: minTouchTarget,
                  paddingVertical: spacing[2],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.subtle,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body">{t.name}</Text>
                  <Text variant="caption" color="tertiary">
                    {t.use_count} {t.use_count === 1 ? "uso" : "usos"}
                  </Text>
                </View>
                <Text variant="bodyStrong">
                  {new Money(t.amount_cents).format()}
                </Text>
                <Icon name="chevron-forward" size={16} />
              </Pressable>
            </FadeIn>
          ))
        )}

        <Button label="+ Nueva plantilla" onPress={() => router.push("/templates/new")} />
      </ScrollView>
    </Screen>
  );
}
