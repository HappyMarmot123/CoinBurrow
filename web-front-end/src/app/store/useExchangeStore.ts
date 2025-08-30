import { create } from "zustand";
import {
  TickerDto,
  CandleDto,
  OrderbookDto,
  Market,
} from "@/entities/market/types/types";

const MAX_CANDLE_DATA_COUNT = 200;

export interface ExchangeState {
  isConnected: boolean;
  tickerData: Record<string, TickerDto | undefined>;
  candleData: CandleDto[];
  orderbookData: Record<string, OrderbookDto | undefined>;
  marketData: Market[];
  selectedCoin: Pick<Market, "market" | "korean_name" | "english_name">;
  actions: {
    setConnected: (status: boolean) => void;
    updateTickerData: (data: TickerDto[]) => void;
    updateCandleData: (data: CandleDto[]) => void;
    updateOrderbookData: (data: OrderbookDto[]) => void;
    updateMarketData: (data: Market[]) => void;
    setSelectedCoin: (coin: Market | undefined) => void;
  };
}

export const useExchangeStore = create<ExchangeState>((set) => ({
  isConnected: false,
  tickerData: {},
  candleData: [],
  orderbookData: {},
  marketData: [],
  selectedCoin: {
    market: "KRW-USDT",
    korean_name: "테더",
    english_name: "Tether",
  },
  actions: {
    setConnected: (status) => set({ isConnected: status }),
    updateTickerData: (data) => {
      set((state) => {
        const newTickerData = { ...state.tickerData };
        data.forEach((ticker) => {
          newTickerData[ticker.market] = ticker;
        });
        return { tickerData: newTickerData };
      });
    },
    updateCandleData: (data) => {
      set(() => ({
        candleData: data,
      }));
    },
    updateOrderbookData: (data) => {
      set((state) => {
        const newOrderbookData = { ...state.orderbookData };
        data.forEach((orderbook) => {
          newOrderbookData[orderbook.market] = orderbook;
        });
        return { orderbookData: newOrderbookData };
      });
    },
    updateMarketData: (data) => {
      set(() => ({ marketData: data }));
    },
    setSelectedCoin: (coin) => set({ selectedCoin: coin }),
  },
}));
