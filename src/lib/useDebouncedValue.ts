import { useEffect, useState } from "react";

/** Devuelve `value` con retraso: solo cambia cuando `delayMs` pasó sin que
 * `value` se moviera. Para no consultar SQLite en cada tecla de una búsqueda. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
