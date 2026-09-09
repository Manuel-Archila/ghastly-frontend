# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Ghastly — app móvil de finanzas personales (Guatemala, GTQ). Cliente de la API en `../ghastly-backend`.

**Documentos de referencia (leer antes de planear trabajo grande):**
- `PLAN-frontend.md` — arquitectura, sistema de diseño, mapa de navegación, las 11 pantallas con wireframes.
- `../ghastly-backend/PLAN-finanzas-app.md` — plan de producto y los 12 casos de negocio.
- `../ghastly-backend/PLAN-backend.md` §8 — catálogo de endpoints.

---

## La métrica que manda

> **Registrar un gasto toma menos de 10 segundos, desde la pantalla bloqueada.**

Toda decisión se juzga contra esto. Si un cambio agrega un tap al flujo de captura rápida, el cambio pierde. Las apps de finanzas manuales no mueren por falta de features: mueren porque registrar cuesta.

---

## Estado actual

**Fases 0-3 completas, con sus huecos tapados** (empatado con el backend). Detalle abajo.

Fase 1: migraciones locales (Drizzle + `useMigrations`), `domain/money.ts`+`balances.ts`+`budget.ts`+`uuid.ts`+`keypad-expression.ts` (con tests), cliente HTTP tipado **con refresh automático de token** (401 `TOKEN_EXPIRED` → `POST /auth/refresh` singleton → reintenta; si el refresh falla, `notifyAuthLost` → login, nada se pierde), tokens en `data/api/token-store.ts`, store de sesión (Zustand + SecureStore), login/registro con gate de auth, **onboarding guiado** (`app/onboarding.tsx`: bienvenida + traer categorías base → alta de cuentas; el layout enruta ahí si no hay cuentas locales), **captura rápida** con **teclado numérico propio** (`ui/primitives/KeypadNumeric.tsx`, evalúa `12.50+3.75`, háptics por tecla) y háptico de éxito al guardar (SQLite + outbox, saldo optimista, advierte duplicado, long-press = guardar y seguir), transferencias (canal dedicado a `POST /transactions/transfer`), **reembolsos en la UI** (`createRefundLocally` → outbox `refund` → `pushRpcEntries` a `POST /transactions/{id}/refund` con Idempotency-Key; botón en el detalle del gasto), crear cuenta, **lista de movimientos** (SectionList por día, búsqueda, filtro por tipo), **detalle + edición + borrado** de transacción, semilla de categorías, y **sync completo**: `push` por lotes con backoff (5 fallos → visible), `pull` con cursor, sync automático al abrir/foreground + debounced tras cada escritura.

Fase 2: pantalla de presupuesto (consumo calculado LOCAL con `domain/budget.ts`, proyección, ritmo diario, sección "sin presupuesto"), alta **y edición** de presupuesto (`app/budget/edit.tsx`: cambia montos por categoría, toggle de rollover → outbox `budget`/`budget_item`), e **historial + cierre de mes** (`app/budget/history.tsx`: `GET /budgets/{id}/history` + `POST /budgets/{id}/close-period`; los `budget_periods` viven solo en el server, se piden online). El consumo **neto de reembolsos** (caso 5): `spentByCategory` resta los `income` con `refund_of_id` de su categoría — igual que el backend. El sync de `budget`/`budget_item` funciona (se extendió `/sync/push` en el backend).

`npm run typecheck`/`test`/`lint` en verde; el bundle de iOS compila con `npx expo export`. El contrato FE↔BE está verificado con scripts de integración contra el backend real: (1) refresh de token (rotación + detección de reuso), reembolso (liga `refund_of_id`, preserva categoría), edición de presupuesto por sync; (2) cierre de período + historial + reembolso neto del gasto congelado.

Fase 3: **compromisos**. Puertos de dominio con tests (`amortization.ts`, `installments.ts`, `recurrence.ts`, `creditCycle.ts`, `lib/dates.ts`). Pantallas: suscripciones (index + alta, con costo mensual/anual y detección de alza), cuotas (index + alta con vista previa del calendario + detalle con "pagar cuota"), deudas (index + alta + detalle con pago que separa capital/interés + tabla de amortización), metas (index + alta + aporte), **calendario con grilla mensual** (`app/calendar/index.tsx`: rejilla de días con puntos de color por compromiso — recurrente/cuota/corte/pago —, navegación ‹ ›, tocar un día abre su detalle; "comprometido este mes"), y detalle de tarjeta (ciclo de corte/pago). "Más" enlaza todo con montos de resumen. Los compromisos se crean online (endpoints REST) y se bajan por pull; el `pull` maneja `recurring_rule`/`installment_plan`/`installment`/`debt`/`goal`.

