import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Money } from "@/domain/money";
import { useReceivables } from "@/features/receivables/useReceivables";
import { useIsHiddenByDelete } from "@/features/undo/deferred-delete";
import {
  FadeIn,
  HeroFigure,
  ListItem,
  MoneyText,
  Screen,
  ScreenState,
  SectionHeader,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function ReceivablesScreen() {
  const router = useRouter();
  const { spacing } = useTokens();
  const { receivables: all, isLoading, isError, refetch } = useReceivables();
  const isHidden = useIsHiddenByDelete();
  const receivables = all.filter((r) => !isHidden("receivable", r.id));

  const pending = receivables.filter((r) => r.status === "pending");
  const settled = receivables.filter((r) => r.status === "settled");
  const pendingTotal = pending.reduce((sum, r) => sum + r.amount_cents, 0);

  const status = isLoading
    ? "loading"
    : isError
      ? "error"
      : receivables.length === 0
        ? "empty"
        : "data";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Me deben" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}>
        <ScreenState
          status={status}
          skeleton="detail"
          error="No se pudo cargar. Se necesita conexión."
          onRetry={() => void refetch()}
          empty={{
            message:
              "Nadie te debe por ahora. Abrí un gasto y tocá “Dividir / me deben” para anotar lo que puso otra persona.",
            icon: "people-outline",
          }}
        >
          <HeroFigure label="Por cobrar" value={new Money(pendingTotal).format()} />

          {[
            { title: "Pendientes", rows: pending },
            { title: "Liquidados", rows: settled },
          ].map((group) =>
            group.rows.length === 0 ? null : (
              <View key={group.title}>
                <SectionHeader label={group.title} />
                {group.rows.map((r, index) => (
                  <FadeIn key={r.id} delay={index * 30}>
                    <ListItem
                      icon={r.status === "settled" ? "checkmark-circle-outline" : "time-outline"}
                      title={r.counterparty}
                      trailing={<MoneyText cents={r.amount_cents} />}
                      accessibilityLabel={`${r.counterparty}, ${new Money(r.amount_cents).format()}, ${
                        r.status === "settled" ? "liquidado" : "pendiente"
                      }`}
                      onPress={() => router.push(`/receivables/${r.id}`)}
                      last={index === group.rows.length - 1}
                    />
                  </FadeIn>
                ))}
              </View>
            ),
          )}
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
