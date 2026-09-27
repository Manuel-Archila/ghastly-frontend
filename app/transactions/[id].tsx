import { useCallback, useState } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  createRefundLocally,
  deleteTransactionLocally,
  getTransaction,
  type TransactionListItem,
} from "@/data/repositories/transactions";
import { triggerSync } from "@/features/sync/sync-manager";
import { formatForKind, Money } from "@/domain/money";
import { Button, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

function Row({ label, value }: { label: string; value: string }) {
  const { spacing, colors } = useTokens();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: spacing[2],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
      }}
    >
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing, colors } = useTokens();
  const [txn, setTxn] = useState<TransactionListItem | undefined>();

  useFocusEffect(
    useCallback(() => {
      void getTransaction(id).then(setTxn);
    }, [id]),
  );

  if (!txn) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Movimiento" }} />
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  const kind = txn.kind as "expense" | "income" | "transfer";
  const color =
    kind === "transfer" ? colors.transfer.fg : kind === "income" ? colors.income.fg : colors.expense.fg;

  async function onDelete() {
    await deleteTransactionLocally(id);
    triggerSync();
    router.back();
  }

  async function onRefund() {
    if (!txn) return;
    await createRefundLocally(txn);
    triggerSync();
    router.back();
  }

  return (
    <Screen style={{ gap: spacing[4] }}>
      <Stack.Screen options={{ title: txn.description ?? txn.categoryName ?? "Movimiento" }} />

      <Text variant="display" style={{ color }}>
        {formatForKind(new Money(txn.amountCents), kind)}
      </Text>

      <View>
        {txn.description ? <Row label="Descripción" value={txn.description} /> : null}
        <Row label="Categoría" value={txn.categoryName ?? "Sin categoría"} />
        <Row label="Cuenta" value={txn.accountName ?? "—"} />
        <Row label="Fecha" value={txn.date} />
        {txn.merchant ? <Row label="Comercio" value={txn.merchant} /> : null}
        {txn.notes ? <Row label="Notas" value={txn.notes} /> : null}
        <Row label="Sincronizado" value={txn.serverSeq > 0 ? "sí" : "pendiente ⟳"} />
      </View>

      {kind !== "transfer" ? (
        <View style={{ gap: spacing[2] }}>
          <Button label="Editar" onPress={() => router.push(`/transactions/${id}/edit`)} />
          {kind === "expense" && !txn.refundOfId ? (
            <Button label="Registrar reembolso" variant="secondary" onPress={onRefund} />
          ) : null}
          {kind === "expense" && !txn.refundOfId ? (
            <Button
              label="Dividir / me deben"
              variant="secondary"
              onPress={() => router.push(`/receivables/new?transactionId=${id}`)}
            />
          ) : null}
          <Button label="Eliminar" variant="danger" onPress={onDelete} />
        </View>
      ) : (
        <Text variant="caption" color="tertiary">
          Las transferencias se editan desde sus dos cuentas.
        </Text>
      )}
    </Screen>
  );
}
