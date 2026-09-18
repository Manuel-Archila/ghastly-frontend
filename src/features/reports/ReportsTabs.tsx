import { useRouter, type Href } from "expo-router";

import { SegmentedControl } from "@/ui/primitives";

export type ReportsTab = "summary" | "categories" | "trends" | "comparison";

const ROUTES: Record<ReportsTab, Href> = {
  summary: "/reports",
  categories: "/reports/categories",
  trends: "/reports/trends",
  comparison: "/reports/comparison",
};

const OPTIONS: { value: ReportsTab; label: string }[] = [
  { value: "summary", label: "Resumen" },
  { value: "categories", label: "Categorías" },
  { value: "trends", label: "Tendencias" },
  { value: "comparison", label: "Comparativo" },
];

/** Barra de navegación compartida por las 4 vistas de Reportes — cada
 * vista es su propia ruta (`router.replace`, no `push`, para que "atrás"
 * no apile las 4 pantallas una sobre otra). */
export function ReportsTabs({ active }: { active: ReportsTab }) {
  const router = useRouter();
  return (
    <SegmentedControl
      options={OPTIONS}
      value={active}
      onChange={(tab) => {
        if (tab !== active) router.replace(ROUTES[tab]);
      }}
    />
  );
}