Verificado FE↔BE con script de integración: suscripción, plan de cuotas (pagar cuota, pasivo baja), deuda (amortización + pago capital/interés), meta (aporte), y el pull final trae todo.

**Falta:** notificaciones locales (`expo-notifications` — necesita dev build, no Expo Go; bloqueado mientras se use Expo Go).

**Fase 4 (reportes) en curso** — el backend ya tiene los diez endpoints de `/reports/*`; el frontend arrancó por la pantalla Hoy.

`(tabs)/index.tsx` reescrita contra `GET /reports/dashboard` (antes era un placeholder con patrimonio neto calculado local). Primer uso real de **React Query** en el repo (estaba instalado sin usar — `data/query-client.ts`, `QueryClientProvider` en `app/_layout.tsx`); reportes son de solo lectura contra el servidor, no se replican a SQLite (mismo patrón que `budget/history.tsx`). El bloque de anomalías del wireframe (`PLAN-frontend.md §6.2`) necesita una segunda llamada a `/reports/anomalies` porque `DashboardOut` no las incluye — se resolvió así a propósito en vez de forzarlo en una sola llamada; ambas cacheadas por React Query en `features/reports/useDashboard.ts`.

Primitivas nuevas en `ui/primitives/`: `Card`, `ProgressBar` (la de `budget.tsx` estaba inline, se promovió y `budget.tsx` ahora la reusa), `Skeleton` (con pulso que respeta "Reducir movimiento" — `AccessibilityInfo.isReduceMotionEnabled`). `SegmentedControl` todavía no existe — hace falta para las 4 vistas de `reports/` (Resumen/Categorías/Tendencias/Comparativo), que siguen sin construir.

Simplificaciones deliberadas de esta vuelta: "PRÓXIMOS VENCIMIENTOS" en vez de "PRÓXIMOS 7 DÍAS" (el wireframe lo llama así pero `dashboard.upcoming` es en realidad top-5 de una ventana de 30 días, no estrictamente 7); patrimonio neto y "por cobrar" no se muestran en Hoy (viven en Reportes, por diseño explícito del plan); sin iconos ⚙️/🔔 en el header (no hay pantallas de ajustes/notificaciones todavía); las cuentas que no son tarjeta no son tappable (no existe `accounts/[id]/index` ni `accounts/index` — solo `accounts/[id]/statement.tsx`, que sí se usa para las tarjetas).

Empatado con el backend hasta Fase 3; el backend además ya tiene `receivables`, `transaction_templates`, recibos en S3 y `statement` de tarjeta — sin pantalla en el frontend todavía.

---

## Comandos

```bash
npm install
npx expo start                      # dev server (requiere dev build, no Expo Go)
npx expo run:ios                    # compilar y correr en simulador
npx expo run:android

npm run test                        # Vitest — dominio
npm run test -- money               # un archivo
npm run test -- -t "rollover"       # un test por nombre
npm run typecheck                   # tsc --noEmit
npm run lint

npx drizzle-kit generate            # nueva migración local tras tocar el esquema
maestro test .maestro/quick-add.yaml # E2E del flujo crítico
```

Se usa **dev build**, no Expo Go: hay módulos nativos (SQLite, biométrico, notificaciones).

---

## Arquitectura

```
app/          Expo Router. SOLO rutas y composición — cero lógica.
src/
  domain/     ⚠️ Funciones puras. Sin React, sin SQLite, sin red.
  data/       db/ (Drizzle) · repositories/ · sync/ (outbox) · api/ (cliente tipado)
  features/   Una carpeta por dominio: componentes + hooks + lógica de pantalla.
  ui/         Sistema de diseño: tokens + primitivas. Cero lógica de negocio.
  lib/        Utilidades transversales.
```

**Reglas de dependencia (no negociables):**
- `domain/` no importa nada de `data/`, `ui/`, `features/` ni React. Un `useEffect` no es lugar para calcular un saldo.
- `ui/` no importa de `features/` ni de `data/`. Un componente de `ui/` no sabe qué es una transacción.
- `features/` **nunca** hace `fetch`. Lee de `data/repositories/`.
- Las pantallas de `app/` componen features y nada más.

---

## Local-first: cómo fluye un dato

```
Guardar gasto → escribe SQLite → UI actualizada (0 ms) → inserta en outbox
                                                              ↓
                                       sync worker: POST /sync/push → GET /sync/pull
```

