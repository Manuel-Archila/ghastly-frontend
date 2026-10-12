/**
 * Título de una fila de transferencia: "Origen → Destino". Cada transferencia
 * son dos filas (salida y entrada); las dos muestran el mismo título para que
 * se lea igual desde cualquiera de las cuentas.
 */
export function transferTitle(
  direction: "in" | "out" | null,
  accountName: string | null,
  counterpartName: string | null,
): string | null {
  if (!accountName || !counterpartName || !direction) return null;
  return direction === "out"
    ? `${accountName} → ${counterpartName}`
    : `${counterpartName} → ${accountName}`;
}
