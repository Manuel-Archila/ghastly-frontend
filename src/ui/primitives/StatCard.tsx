import { Card } from "@/ui/primitives/Card";
import { MoneyText } from "@/ui/primitives/MoneyText";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface StatCardProps {
  label: string;
  cents: number;
  currency?: string;
  kind: "income" | "expense";
}

/** Tarjeta compacta de ingreso o gasto. Pesa menos que la cifra grande de la
 * pantalla: es apoyo, no protagonista. */
export function StatCard({ label, cents, currency, kind }: StatCardProps) {
  const { spacing } = useTokens();
  return (
    <Card style={{ flex: 1, gap: spacing[1], padding: spacing[3] }}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <MoneyText cents={cents} currency={currency} kind={kind} variant="bodyStrong" />
    </Card>
  );
}
