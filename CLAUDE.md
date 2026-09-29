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

**Notificaciones push (backend Fase 5) ya tienen su lado cliente y ya se probaron en un teléfono real.** `src/lib/pushToken.ts` pide permiso y el Expo push token (`Notifications.getExpoPushTokenAsync`) y `session-store.ts` lo registra contra `POST /devices` tras `login()`/`restore()` — best-effort, nunca bloquea ni rompe la sesión si falla. Ya existe un dev build de Android (`eas build --profile development`, proyecto `@archi15/ghastly` en EAS) con `extra.eas.projectId` en `app.json`, `google-services.json` propio (Firebase, FCM V1 — Expo dejó de usar credenciales compartidas para push en Android desde el SDK 53) y `expo-dev-client` instalado. `com.archi15.ghastly` es el `android.package` fijo.

**Sistema de diseño (pasada de presentación, sep 2026).** Íconos con Ionicons vía `ui/primitives/Icon.tsx`, sin emoji. Paleta **Cobalto** (`ui/tokens/colors.ts`): acento azul sobre grises neutros, con texto ≥ 4.5:1 y bordes de control (`border.control`) ≥ 3:1 en claro y oscuro; `accent.fg` cambia por modo (blanco en claro, tinta oscura en oscuro) y hay `success`/`info`/`scrim`. Los 6 categóricos no cambiaron: en claro los slots 2-5 quedan bajo 3:1, así que una gráfica siempre lleva etiqueta o tabla al lado. `DESIGN.md` y `PRODUCT.md` existen solo en local (están en `.gitignore`); `DESIGN.md` documenta la paleta.

Tokens nuevos en `ui/tokens/`: `motion` (duraciones, curvas, resortes, escala de presión), `opacity`, `iconSize`, `dot`, `stroke`; `tabular-nums` en toda la tipografía y variante `overline` para encabezados de sección. Ningún literal de tamaño, radio, opacidad ni duración en `app/`.

**Animación con Reanimated 4** (hilo de UI; antes era `Animated` de RN). `usePressScale` es una transición CSS 0.97 en 120 ms sin rebote; `FadeIn` usa `entering` con tope de escalonado (**no usarlo dentro de FlashList/SectionList**: las filas se reciclan); `Skeleton` y `ProgressBar` (se llena desde 0 al montar) son animaciones/transiciones CSS; `ToastHost` entra y sale; `useCountUp` hace correr el saldo de Hoy **solo cuando cambia con la pantalla abierta**, nunca en la primera carga; las gráficas usan `isAnimated`. Un único `useReducedMotion()` (`ui/useReducedMotion.ts`, una sola suscripción para toda la app). Las tabs no animan. **Nunca envolver `Pressable` con un componente animado**: rompe el `style` como función de `state` (ya pasó); el feedback va en un `Animated.View` interno. Sigue sin animación por tecla en `KeypadNumeric` ni en quick-add (captura < 10 s). Hay `haptics` de éxito/error al pagar cuota, aportar a meta, pagar deuda y guardar un gasto. **Requiere un dev build con Reanimated**: el `eas build --profile development` de sep 2026 lo incluye, pero todavía no se probó que arranque en un teléfono (si crashea al abrir, es lo primero a revisar).

**Primitivas** (`ui/primitives/`, exportadas desde `index.ts`), una por patrón que estaba copiado en 6-20 pantallas: `MoneyText` (signo + color semántico + cifras tabulares, usa `domain/money.ts`), `ListItem`, `SectionHeader`, `DetailRow`, `Dot`, `HeroFigure`, `StatCard`, `ProgressRow`, `MonthSwitcher`, `ScreenHeader`, `ChipGroup`, `FormScreen`, `EmptyState`, `ErrorState`, `ScreenState` y `ToastHost`/`showToast`. Convenciones que salen de ahí: una pantalla de datos usa `ScreenState` (skeleton con la forma del contenido, error con Reintentar, vacío con acción) y **las pantallas locales deben esperar la primera lectura antes de mostrar "vacío"**; una sola `HeroFigure` por pantalla; los formularios de alta/edición usan `FormScreen`; los montos se pintan con `MoneyText`; fechas y meses se muestran con `formatDateLabel`/`formatMonthLabel` (`lib/dates.ts`), **nunca en ISO**; y "hoy"/el mes actual salen de `todayIso()`, **nunca de `new Date().toISOString()`** (es fecha UTC: en Guatemala ya es "mañana" desde las 18:00).

