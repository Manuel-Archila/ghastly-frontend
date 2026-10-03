import { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";

import { Icon } from "@/ui/primitives/Icon";
import { Input } from "@/ui/primitives/Input";
import { ListItem } from "@/ui/primitives/ListItem";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface SelectOption {
  value: string;
  label: string;
  /** Subcategoría: se indenta bajo su padre en la lista (árbol de 2 niveles,
   * mismo criterio que `domain/categoryTree.ts::flattenTree`). */
  depth?: 0 | 1;
}

export interface SelectProps {
  label?: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Qué mostrar en el botón cuando no hay ninguna opción para elegir. */
  emptyMessage?: string;
}

const SEARCH_THRESHOLD = 6;
/** Proporción máxima de la pantalla que ocupa la hoja (sin teclado). */
const SHEET_MAX_RATIO = 0.7;
/** Aire que la hoja deja arriba cuando el teclado está abierto. */
const SHEET_TOP_GAP_RATIO = 0.08;

/**
 * Alto del teclado mientras `active`. Una `Modal` no se redimensiona sola con el
 * teclado, así que la hoja se levanta y se acorta con este valor para que el
 * buscador y las opciones filtradas queden encima del teclado y no debajo.
 */
function useKeyboardHeight(active: boolean): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!active) return;
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
      setHeight(0);
    };
  }, [active]);
  return active ? height : 0;
}

/**
 * Selector tipo dropdown: un botón compacto que muestra lo elegido y, al
 * tocarlo, abre una hoja con TODAS las opciones — para cuentas y categorías,
 * donde una fila de chips se vuelve ilegible apenas hay más de un puñado
 * (y, en captura rápida, antes ni dejaba elegir una que no estuviera entre
 * las 6 más usadas). Con buscador cuando hay más de 6 opciones.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Elegí una opción",
  emptyMessage,
}: SelectProps) {
  const { spacing, colors, radii, minTouchTarget, iconSize, stroke } =
    useTokens();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const keyboardHeight = useKeyboardHeight(open);
  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.min(
    windowHeight * SHEET_MAX_RATIO,
    windowHeight - keyboardHeight - windowHeight * SHEET_TOP_GAP_RATIO,
  );

  const selected = options.find((o) => o.value === value);
  const hasChildren = options.some((o) => o.depth === 1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  const triggerLabel =
    selected?.label ??
    (options.length === 0 ? (emptyMessage ?? placeholder) : placeholder);

  return (
    <View style={{ gap: spacing[1] }}>
      {label ? (
        <Text variant="caption" color="secondary">
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${triggerLabel}` : triggerLabel}
        onPress={() => options.length > 0 && setOpen(true)}
        disabled={options.length === 0}
        style={({ pressed }) => ({
          minHeight: minTouchTarget,
          borderRadius: radii.sm,
          borderWidth: stroke.hairline,
          borderColor: colors.border.control,
          paddingHorizontal: spacing[3],
          backgroundColor: colors.bg.surface,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: pressed ? 0.7 : options.length === 0 ? 0.5 : 1,
        })}
      >
        <Text variant="body" color={selected ? "primary" : "tertiary"}>
          {triggerLabel}
        </Text>
        <Icon
          name="chevron-down-outline"
          size={iconSize.sm}
          color={colors.text.tertiary}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            paddingBottom: keyboardHeight,
          }}
        >
          <Pressable
            accessibilityLabel="Cerrar"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.scrim,
            }}
            onPress={close}
          />
          <View
            style={{
              maxHeight: sheetMaxHeight,
              backgroundColor: colors.bg.elevated,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              paddingTop: spacing[3],
              paddingBottom: keyboardHeight > 0 ? spacing[2] : spacing[6],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: spacing[4],
                paddingBottom: spacing[2],
              }}
            >
              <Text variant="title2">{label ?? "Elegí una opción"}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={close}
                style={{
                  minWidth: minTouchTarget,
                  minHeight: minTouchTarget,
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name="close"
                  size={iconSize.md}
                  color={colors.text.secondary}
                />
              </Pressable>
            </View>

            {options.length > SEARCH_THRESHOLD ? (
              <View
                style={{
                  paddingHorizontal: spacing[4],
                  paddingBottom: spacing[2],
                }}
              >
                <Input
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar…"
                  autoFocus
                />
              </View>
            ) : null}

            {/* flexShrink: en RN es 0 por defecto, y sin él la lista crece a su alto total
              y la hoja la recorta en vez de dejarla hacer scroll. */}
            <ScrollView
              style={{ flexShrink: 1, paddingHorizontal: spacing[4] }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {filtered.length === 0 ? (
                <Text
                  variant="body"
                  color="secondary"
                  style={{ paddingVertical: spacing[4] }}
                >
                  Nada coincide con “{query}”.
                </Text>
              ) : (
                filtered.map((o, index) => (
                  <View
                    key={o.value}
                    style={{ paddingLeft: o.depth === 1 ? spacing[5] : 0 }}
                  >
                    <ListItem
                      title={o.label}
                      strong={o.depth === 0 && hasChildren}
                      trailing={
                        value === o.value ? (
                          <Icon
                            name="checkmark"
                            size={iconSize.md}
                            color={colors.accent.bg}
                          />
                        ) : undefined
                      }
                      chevron={false}
                      onPress={() => {
                        onChange(o.value);
                        close();
                      }}
                      last={index === filtered.length - 1}
                    />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
