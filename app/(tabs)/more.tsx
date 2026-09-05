import { useSessionStore } from "@/features/auth/session-store";
import { Button, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function MoreScreen() {
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const { spacing } = useTokens();

  return (
    <Screen style={{ gap: spacing[5], paddingTop: spacing[4] }}>
      <Text variant="title1">Más</Text>
      {user ? (
        <Text variant="body" color="secondary">
          {user.name} · {user.email}
        </Text>
      ) : null}
      <Text variant="body" color="secondary">
        Cuentas, cuotas, suscripciones, deudas, metas, reportes y ajustes llegan en fases 3-5.
      </Text>
      <Button label="Cerrar sesión" variant="danger" onPress={() => void logout()} />
    </Screen>
  );
}
