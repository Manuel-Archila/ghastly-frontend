import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";

import { evaluateKeypadExpression } from "@/domain/keypad-expression";
import { Icon } from "@/ui/primitives/Icon";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

/**
 * Teclado numérico propio (PLAN-frontend §6.1): aparición instantánea, sin
 * reflow ni latencia del teclado del sistema, teclas grandes, y soporta
 * `+` / `−` para sumar la cuenta del súper sin salir. Feedback háptico
 * ligero en cada tecla.
 *
 * El valor se maneja como una expresión de operandos decimales en
 * quetzales (`"12.50+3"`); `onChange` emite el total ya en centavos.
 */
export interface KeypadNumericProps {
  onChange: (cents: number) => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

export function KeypadNumeric({ onChange }: KeypadNumericProps) {
  const { colors, spacing, radii, minTouchTarget, iconSize } = useTokens();
  const [expr, setExpr] = useState("");

  const emit = useCallback(
    (next: string) => {
      setExpr(next);
      onChange(evaluateKeypadExpression(next));
    },
    [onChange],
  );

  const press = useCallback(
    (key: string) => {
      void Haptics.selectionAsync();
      if (key === "⌫") {
        emit(expr.slice(0, -1));
        return;
      }
      if (key === ".") {
        const currentOperand = expr.split(/[+-]/).pop() ?? "";
        if (currentOperand.includes(".")) return;
        emit(expr === "" ? "0." : expr + ".");
        return;
      }
      emit(expr + key);
    },
    [expr, emit],
  );

  const pressOperator = useCallback(
    (op: "+" | "-") => {
      void Haptics.selectionAsync();
      if (expr === "" || expr.endsWith("+") || expr.endsWith("-")) {
        emit(expr.replace(/[+-]$/, "") + op);
      } else {
        emit(expr + op);
      }
    },
    [expr, emit],
  );

  const keyStyle = {
    flexGrow: 1,
    flexBasis: "30%" as const,
    // Teclas de dígito más grandes que el mínimo: se aporrean con el pulgar.
    minHeight: minTouchTarget + spacing[2],
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.bg.surface,
  };

  return (
    <View style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        {(["+", "-"] as const).map((op) => (
          <Pressable
            key={op}
            accessibilityRole="button"
            accessibilityLabel={op === "+" ? "sumar" : "restar"}
            onPress={() => pressOperator(op)}
            style={({ pressed }) => [
              keyStyle,
              {
                flexBasis: "48%",
                minHeight: minTouchTarget,
                backgroundColor: pressed ? colors.border.subtle : colors.bg.sunken,
              },
            ]}
          >
            <Text variant="title2">{op === "-" ? "−" : "+"}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={key === "⌫" ? "borrar" : key === "." ? "punto decimal" : key}
            onPress={() => press(key)}
            style={({ pressed }) => [keyStyle, pressed && { backgroundColor: colors.bg.sunken }]}
          >
            {key === "⌫" ? (
              <Icon name="backspace-outline" size={iconSize.lg} color={colors.text.primary} />
            ) : (
              <Text variant="title2">{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
