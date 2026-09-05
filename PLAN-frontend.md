# Ghastly — Plan del Frontend

App móvil de finanzas personales. Documento de arquitectura, sistema de diseño y pantallas.
Complemento de `PLAN-finanzas-app.md` y `PLAN-backend.md` (repo `ghastly-backend`).

---

## 1. La única métrica que importa

> **Registrar un gasto toma menos de 10 segundos, desde la pantalla bloqueada.**

Toda decisión de diseño se juzga contra esto. Una app de finanzas manual no falla por falta de features: falla porque registrar cuesta y el usuario deja de hacerlo a las tres semanas. Si una pantalla bonita agrega un tap al flujo de captura, la pantalla pierde.

Presupuesto de taps para el caso común (gasto en efectivo, categoría frecuente):

```
Widget / atajo  →  monto en teclado  →  tap categoría  →  Guardar
     0 taps            ~4 taps            1 tap          1 tap
```

Cuenta y fecha vienen predeterminadas y solo se tocan cuando cambian.

---

## 2. Stack

| Capa | Elección | Por qué |
|---|---|---|
| Framework | React Native + **Expo (dev build)**, SDK estable | Nativo real, un solo código |
| Lenguaje | TypeScript `strict: true` | El dominio financiero necesita tipos |
| Navegación | **Expo Router** (file-based) | Menos configuración, deep links gratis |
| DB local | `expo-sqlite` + **Drizzle ORM** | Local-first, migraciones versionadas |
| Servidor/caché | **TanStack Query** sobre la capa local | Refetch, invalidación, estados de carga |
| Estado UI | **Zustand** | Sesión, tema, filtros. Sin boilerplate |
| Formularios | `react-hook-form` + `zod` | Los mismos esquemas validan local y contra la API |
| Gráficas | `react-native-gifted-charts` | Buen soporte RN, menos fricción que Victory |
| Animación | `react-native-reanimated` + `react-native-gesture-handler` | 60 fps en el hilo de UI |
| Fechas | `date-fns` + `date-fns-tz`, zona `America/Guatemala` | |
| Dinero | Enteros en centavos. `domain/money.ts` propio | **Nunca `float`** |
| Listas | `@shopify/flash-list` | Miles de movimientos sin caídas de frame |
| Seguridad | `expo-local-authentication`, `expo-secure-store` | Biométrico y tokens |
| i18n | `i18n-js` — es-GT único idioma al inicio | Textos fuera del JSX desde el día uno |
| Tests | Vitest (dominio) + Maestro (E2E) | |

---

## 3. Arquitectura

```
app/                      # Expo Router — SOLO rutas y composición
├── (auth)/
├── (tabs)/
└── (modals)/

src/
├── domain/               # ⚠️ funciones puras. Sin React, sin SQLite, sin red.
│   ├── money.ts          # Money, formateo GTQ/USD, aritmética en centavos
│   ├── balances.ts       # saldo derivado, signo por kind
│   ├── budget.ts         # consumo, proyección, rollover
│   ├── installments.ts   # calendario de cuotas
│   ├── recurrence.ts     # próxima ocurrencia
│   └── creditCycle.ts    # corte y fecha de pago
├── data/
│   ├── db/               # esquema Drizzle + migraciones (espejo del backend)
│   ├── repositories/     # queries locales, la ÚNICA fuente que lee la UI
│   ├── sync/             # outbox, pull/push, reconciliación
│   └── api/              # cliente HTTP tipado, generado del OpenAPI
├── features/             # una carpeta por dominio: components + hooks + lógica de pantalla
│   ├── transactions/  budgets/  accounts/  installments/
│   ├── recurring/  debts/  goals/  reports/
├── ui/                   # sistema de diseño: tokens + primitivas, cero lógica de negocio
└── lib/                  # utilidades transversales
```

**Reglas de dependencia (no negociables):**

- `domain/` no importa nada de `data/`, `ui/`, `features/` ni React.
- `ui/` no importa de `features/` ni de `data/`. Un componente de `ui/` no sabe qué es una transacción.
- `features/` **nunca** hace `fetch` directo. Lee de `repositories/`.
- Las pantallas en `app/` no contienen lógica: componen features.

### Local-first: cómo fluye un dato

