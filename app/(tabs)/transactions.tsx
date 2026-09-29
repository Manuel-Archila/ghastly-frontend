import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  listTransactions,
  type TransactionFilters,
  type TransactionListItem,
} from "@/data/repositories/transactions";
import { formatForKind, Money, type TransactionKind } from "@/domain/money";
import { flattenSections, groupByDay, type FlatRow } from "@/features/transactions/group-by-day";
import { todayIso } from "@/lib/dates";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  Chip,
  Input,
  ListItem,
  MoneyText,
  Screen,
  ScreenHeader,
  ScreenState,
  SectionHeader,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const KIND_FILTERS: { value: TransactionFilters["kind"]; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "expense", label: "Gastos" },
  { value: "income", label: "Ingresos" },
  { value: "transfer", label: "Transfer." },
];

const PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 250;

const TransactionRow = memo(function TransactionRow({
  item,
  last,
  onOpen,
}: {
  item: TransactionListItem;
  last: boolean;
  onOpen: (id: string) => void;
}) {
  const kind = item.kind as TransactionKind;
  const title = item.description ?? item.categoryName ?? "Sin descripción";
  return (
    <ListItem
      title={title}
      subtitle={[item.categoryName, item.accountName].filter(Boolean).join(" · ") || undefined}
      trailing={<MoneyText cents={item.amountCents} currency={item.currency} kind={kind} />}
      accessibilityLabel={`${title}, ${formatForKind(new Money(item.amountCents, item.currency), kind)}`}
      onPress={() => onOpen(item.id)}
      chevron={false}
      last={last}
    />
  );
});

const DayHeader = memo(function DayHeader({ title, totalCents }: { title: string; totalCents: number }) {
  const { colors } = useTokens();
  // Fondo opaco: el encabezado queda fijo y las filas pasan por debajo.
  return (
    <View style={{ backgroundColor: colors.bg.base }}>
      <SectionHeader label={title} trailing={new Money(totalCents).format()} />
    </View>
  );
});

export default function TransactionsScreen() {
  const router = useRouter();
  const { spacing } = useTokens();
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();

  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<TransactionFilters["kind"]>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<{ id: string; name: string } | null>(null);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  // Llega desde Reportes → Categorías (tocar una fila filtra Movimientos
  // por esa categoría). Solo se toma al entrar con el param presente.
  useEffect(() => {
    if (!params.categoryId) return;
    void (async () => {
      setCategoryFilter({ id: params.categoryId!, name: params.categoryName ?? "" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al recibir el param
  }, [params.categoryId]);

  const load = useCallback(async () => {
    try {
      setItems(
        await listTransactions(
          {
            search: debouncedSearch.trim() || undefined,
            kind,
            categoryId: categoryFilter?.id,
          },
          limit,
        ),
      );
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoaded(true);
    }
  }, [debouncedSearch, kind, categoryFilter, limit]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Al cambiar un filtro se vuelve al primer tramo.
  const resetPaging = () => setLimit(PAGE_SIZE);

  const { rows, headerIndices } = useMemo(
    () => flattenSections(groupByDay(items, todayIso())),
    [items],
  );

  const onOpen = useCallback((id: string) => router.push(`/transactions/${id}`), [router]);

  const renderItem = useCallback(
    ({ item: row, index }: { item: FlatRow; index: number }) => {
      if (row.type === "header") return <DayHeader title={row.title} totalCents={row.totalCents} />;
      const next = rows[index + 1];
      return <TransactionRow item={row.item} last={!next || next.type === "header"} onOpen={onOpen} />;
    },
    [rows, onOpen],
  );

  const onEndReached = useCallback(() => {
    // Si el último tramo vino lleno, puede haber más.
    if (items.length >= limit) setLimit((l) => l + PAGE_SIZE);
  }, [items.length, limit]);

  const hasFilters = Boolean(debouncedSearch.trim() || kind || categoryFilter);
  const status = failed ? "error" : !loaded ? "loading" : rows.length === 0 ? "empty" : "data";

  return (
    <Screen>
      <ScreenHeader title="Movimientos" />
      <View style={{ gap: spacing[3], paddingBottom: spacing[3] }}>
        <Input
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            resetPaging();
          }}
          placeholder="Buscar"
          returnKeyType="search"
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {KIND_FILTERS.map((f) => (
            <Chip
              key={f.label}
              label={f.label}
              selected={kind === f.value}
              onPress={() => {
                setKind(f.value);
                resetPaging();
              }}
            />
          ))}
        </View>
        {categoryFilter ? (
          <Chip
            label={`Categoría: ${categoryFilter.name} ✕`}
            selected
            onPress={() => {
              setCategoryFilter(null);
              resetPaging();
            }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        {status === "data" ? (
          <FlashList
            data={rows}
            renderItem={renderItem}
            keyExtractor={(row) => row.key}
            getItemType={(row) => row.type}
            stickyHeaderIndices={headerIndices}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing[8] }}
          />
        ) : (
          <ScreenState
            status={status}
            error="No se pudieron cargar los movimientos."
            onRetry={() => void load()}
            empty={
              hasFilters
                ? { message: "No hay movimientos con esos filtros.", icon: "search-outline" }
                : {
                    message: "Todavía no hay movimientos.",
                    icon: "receipt-outline",
                    actionLabel: "Registrar un gasto",
                    onAction: () => router.push("/(modals)/quick-add"),
                  }
            }
          >
            {null}
          </ScreenState>
        )}
      </View>
    </Screen>
  );
}
