import { useEffect, useState } from "react";

import { duration } from "@/ui/tokens/motion";
import { useReducedMotion } from "@/ui/useReducedMotion";

/**
 * Cifra que "corre" hasta su nuevo valor cuando cambia con la pantalla abierta
 * (por ejemplo, tras guardar un gasto y sincronizar): así se ve DE DÓNDE a
 * DÓNDE se movió el saldo, en vez de un salto.
 *
 * Deliberadamente NO anima en la primera carga: abrir la app es algo de todos
 * los días y contar desde cero cada vez sería ruido. Tampoco cuando el valor
 * pasa de/hacia `null`, ni con "Reducir movimiento".
 *
 * Corre con `requestAnimationFrame` en JS: son ~30 renders de UN texto durante
 * medio segundo, aceptable para una cifra que se ve una vez.
 */
export function useCountUp(target: number | null): number | null {
  const reduceMotion = useReducedMotion();
  const [anim, setAnim] = useState<{ key: number | null; shown: number | null }>({
    key: target,
    shown: target,
  });

  // Ajuste de estado durante el render (patrón de React para "estado derivado
  // de props"): sin esto habría un frame mostrando el valor nuevo antes de
  // arrancar la cuenta desde el viejo.
  if (target !== anim.key) {
    const jump = reduceMotion || anim.key === null || target === null;
    setAnim({ key: target, shown: jump ? target : anim.shown });
  }

  const from = anim.shown;
  useEffect(() => {
    if (target === null || from === null || from === target) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration.count);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = t === 1 ? target : Math.round(from + (target - from) * eased);
      setAnim({ key: target, shown: value });
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // Solo cuando cambia el destino: `from` es el valor mostrado en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return anim.shown;
}
