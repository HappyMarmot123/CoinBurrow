import { create } from "zustand";
import {
  TickerDto,
  CandleDto,
  OrderbookDto,
  Market,
  SelectedCoin,
  TradeDto,
} from "@/entities/market/types/types";

const MAX_CANDLE_DATA_COUNT = 200;

export interface ExchangeState {
  isConnected: boolean;
  tickerData: Record<string, TickerDto | undefined>;
  candleData: CandleDto[];
  orderbookData: Record<string, OrderbookDto | undefined>;
  tradeData: Record<string, TradeDto[]>; // Trade 데이터 추가
  marketData: Market[];
  selectedCoin: SelectedCoin;
  actions: {
    setConnected: (status: boolean) => void;
    updateTickerData: (data: TickerDto[]) => void;
    updateCandleData: (data: CandleDto[]) => void;
    updateOrderbookData: (data: OrderbookDto[]) => void;
    updateTradeData: (data: TradeDto[]) => void; // Trade 데이터 업데이트 액션 추가
    updateMarketData: (data: Market[]) => void;
    setSelectedCoin: (coin: SelectedCoin | undefined) => void;
  };
}

export const useExchangeStore = create<ExchangeState>((set) => ({
  isConnected: false,
  tickerData: {},
  candleData: [],
  orderbookData: {},
  tradeData: {}, // 초기화
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
          newTickerData[ticker.code] = ticker; // market 대신 code 사용
        });
        return { tickerData: newTickerData };
      });
    },
    updateCandleData: (data) => {
      set((state) => {
        const newCandleData = [...state.candleData];
        data.forEach((newCandle) => {
          const existingIndex = newCandleData.findIndex(
            (candle) =>
              candle.candle_date_time_kst === newCandle.candle_date_time_kst
          );
          if (existingIndex !== -1) {
            // 기존 캔들 업데이트
            newCandleData[existingIndex] = newCandle;
          } else {
            // 새 캔들 추가
            newCandleData.push(newCandle);
          }
        });
        // MAX_CANDLE_DATA_COUNT를 사용하여 최대 캔들 데이터 수를 유지
        const startIndex = Math.max(
          0,
          newCandleData.length - MAX_CANDLE_DATA_COUNT
        );
        return { candleData: newCandleData.slice(startIndex) };
      });
    },
    updateOrderbookData: (data) => {
      set((state) => {
        const newOrderbookData = { ...state.orderbookData };
        data.forEach((orderbook) => {
          newOrderbookData[orderbook.code] = orderbook; // market 대신 code 사용
        });
        return { orderbookData: newOrderbookData };
      });
    },
    updateTradeData: (data) => {
      set((state) => {
        const newTradeData = { ...state.tradeData };
        data.forEach((trade) => {
          if (!newTradeData[trade.code]) {
            newTradeData[trade.code] = [];
          }
          // 최신 50개의 체결 데이터만 유지
          newTradeData[trade.code] = [trade, ...newTradeData[trade.code]].slice(
            0,
            50
          );
        });
        return { tradeData: newTradeData };
      });
    },
    updateMarketData: (data) => {
      set(() => ({ marketData: data }));
    },
    setSelectedCoin: (coin) => set({ selectedCoin: coin }),
  },
}));
