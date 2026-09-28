import { listAccounts } from "@/data/repositories/accounts";
import { listRecurringRules, listUpcomingInstallments } from "@/data/repositories/commitments";
import { computeCurrentCycle } from "@/domain/creditCycle";
import { nextOccurrence, type Frequency } from "@/domain/recurrence";
import { addDays, daysBetween, todayIso } from "@/lib/dates";

export interface CommitmentEvent {
  date: string; // YYYY-MM-DD
  label: string;
  amountCents: number | null;
  kind: "recurring" | "installment" | "card_statement" | "card_payment";
}

/** Calendario unificado: recurrentes + cuotas + cortes y pagos de tarjeta,
 * en los próximos `days` días (PLAN-frontend §6.9). */
export async function computeUpcoming(days = 45): Promise<{
  committedThisMonthCents: number;
  events: CommitmentEvent[];
}> {
  const today = todayIso();
  const horizon = addDays(today, days);
  const events: CommitmentEvent[] = [];

  const [rules, installmentsDue, accounts] = await Promise.all([
    listRecurringRules(),
    listUpcomingInstallments(days),
    listAccounts(),
  ]);

  for (const rule of rules) {
    // `next_due_date` guarda UNA sola fecha — la que viene — no una serie.
    // Para que el calendario muestre la suscripción en cada mes futuro (no
    // solo en el mes de esa fecha), se proyecta hacia adelante con la misma
    // función que usa "Saltar próxima ocurrencia" en el servidor, hasta
    // salirse del horizonte visible o llegar a end_date.
    let occurrence = rule.nextDueDate;
    // El tope real lo pone `occurrence <= horizon`; este número solo evita
    // un loop infinito si algo anda mal (nextOccurrence no debería nunca
    // quedarse quieta o retroceder).
    for (let i = 0; i < 2000 && occurrence <= horizon; i++) {
      if (rule.endDate && occurrence > rule.endDate) break;
      if (occurrence >= today) {
        events.push({
          date: occurrence,
          label: rule.name,
          amountCents: rule.amountCents,
          kind: "recurring",
        });
      }
      occurrence = nextOccurrence(occurrence, rule.frequency as Frequency, rule.interval);
    }
  }

  for (const inst of installmentsDue) {
    events.push({
      date: inst.dueDate,
      label: `Cuota ${inst.number}`,
      amountCents: inst.amountCents,
      kind: "installment",
    });
  }

  for (const acc of accounts) {
    if (acc.type === "credit_card" && acc.statementDay && acc.paymentDueDay) {
      const cycle = computeCurrentCycle(today, acc.statementDay, acc.paymentDueDay);
      if (daysBetween(today, cycle.statementDate) <= days) {
        events.push({
          date: cycle.statementDate,
          label: `Corte ${acc.name}`,
          amountCents: null,
          kind: "card_statement",
        });
      }
      if (daysBetween(today, cycle.paymentDueDate) <= days) {
        events.push({
          date: cycle.paymentDueDate,
          label: `Pago ${acc.name}`,
          amountCents: acc.currentBalanceCents,
          kind: "card_payment",
        });
      }
    }
  }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const monthEnd = `${today.slice(0, 7)}-31`;
  const committedThisMonthCents = events
    .filter((e) => e.date <= monthEnd && e.amountCents !== null && e.kind !== "card_statement")
    .reduce((s, e) => s + (e.amountCents ?? 0), 0);

  return { committedThisMonthCents, events };
}
