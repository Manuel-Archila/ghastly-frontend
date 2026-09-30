import { useCallback, useMemo, useState } from "react";
import { Switch, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import {
  listCategoriesForManagement,
  type Category,
} from "@/data/repositories/categories";
import { flattenTree } from "@/domain/categoryTree";
import { asIconName } from "@/features/categories/presets";
import {
  Button,
  FadeIn,
  Icon,
  ListItem,
  ScreenState,
  ScrollScreen,
  SegmentedControl,
  Text,
} from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function CategoriesScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [all, setAll] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setAll(await listCategoriesForManagement(true));
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const rows = useMemo(
    () =>
      flattenTree(all.filter((c) => c.kind === kind && (showArchived || !c.isArchived))),
    [all, kind, showArchived],
  );

  const status = !loaded ? "loading" : rows.length === 0 ? "empty" : "data";

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: "Categorías" }} />
      <SegmentedControl
        options={[
          { value: "expense", label: "Gastos" },
          { value: "income", label: "Ingresos" },
        ]}
        value={kind}
        onChange={setKind}
      />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="caption" color="secondary">
          Ver archivadas
        </Text>
        <Switch
          accessibilityLabel="Ver archivadas"
          value={showArchived}
          onValueChange={setShowArchived}
          trackColor={{ false: colors.border.control, true: colors.accent.bg }}
        />
      </View>

      <ScreenState
        status={status}
        empty={{
          message: "Todavía no hay categorías de este tipo.",
          icon: "pricetags-outline",
          actionLabel: "Crear la primera categoría",
          onAction: () => router.push({ pathname: "/categories/new", params: { kind } }),
        }}
      >
        <View>
          {rows.map(({ category, depth }, index) => {
            const icon = asIconName(category.icon);
            return (
              <FadeIn key={category.id} delay={index * 20}>
                <View style={{ paddingLeft: depth === 1 ? spacing[6] : 0 }}>
                  <ListItem
                    leading={<Icon name={icon ?? "pricetag-outline"} color={category.color ?? undefined} />}
                    title={category.name}
                    subtitle={category.isArchived ? "Archivada" : undefined}
                    strong={depth === 0}
                    accessibilityLabel={category.isArchived ? `${category.name}, archivada` : category.name}
                    onPress={() => router.push(`/categories/${category.id}`)}
                    last={index === rows.length - 1}
                  />
                </View>
              </FadeIn>
            );
          })}
        </View>

        <Button label="Nueva categoría" onPress={() => router.push({ pathname: "/categories/new", params: { kind } })} />
      </ScreenState>
    </ScrollScreen>
  );
}
