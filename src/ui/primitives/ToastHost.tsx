import { useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, FadeOut, Keyframe } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";
import { bezier, duration, enterOffset } from "@/ui/tokens/motion";
import { useToastStore } from "@/ui/toast";
import { useReducedMotion } from "@/ui/useReducedMotion";

const EASE_OUT = Easing.bezier(...bezier.out);
// La salida es más rápida que la entrada: el sistema responde, no hace esperar.
const EXITING = FadeOut.duration(duration.press);

/**
 * Monta UNA vez en `app/_layout.tsx`. Muestra el toast actual sobre la barra
 * de tabs, se cierra solo tras `durationMs` y ofrece la acción (Deshacer).
 * Entrada: fundido + subida corta. Con "Reducir movimiento", solo fundido.
 */
export function ToastHost() {
  const toast = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);
  const { colors, spacing, radii, minTouchTarget, opacity, stroke } = useTokens();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  const entering = useMemo(
    () =>
      new Keyframe({
        0: { opacity: 0, transform: [{ translateY: reduceMotion ? 0 : enterOffset }] },
        100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
      }).duration(duration.fast),
    [reduceMotion],
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: spacing[4],
        right: spacing[4],
        bottom: insets.bottom + minTouchTarget + spacing[4],
      }}
    >
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={entering}
          exiting={EXITING}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            paddingLeft: spacing[4],
            borderRadius: radii.md,
            borderWidth: stroke.hairline,
            borderColor: colors.border.strong,
            backgroundColor: colors.bg.elevated,
          }}
        >
          <Text variant="body" style={{ flex: 1, paddingVertical: spacing[3] }}>
            {toast.message}
          </Text>
          {toast.actionLabel ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                toast.onAction?.();
                dismiss();
              }}
              style={({ pressed }) => ({
                minHeight: minTouchTarget,
                justifyContent: "center",
                paddingHorizontal: spacing[4],
                opacity: pressed ? opacity.pressed : 1,
              })}
            >
              <Text variant="bodyStrong" style={{ color: colors.accent.bg }}>
                {toast.actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}
