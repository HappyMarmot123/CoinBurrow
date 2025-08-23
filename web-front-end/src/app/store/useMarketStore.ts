import { create } from "zustand";
import { Market } from "../../entities/market/types/types";

export interface MarketState {
  markets: Market[];
  isLoading: boolean;
  error: string | null;
  setMarkets: (markets: Market[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketStore = create<MarketState>()((set) => ({
  markets: [],
  isLoading: true,
  error: null,
  setMarkets: (markets) => set({ markets, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));
