import { create } from "zustand";
import { Market, Ticker } from "../../entities/market/types/types";

export interface MarketState {
  markets: Market[];
  tickers: Record<string, Ticker>;
  isLoading: boolean;
  error: string | null;
  setMarkets: (markets: Market[]) => void;
  setTickers: (tickers: Record<string, Ticker>) => void;
  updateTicker: (ticker: Ticker) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketStore = create<MarketState>()((set) => ({
  markets: [],
  tickers: {},
  isLoading: true,
  error: null,
  setMarkets: (markets) => set({ markets, isLoading: false }),
  setTickers: (tickers) => set({ tickers }),
  updateTicker: (ticker) =>
    set((state) => ({
      tickers: {
        ...state.tickers,
        [ticker.code]: ticker,
      },
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));
