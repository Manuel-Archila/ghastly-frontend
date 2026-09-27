import { Pressable, ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Money } from "@/domain/money";
import { useReceivables } from "@/features/receivables/useReceivables";
import { Button, FadeIn, Icon, Screen, Skeleton, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function ReceivablesScreen() {
  const router = useRouter();
  const { spacing, colors, minTouchTarget } = useTokens();
  const { receivables, isLoading, isError, refetch } = useReceivables();

  const pending = receivables.filter((r) => r.status === "pending");
  const settled = receivables.filter((r) => r.status === "settled");
  const pendingTotal = pending.reduce((sum, r) => sum + r.amount_cents, 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: "Me deben" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <Skeleton height={64} />
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
        ) : receivables.length === 0 ? (
          <Text variant="body" color="secondary">
            Nadie te debe por ahora. Abrí un gasto y tocá “Dividir / me deben” para anotar lo que
            puso otra persona.
          </Text>
        ) : (
          <>
            <View style={{ gap: spacing[1] }}>
              <Text variant="caption" color="secondary">
                POR COBRAR
              </Text>
              <Text variant="display">{new Money(pendingTotal).format()}</Text>
            </View>

            {[
              { title: "PENDIENTES", rows: pending },
              { title: "LIQUIDADOS", rows: settled },
            ].map((group) =>
              group.rows.length === 0 ? null : (
                <View key={group.title}>
                  <Text variant="caption" color="secondary" style={{ paddingBottom: spacing[2] }}>
                    {group.title}
                  </Text>
                  {group.rows.map((r, index) => (
                    <FadeIn key={r.id} delay={index * 30}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${r.counterparty}, ${new Money(r.amount_cents).format()}, ${
                          r.status === "settled" ? "liquidado" : "pendiente"
                        }`}
                        onPress={() => router.push(`/receivables/${r.id}`)}
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
                        <Icon name={r.status === "settled" ? "checkmark-circle-outline" : "time-outline"} />
                        <Text variant="body" style={{ flex: 1 }}>
                          {r.counterparty}
                        </Text>
                        <Text variant="bodyStrong" style={{ fontVariant: ["tabular-nums"] }}>
                          {new Money(r.amount_cents).format()}
                        </Text>
                        <Icon name="chevron-forward" size={16} />
                      </Pressable>
                    </FadeIn>
                  ))}
                </View>
              ),
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
