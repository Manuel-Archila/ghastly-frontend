import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { FadeIn, ListRow, Screen } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function SettingsScreen() {
  const router = useRouter();
  const { spacing } = useTokens();

  const rows = [
    { icon: "pricetags-outline", label: "Categorías", href: "/categories" },
    { icon: "copy-outline", label: "Plantillas", href: "/templates" },
    { icon: "notifications-outline", label: "Notificaciones", href: "/settings/notifications" },
    { icon: "phone-portrait-outline", label: "Dispositivos", href: "/settings/devices" },
    { icon: "sync-outline", label: "Sincronización", href: "/settings/sync" },
  ] as const;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Ajustes" }} />
      <ScrollView contentContainerStyle={{ paddingVertical: spacing[4] }}>
        <View>
          {rows.map((row, index) => (
            <FadeIn key={row.label} delay={index * 30}>
              <ListRow icon={row.icon} label={row.label} onPress={() => router.push(row.href)} />
            </FadeIn>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
