import type { CandlestickData, HistogramData, UTCTimestamp } from "lightweight-charts";
import type { CandleTimeframe } from "../../api/rest.js";
import type { CandleView } from "../../stores/types.js";

export const TF_SECONDS: Record<CandleTimeframe, number> = {
  "1s": 1,
  "1m": 60,
  "3m": 180,
  "5m": 300,
  "10m": 600,
  "15m": 900,
  "30m": 1800,
  "60m": 3600,
  "240m": 14400,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
  "1w": 604800,
  "1mo": 2592000,
  "1M": 2592000,
  "1y": 31536000,
};

export function readCssToken(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function toCandlestickBar(candle: CandleView): CandlestickData {
  return {
    time: Math.floor(candle.timestamp / 1000) as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

export function toVolumeBar(candle: CandleView, upColor: string, downColor: string): HistogramData {
  return {
    time: Math.floor(candle.timestamp / 1000) as UTCTimestamp,
    value: candle.volume,
    color: candle.close >= candle.open ? upColor : downColor,
  };
}

export function formatKstLabel(time: UTCTimestamp): string {
  const kstOffsetSeconds = 9 * 60 * 60;
  const asUtc = new Date((Number(time) + kstOffsetSeconds) * 1000);
  const day = String(asUtc.getUTCMonth() + 1).padStart(2, "0");
  const hours = String(asUtc.getUTCHours()).padStart(2, "0");
  const minutes = String(asUtc.getUTCMinutes()).padStart(2, "0");
  return `${day} ${hours}:${minutes}`;
}

export function formatAmount(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(value);
}

export const tickFormatter = (rawTime: number): string => formatKstLabel(rawTime as UTCTimestamp);
