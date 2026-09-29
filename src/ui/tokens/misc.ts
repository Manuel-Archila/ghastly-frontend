/** Opacidades de estado. Antes vivían sueltas (0.5, 0.6, 0.7, 0.85). */
export const opacity = {
  pressed: 0.85,
  pressedSubtle: 0.6,
  disabled: 0.4,
} as const;

/** Tamaños de icono. El área táctil sigue siendo `minTouchTarget`. */
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

/** Puntos de leyenda y marcadores. */
export const dot = {
  sm: 8,
  md: 10,
} as const;

/** Grosores de línea. */
export const stroke = {
  hairline: 1,
  control: 1.5,
} as const;
