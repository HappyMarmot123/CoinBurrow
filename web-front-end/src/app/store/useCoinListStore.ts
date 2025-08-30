import { create } from "zustand";
import { Market } from "@/entities/market/types/types";

interface CoinListState {
  coinList: Market[];
  actions: {
    setCoinList: (coinList: Market[]) => void;
  };
}

export const useCoinListStore = create<CoinListState>((set) => ({
  coinList: [],
  actions: {
    setCoinList: (coinList) => set({ coinList }),
  },
}));