**Movimientos** (`(tabs)/transactions.tsx`) usa `FlashList` con los días aplanados (`flattenSections` en `features/transactions/group-by-day.ts`) y encabezados fijos, búsqueda con debounce de 250 ms y carga de 100 en 100 al llegar al final.

**Pendiente de esta pasada:** el `Toast` existe pero ningún borrado ofrece **Deshacer** todavía (siguen con `confirmDestructive`; varios borran por API y no tienen restauración simple); no hay swipe en las filas de Movimientos; `debts/[id]`, `goals/[id]`, `subscriptions/[id]`, `receivables/[id]`, categorías, plantillas, ajustes, onboarding y login siguen con parte de sus filas armadas a mano; `quick-add` y `transfer` conservan su encabezado propio. **Reglas de arriba que hoy NO se cumplen:** los textos no están en `i18n` (unos 280 literales en el JSX; `i18n-js` está instalado sin usar) y 10 pantallas muestran el `message` del servidor en vez de `error-messages.ts` (login, registro, deudas, metas, cuotas, suscripciones, cuentas). **Sin verificar en dispositivo:** la métrica de < 10 s, modo avión y fuente al 200 % de todo lo anterior.

**Cuentas**: "Más → Cuentas" abre `app/accounts/index.tsx` (lista, antes iba directo a `/accounts/new`) con borrar (archiva vía `DELETE /accounts/{id}`, direct-online como `closeBudgetPeriod` — no por outbox, porque hace falta la respuesta síncrona del 409 `ACCOUNT_HAS_BALANCE`) y "ocultar de Hoy" (preferencia **solo local**, `lib/hiddenAccounts.ts` vía SecureStore — no toca la tabla `accounts`, que mirrorea el esquema del backend campo a campo; la cuenta sigue activa en todo lo demás).

**Moneda extranjera (caso de negocio 4) ya está expuesta**: "Nueva cuenta" tiene selector GTQ/USD (antes mandaba "GTQ" fijo). Captura rápida y "Nueva suscripción" siguen SIEMPRE la moneda de la cuenta elegida (no es un campo libre — evita crear una transacción en otra moneda que la de su cuenta, que el backend permite pero rompería el saldo); si la cuenta no es GTQ, piden la tasa de cambio del día (no hay fuente automática). `createTransactionLocally` calcula `base_amount_cents` de forma optimista con esa tasa para que el presupuesto local no muestre mal antes del próximo sync. Esto solo tiene sentido porque el backend ya lo soporta de verdad: hasta hace poco `budget_service`/`report_service` sumaban `amount_cents` crudo en vez de `base_amount_cents`, y `repositories/budgets.ts::spentByCategory` (cálculo LOCAL de consumo) tenía el mismo bug — ya arreglado en ambos lados con el mismo `COALESCE`.

`app/settings/notifications.tsx` (nueva, enlazada desde "Más" → 🔔 Notificaciones) es la pantalla de Ajustes → Notificaciones del wireframe (`PLAN-frontend.md §6.12`): umbrales de presupuesto (chips multi-select), días de aviso de cuotas, horas de silencio (`HH:MM` en texto: `DateField` solo elige fechas, no horas) y el switch de canal push. Contra `GET`/`PATCH /v1/notification-preferences` del backend vía `data/api/notifications.ts` + `features/notifications/useNotificationPreferences.ts` (React Query para el read, como `useDashboard`; el save es un PATCH directo, no hizo falta `useMutation`). No se construyó el resto del hub de Ajustes (Perfil/Seguridad/Moneda/Sync/Backup/Apariencia) — fuera de alcance de este pedido, la fila de "Más" enlaza directo a Notificaciones.

**Fase 4 (reportes) completa.** `(tabs)/index.tsx` reescrita contra `GET /reports/dashboard` (antes era un placeholder con patrimonio neto calculado local). Primer uso real de **React Query** en el repo (estaba instalado sin usar — `data/query-client.ts`, `QueryClientProvider` en `app/_layout.tsx`); reportes son de solo lectura contra el servidor, no se replican a SQLite (mismo patrón que `budget/history.tsx`). El bloque de anomalías del wireframe (`PLAN-frontend.md §6.2`) necesita una segunda llamada a `/reports/anomalies` porque `DashboardOut` no las incluye — se resolvió así a propósito en vez de forzarlo en una sola llamada; ambas cacheadas por React Query en `features/reports/useDashboard.ts`.

