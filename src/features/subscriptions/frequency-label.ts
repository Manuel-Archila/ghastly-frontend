const LABELS: Record<string, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

/** Etiqueta en español de una frecuencia. El enum del servidor nunca se
 * muestra tal cual; un valor desconocido se devuelve sin tocar. */
export function frequencyLabel(frequency: string): string {
  return LABELS[frequency] ?? frequency;
}
