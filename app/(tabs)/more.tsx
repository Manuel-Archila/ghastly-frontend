import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import type { Ionicons } from "@expo/vector-icons";

import {
  computeInstallmentCommitment,
  computeSubscriptionSummary,
  listDebts,
  listGoals,
} from "@/data/repositories/commitments";
import { listAccounts } from "@/data/repositories/accounts";
import { useSessionStore } from "@/features/auth/session-store";
import { Money } from "@/domain/money";
import { Button, FadeIn, ListRow, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

interface RowSpec {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href: Href;
  summary: string;
}

export default function MoreScreen() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const { spacing } = useTokens();

  const [rows, setRows] = useState<RowSpec[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [subs, inst, debts, goals, accounts] = await Promise.all([
          computeSubscriptionSummary(),
          computeInstallmentCommitment(),
          listDebts(),
          listGoals(),
          listAccounts(),
        ]);
        setRows([
          {
            icon: "wallet-outline",
            label: "Cuentas",
            href: "/accounts",
            summary: `${accounts.length}`,
          },
          {
            icon: "repeat-outline",
            label: "Suscripciones",
            href: "/subscriptions",
            summary: `${new Money(subs.totalMonthlyCents).format()}/mes`,
          },
          {
            icon: "layers-outline",
            label: "Cuotas",
            href: "/installments",
            summary: `${new Money(inst.totalLiabilityCents).format()} pendiente`,
          },
          {
            icon: "trending-down-outline",
            label: "Deudas",
            href: "/debts",
            summary: new Money(debts.reduce((s, d) => s + d.balanceCents, 0)).format(),
          },
          {
            icon: "flag-outline",
            label: "Metas",
            href: "/goals",
            summary: `${goals.filter((g) => g.status === "active").length} en progreso`,
          },
          { icon: "people-outline", label: "Me deben", href: "/receivables", summary: "" },
          { icon: "calendar-outline", label: "Calendario", href: "/calendar", summary: "" },
          { icon: "pie-chart-outline", label: "Reportes", href: "/reports", summary: "" },
          { icon: "settings-outline", label: "Ajustes", href: "/settings", summary: "" },
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
          {rows.map((row, index) => (
            <FadeIn key={row.label} delay={index * 30}>
              <ListRow
                icon={row.icon}
                label={row.label}
                summary={row.summary}
                onPress={() => router.push(row.href)}
              />
            </FadeIn>
          ))}
        </View>

        <Button label="Cerrar sesión" variant="danger" onPress={() => void logout()} />
      </ScrollView>
    </Screen>
  );
}