- Los IDs son **UUIDv7 generados aquí**. Nunca se espera al servidor.
- Los campos derivados (saldos, consumo de presupuesto) se calculan local con `domain/` para pintar rápido, y **el valor del servidor los sobrescribe** al llegar el pull. El servidor manda.
- **Ninguna pantalla muestra un spinner esperando la red.** Lo no sincronizado se marca con `⟳`, no bloquea.
- El outbox reintenta con backoff. Una mutación fallida 5 veces aparece en Ajustes → Sincronización; nunca se pierde en silencio.
- **Toda feature se prueba en modo avión antes de darla por terminada.**

---

## Reglas de UI

| Tema | Regla |
|---|---|
| **Dinero** | Enteros en centavos. Nunca `float`. Formateo solo desde `domain/money.ts`: `Q 1,250.00`, gasto `− Q 250.00`, ingreso `+ Q 4,500.00`, transferencia `Q 500.00 →` sin signo. |
| **Estilos** | **Cero literales de estilo en pantallas y features.** Todo color, espacio, radio y tamaño sale de `ui/tokens`. Un `#FF3B30` suelto es un bug. |
| **Color semántico** | Verde = ingreso, rojo = gasto, **azul/gris neutro = transferencia** (no es gasto ni ingreso y el color lo tiene que gritar), ámbar = 80–100% de presupuesto, rojo = sobregiro. El color informa, nunca decora. |
| **Nunca solo color** | Todo monto lleva signo y todo estado lleva icono o texto. ~8% de los hombres no distingue rojo de verde. |
| **Cifras** | Siempre `fontVariant: ['tabular-nums']`. Sin esto las columnas bailan al hacer scroll. |
| **Una cifra por pantalla** | Hay un solo número grande; todo lo demás lo sostiene. |
| **Estados** | Toda pantalla se entrega con los cuatro: cargando (**skeleton con la forma del contenido**, nunca spinner centrado), vacía (frase + botón de la acción), error (qué pasó en español + `Reintentar`, nunca un código HTTP crudo), con datos. |
| **Deshacer** | Todo borrado ofrece `Deshacer` 5 s en el toast. El borrado es lógico. |
| **Alturas** | Ninguna altura de fila es fija: todo crece con la escala de fuente del sistema (hasta 200%). |
| **Táctil** | Área mínima 48×48, aunque el icono se vea de 20. |
| **Textos** | En `i18n`, nunca literales en el JSX. Español de Guatemala, directo, **sin juicios morales** — la app no dice "gastaste demasiado", muestra el dato y la proyección. |
| **Movimiento** | Respetar "Reducir movimiento": si está activo, todo se vuelve fundido simple. |

Presupuesto de rendimiento: arranque a interactivo **< 1.5 s**, apertura de captura rápida **< 150 ms**, scroll de 1000 movimientos a 60 fps (`FlashList`).

---

## Reglas de negocio que se ven en la UI

Detalladas en `PLAN-finanzas-app.md` §5. Las que afectan pantallas:

1. **Transferencia ≠ gasto.** Nunca aparece en reportes ni consume presupuesto.
2. **Pago de tarjeta:** el botón dice "Registrar pago" y abre una transferencia. El usuario no tiene que saber que es una transferencia; la app le impide equivocarse.
3. **Cuotas:** al crear el plan, el copy explica que la compra no cuenta como gasto del mes, solo la cuota. Enseñar la regla en el momento en que importa.
4. **USD:** se muestra el monto original, la tasa aplicada y el equivalente en GTQ con la nota "tasa del día de la compra".
5. **Retiro de efectivo:** se ofrece convertirlo en transferencia a la cuenta `cash`.
6. **Duplicado:** se advierte en el toast, **no se bloquea** el guardado.
7. **Ajuste de saldo:** pantalla propia. El saldo nunca se edita a mano.

---

## Cómo trabajar aquí

- **Orden dentro de cada tarea:** `domain` + sus tests → `data` (esquema, repos, sync) → `features` → pantalla. Sin saltarse capas.
- El esquema Drizzle es **espejo del backend**. Un cambio de modelo se hace en los dos repos en el mismo commit lógico.
- Antes de escribir una gráfica, cargar la skill `dataviz`. Máximo 6 categorías + "Otros", color de serie estable entre pantallas, y siempre una tabla equivalente debajo.
- Nada de librerías de UI completas. Las primitivas de `ui/` son propias; así el sistema de diseño se sostiene.
- Antes de instalar una dependencia, evaluar si son 40 líneas propias.
- Commits pequeños y descriptivos.
