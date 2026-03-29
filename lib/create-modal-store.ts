import { create } from "zustand";

type NewModalState = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

type OpenModalState = {
  id?: string;
  isOpen: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
};

export function createNewStore() {
  return create<NewModalState>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
  }));
}

export function createOpenStore() {
  return create<OpenModalState>((set) => ({
    id: undefined,
    isOpen: false,
    onOpen: (id: string) => set({ isOpen: true, id }),
    onClose: () => set({ isOpen: false, id: undefined }),
  }));
}