```
Usuario guarda un gasto
      │
      ├─▶ escribe en SQLite  ────────────▶ la UI ya se actualizó (optimista, 0 ms)
      │
      └─▶ inserta en outbox
                 │
                 └─▶ sync worker (al reconectar / cada 60 s / al abrir la app)
                          ├─ POST /sync/push  ──▶ backend
                          └─ GET  /sync/pull   ──▶ aplica cambios, reconcilia
```

- **Los IDs los genera el cliente (UUIDv7).** No se espera al servidor para nada.
- Los campos derivados (saldos, consumo de presupuesto) se calculan local con `domain/` para pintar al instante, y se **sobrescriben con el valor del servidor** cuando llega el pull. El servidor manda.
- El outbox es una tabla SQLite con reintentos y backoff. Si una mutación falla 5 veces, se marca y aparece en Ajustes → Sincronización, nunca se pierde en silencio.
- **Nada en la UI muestra un spinner esperando la red.** Si algo no está sincronizado, se marca con un indicador sutil, no bloqueando.

---

## 4. Sistema de diseño

### 4.1 Principios

1. **El número es el protagonista.** En cada pantalla hay una sola cifra grande. Todo lo demás la sostiene.
2. **Densidad honesta.** Es una app de datos; listas compactas y legibles, no tarjetas gigantes con aire vacío que obligan a hacer scroll para ver tres movimientos.
3. **El color informa, nunca decora.** Verde/rojo/azul significan algo fijo. Nunca son adorno.
4. **Nada de juicios morales.** La app no dice "gastaste demasiado". Muestra el dato y la proyección. El tono es de copiloto, no de nutricionista.
5. **Sin estados muertos.** Toda lista vacía enseña qué hacer y tiene el botón para hacerlo.

### 4.2 Color

Semántica fija en toda la app:

| Rol | Significado | Uso |
|---|---|---|
| `income` (verde) | Ingreso, disponible, meta cumplida | Montos positivos |
| `expense` (rojo/coral) | Gasto, sobregiro | Montos negativos |
| `transfer` (azul/gris) | Movimiento entre cuentas propias | **Deliberadamente neutro:** no es gasto ni ingreso, y el color lo tiene que gritar |
| `warning` (ámbar) | 80–100% de presupuesto, vence pronto | |
| `danger` | >100%, vencido, sin fondos | |
| `neutral` | Texto, superficies, bordes | |

Tokens, no valores sueltos:

```
color.bg.base / bg.surface / bg.elevated / bg.sunken
color.text.primary / secondary / tertiary / inverse
color.border.subtle / strong
color.income.fg|bg  ·  expense.fg|bg  ·  transfer.fg|bg  ·  warning.*  ·  danger.*
color.accent.fg|bg          # marca, solo para acciones primarias
```

**Modo oscuro desde la Fase 0**, no como feature de Fase 5: se define el set completo de tokens en ambos temas antes de escribir la primera pantalla. Adaptarlo después cuesta diez veces más.

**Accesibilidad:** contraste mínimo 4.5:1 en texto; el color **nunca** es el único portador de significado — todo monto lleva signo (`+` / `−`) y todo estado lleva icono o texto además del color. ~8% de los hombres no distingue rojo de verde.

### 4.3 Tipografía

Fuente del sistema (SF Pro / Roboto) para texto. **Cifras siempre con `fontVariant: ['tabular-nums']`** — sin esto, las columnas de montos bailan al hacer scroll y la lista se ve rota.

| Token | Tamaño / peso | Uso |
|---|---|---|
| `display` | 40 / 600, tabular | La cifra protagonista (saldo, total del mes) |
| `title1` | 28 / 600 | Título de pantalla |
| `title2` | 20 / 600 | Sección |
| `body` | 16 / 400 | Texto general, descripción de movimiento |
| `bodyStrong` | 16 / 600, tabular | Monto en lista |
| `caption` | 13 / 400 | Cuenta, fecha, metadatos |
| `micro` | 11 / 500, mayúsculas suaves | Etiquetas, encabezado de grupo |

Respetar Dynamic Type / escala de fuente del sistema hasta 200%: **ninguna altura de fila es fija**, todas crecen con el texto.

### 4.4 Espacio, forma, elevación

- Escala de 4 pt: `1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40`. Margen lateral de pantalla: `16`.
- Radios: `sm=8` (chips, inputs), `md=12` (tarjetas), `lg=20` (sheets), `full` (botones circulares, avatares).
- Elevación: solo **tres** niveles — plano, tarjeta, sheet. Nada de sombras decorativas.
- **Área táctil mínima 48×48**, aunque el icono se vea de 20.

