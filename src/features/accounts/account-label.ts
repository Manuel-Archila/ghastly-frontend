/**
 * Nombre de una cuenta para mostrarlo en un chip o una fila. Las que no son en
 * quetzales llevan su moneda ("BAC Visa · USD"): una cuenta en dólares se
 * confundía con una en quetzales al elegirla. Las de quetzales quedan sin
 * sufijo, que es el caso común.
 */
export function accountLabel(account: { name: string; currency: string }): string {
  return account.currency === "GTQ" ? account.name : `${account.name} · ${account.currency}`;
}
