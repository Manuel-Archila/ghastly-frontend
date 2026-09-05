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

**Fase 0 completa, Fase 1 parcial.** Ya funciona una rebanada vertical completa: migraciones locales (Drizzle + `useMigrations`), `domain/money.ts`+`balances.ts`+`uuid.ts` (con tests), cliente HTTP tipado, store de sesión (Zustand + SecureStore), pantallas de login/registro con gate de auth en el root layout, **captura rápida** (escribe SQLite + encola outbox, actualiza al instante, advierte duplicado), crear cuenta, y **sync completo** (`push` del outbox por lotes con backoff + `pull` con cursor, push antes que pull). Primitivas: `Text`, `Button`, `Screen`, `Input`, `Chip`.

`npm run typecheck`/`test`/`lint` en verde; el bundle de iOS completo compila con `npx expo export` (no hay simulador en esta máquina — falta Xcode CLT / Android SDK).

**Falta de Fase 1:** onboarding guiado, lista de movimientos con búsqueda/filtros, detalle y edición de transacción, transferencias y reembolsos en la UI, refresh automático de token, el teclado numérico propio y los háptics de la captura rápida, y aplicar en el `pull` los `entity_type` más allá de account/category/transaction.

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