### 4.5 Movimiento

- Duración: 150 ms micro, 250 ms transición de pantalla, 350 ms sheet.
- Curva estándar: `easeOutQuad`. Los sheets entran con spring suave.
- El teclado numérico responde con feedback háptico ligero (`Haptics.selectionAsync`).
- Guardar un movimiento: háptico de éxito + el número vuela hacia la lista. Es la recompensa que sostiene el hábito.
- **Respetar "Reducir movimiento" del sistema:** si está activo, todo se vuelve fundido simple.

### 4.6 Formato de datos (una sola implementación, en `domain/money.ts`)

| Caso | Formato |
|---|---|
| Monto GTQ | `Q 1,250.00` — espacio tras el símbolo |
| Monto USD | `$ 160.00` + fila secundaria `≈ Q 1,248.00` con la tasa congelada |
| Gasto en lista | `− Q 250.00`, color `expense` |
| Ingreso | `+ Q 4,500.00`, color `income` |
| Transferencia | `Q 500.00 →`, color `transfer`, sin signo |
| Cifras grandes en gráficas | `Q 12.5k` (nunca en listas ni en detalles) |
| Fecha en lista | Encabezado de grupo: `Hoy` · `Ayer` · `Lunes 8 de septiembre` |
| Porcentaje | Entero: `78%`. Decimales solo en tasas de interés |

### 4.7 Primitivas de `ui/`

`Text` · `Button` (primary/secondary/ghost/danger) · `IconButton` · `Card` · `ListRow` · `SectionHeader` · `Chip` · `Input` · `AmountInput` · `Select` · `DatePicker` · `Sheet` · `Modal` · `Tabs` · `SegmentedControl` · `ProgressBar` · `Badge` · `Avatar` · `EmptyState` · `Skeleton` · `Toast` · `SwipeableRow` · `KeypadNumeric`

Cuatro estados obligatorios por componente que muestre datos: **cargando (skeleton, no spinner) · vacío · error · con datos.** Un componente sin sus cuatro estados no está terminado.

---

## 5. Navegación

```
app/
├── (auth)/
│   ├── welcome            Bienvenida
│   ├── login
│   ├── register
│   └── onboarding/        [1] cuentas  [2] saldos  [3] presupuesto (saltable)
│
├── (tabs)/                ← Tab bar de 5, con FAB central
│   ├── index              🏠 HOY          (dashboard)
│   ├── transactions       📋 MOVIMIENTOS
│   ├── (+)                ➕ FAB → abre captura rápida (no es tab, es acción)
│   ├── budget             🎯 PRESUPUESTO
│   └── more               ⋯ MÁS
│
├── accounts/              index · [id] · new · [id]/edit · [id]/statement · [id]/adjust
├── transactions/          [id] · [id]/edit
├── budget/                edit · history · [month]
├── installments/          index · [id] · new
├── subscriptions/         index · [id] · new
├── debts/                 index · [id] · [id]/payment
├── goals/                 index · [id]
├── receivables/           index
├── calendar/              index          (próximos compromisos)
├── reports/               index · categories · trends · comparison · net-worth
├── categories/            index · [id]
├── settings/              index · profile · security · notifications · currency
│                          · sync · backup · export · appearance · about
│
└── (modals)/              ← todos como bottom sheet, se cierran con gesto
    ├── quick-add          ⭐ CAPTURA RÁPIDA
    ├── transfer
    ├── refund
    ├── category-picker
    ├── account-picker
    └── date-picker
```

### Por qué esta estructura

- **5 tabs, ni una más.** Hoy (¿cómo voy?), Movimientos (¿qué pasó?), Presupuesto (¿cuánto me queda?) son las tres preguntas diarias. Todo lo demás —cuotas, deudas, metas, suscripciones, reportes— es semanal o mensual y vive en **Más**, que es un menú, no un basurero: agrupado por secciones con montos de resumen visibles en cada fila.
- **El FAB central es la acción, no una pantalla.** Ocupa el lugar de más fácil alcance del pulgar. Tap = captura rápida. **Long-press = menú radial** con Ingreso / Transferencia / Plantillas frecuentes.
- **Modales como bottom sheet**, no pantallas completas: se descartan con gesto, no rompen el contexto y se sienten más rápidos.
- Los stacks fuera de tabs se abren *sobre* la tab activa y regresan a ella.

