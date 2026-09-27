import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { errorMessageFor } from "@/data/api/error-messages";
import {
  listCategoriesForManagement,
  type Category,
} from "@/data/repositories/categories";
import { flattenTree } from "@/domain/categoryTree";
import { asIconName } from "@/features/categories/presets";
import { seedCategoriesFromServer } from "@/features/categories/seed";
import { Button, FadeIn, Icon, Notice, Screen, SegmentedControl, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function CategoriesScreen() {
  const router = useRouter();
  const { spacing, colors, minTouchTarget } = useTokens();

  const [all, setAll] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [showArchived, setShowArchived] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onSeed() {
    setSeeding(true);
    setError(null);
    try {
      await seedCategoriesFromServer();
      await load();
    } catch (e) {
      setError(errorMessageFor(e, "No se pudieron cargar las categorías. Reintentá."));
    }
    setSeeding(false);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Categorías" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
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
          <Switch value={showArchived} onValueChange={setShowArchived} />
        </View>

        {error ? <Notice tone="danger" text={error} /> : null}

        {loaded && rows.length === 0 ? (
          <View style={{ gap: spacing[2] }}>
            <Text variant="body" color="secondary">
              Todavía no hay categorías de este tipo.
            </Text>
            <Button
              label={seeding ? "Cargando…" : "Cargar categorías por defecto"}
              variant="secondary"
              disabled={seeding}
              onPress={() => void onSeed()}
            />
          </View>
        ) : null}

        <View>
          {rows.map(({ category, depth }, index) => {
            const icon = asIconName(category.icon);
            return (
              <FadeIn key={category.id} delay={Math.min(index, 10) * 20}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    category.isArchived ? `${category.name}, archivada` : category.name
                  }
                  onPress={() => router.push(`/categories/${category.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[3],
                    minHeight: minTouchTarget,
                    paddingVertical: spacing[2],
                    paddingLeft: depth === 1 ? spacing[6] : 0,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.subtle,
                    opacity: pressed ? 0.6 : category.isArchived ? 0.6 : 1,
                  })}
                >
                  <Icon name={icon ?? "pricetag-outline"} color={category.color ?? undefined} />
                  <Text variant={depth === 1 ? "body" : "bodyStrong"} style={{ flex: 1 }}>
                    {category.name}
                  </Text>
                  {category.isArchived ? (
                    <Text variant="caption" color="tertiary">
                      Archivada
                    </Text>
                  ) : null}
                  <Icon name="chevron-forward" size={16} />
                </Pressable>
              </FadeIn>
            );
          })}
        </View>

        <Button label="+ Nueva categoría" onPress={() => router.push("/categories/new")} />
        {rows.length > 0 ? (
          <Button
            label={seeding ? "Cargando…" : "Cargar categorías por defecto"}
            variant="ghost"
            disabled={seeding}
            onPress={() => void onSeed()}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
