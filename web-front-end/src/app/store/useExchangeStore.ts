import { create } from "zustand";
import {
  TickerDto,
  CandleDto,
  OrderbookDto,
} from "@/entities/market/types/types";

interface ExchangeState {
  isConnected: boolean;
  tickerData: Record<string, TickerDto | undefined>;
  candleData: Record<string, CandleDto[] | undefined>;
  orderbookData: Record<string, OrderbookDto | undefined>;
  actions: {
    setConnected: (status: boolean) => void;
    updateTickerData: (data: TickerDto[]) => void;
    updateCandleData: (data: CandleDto[]) => void;
    updateOrderbookData: (data: OrderbookDto[]) => void;
  };
}

export const useExchangeStore = create<ExchangeState>((set) => ({
  isConnected: false,
  tickerData: {},
  candleData: {},
  orderbookData: {},
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
      set((state) => {
        const newCandleData = { ...state.candleData };
        data.forEach((candle) => {
          // Assuming the candle array contains a single candle per market update
          // or we want to append new candles to an existing array
          newCandleData[candle.market] = [
            ...(newCandleData[candle.market] || []),
            candle,
          ];
        });
        return { candleData: newCandleData };
      });
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
  },
}));