### Deep links (para widgets, atajos de Siri y notificaciones)

```
ghastly://add                          → captura rápida
ghastly://add?amount=250&category=food → precargada (atajo de Siri)
ghastly://transactions/{id}
ghastly://budget
ghastly://calendar
```

---

## 6. Pantallas

Formato: **propósito · datos · interacción · estados**. Los endpoints citados son de `PLAN-backend.md` §8, pero la pantalla **siempre lee de SQLite local**; el endpoint alimenta la caché.

---

### 6.1 ⭐ Captura rápida — `(modals)/quick-add`

La pantalla más importante de la app. Se diseña primero y se optimiza sin piedad.

```
╭───────────────────────────────────────────╮
│  ✕                             Gasto  ▾   │  ← segmented: Gasto·Ingreso·Transfer
│                                           │
│                                           │
│                          Q 250.00         │  ← display 40pt, tabular
│                                           │     crece desde 0 al teclear
│  ─────────────────────────────────────    │
│                                           │
│  🍔 Alimentación   🚗 Transporte  ⚡ Luz   │  ← chips: 6 categorías más usadas
│  🏠 Casa          🎬 Ocio        ⋯ Todas  │     ordenadas por frecuencia real
│                                           │
│  💳 BAC Crédito ▾    📅 Hoy ▾             │  ← defaults inteligentes, 1 tap
│                                           │
│  ✎ Descripción (opcional)                 │
│                                           │
│  ╭─────┬─────┬─────╮                      │
│  │  1  │  2  │  3  │                      │  ← teclado propio, teclas de 56pt
│  ├─────┼─────┼─────┤                      │     NO el teclado del sistema:
│  │  4  │  5  │  6  │                      │     no hay latencia de aparición
│  ├─────┼─────┼─────┤                      │     ni salto de layout
│  │  7  │  8  │  9  │                      │
│  ├─────┼─────┼─────┤                      │
│  │  .  │  0  │  ⌫  │                      │
│  ╰─────┴─────┴─────╯                      │
│                                           │
│  ╭───────────────────────────────────╮    │
│  │            Guardar                │    │  ← ancho completo, pulgar
│  ╰───────────────────────────────────╯    │
╰───────────────────────────────────────────╯
```

**Decisiones:**

- **Abre con el foco en el monto y el teclado ya visible.** Cero taps de calentamiento.
- **Teclado numérico propio**, no el del sistema: aparición instantánea, sin reflow, teclas grandes, y soporta operaciones (`+`, `−`) para sumar la cuenta del súper sin salir.
- **Chips de categoría ordenados por uso real** (`use_count` local, no un orden fijo). Tras dos semanas, el 80% de los gastos se registran con un tap en las primeras seis.
- **Defaults que aciertan:** última cuenta usada, fecha = hoy. Se muestran, pero no piden atención.
- Descripción **opcional y al final**. Pedir texto obligatorio mata la métrica de 10 segundos.
- **Guardar cierra y vuelve** a donde estaba el usuario, con toast `Gasto registrado · Deshacer` (5 s).
- Si el backend responde `POSSIBLE_DUPLICATE`, **no se bloquea**: el toast cambia a `¿Repetido? Registraste Q250 en Alimentación hace 3 min · Ver`.
- Long-press en Guardar → **guardar y abrir otro** (para registrar varios gastos seguidos).

**Variante Transferencia:** el layout cambia a `Desde ▾ → Hacia ▾` sin categoría, y el color del monto pasa a `transfer`. Si el destino es una `credit_card`, la etiqueta se vuelve **"Pago de tarjeta"** automáticamente.

**Modo efectivo:** si la cuenta seleccionada es tipo `cash` y el saldo no alcanza, ofrece en línea "¿Retiraste efectivo?" y crea la transferencia. (Caso 8 del plan.)

---

### 6.2 🏠 Hoy — `(tabs)/index`

Responde en tres segundos: *¿cómo voy este mes y qué se me viene?*

