import { Screen, Text } from "@/ui/primitives";

export default function BudgetScreen() {
  return (
    <Screen>
      <Text variant="title1">Presupuesto</Text>
      <Text variant="body" color="secondary">
        Fase 2: consumo por categoría, proyección y rollover.
      </Text>
    </Screen>
  );
}
