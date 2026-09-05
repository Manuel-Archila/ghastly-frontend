import { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";

import { useRunMigrations } from "@/data/db/migrate";
import { useSessionStore } from "@/features/auth/session-store";
import { Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

/**
 * SOLO composición (CLAUDE.md). Antes de mostrar nada: corre migraciones y
 * restaura la sesión. Después, redirige entre `(auth)` y `(tabs)` según el
 * estado de sesión — el patrón estándar de Expo Router.
 */
export default function RootLayout() {
  const { success: migrationsReady, error: migrationsError } = useRunMigrations();
  const status = useSessionStore((s) => s.status);
  const restore = useSessionStore((s) => s.restore);
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTokens();

  useEffect(() => {
    if (migrationsReady) {
      void restore();
    }
  }, [migrationsReady, restore]);

  useEffect(() => {
    if (status === "loading") return;
    const inAuthGroup = segments[0] === "(auth)";
    if (status === "unauthenticated" && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (status === "authenticated" && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [status, segments, router]);

  if (migrationsError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg.base }}>
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
