/**
 * Integración FE↔BE contra el backend REAL: presupuestos jerárquicos, ítems
 * por sync (alta/cambio de categoría/delete), categorías (padre/merge),
 * reabrir mes, receivables, plantillas y dispositivos.
 *
 *   API_URL=http://localhost:8011/v1 node scripts/integration/hierarchy-crud.mjs
 *
 * Crea un usuario nuevo por corrida; no toca datos existentes.
 */
import { randomUUID as uuid } from "node:crypto";

const BASE = process.env.API_URL ?? "http://localhost:8011/v1";
let token = "";
let passed = 0;
const failures = [];

async function call(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const env = await res.json().catch(() => ({}));
  return { status: res.status, ok: env.is_success === true, data: env.data, code: env.data?.code };
}

function check(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name} ${detail}`);
  }
}

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const deviceId = uuid();

async function push(mutations) {
  const r = await call("POST", "/sync/push", {
    device_id: deviceId,
    mutations: mutations.map((m) => ({
      client_mutation_id: uuid(),
      client_updated_at: now(),
      payload: {},
      ...m,
    })),
  });
  return { ...r, mutations };
}

async function pull(since = 0) {
  const r = await call("GET", `/sync/pull?since=${since}&limit=500`);
  return r.data;
}

function monthsAgo(n) {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, 1)).toISOString().slice(0, 7);
}

async function main() {
  console.log(`API: ${BASE}`);

  // ── Sesión
  const email = `it-${Date.now()}@example.com`;
  const reg = await call("POST", "/auth/register", { email, password: "password123", name: "IT" });
  check("registro", reg.ok, JSON.stringify(reg.data));
  const login = await call("POST", "/auth/login", {
    email,
    password: "password123",
    device_id: deviceId,
    platform: "integration",
  });
  check("login", login.ok, JSON.stringify(login.data));
  token = login.data.access_token;

  // ── Categorías: comida (raíz), pizza y cafe (hijas), hogar (raíz), sueldo (ingreso)
  const cat = { comida: uuid(), pizza: uuid(), cafe: uuid(), hogar: uuid(), sueldo: uuid() };
  const catPush = await push([
    { entity_type: "category", entity_id: cat.comida, op: "upsert", payload: { id: cat.comida, name: "Comida", kind: "expense", parent_id: null } },
    { entity_type: "category", entity_id: cat.hogar, op: "upsert", payload: { id: cat.hogar, name: "Hogar", kind: "expense", parent_id: null } },
    { entity_type: "category", entity_id: cat.sueldo, op: "upsert", payload: { id: cat.sueldo, name: "Sueldo", kind: "income", parent_id: null } },
  ]);
  check("sync: categorías raíz", catPush.data?.applied?.length === 3, JSON.stringify(catPush.data));
  const kids = await push([
    { entity_type: "category", entity_id: cat.pizza, op: "upsert", payload: { id: cat.pizza, name: "Pizza", kind: "expense", parent_id: cat.comida } },
    { entity_type: "category", entity_id: cat.cafe, op: "upsert", payload: { id: cat.cafe, name: "Café", kind: "expense", parent_id: cat.comida } },
  ]);
  check("sync: subcategorías", kids.data?.applied?.length === 2, JSON.stringify(kids.data));

  // ── Presupuesto: comida 100.00 (REST) + pizza 60.00 (sync) + café 70.00 (REST → warning)
  const budgetId = uuid();
  const itemComida = uuid();
  const b = await call("POST", "/budgets", {
    id: budgetId,
    name: "IT",
    items: [{ id: itemComida, category_id: cat.comida, amount_cents: 10_000 }],
  });
  check("presupuesto creado", b.ok, JSON.stringify(b.data));

  const itemPizza = uuid();
  const p1 = await push([
    { entity_type: "budget_item", entity_id: itemPizza, op: "upsert", payload: { id: itemPizza, budget_id: budgetId, category_id: cat.pizza, amount_cents: 6_000 } },
  ]);
  check("sync: ítem hijo (pizza)", p1.data?.applied?.length === 1, JSON.stringify(p1.data));

  const itemCafe = uuid();
  const cafeRest = await call("POST", `/budgets/${budgetId}/items`, { id: itemCafe, category_id: cat.cafe, amount_cents: 7_000 });
  check("REST ítem hijo (café) responde", cafeRest.ok, JSON.stringify(cafeRest.data));
  check(
    "warning CHILDREN_EXCEED_PARENT con exceso 3000",
    cafeRest.data?.warning?.code === "CHILDREN_EXCEED_PARENT" && cafeRest.data.warning.excess_cents === 3_000,
    JSON.stringify(cafeRest.data?.warning),
  );

  // ── El pull ahora emite budget_item
  const pulled = await pull(0);
  const itemChanges = pulled.changes.filter((c) => c.entity_type === "budget_item");
  const emitted = new Set(itemChanges.map((c) => c.entity_id));
  check("pull emite budget_item (por sync y por REST add_item)", emitted.has(itemPizza) && emitted.has(itemCafe));
  // Hueco conocido del backend: `POST /budgets` con `items` inline no emite
  // budget_item (solo `add_item`). El FE crea ítems por sync, así que no le pega;
  // afectaría a otro cliente que cree presupuestos por REST.
  console.log(`  · [hueco backend] ítem inline de POST /budgets emitido en pull: ${emitted.has(itemComida)}`);
  check(
    "payload de budget_item trae sort_order y category_id",
    itemChanges.every((c) => "sort_order" in c.payload && "category_id" in c.payload),
  );

  // ── Unicidad y tipo (REST)
  const dup = await call("POST", `/budgets/${budgetId}/items`, { id: uuid(), category_id: cat.comida, amount_cents: 1 });
  check("categoría repetida → BUDGET_ITEM_CATEGORY_TAKEN", dup.code === "BUDGET_ITEM_CATEGORY_TAKEN", JSON.stringify(dup.data));
  const inc = await call("POST", `/budgets/${budgetId}/items`, { id: uuid(), category_id: cat.sueldo, amount_cents: 1 });
  check("categoría de ingreso → BUDGET_REQUIRES_EXPENSE_CATEGORY", inc.code === "BUDGET_REQUIRES_EXPENSE_CATEGORY", JSON.stringify(inc.data));

  // ── Conflicto por sync (lo que push.ts reconcilia)
  const taken = await push([
    { entity_type: "budget_item", entity_id: uuid(), op: "upsert", payload: { budget_id: budgetId, category_id: cat.comida, amount_cents: 5 } },
  ]);
  check(
    "sync: duplicado devuelve conflicto BUDGET_ITEM_CATEGORY_TAKEN",
    taken.data?.conflicts?.[0]?.reason === "BUDGET_ITEM_CATEGORY_TAKEN",
    JSON.stringify(taken.data),
  );

  // ── Cambiar categoría del ítem por sync: pizza → hogar
  const change = await push([
    { entity_type: "budget_item", entity_id: itemPizza, op: "upsert", payload: { budget_id: budgetId, category_id: cat.hogar } },
  ]);
  check("sync: cambio de categoría del ítem", change.data?.applied?.length === 1, JSON.stringify(change.data));
  const got = await call("GET", `/budgets/${budgetId}/items/${itemPizza}`);
  check("GET ítem refleja la nueva categoría", got.data?.category_id === cat.hogar, JSON.stringify(got.data));

  // ── Delete por sync (payload vacío)
  const cursor = pulled.next_seq;
  const del = await push([{ entity_type: "budget_item", entity_id: itemCafe, op: "delete", payload: {} }]);
  check("sync: delete de budget_item", del.data?.applied?.length === 1, JSON.stringify(del.data));
  const after = await pull(cursor);
  const delChange = after.changes.find((c) => c.entity_type === "budget_item" && c.op === "delete");
  check("pull emite el delete con {id, budget_id}", delChange?.payload?.id === itemCafe && !!delChange.payload.budget_id, JSON.stringify(delChange));
  const del2 = await push([{ entity_type: "budget_item", entity_id: itemCafe, op: "delete", payload: {} }]);
  console.log(`  · re-delete → applied=${del2.data?.applied?.length} conflicts=${JSON.stringify(del2.data?.conflicts?.map((c) => c.reason))}`);

  // ── Categorías: padre (online) y merge
  const deep = await call("PATCH", `/categories/${cat.comida}`, { parent_id: cat.hogar });
  check("categoría con hijas no puede ser subcategoría", deep.code === "CATEGORY_TOO_DEEP", JSON.stringify(deep.data));
  const toRoot = await call("PATCH", `/categories/${cat.pizza}`, { parent_id: null });
  check("PATCH parent_id null la vuelve raíz", toRoot.ok && toRoot.data?.parent_id === null, JSON.stringify(toRoot.data));
  const toChild = await call("PATCH", `/categories/${cat.pizza}`, { parent_id: cat.comida });
  check("PATCH parent_id la vuelve hija", toChild.ok && toChild.data?.parent_id === cat.comida, JSON.stringify(toChild.data));
  const noop = await call("POST", `/categories/${cat.cafe}/merge`, { into_id: cat.cafe });
  check("merge consigo misma → CATEGORY_MERGE_NOOP", noop.code === "CATEGORY_MERGE_NOOP", JSON.stringify(noop.data));
  const mismatch = await call("POST", `/categories/${cat.cafe}/merge`, { into_id: cat.sueldo });
  check("merge de otro tipo → CATEGORY_KIND_MISMATCH", mismatch.code === "CATEGORY_KIND_MISMATCH", JSON.stringify(mismatch.data));
  const reorder = await call("PATCH", "/categories/reorder", { ids: [cat.hogar, cat.comida] });
  check("reorder", reorder.ok, JSON.stringify(reorder.data));
  const seed1 = await call("POST", "/categories/seed");
  const seed2 = await call("POST", "/categories/seed");
  check("seed idempotente", seed1.ok && seed2.ok && (seed2.data?.length ?? 0) === 0, `(${seed2.data?.length})`);

  // ── Cerrar / reabrir meses
  const older = monthsAgo(2);
  const newer = monthsAgo(1);
  await call("POST", `/budgets/${budgetId}/close-period?month=${older}`);
  await call("POST", `/budgets/${budgetId}/close-period?month=${newer}`);
  const hist = await call("GET", `/budgets/${budgetId}/history`);
  check("historial con 2 meses cerrados", hist.data?.periods?.length === 2, JSON.stringify(hist.data?.periods?.map((p) => p.month)));
  const later = await call("DELETE", `/budgets/${budgetId}/periods/${older}`);
  check("reabrir el anterior → LATER_PERIOD_CLOSED", later.code === "LATER_PERIOD_CLOSED", JSON.stringify(later.data));
  const reopen = await call("DELETE", `/budgets/${budgetId}/periods/${newer}`);
  check("reabrir el más reciente", reopen.ok, JSON.stringify(reopen.data));
  const gone = await call("DELETE", `/budgets/${budgetId}/periods/${newer}`);
  check("reabrir de nuevo → PERIOD_NOT_FOUND", gone.code === "PERIOD_NOT_FOUND", JSON.stringify(gone.data));

  // ── Cuenta + plantilla + gasto desde plantilla
  const acc = uuid();
  const accPush = await push([
    { entity_type: "account", entity_id: acc, op: "upsert", payload: { id: acc, name: "Efectivo", type: "cash", currency: "GTQ", initial_balance_cents: 100_000 } },
  ]);
  check("sync: cuenta", accPush.data?.applied?.length === 1, JSON.stringify(accPush.data));

  const tpl = uuid();
  const tCreate = await call("POST", "/transaction-templates", {
    id: tpl, name: "Almuerzo", account_id: acc, category_id: cat.comida, kind: "expense", amount_cents: 3_500,
  });
  check("plantilla creada", tCreate.ok, JSON.stringify(tCreate.data));
  const txn = uuid();
  const tx = await push([
    { entity_type: "transaction", entity_id: txn, op: "upsert", payload: { id: txn, account_id: acc, category_id: cat.comida, kind: "expense", amount_cents: 5_000, currency: "GTQ", date: today(), template_id: tpl } },
  ]);
  check("sync: gasto con template_id", tx.data?.applied?.length === 1, JSON.stringify(tx.data));
  const tList = await call("GET", "/transaction-templates");
  check("template_id incrementa use_count", tList.data?.find((t) => t.id === tpl)?.use_count === 1, JSON.stringify(tList.data));
  const tNull = await call("PATCH", `/transaction-templates/${tpl}`, { category_id: null });
  check("PATCH category_id null la quita", tNull.ok && tNull.data?.category_id === null, JSON.stringify(tNull.data));
  const tKind = await call("PATCH", `/transaction-templates/${tpl}`, { category_id: cat.comida });
  const tKind2 = await call("PATCH", `/transaction-templates/${tpl}`, { kind: "income" });
  check("cambiar kind revalida categoría → CATEGORY_KIND_MISMATCH", tKind.ok && tKind2.code === "CATEGORY_KIND_MISMATCH", JSON.stringify(tKind2.data));
  const tDel = await call("DELETE", `/transaction-templates/${tpl}`);
  const tGone = await call("GET", `/transaction-templates/${tpl}`);
  check("plantilla borrada → TEMPLATE_NOT_FOUND", tDel.ok && tGone.code === "TEMPLATE_NOT_FOUND", JSON.stringify(tGone.data));

  // ── Receivables
  const r1 = uuid();
  const rc = await call("POST", "/receivables", { id: r1, transaction_id: txn, counterparty: "Ana", amount_cents: 2_000 });
  check("receivable creado", rc.ok, JSON.stringify(rc.data));
  const rOver = await call("POST", "/receivables", { id: uuid(), transaction_id: txn, counterparty: "Luis", amount_cents: 4_000 });
  check("suma > gasto → RECEIVABLE_EXCEEDS_TRANSACTION_AMOUNT", rOver.code === "RECEIVABLE_EXCEEDS_TRANSACTION_AMOUNT", JSON.stringify(rOver.data));
  const rPatch = await call("PATCH", `/receivables/${r1}`, { amount_cents: 2_500 });
  check("PATCH receivable pendiente", rPatch.ok && rPatch.data?.amount_cents === 2_500, JSON.stringify(rPatch.data));
  const settleId = uuid();
  const key = uuid();
  const s1 = await call("POST", `/receivables/${r1}/settle`, { id: settleId, account_id: acc, date: today() }, { "Idempotency-Key": key });
  const s2 = await call("POST", `/receivables/${r1}/settle`, { id: settleId, account_id: acc, date: today() }, { "Idempotency-Key": key });
  check("liquidar + reintento con la misma llave", s1.ok && s2.ok && s1.data?.settlement_transaction_id === s2.data?.settlement_transaction_id, JSON.stringify([s1.data, s2.data]));
  const pAfter = await call("PATCH", `/receivables/${r1}`, { amount_cents: 1 });
  const dAfter = await call("DELETE", `/receivables/${r1}`);
  check("editar liquidado → RECEIVABLE_ALREADY_SETTLED", pAfter.code === "RECEIVABLE_ALREADY_SETTLED", JSON.stringify(pAfter.data));
  check("eliminar liquidado → RECEIVABLE_ALREADY_SETTLED", dAfter.code === "RECEIVABLE_ALREADY_SETTLED", JSON.stringify(dAfter.data));
  const dash = await call("GET", "/reports/dashboard");
  check("dashboard trae receivable_cents", typeof dash.data?.receivable_cents === "number", JSON.stringify(dash.data?.receivable_cents));

  // ── Dispositivos
  const devs = await call("GET", "/devices");
  check("GET /devices incluye este dispositivo", devs.data?.some((d) => d.id === deviceId), JSON.stringify(devs.data));
  check("dispositivos sin campos extra sensibles", devs.data?.every((d) => !("user_id" in d)));

  console.log(`\n${passed} ok, ${failures.length} fallas`);
  if (failures.length) {
    console.log(failures.map((f) => ` - ${f}`).join("\n"));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
