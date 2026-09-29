import type { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";

import { EmptyState, type EmptyStateProps } from "@/ui/primitives/EmptyState";
import { ErrorState } from "@/ui/primitives/ErrorState";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { useTokens } from "@/ui/tokens";

export type ScreenStatus = "loading" | "error" | "empty" | "data";

export interface ScreenStateProps {
  status: ScreenStatus;
  /** Skeleton propio con la forma real del contenido. Si no se pasa, se usa
   * el preset de `skeleton`. */
  loading?: ReactNode;
  /** Preset de skeleton: filas de lista o cifra grande + filas. */
  skeleton?: "list" | "detail";
  error?: string;
  onRetry?: () => void;
  empty?: EmptyStateProps;
}

/**
 * Los cuatro estados de toda pantalla en un solo lugar: cargando (skeleton
 * con la forma del contenido, nunca spinner), vacía (frase + acción), error
 * (qué pasó + Reintentar) y con datos (los `children`).
 *
 * Las pantallas locales deben pasar `loading` hasta la PRIMERA lectura: de
 * lo contrario se ve "no hay nada" un instante antes de que lleguen los datos.
 */
export function ScreenState({
  status,
  loading,
  skeleton = "list",
  error,
  onRetry,
  empty,
  children,
}: PropsWithChildren<ScreenStateProps>) {
  if (status === "loading") return <>{loading ?? <SkeletonPreset kind={skeleton} />}</>;
  if (status === "error") {
    return <ErrorState message={error ?? "No se pudo cargar."} onRetry={onRetry} />;
  }
  if (status === "empty" && empty) return <EmptyState {...empty} />;
  return <>{children}</>;
}

function SkeletonPreset({ kind }: { kind: "list" | "detail" }) {
  const { spacing } = useTokens();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      style={{ gap: spacing[4], paddingTop: spacing[2] }}
    >
      {kind === "detail" ? (
        <View style={{ gap: spacing[2] }}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="65%" height={44} />
        </View>
      ) : null}
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="35%" height={12} />
          </View>
          <Skeleton width={72} height={16} />
        </View>
      ))}
    </View>
  );
}
