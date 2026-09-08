import { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";

import { useRunMigrations } from "@/data/db/migrate";
import { listAccounts } from "@/data/repositories/accounts";
import { useSessionStore } from "@/features/auth/session-store";
import { useSyncOnForeground } from "@/features/sync/sync-manager";
import { Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

/**
 * SOLO composición (CLAUDE.md). Antes de mostrar nada: corre migraciones y
 * restaura la sesión. Después redirige según sesión — y, si no hay ni una
 * cuenta local, al onboarding. El onboarding navega a `(tabs)` cuando
 * termina; el layout no lo saca de ahí.
 */
export default function RootLayout() {
  const { success: migrationsReady, error: migrationsError } = useRunMigrations();
  const status = useSessionStore((s) => s.status);
  const restore = useSessionStore((s) => s.restore);
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTokens();

  useEffect(() => {
    if (migrationsReady) void restore();
  }, [migrationsReady, restore]);

  useEffect(() => {
    if (status === "loading") return;
    const group = segments[0] as string | undefined;

    if (status === "unauthenticated") {
      if (group !== "(auth)") router.replace("/(auth)/login");
      return;
    }

    // Autenticado: al aterrizar desde login o al abrir la app, decidimos
    // entre onboarding y tabs según si ya hay cuentas.
    if (group === "(auth)" || group === undefined) {
      let cancelled = false;
      void listAccounts().then((accounts) => {
        if (!cancelled) router.replace(accounts.length === 0 ? "/onboarding" : "/(tabs)");
      });
      return () => {
        cancelled = true;
      };
    }
  }, [status, segments, router]);

  useSyncOnForeground(status === "authenticated");

  if (migrationsError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg.base,
        }}
      >
        <Text variant="body" style={{ color: colors.danger.fg }}>
          No se pudo preparar la base de datos local.
        </Text>
      </View>
    );
  }

  if (!migrationsReady || status === "loading") {
    return <View style={{ flex: 1, backgroundColor: colors.bg.base }} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
