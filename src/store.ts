import { create } from 'zustand';

// Estado efêmero de interface (o que precisa persistir fica no IndexedDB).
interface UiState {
  toast: { text: string; icon?: string } | null;
  showToast: (text: string, icon?: string) => void;
  dietWeekday: number;
  setDietWeekday: (d: number) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiState>((set) => ({
  toast: null,
  showToast: (text, icon) => {
    clearTimeout(timer);
    set({ toast: { text, icon } });
    timer = setTimeout(() => set({ toast: null }), 2600);
  },
  dietWeekday: new Date().getDay(),
  setDietWeekday: (d) => set({ dietWeekday: d }),
}));
