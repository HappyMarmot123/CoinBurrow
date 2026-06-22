import type { CandleTimeframe } from "../api/rest.js";

export const TIMEFRAME_LABELS: Readonly<Record<CandleTimeframe, string>> = {
  "1s": "1s",
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "10m": "10m",
  "15m": "15m",
  "30m": "30m",
  "60m": "60m",
  "240m": "240m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
  "1w": "1w",
  "1mo": "1M",
  "1M": "1M",
  "1y": "1Y",
};

export const CANDLE_FALLBACK_PATH: Readonly<Record<CandleTimeframe, string>> = {
  "1s": "/candles/seconds/1",
  "1m": "/candles/minutes/1",
  "3m": "/candles/minutes/3",
  "5m": "/candles/minutes/5",
  "10m": "/candles/minutes/10",
  "15m": "/candles/minutes/15",
  "30m": "/candles/minutes/30",
  "60m": "/candles/minutes/60",
  "240m": "/candles/minutes/240",
  "1h": "/candles/minutes/60",
  "4h": "/candles/minutes/240",
  "1d": "/candles/days",
  "1w": "/candles/weeks",
  "1mo": "/candles/months",
  "1M": "/candles/months",
  "1y": "/candles/years/1",
};
