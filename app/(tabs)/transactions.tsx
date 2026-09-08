import { useCallback, useMemo, useState } from "react";
import { Pressable, SectionList, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import {
  listTransactions,
  type TransactionFilters,
  type TransactionListItem,
} from "@/data/repositories/transactions";
import { formatForKind, Money } from "@/domain/money";
import { groupByDay } from "@/features/transactions/group-by-day";
import { Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const KIND_FILTERS: { value: TransactionFilters["kind"]; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "expense", label: "Gastos" },
  { value: "income", label: "Ingresos" },
  { value: "transfer", label: "Transfer." },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<TransactionFilters["kind"]>(undefined);

  const load = useCallback(async () => {
    setItems(await listTransactions({ search: search.trim() || undefined, kind }));
  }, [search, kind]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sections = useMemo(() => groupByDay(items, today()), [items]);

  function colorFor(item: TransactionListItem): string {
    if (item.kind === "transfer") return colors.transfer.fg;
    return item.kind === "income" ? colors.income.fg : colors.expense.fg;
  }

  return (
    <Screen>
      <View style={{ gap: spacing[3], paddingVertical: spacing[3] }}>
        <Text variant="title1">Movimientos</Text>
        <Input value={search} onChangeText={setSearch} placeholder="Buscar" returnKeyType="search" />
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          {KIND_FILTERS.map((f) => (
            <Chip
              key={f.label}
              label={f.label}
              selected={kind === f.value}
              onPress={() => setKind(f.value)}
            />
          ))}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: spacing[8] }}
        ListEmptyComponent={
          <Text variant="body" color="secondary" style={{ paddingVertical: spacing[5] }}>
            Todavía no hay movimientos.
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              backgroundColor: colors.bg.base,
              paddingVertical: spacing[2],
            }}
          >
            <Text variant="micro" color="tertiary">
              {section.title.toUpperCase()}
            </Text>
            <Text variant="micro" color="tertiary">
              {new Money(section.totalCents).format()}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/transactions/${item.id}`)}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: spacing[2],
              borderBottomWidth: 1,
              borderBottomColor: colors.border.subtle,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body">{item.description ?? item.categoryName ?? "Sin descripción"}</Text>
              <Text variant="caption" color="tertiary">
                {[item.categoryName, item.accountName].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Text variant="bodyStrong" style={{ color: colorFor(item) }}>
              {formatForKind(new Money(item.amountCents), item.kind as "expense" | "income" | "transfer")}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
