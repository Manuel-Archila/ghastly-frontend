import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { errorMessageFor } from "@/data/api/error-messages";
import { useSessionStore } from "@/features/auth/session-store";
import { Button, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function RegisterScreen() {
  const register = useSessionStore((s) => s.register);
  const login = useSessionStore((s) => s.login);
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await register(email.trim(), password, name.trim());
      await login(email.trim(), password);
    } catch (e) {
      setError(errorMessageFor(e, "No se pudo crear la cuenta."));
      setBusy(false);
    }
  }

  return (
    <Screen style={{ justifyContent: "center", gap: spacing[4] }}>
      <Text variant="title1">Crear cuenta</Text>
      <View style={{ gap: spacing[3] }}>
        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
        <Input
          label="Correo"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tu@correo.com"
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Mínimo 8 caracteres"
        />
        {error ? (
          <Text variant="caption" style={{ color: colors.danger.fg }}>
            {error}
          </Text>
        ) : null}
        <Button label={busy ? "Creando…" : "Crear cuenta"} onPress={onSubmit} disabled={busy} />
        <Button label="Ya tengo cuenta" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