```
╭───────────────────────────────────────────╮
│  Septiembre                        ⚙️ 🔔  │
│                                           │
│  Disponible este mes                      │
│  Q 4,320.50                               │  ← display. LA cifra.
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  62% del presupuesto  │
│  Vas bien · quedan 12 días                │  ← proyección, tono neutro
│                                           │
│  ╭──────────────╮ ╭──────────────╮        │
│  │ Ingresos     │ │ Gastos       │        │
│  │ + Q 11,200   │ │ − Q 6,879.50 │        │
│  ╰──────────────╯ ╰──────────────╯        │
│                                           │
│  CUENTAS                        Ver todas │
│  ┌───────────────────────────────────┐    │
│  │ 💳 BAC Crédito     − Q 3,240.00   │    │  ← scroll horizontal
│  │    Corte en 6 días                │    │
│  └───────────────────────────────────┘    │
│                                           │
│  PRÓXIMOS 7 DÍAS                          │
│  ⚠️  Netflix              Q 89.00   mañana │
│  📱 Cuota celular 4/12   Q 458.33   día 15│
│  💳 Pago BAC             Q 3,240    día 18│
│                                           │
│  EN QUÉ SE FUE                            │
│  🍔 Alimentación   Q 2,140  ▓▓▓▓▓▓▓░ 31%  │
│  🚗 Transporte     Q 1,280  ▓▓▓▓░░░░ 19%  │
│  ⚡ Servicios      Q 980    ▓▓▓░░░░░ 14%  │
│                                           │
│  ⚡ Gastaste 40% más en Ocio que el        │  ← anomalía, solo si existe
│     promedio. Ver →                       │
╰───────────────────────────────────────────╯
```

- Una llamada: `GET /reports/dashboard?month=`. La pantalla no orquesta seis peticiones.
- **"Disponible" es la cifra, no "gastado".** La gente decide con lo que le queda, no con lo que se fue.
- La proyección usa el ritmo real de gasto, no una regla de tres sobre los días transcurridos.
- El bloque de anomalías aparece **solo si hay una**. Nada de "Todo normal ✓" ocupando espacio.
- Pull-to-refresh dispara sync manual.
- **Patrimonio neto no está aquí.** Es una cifra mensual, vive en Reportes. Hoy es operativo.

---

### 6.3 📋 Movimientos — `(tabs)/transactions`

```
╭───────────────────────────────────────────╮
│  Movimientos                    🔍  ⚙️     │
│  ╭─────────────────────────────────────╮  │
│  │ 🔍 Buscar                           │  │
│  ╰─────────────────────────────────────╯  │
│  [Todos] [Gastos] [Ingresos] [Transfer.]  │  ← chips + filtro avanzado
│                                           │
│  HOY                          − Q 340.00  │  ← total por día a la derecha
│  🍔  Súper La Torre           − Q 285.00  │
│      Alimentación · BAC Débito            │
│  🚗  Uber                      − Q 55.00  │
│      Transporte · Efectivo          ⟳     │  ← ⟳ = pendiente de sincronizar
│                                           │
│  AYER                       + Q 4,160.00  │
│  💼  Salario septiembre     + Q 4,500.00  │
│      Salario · BAC Débito                 │
│  ↔️  A Ahorro                  Q 340.00 → │  ← transferencia: neutra, sin signo
│      BAC Débito → Ahorro BI               │
│                                           │
│  LUNES 8 DE SEPTIEMBRE        − Q 890.00  │
│  ...                                      │
╰───────────────────────────────────────────╯
```

- `FlashList` con secciones por día y **encabezado pegajoso**. Miles de filas sin perder frames.
- **Swipe izquierda** → Editar · Eliminar. **Swipe derecha** → Marcar conciliado. Eliminar es lógico y siempre ofrece `Deshacer`.
- Búsqueda: full-text local sobre descripción, comercio y notas + monto exacto. Debounce 200 ms, sin red.
- Filtro avanzado (sheet): rango de fechas, cuentas, categorías, rango de monto, etiquetas, solo no conciliados, incluir eliminados.
- **Chip de filtro activo siempre visible** con el total del filtro: `Alimentación · Sep · Q 2,140 ✕`. Nada peor que una lista filtrada que parece vacía sin decir por qué.
- Selección múltiple (long-press) → recategorizar en lote.
- Vacío: `Todavía no hay movimientos` + botón `Registrar el primero`.

---

### 6.4 Detalle de transacción — `transactions/[id]`

