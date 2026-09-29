import type { PropsWithChildren } from "react";
import { ScrollView } from "react-native";

import { Button } from "@/ui/primitives/Button";
import { Screen } from "@/ui/primitives/Screen";
import { Notice } from "@/ui/primitives/Notice";
import { useTokens } from "@/ui/tokens";

export interface FormScreenProps {
  /** Error del envío, ya traducido (`data/api/error-messages.ts`). */
  error?: string | null;
  submitLabel?: string;
  /** Texto del botón mientras `busy` está activo. */
  busyLabel?: string;
  onSubmit?: () => void;
  /** Envío en curso: deshabilita el botón y evita el doble tap. */
  busy?: boolean;
  submitDisabled?: boolean;
}

/**
 * Esqueleto único de los formularios (alta y edición): mismo padding, teclado
 * que no tapa campos, error y botón de envío. Reemplaza las 10 variantes de
 * `contentContainerStyle` que había repartidas.
 */
export function FormScreen({
  children,
  error,
  submitLabel,
  busyLabel = "Guardando…",
  onSubmit,
  busy = false,
  submitDisabled = false,
}: PropsWithChildren<FormScreenProps>) {
  const { spacing } = useTokens();
  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: spacing[4],
          paddingTop: spacing[4],
          paddingBottom: spacing[8],
        }}
      >
        {children}
        {error ? <Notice tone="danger" text={error} /> : null}
        {submitLabel && onSubmit ? (
          <Button
            label={busy ? busyLabel : submitLabel}
            onPress={onSubmit}
            disabled={busy || submitDisabled}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
