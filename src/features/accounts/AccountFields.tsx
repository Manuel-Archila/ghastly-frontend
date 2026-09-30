import { View } from "react-native";

import { Chip, ChipGroup, Input, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

import {
  ACCOUNT_CURRENCIES,
  ACCOUNT_TYPES,
  canAddDollarBalance,
  isCreditCard,
  type AccountDraft,
} from "./account-draft";

/**
 * Campos para dar de alta una cuenta. Lo usan "Nueva cuenta" y el onboarding, así
 * que quien empieza de cero tiene las mismas opciones (moneda, datos de tarjeta)
 * que quien agrega una cuenta después.
 */
export function AccountFields({
  draft,
  onChange,
}: {
  draft: AccountDraft;
  onChange: (patch: Partial<AccountDraft>) => void;
}) {
  const { spacing } = useTokens();
  const card = isCreditCard(draft);

  return (
    <View style={{ gap: spacing[4] }}>
      <Input
        label="Nombre"
        value={draft.name}
        onChangeText={(name) => onChange({ name })}
        placeholder="BAC Monetaria"
      />

      <ChipGroup label="Tipo">
        {ACCOUNT_TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={draft.type === t.value}
            onPress={() => onChange({ type: t.value })}
          />
        ))}
      </ChipGroup>

      <ChipGroup label="Moneda">
        {ACCOUNT_CURRENCIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={draft.currency === c}
            // Un segundo saldo en dólares solo tiene sentido desde una cuenta en quetzales.
            onPress={() => onChange({ currency: c, ...(c === "USD" ? { alsoInDollars: false } : {}) })}
          />
        ))}
      </ChipGroup>

      <Input
        label={`Saldo actual (${draft.currency})`}
        value={draft.balance}
        onChangeText={(balance) => onChange({ balance })}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      {card ? (
        <View style={{ gap: spacing[4] }}>
          <Input
            label="Límite de crédito (opcional)"
            value={draft.creditLimit}
            onChangeText={(creditLimit) => onChange({ creditLimit })}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Input
            label="Día de corte (opcional)"
            value={draft.statementDay}
            onChangeText={(statementDay) => onChange({ statementDay })}
            keyboardType="number-pad"
            placeholder="1-31"
          />
          <Input
            label="Día de pago (opcional)"
            value={draft.paymentDueDay}
            onChangeText={(paymentDueDay) => onChange({ paymentDueDay })}
            keyboardType="number-pad"
            placeholder="1-31"
          />
          <Input
            label="Tasa de interés anual % (opcional)"
            value={draft.interestRate}
            onChangeText={(interestRate) => onChange({ interestRate })}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
          <View style={{ gap: spacing[1] }}>
            <Input
              label="Pago mínimo, % del saldo (opcional)"
              value={draft.minimumPaymentPercent}
              onChangeText={(minimumPaymentPercent) => onChange({ minimumPaymentPercent })}
              keyboardType="decimal-pad"
              placeholder="0.0"
            />
            <Text variant="caption" color="secondary">
              Si no sabés el porcentaje, dejalo vacío: solo no se calculará el pago mínimo. Lo
              podés completar después.
            </Text>
          </View>

          {canAddDollarBalance(draft) ? (
            <View style={{ gap: spacing[3] }}>
              <ChipGroup label="Gastos en dólares">
                <Chip
                  label="También tiene saldo en dólares"
                  selected={draft.alsoInDollars}
                  onPress={() => onChange({ alsoInDollars: !draft.alsoInDollars })}
                />
              </ChipGroup>
              {draft.alsoInDollars ? (
                <>
                  <Text variant="caption" color="secondary">
                    Se crea una cuenta aparte, “{draft.name.trim() || "Tarjeta"} USD”, porque el
                    banco cobra los dólares por separado. Comparte los días de corte y de pago.
                  </Text>
                  <Input
                    label="Saldo en dólares (USD)"
                    value={draft.usdBalance}
                    onChangeText={(usdBalance) => onChange({ usdBalance })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                  <Input
                    label="Límite en dólares (opcional)"
                    value={draft.usdCreditLimit}
                    onChangeText={(usdCreditLimit) => onChange({ usdCreditLimit })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
