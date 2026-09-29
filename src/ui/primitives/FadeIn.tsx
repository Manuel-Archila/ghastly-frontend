import { type PropsWithChildren, useMemo } from "react";
import Animated, { Easing, FadeIn as FadeOnly, Keyframe } from "react-native-reanimated";

import { bezier, duration, enterOffset, staggerMaxItems, staggerStep } from "@/ui/tokens/motion";
import { useReducedMotion } from "@/ui/useReducedMotion";

export interface FadeInProps {
  /** Retraso opcional en ms para escalonar filas. Se recorta al tope del
   * escalonado (`staggerMaxItems` × `staggerStep`): en una lista larga la
   * última fila no espera segundos. */
  delay?: number;
}

const EASE_OUT = Easing.bezier(...bezier.out);
const MAX_DELAY = staggerStep * staggerMaxItems;

/**
 * Fade + subida corta al montar, para que listas y tarjetas no aparezcan de
 * golpe. Es una animación de entrada de Reanimated: arranca desde el estado
 * inicial en el primer frame (sin el parpadeo de la versión anterior) y corre
 * en el hilo de UI.
 *
 * "Reducir movimiento": solo fundido, sin desplazamiento.
 *
 * NO usar dentro de FlashList/FlatList/SectionList: las filas se reciclan y
 * la animación se dispararía cada vez que una fila vuelve a la vista.
 */
export function FadeIn({ children, delay = 0 }: PropsWithChildren<FadeInProps>) {
  const reduceMotion = useReducedMotion();
  const wait = Math.min(delay, MAX_DELAY);

  const entering = useMemo(() => {
    if (reduceMotion) return FadeOnly.duration(duration.fast).delay(wait);
    return new Keyframe({
      0: { opacity: 0, transform: [{ translateY: enterOffset }] },
      100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
    })
      .duration(duration.base)
      .delay(wait);
  }, [reduceMotion, wait]);

  return <Animated.View entering={entering}>{children}</Animated.View>;
}