- Monto grande arriba con su color. Debajo: categoría, cuenta, fecha, comercio, notas, etiquetas.
- Si es USD: monto original, tasa aplicada y equivalente en GTQ, con la nota **"tasa del día de la compra"** — para que quede claro que no cambia.
- Si pertenece a un grupo: enlace a la **otra pata de la transferencia**, al **plan de cuotas** o a la **regla recurrente** que la generó.
- Foto del recibo, si hay.
- Acciones: Editar · Duplicar · **Registrar reembolso** · Guardar como plantilla · Eliminar.
- Al pie, discreto: creado/modificado y estado de sincronización.

---

### 6.5 🎯 Presupuesto — `(tabs)/budget`

```
╭───────────────────────────────────────────╮
│  ◀  Septiembre 2026  ▶              ⋯     │
│                                           │
│  Q 6,879 de Q 11,200                      │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  61%                 │
│  Proyección: Q 10,340 · dentro del límite │  ← ámbar si proyecta pasarse
│                                           │
│  🍔 Alimentación                          │
│     Q 2,140 / Q 2,500        ▓▓▓▓▓▓▓▓░ 86%│  ← ámbar (>80%)
│     Q 360 disponibles · ~Q 30/día         │
│                                           │
│  🚗 Transporte                            │
│     Q 1,280 / Q 1,200        ▓▓▓▓▓▓▓▓▓ 107%│ ← rojo, barra desbordada
│     Q 80 sobre el límite                  │
│                                           │
│  🎬 Ocio                          ↩ Q 120 │  ← ↩ = rollover del mes anterior
│     Q 340 / Q 800 (+120)     ▓▓▓░░░░░ 37% │
│                                           │
│  ⚡ Servicios                              │
│     Q 980 / Q 1,000          ▓▓▓▓▓▓▓▓░ 98%│
│                                           │
│  Sin presupuesto                          │
│  🐕 Mascotas   Q 240   + Asignar          │  ← gastos sin categoría presupuestada
╰───────────────────────────────────────────╯
```

- `GET /budgets/current?month=`. Navegación entre meses con swipe horizontal.
- Cada fila: gastado / presupuestado, barra, **disponible** y **ritmo diario sugerido** para el resto del mes. El ritmo es lo accionable.
- **La sección "Sin presupuesto" es clave:** expone las categorías donde hay gasto pero no hay límite. Es como el presupuesto crece de forma orgánica en vez de exigir configurarlo todo al inicio.
- El overflow se ve: barra desbordada + monto sobre el límite. No se recorta al 100%.
- `⋯` → Editar presupuesto · Copiar el del mes anterior · Configurar rollover · Historial.
- **Ingreso irregular:** al crear el presupuesto se ofrece `Fijo` / `Ingreso del mes anterior` / `Promedio 3 meses` (caso 7).
- Vacío: onboarding de una pantalla que propone montos a partir del gasto real de los últimos 3 meses. Nadie sabe cuánto presupuestar en frío.

---

### 6.6 Cuentas — `accounts/index`, `accounts/[id]`

Lista agrupada por tipo, con **patrimonio neto arriba** (activos − pasivos). Reordenable por arrastre.

**Detalle de cuenta:** saldo grande, gráfica de evolución de 30 días, movimientos de la cuenta, acciones (Ajustar saldo · Editar · Archivar).

**Detalle de tarjeta de crédito** — pantalla propia, porque el modelo mental es distinto:

```
╭───────────────────────────────────────────╮
│  💳 BAC Crédito                     ⋯     │
│                                           │
│  Consumido en este corte                  │
│  Q 3,240.00                               │
│  ▓▓▓▓▓▓▓░░░░░░░  de Q 15,000 de límite    │
│                                           │
│  Corte           18 de septiembre (6 días)│
│  Pago máximo     3 de octubre             │
│  Saldo anterior  Q 2,180.00 · pagado ✓    │
│                                           │
│  ╭───────────────────────────────────╮    │
│  │        Registrar pago             │    │  ← abre TRANSFERENCIA, no gasto
│  ╰───────────────────────────────────╯    │
│                                           │
│  CUOTAS ACTIVAS EN ESTA TARJETA           │
│  📱 Celular      4/12    Q 458.33/mes     │
│  💻 Laptop       2/18    Q 720.00/mes     │
│  Compromiso mensual: Q 1,178.33           │
╰───────────────────────────────────────────╯
```

