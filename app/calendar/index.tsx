import { memo, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";

import type { Ionicons } from "@expo/vector-icons";

import { computeUpcoming, type CommitmentEvent } from "@/features/calendar/upcoming";
import {
  COMMITMENT_LABEL,
  CommitmentMark,
  type CommitmentKind,
} from "@/features/calendar/CommitmentMark";
import { Money } from "@/domain/money";
import { daysBetween, formatDateLabel, formatMonthLabel, todayIso } from "@/lib/dates";
import {
  FadeIn,
  HeroFigure,
  ListItem,
  MoneyText,
  MonthSwitcher,
  Screen,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];
const MAX_MARKS = 3;
const KINDS: CommitmentKind[] = ["recurring", "installment", "card_statement", "card_payment"];

const KIND_ICON: Record<CommitmentEvent["kind"], keyof typeof Ionicons.glyphMap> = {
  recurring: "repeat-outline",
  installment: "layers-outline",
  card_statement: "card-outline",
  card_payment: "card-outline",
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** "Día 5, 2 compromisos: suscripción, cuota" — el tipo se anuncia, no se
 * deduce del color ni de la forma. */
function dayLabel(dayNum: number, events: CommitmentEvent[]): string {
  if (events.length === 0) return `Día ${dayNum}`;
  const kinds = [...new Set(events.map((e) => COMMITMENT_LABEL[e.kind].toLowerCase()))];
  return `Día ${dayNum}, ${events.length} compromiso${events.length > 1 ? "s" : ""}: ${kinds.join(", ")}`;
}

const DayCell = memo(function DayCell({
  iso,
  events,
  isToday,
  isSelected,
  onSelect,
}: {
  iso: string;
  events: CommitmentEvent[];
  isToday: boolean;
  isSelected: boolean;
  onSelect: (iso: string) => void;
}) {
  const { colors, spacing, radii, minTouchTarget, iconSize, stroke, dot } = useTokens();
  const dayNum = Number(iso.slice(8, 10));
  const circle = iconSize.lg + spacing[1];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dayLabel(dayNum, events)}
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(iso)}
      style={{
        width: `${100 / 7}%`,
        minHeight: minTouchTarget + spacing[1],
        alignItems: "center",
        justifyContent: "center",
        gap: spacing[1],
      }}
    >
      <View
        style={{
          width: circle,
          height: circle,
          borderRadius: radii.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isSelected ? colors.accent.bg : "transparent",
          // Hoy se marca con un aro, no solo con color de fondo.
          borderWidth: isToday ? stroke.control : 0,
          borderColor: colors.accent.bg,
        }}
      >
        <Text
          variant="caption"
          style={{ color: isSelected ? colors.accent.fg : colors.text.primary }}
        >
          {dayNum}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: spacing[1], height: dot.sm }}>
        {events.slice(0, MAX_MARKS).map((e, j) => (
          <CommitmentMark key={j} kind={e.kind} />
        ))}
      </View>
    </Pressable>
  );
});

/**
 * Grilla mensual (PLAN-frontend §6.9): cada día con una marca por compromiso
 * que cae ese día. Tocar un día abre su detalle abajo. Los compromisos son a
 * futuro — meses pasados salen vacíos.
 */
export default function CalendarScreen() {
  const { spacing, minTouchTarget } = useTokens();
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

  const onSelect = useCallback(
    (iso: string) => setSelectedDay((prev) => (prev === iso ? null : iso)),
    [],
  );

  const changeMonth = (delta: number) => {
    setSelectedDay(null);
    setVisibleMonth((prev) => shiftMonth(prev, delta));
  };

  const selectedEvents = selectedDay ? (byDate.get(selectedDay) ?? []) : [];

  return (
    <Screen>
      <Stack.Screen options={{ title: "Calendario" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        <MonthSwitcher
          label={formatMonthLabel(visibleMonth)}
          onPrev={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
        />

        {committedThisMonthCents > 0 ? (
          <HeroFigure
            label="Comprometido este mes"
            value={new Money(committedThisMonthCents).format()}
          />
        ) : null}

        <View>
          <View style={{ flexDirection: "row" }}>
            {WEEKDAYS.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center", paddingBottom: spacing[1] }}>
                <Text variant="caption" color="secondary">
                  {d}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {cells.map((iso, i) =>
              iso ? (
                <DayCell
                  key={iso}
                  iso={iso}
                  events={byDate.get(iso) ?? []}
                  isToday={iso === today}
                  isSelected={iso === selectedDay}
                  onSelect={onSelect}
                />
              ) : (
                <View
                  key={`blank-${i}`}
                  style={{ width: `${100 / 7}%`, minHeight: minTouchTarget + spacing[1] }}
                />
              ),
            )}
          </View>
        </View>

        <View
          accessibilityLabel="Leyenda de compromisos"
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[3] }}
        >
          {KINDS.map((kind) => (
            <View key={kind} style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
              <CommitmentMark kind={kind} />
              <Text variant="caption" color="secondary">
                {COMMITMENT_LABEL[kind]}
              </Text>
            </View>
          ))}
        </View>

        {selectedDay ? (
          <View>
            <Text variant="bodyStrong" accessibilityRole="header">
              {formatDateLabel(selectedDay)}
            </Text>
            {selectedEvents.length === 0 ? (
              <Text variant="body" color="secondary" style={{ paddingTop: spacing[2] }}>
                Nada este día.
              </Text>
            ) : (
              selectedEvents.map((e, i) => (
                <FadeIn key={i} delay={i * 30}>
                  <ListItem
                    icon={KIND_ICON[e.kind]}
                    title={e.label}
                    subtitle={COMMITMENT_LABEL[e.kind]}
                    trailing={e.amountCents !== null ? <MoneyText cents={e.amountCents} /> : undefined}
                    last={i === selectedEvents.length - 1}
                  />
                </FadeIn>
              ))
            )}
          </View>
        ) : (
          <Text variant="caption" color="secondary">
            Tocá un día para ver sus compromisos.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}
