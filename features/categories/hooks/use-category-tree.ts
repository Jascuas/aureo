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

    // Build id → children map
    const childrenMap = new Map<string | null, typeof categories>();
    for (const cat of categories) {
      const key = cat.parentId ?? null;
      const list = childrenMap.get(key) ?? [];
      list.push(cat);
      childrenMap.set(key, list);
    }

    // Depth-first flatten starting from a given parentId
    const flatten = (
      parentId: string | null,
      depth: number,
      parentPath: string,
    ): TreeItem[] => {
      const children = (childrenMap.get(parentId) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const result: TreeItem[] = [];
      for (const cat of children) {
        const path = parentPath ? `${parentPath} / ${cat.name}` : cat.name;
        if (cat.id !== excludeId) {
          result.push({ id: cat.id, name: cat.name, depth, path });
        }
        result.push(...flatten(cat.id, depth + 1, path));
      }
      return result;
    };

    // Each root becomes a group
    const roots = (childrenMap.get(null) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const result: CategoryGroup[] = [];
    for (const root of roots) {
      const rootPath = root.name;
      const items: TreeItem[] = [];

      // Root itself (selectable, depth 0) — unless it's the top suggestion
      if (root.id !== excludeId) {
        items.push({ id: root.id, name: root.name, depth: 0, path: rootPath });
      }

      // Descendants
      items.push(...flatten(root.id, 1, rootPath));

      // Skip groups that became empty after excluding the top suggestion
      if (items.length === 0) continue;

      result.push({ rootName: root.name, items });
    }

    return result;
  }, [categories, topSuggestion?.id]);

  return { topSuggestion, groups, isLoading };
};
