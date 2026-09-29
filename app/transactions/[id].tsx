import { useCallback, useState } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  createRefundLocally,
  getTransaction,
  type TransactionListItem,
} from "@/data/repositories/transactions";
import { triggerSync } from "@/features/sync/sync-manager";
import { deleteTransactionWithUndo } from "@/features/transactions/delete-with-undo";
import type { TransactionKind } from "@/domain/money";
import { formatDateLabel } from "@/lib/dates";
import {
  Button,
  Card,
  DetailRow,
  MoneyText,
  Screen,
  ScreenState,
  ScrollScreen,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing } = useTokens();
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
        <ScreenState status="loading" skeleton="detail">{null}</ScreenState>
      </Screen>
    );
  }

  const kind = txn.kind as TransactionKind;

  async function onDelete() {
    await deleteTransactionWithUndo(id);
    router.back();
  }

  async function onRefund() {
    if (!txn) return;
    await createRefundLocally(txn);
    triggerSync();
    router.back();
  }

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: txn.description ?? txn.categoryName ?? "Movimiento" }} />

      <MoneyText cents={txn.amountCents} currency={txn.currency} kind={kind} variant="display" />

      <Card style={{ gap: spacing[3] }}>
        {txn.description ? <DetailRow label="Descripción" value={txn.description} /> : null}
        <DetailRow label="Categoría" value={txn.categoryName ?? "Sin categoría"} />
        <DetailRow label="Cuenta" value={txn.accountName ?? "—"} />
        <DetailRow label="Fecha" value={formatDateLabel(txn.date)} />
        {txn.merchant ? <DetailRow label="Comercio" value={txn.merchant} /> : null}
        {txn.notes ? <DetailRow label="Notas" value={txn.notes} /> : null}
        <DetailRow label="Sincronizado" value={txn.serverSeq > 0 ? "sí" : "pendiente ⟳"} />
      </Card>

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
        <Text variant="caption" color="secondary">
          Las transferencias se editan desde sus dos cuentas.
        </Text>
      )}
    </ScrollScreen>
  );
}