**Las 4 pantallas de `/reports` (§6.10 del wireframe) ya están** — Resumen, Categorías, Tendencias, Comparativo, con `SegmentedControl` (primitiva nueva) para moverse entre ellas; cada una es su propia ruta (`router.replace`, no `push`, para que "atrás" no las apile). Gráficas con `react-native-gifted-charts` + `react-native-svg` (ya estaban instaladas desde antes de esta sesión, nunca usadas). `lib/categoryColor.ts` le asigna a cada categoría un color fijo de `colors.categorical` (6 slots, paleta validada con la skill `dataviz` — hash del `category_id`, nunca por posición/ranking, para que el color de una categoría sea siempre el mismo entre pantallas). Comparativo y Tendencias reusan los semánticos ya establecidos (`income.fg`/`expense.fg`) en vez de un par divergente nuevo. `domain/money.ts` ganó `formatCompact()` ("Q12.5k") para los ejes — el valor exacto siempre va en la tabla de abajo de cada gráfica, como pide el wireframe. Categorías: tocar una fila filtra Movimientos por esa categoría (`categoryId` nuevo en `TransactionFilters` + query param en `(tabs)/transactions.tsx`). **Hueco real, decidido con el usuario:** el wireframe describe "Tendencias" como evolución mensual *por categoría*, pero ningún endpoint del backend lo da — `GET /reports/trends` solo trae la serie agregada (ingreso/gasto/neto) + los dos promedios del caso 12. Por ahora Tendencias muestra eso; un desglose por categoría en el tiempo necesitaría un endpoint nuevo, fuera de este lote.

Simplificaciones deliberadas de esta vuelta: "PRÓXIMOS VENCIMIENTOS" en vez de "PRÓXIMOS 7 DÍAS" (el wireframe lo llama así pero `dashboard.upcoming` es en realidad top-5 de una ventana de 30 días, no estrictamente 7); el patrimonio neto no se muestra en Hoy (vive en Reportes, por diseño explícito del plan); "Me deben" sí aparece como una fila compacta solo cuando `receivable_cents > 0`; sin iconos ⚙️/🔔 en el header de Hoy (la pantalla de Notificaciones ya existe pero se llega desde "Más", no hay un hub de Ajustes todavía); las cuentas que no son tarjeta no son tappable en Hoy (para editarlas se entra por "Más → Cuentas"; `accounts/[id]/statement.tsx` se usa solo para las tarjetas).

**Presupuestos jerárquicos y CRUD completo (empatado con el backend).** La jerarquía NO se guarda en el ítem: se deriva de `categories.parentId` (máx. 2 niveles) con `effectiveParents`/`rollupSpent`/`childrenExcess`/`summarizeHierarchy` en `domain/budget.ts` (espejo de `budget.py`); `computeBudgetCurrent` las usa (el padre muestra gasto agregado, `totalBudgetedCents` = solo raíces, `unbudgeted` excluye subcategorías de un padre presupuestado). El tope del padre solo ADVIERTE (`Notice`), nunca bloquea; las advertencias se calculan local porque `data.warning` no existe en `/sync/push`. `app/budget/edit.tsx` ahora es "En el presupuesto" (árbol + quitar) + "Agregar categoría". Sync: `budget_item` con `op: "delete"`, cambio de categoría del ítem, unicidad local (`BudgetRuleError`), y `push.ts` maneja `DELETED_ON_SERVER`/rechazos de ítem reconciliando con el servidor. Nuevas pantallas: Categorías (`app/categories/*`; el PADRE, la fusión y la semilla son online, el resto por outbox), Me deben (`app/receivables/*`, solo REST), Plantillas (`app/templates/*`, solo REST), Dispositivos (`app/settings/devices.tsx`), y "Reabrir mes" en el historial. Los mensajes de error salen de `data/api/error-messages.ts` por `data.code`, nunca del `message` del servidor. Tono: voseo es-GT ("Necesitás", "Agregá") — el "tú" del backend no se muestra al usuario.

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
