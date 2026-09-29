/**
 * Tokens de movimiento. Una sola fuente para duraciones, curvas y resortes:
 * ninguna pantalla ni primitiva escribe milisegundos sueltos.
 *
 * Criterio: la UI se queda bajo 300 ms; lo que se ve muchas veces al día
 * es más corto. Las salidas son más rápidas que las entradas.
 */
export const duration = {
  /** Feedback de presión. */
  press: 120,
  /** Entradas/salidas pequeñas: toast, chip, cambio de color. */
  fast: 200,
  /** Entradas de bloque (tarjeta, fila). */
  base: 260,
  /** Conteo de cifras y relleno de barras: se ve al abrir, no repetidamente. */
  count: 500,
  /** Pulso del skeleton, por semiciclo. */
  pulse: 800,
} as const;

/** Curvas como puntos de `Easing.bezier(...)`. `out` es el ease-out fuerte
 * para todo lo que entra; `inOut` para lo que se mueve estando en pantalla. */
export const bezier = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
} as const;

/** Resortes críticos (sin rebote visible) para presión y layout. */
export const spring = {
  press: { damping: 22, stiffness: 420, mass: 1 },
  layout: { damping: 24, stiffness: 260, mass: 1 },
} as const;

/** Escala al presionar: sutil, 0.95–0.98. */
export const pressScale = 0.97;

/** Desplazamiento de entrada (px). */
export const enterOffset = 8;

/** Tope del escalonado de listas: pasado este índice todo entra junto. */
export const staggerStep = 30;
export const staggerMaxItems = 8;