El botón dice **"Registrar pago"** y abre una transferencia. El usuario nunca tiene que saber que es una transferencia; la app le impide equivocarse (caso 5).

---

### 6.7 Cuotas — `installments/`

- Lista de planes activos con `4/12`, cuota mensual y **saldo pendiente**.
- Arriba: **compromiso mensual total** y **pasivo total**. Las dos cifras que nadie tiene claras.
- Crear plan: monto total, número de cuotas, primera fecha, tasa opcional → **vista previa del calendario completo antes de guardar**.
- Detalle: calendario de cuotas con pagadas ✓, la del mes actual resaltada y las futuras en gris. Tap en la del mes → registrar pago.
- Copy explícito al crear: *"Esta compra no se cuenta como gasto de este mes. Solo la cuota de Q 458.33 afecta tu presupuesto."* Enseñar la regla en el momento en que importa (caso 6).

---

### 6.8 Suscripciones — `subscriptions/`

- Encabezado con **total mensual** y **anualizado**. Ver "Q 14,268 al año" cambia decisiones.
- Ordenadas por costo. Cada fila: nombre, monto, frecuencia, próximo cobro, cuenta.
- **Detección de alzas:** `⚠️ Subió de Q 79 a Q 89 en agosto`.
- **Candidatas a cancelar:** sin transacción asociada en 60 días → `¿Todavía la usás?`.
- Alta rápida desde plantillas comunes (Netflix, Spotify, gimnasio, alquiler, colegiatura).

---

### 6.9 Calendario — `calendar/`

Vista mensual unificada de compromisos: recurrentes + cuotas + cortes y pagos de tarjeta + deudas. Cada día con un punto de color por tipo. Debajo, la lista del día seleccionado.

Arriba: **"Comprometido este mes: Q 6,240"**, que es lo que realmente queda libre del ingreso.

---

### 6.10 Reportes — `reports/`

Cuatro sub-pantallas con `SegmentedControl`, no un scroll infinito:

| Vista | Contenido |
|---|---|
| **Resumen** | Patrimonio neto (línea, 12 meses), tasa de ahorro, ingreso vs. gasto (barras) |
| **Categorías** | Dona + lista ordenada. Tap en un sector → filtra Movimientos por esa categoría |
| **Tendencias** | Evolución mensual por categoría (6/12 meses), con selector |
| **Comparativo** | Mes vs. mes anterior y vs. mismo mes del año pasado, con Δ absoluto y % |

Reglas de gráficas (ver skill `dataviz` antes de escribir la primera):
- Máximo 6 categorías + "Otros". Nadie lee una dona de 14 sectores.
- El color de la serie es **estable entre pantallas**: Alimentación es el mismo color siempre.
- Toda gráfica tiene su tabla equivalente abajo. La gráfica seduce; la tabla informa.
- Ejes en `Q 12.5k`; los valores exactos van en el tooltip y en la tabla.
- Sin datos suficientes (<2 meses): mensaje honesto, no una gráfica plana.

---

### 6.11 Más — `(tabs)/more`

Menú agrupado, con montos de resumen en cada fila para que sirva de dashboard secundario:

```
GESTIÓN
  🏦 Cuentas                    Q 18,420  ›
  📱 Cuotas               3 planes activos ›
  🔁 Suscripciones           Q 1,189/mes  ›
  💰 Deudas                  Q 42,300     ›
  🎯 Metas                  2 en progreso ›
  🤝 Por cobrar                Q 850      ›
  🏷️ Categorías                           ›

ANÁLISIS
  📊 Reportes                              ›
  📅 Calendario                            ›

APP
  ⚙️ Ajustes  ·  🔄 Sincronización  ·  💾 Respaldo
```

### 6.12 Ajustes

`Perfil` · `Seguridad` (biométrico, PIN, bloqueo automático) · `Notificaciones` (umbrales de presupuesto, días de aviso, horas de silencio) · `Moneda y tasas` · `Sincronización` (estado, última vez, **mutaciones fallidas visibles y reintentables**) · `Respaldo y exportación` (CSV/Excel, backup cifrado) · `Apariencia` (claro/oscuro/sistema) · `Acerca de`.

---

## 7. Estados transversales

