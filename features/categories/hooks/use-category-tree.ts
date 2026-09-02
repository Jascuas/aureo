import { useMemo } from "react";

import { useGetCategories } from "@/features/categories/api/use-get-categories";

type CategorySuggestion = {
  categoryId: string;
  confidence: number;
};

export type TreeItem = {
  id: string;
  name: string;
  /** Depth in the hierarchy: 0 = root (selectable), 1 = child, 2 = grandchild, … */
  depth: number;
  /** Full slash-separated path used as cmdk `value` for fuzzy search. */
  path: string;
};

export type CategoryGroup = {
  /** Displayed as the CommandGroup heading (not selectable). */
  rootName: string;
  /** Root itself (depth 0) followed by descendants depth-first, each level alpha sorted. */
  items: TreeItem[];
};

export type TopSuggestionItem = {
  id: string;
  name: string;
  confidence: number;
  path: string;
};

type UseCategoryTreeResult = {
  topSuggestion: TopSuggestionItem | null;
  groups: CategoryGroup[];
  isLoading: boolean;
};

/**
 * Returns the category tree shaped for the Command menu:
 * - `topSuggestion` — highest-confidence AI suggestion (excluded from groups).
 * - `groups` — one group per root category, sorted alphabetically by root name.
 *   Each group's items start with the root itself (depth 0, selectable) then its
 *   descendants depth-first, each sibling level sorted alphabetically.
 *   Groups whose sole item was the top suggestion are omitted.
 */
export const useCategoryTree = (
  suggestions?: CategorySuggestion[],
): UseCategoryTreeResult => {
  const { data: categories, isLoading } = useGetCategories();

  const topSuggestion = useMemo<TopSuggestionItem | null>(() => {
    if (!suggestions?.length || !categories?.length) return null;

    const best = suggestions.reduce((a, b) =>
      a.confidence >= b.confidence ? a : b,
    );

    const cat = categories.find((c) => c.id === best.categoryId);
    if (!cat) return null;

    const path = cat.parentName ? `${cat.parentName} / ${cat.name}` : cat.name;

    return { id: cat.id, name: cat.name, confidence: best.confidence, path };
  }, [suggestions, categories]);

  const groups = useMemo<CategoryGroup[]>(() => {
    if (!categories?.length) return [];

    const excludeId = topSuggestion?.id ?? null;
    const pathsById = new Map<string, string>();
    const groupsByRootId = new Map<string, CategoryGroup>();
    let currentRootId: string | null = null;

    for (const category of categories) {
      const parentPath =
        category.parentId === null
          ? ""
          : pathsById.get(category.parentId) ?? "";
      const path = parentPath ? `${parentPath} / ${category.name}` : category.name;
      pathsById.set(category.id, path);

      if (category.depth === 0) {
        currentRootId = category.id;
        groupsByRootId.set(category.id, { rootName: category.name, items: [] });
      }

      if (currentRootId === null || category.id === excludeId) {
        continue;
      }

      groupsByRootId.get(currentRootId)?.items.push({
        id: category.id,
        name: category.name,
        depth: category.depth,
        path,
      });
    }

    return [...groupsByRootId.values()].filter((group) => group.items.length > 0);
  }, [categories, topSuggestion?.id]);

  return { topSuggestion, groups, isLoading };
};
