import { useState } from "react";
import { View } from "react-native";
import { Link } from "expo-router";

import { errorMessageFor } from "@/data/api/error-messages";
import { useSessionStore } from "@/features/auth/session-store";
import { Button, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function LoginScreen() {
  const login = useSessionStore((s) => s.login);
  const { spacing, colors } = useTokens();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(errorMessageFor(e, "No se pudo iniciar sesión."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen style={{ justifyContent: "center", gap: spacing[4] }}>
      <Text variant="title1">Ghastly</Text>
      <View style={{ gap: spacing[3] }}>
        <Input
          label="Correo"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="tu@correo.com"
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        {error ? (
          <Text variant="caption" style={{ color: colors.danger.fg }}>
            {error}
          </Text>
        ) : null}
        <Button label={busy ? "Entrando…" : "Entrar"} onPress={onSubmit} disabled={busy} />
      </View>
      <Link href="/(auth)/register" style={{ alignSelf: "center" }}>
        <Text variant="body" color="secondary">
          Crear una cuenta
        </Text>
      </Link>
    </Screen>
  );
}
