import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View, type ViewStyle } from "react-native";
import { Stack, useFocusEffect } from "expo-router";

import type { Ionicons } from "@expo/vector-icons";

import { computeUpcoming, type CommitmentEvent } from "@/features/calendar/upcoming";
import { Money } from "@/domain/money";
import { daysBetween, todayIso } from "@/lib/dates";
import { FadeIn, Icon, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DOT_ICON: Record<CommitmentEvent["kind"], keyof typeof Ionicons.glyphMap> = {
  recurring: "repeat-outline",
  installment: "layers-outline",
  card_statement: "card-outline",
  card_payment: "card-outline",
};

function dotColor(
  kind: CommitmentEvent["kind"],
  colors: ReturnType<typeof useTokens>["colors"],
): string {
  switch (kind) {
    case "recurring":
      return colors.transfer.fg;
    case "installment":
      return colors.accent.bg;
    case "card_statement":
      return colors.warning.fg;
    case "card_payment":
      return colors.expense.fg;
  }
}

/** Cada tipo de compromiso también se distingue por FORMA, no solo color
 * (CLAUDE.md "nunca solo color" / DESIGN.md Sign-and-Icon Rule) — a este
 * tamaño un ícono real no se lee, pero un círculo, un cuadrado, un rombo y
 * un anillo sí se distinguen sin depender del matiz. */
const DOT_SIZE = 6;

function dotStyle(kind: CommitmentEvent["kind"], color: string): ViewStyle {
  const base: ViewStyle = { width: DOT_SIZE, height: DOT_SIZE };
  switch (kind) {
    case "recurring":
      return { ...base, borderRadius: DOT_SIZE / 2, backgroundColor: color }; // círculo
    case "installment":
      return { ...base, borderRadius: 1, backgroundColor: color }; // cuadrado
    case "card_statement":
      return {
        ...base,
        borderRadius: 1,
        backgroundColor: color,
        transform: [{ rotate: "45deg" }],
      }; // rombo
    case "card_payment":
      return {
        ...base,
        borderRadius: DOT_SIZE / 2,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: "transparent",
      }; // anillo
  }
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/**
 * Grilla mensual (PLAN-frontend §6.9): cada día con un punto de color por
 * compromiso que cae ese día. Tocar un día abre su detalle abajo. Los
 * compromisos son a futuro — meses pasados salen vacíos.
 */
export default function CalendarScreen() {
  const { spacing, colors, radii, minTouchTarget } = useTokens();
  const today = todayIso();
  const [visibleMonth, setVisibleMonth] = useState(today.slice(0, 7));
  const [byDate, setByDate] = useState<Map<string, CommitmentEvent[]>>(new Map());
  const [committedThisMonthCents, setCommitted] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [y, m] = visibleMonth.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const horizon = Math.max(0, daysBetween(today, lastDay) + 1);
    const { events, committedThisMonthCents: committed } = await computeUpcoming(horizon);
    const grouped = new Map<string, CommitmentEvent[]>();
    for (const e of events) {
      if (e.date.slice(0, 7) !== visibleMonth) continue;
      const list = grouped.get(e.date) ?? [];
      list.push(e);
      grouped.set(e.date, list);
    }
    setByDate(grouped);
    setCommitted(visibleMonth === today.slice(0, 7) ? committed : 0);
  }, [visibleMonth, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const cells = useMemo(() => {
    const [y, m] = visibleMonth.split("-").map(Number);
    const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(`${visibleMonth}-${String(d).padStart(2, "0")}`);
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [visibleMonth]);

  const [yy, mm] = visibleMonth.split("-").map(Number);
  const selectedEvents = selectedDay ? (byDate.get(selectedDay) ?? []) : [];

  return (
    <Screen>
      <Stack.Screen options={{ title: "Calendario" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            onPress={() => {
              setSelectedDay(null);
              setVisibleMonth((prev) => shiftMonth(prev, -1));
            }}
            style={{ minWidth: minTouchTarget, minHeight: minTouchTarget, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="chevron-back" size={22} color={colors.text.primary} />
          </Pressable>
          <Text variant="title2">
            {MONTHS[mm - 1]} {yy}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
            onPress={() => {
              setSelectedDay(null);
              setVisibleMonth((prev) => shiftMonth(prev, 1));
            }}
            style={{ minWidth: minTouchTarget, minHeight: minTouchTarget, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="chevron-forward" size={22} color={colors.text.primary} />
          </Pressable>
        </View>

        {committedThisMonthCents > 0 ? (
          <View>
            <Text variant="caption" color="secondary">
              Comprometido este mes
            </Text>
            <Text variant="display">{new Money(committedThisMonthCents).format()}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row" }}>
          {WEEKDAYS.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", paddingBottom: spacing[1] }}>
              <Text variant="caption" color="tertiary">
                {d}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((iso, i) => {
            if (!iso) return <View key={i} style={{ width: `${100 / 7}%`, minHeight: 52 }} />;
            const dayNum = Number(iso.slice(8, 10));
            const events = byDate.get(iso) ?? [];
            const isToday = iso === today;
            const isSelected = iso === selectedDay;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={
                  events.length > 0
                    ? `Día ${dayNum}, ${events.length} compromiso${events.length > 1 ? "s" : ""}`
                    : `Día ${dayNum}`
                }
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedDay(isSelected ? null : iso)}
                style={{
                  width: `${100 / 7}%`,
                  minHeight: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: radii.full,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSelected
                      ? colors.accent.bg
                      : isToday
                        ? colors.bg.sunken
                        : "transparent",
                  }}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: isSelected ? colors.accent.fg : colors.text.primary,
                      fontWeight: isToday ? "700" : "400",
                    }}
                  >
                    {dayNum}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 3, height: DOT_SIZE }}>
                  {events.slice(0, 3).map((e, j) => (
                    <View key={j} style={dotStyle(e.kind, dotColor(e.kind, colors))} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {selectedDay ? (
          <View style={{ gap: spacing[2] }}>
            <Text variant="bodyStrong">{selectedDay}</Text>
            {selectedEvents.length === 0 ? (
              <Text variant="body" color="secondary">
                Nada este día.
              </Text>
            ) : (
              selectedEvents.map((e, i) => (
                <FadeIn key={i} delay={i * 30}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: spacing[2],
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.subtle,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                      <Icon name={DOT_ICON[e.kind]} size={18} />
                      <Text variant="body">{e.label}</Text>
                    </View>
                    {e.amountCents !== null ? (
                      <Text variant="bodyStrong">{new Money(e.amountCents).format()}</Text>
                    ) : null}
                  </View>
                </FadeIn>
              ))
            )}
          </View>
        ) : (
          <Text variant="caption" color="tertiary">
            Tocá un día para ver sus compromisos.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}
