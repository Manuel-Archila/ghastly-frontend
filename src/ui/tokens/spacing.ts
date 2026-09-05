/** Escala de 4pt (PLAN-frontend §4.4). Margen lateral de pantalla: `spacing[4]`. */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

export const radii = {
  sm: 8, // chips, inputs
  md: 12, // tarjetas
  lg: 20, // sheets
  full: 9999, // botones circulares, avatares
} as const;

/** Área táctil mínima, aunque el icono se vea más chico (PLAN-frontend §4.4/§8). */
export const minTouchTarget = 48;