| Estado | Tratamiento |
|---|---|
| **Offline** | Barra fina, no modal: `Sin conexión · se guardará` + icono. **La app funciona igual.** Jamás bloquear la UI por falta de red. |
| **Sincronizando** | Indicador sutil en el encabezado. Sin overlay. |
| **No sincronizado** | `⟳` en la fila afectada. Se va solo al sincronizar. |
| **Cargando** | **Skeletons con la forma del contenido real**, nunca spinners centrados. |
| **Vacío** | Ilustración simple + una frase + **el botón de la acción**. Nunca solo "No hay datos". |
| **Error** | Qué pasó, en español, y qué hacer. `Reintentar` siempre presente. Nunca un código HTTP crudo. |
| **Conflicto de sync** | Sheet que muestra ambas versiones y deja elegir. Solo aparece si el servidor no pudo resolver. |
| **Deshacer** | Todo borrado ofrece `Deshacer` 5 s en el toast. El borrado es lógico, siempre reversible. |

---

## 8. Accesibilidad y calidad

- Escala de fuente del sistema hasta 200%, sin recortes ni superposiciones. Se prueba en cada pantalla.
- `accessibilityLabel` en todo control sin texto. Los montos se leen **`menos doscientos cincuenta quetzales`**, no `− Q 250.00`.
- Contraste ≥ 4.5:1. Nunca color como único portador de significado.
- Área táctil ≥ 48×48.
- Navegación completa con lector de pantalla en el flujo de captura, como mínimo.
- `prefers-reduced-motion` respetado.
- Presupuesto de rendimiento: **arranque a interactivo < 1.5 s**, apertura de captura rápida **< 150 ms**, scroll de 1000 movimientos a 60 fps.

---

## 9. Fases

Espejo de las fases del backend. **Cada fase termina con la app funcionando en un dispositivo real.**

| Fase | Alcance | Entregable |
|---|---|---|
| **0 — Fundaciones** | Expo + TS estricto + Expo Router; SQLite + Drizzle con migraciones; `domain/money.ts` **con sus tests primero**; tokens de diseño claro/oscuro completos; primitivas de `ui/`; shell de navegación con tabs vacíos | La app abre, con DB y sistema de diseño |
| **1 — Núcleo** | Auth + onboarding; cuentas y categorías; **captura rápida terminada y cronometrada**; lista de movimientos; detalle y edición; transferencias; saldos; sync completo | Puedo registrar toda mi vida financiera |
| **2 — Presupuestos** | Pantalla de presupuesto, edición, rollover, alertas, copiar mes anterior, sugerencia inicial | Control del mes en curso |
| **3 — Compromisos** | Suscripciones, cuotas, deudas, calendario, ciclos de tarjeta, notificaciones locales | Ningún pago sorprende |
| **4 — Reportes** | Las cuatro vistas, gráficas, anomalías, tasa de ahorro | Entiendo mis patrones |
| **5 — Calidad de vida** | Biométrico, widget, atajo de Siri, foto de recibo, plantillas, exportar, respaldo | Producción |

**Orden dentro de cada fase:** `domain` + tests → `data` (esquema, repos, sync) → `features` → pantallas. Sin saltarse capas.

---

## 10. Reglas para trabajar en este repo

- Lógica de negocio en `domain/`, funciones puras, sin React. Un `useEffect` no es el lugar para calcular un saldo.
- **Nunca `float` para dinero.** Centavos y `Money`.
- **Cero valores literales de estilo en las pantallas.** Todo color, espacio, radio y tamaño sale de `ui/tokens`. Un `#FF3B30` suelto en una feature es un bug.
- Toda pantalla se entrega con sus cuatro estados: cargando, vacía, error, con datos.
- Cada feature se prueba en **modo avión** antes de darla por terminada.
- Nada de librerías de UI completas. Las primitivas son propias; así el sistema de diseño se sostiene.
- Textos en `i18n`, nunca literales en el JSX. Español de Guatemala, tono directo, sin juicios.
- Antes de instalar una dependencia, evaluar si son 40 líneas propias.
- Commits pequeños y descriptivos.

---

## 11. Preguntas abiertas

- ¿iOS, Android o ambos? (define widget, atajo de Siri vs. App Shortcuts)
- ¿Nombre y marca definitivos? (los tokens de acento dependen de eso)
- ¿Se arranca con histórico cargado o desde cero? (cambia el onboarding por completo)
- ¿Cuántas cuentas y tarjetas reales? (define si el carrusel de cuentas en Hoy es horizontal o lista)
