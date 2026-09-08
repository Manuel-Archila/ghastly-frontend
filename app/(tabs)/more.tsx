import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";

import {
  computeInstallmentCommitment,
  computeSubscriptionSummary,
  listDebts,
  listGoals,
} from "@/data/repositories/commitments";
import { useSessionStore } from "@/features/auth/session-store";
import { Money } from "@/domain/money";
import { Button, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

interface RowSpec {
  label: string;
  href: Href;
  summary: string;
}

export default function MoreScreen() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const { spacing, colors } = useTokens();

  const [rows, setRows] = useState<RowSpec[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [subs, inst, debts, goals] = await Promise.all([
          computeSubscriptionSummary(),
          computeInstallmentCommitment(),
          listDebts(),
          listGoals(),
        ]);
        setRows([
          {
            label: "🔁 Suscripciones",
            href: "/subscriptions",
            summary: `${new Money(subs.totalMonthlyCents).format()}/mes`,
          },
          {
            label: "📱 Cuotas",
            href: "/installments",
            summary: `${new Money(inst.totalLiabilityCents).format()} pendiente`,
          },
          {
            label: "💰 Deudas",
            href: "/debts",
            summary: new Money(debts.reduce((s, d) => s + d.balanceCents, 0)).format(),
          },
          {
            label: "🎯 Metas",
            href: "/goals",
            summary: `${goals.filter((g) => g.status === "active").length} en progreso`,
          },
          { label: "📅 Calendario", href: "/calendar", summary: "" },
        ]);
      })();
    }, []),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        <Text variant="title1">Más</Text>
        {user ? (
          <Text variant="body" color="secondary">
            {user.name} · {user.email}
          </Text>
        ) : null}

        <View>
          {rows.map((row) => (
            <Pressable
              key={row.label}
              onPress={() => router.push(row.href)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: spacing[3],
                borderBottomWidth: 1,
                borderBottomColor: colors.border.subtle,
              }}
            >
              <Text variant="body">{row.label}</Text>
              <Text variant="caption" color="tertiary">
                {row.summary} ›
              </Text>
            </Pressable>
          ))}
        </View>

        <Button label="Cerrar sesión" variant="danger" onPress={() => void logout()} />
      </ScrollView>
    </Screen>
  );
}
