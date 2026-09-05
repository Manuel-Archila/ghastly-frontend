import { Screen, Text } from "@/ui/primitives";

export default function TransactionsScreen() {
  return (
    <Screen>
      <Text variant="title1">Movimientos</Text>
      <Text variant="body" color="secondary">
        Fase 1: lista de movimientos con búsqueda y filtros.
      </Text>
    </Screen>
  );
}
