import { create } from "zustand";
import { persist } from "zustand/middleware";

type SidebarStore = {
  isOpen: boolean;
  toggle: () => void;
};

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isOpen: true,
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    { name: "sidebar-state" },
  ),
);
