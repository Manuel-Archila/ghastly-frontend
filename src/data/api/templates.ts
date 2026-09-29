/** Plantillas de gasto: solo online. `GET` viene ordenado por uso. */
import { api } from "@/data/api/client";
import { assertCategoryPresent } from "@/domain/categoryRule";

export interface TemplateOut {
  id: string;
  name: string;
  account_id: string;
  category_id: string | null;
  kind: "expense" | "income";
  amount_cents: number;
  description: string | null;
  use_count: number;
}

export interface TemplateCreate {
  id: string;
  name: string;
  account_id: string;
  category_id?: string | null;
  kind: "expense" | "income";
  amount_cents: number;
  description?: string | null;
}

/** `category_id: null` la quita; name/account_id/kind/amount_cents no aceptan null. */
export type TemplatePatch = Partial<Omit<TemplateCreate, "id">>;

export function listTemplates(): Promise<TemplateOut[]> {
  return api.get("/transaction-templates");
}

export function getTemplate(id: string): Promise<TemplateOut> {
  return api.get(`/transaction-templates/${id}`);
}

export function createTemplate(body: TemplateCreate): Promise<TemplateOut> {
  assertCategoryPresent(body.kind, body.category_id);
  return api.post("/transaction-templates", body);
}

export function updateTemplate(id: string, body: TemplatePatch): Promise<TemplateOut> {
  return api.patch(`/transaction-templates/${id}`, body);
}

export function deleteTemplate(id: string): Promise<void> {
  return api.delete(`/transaction-templates/${id}`);
}
