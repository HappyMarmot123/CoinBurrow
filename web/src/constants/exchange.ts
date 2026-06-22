import type { CandleTimeframe } from "../api/rest.js";
import { TIMEFRAME_LABELS } from "./candle.js";

export interface TimeframeOption {
  value: CandleTimeframe;
  label: string;
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { value: "1s", label: TIMEFRAME_LABELS["1s"] },
  { value: "1m", label: `${TIMEFRAME_LABELS["1m"]} (기본)` },
  { value: "3m", label: TIMEFRAME_LABELS["3m"] },
  { value: "5m", label: TIMEFRAME_LABELS["5m"] },
  { value: "15m", label: TIMEFRAME_LABELS["15m"] },
  { value: "30m", label: TIMEFRAME_LABELS["30m"] },
  { value: "60m", label: TIMEFRAME_LABELS["60m"] },
  { value: "240m", label: TIMEFRAME_LABELS["240m"] },
  { value: "1h", label: TIMEFRAME_LABELS["1h"] },
  { value: "4h", label: TIMEFRAME_LABELS["4h"] },
  { value: "1d", label: TIMEFRAME_LABELS["1d"] },
  { value: "1w", label: TIMEFRAME_LABELS["1w"] },
  { value: "1M", label: TIMEFRAME_LABELS["1M"] },
  { value: "1mo", label: TIMEFRAME_LABELS["1mo"] },
  { value: "1y", label: TIMEFRAME_LABELS["1y"] },
];

export const CANDLE_COUNT_OPTIONS = [30, 50, 100, 200];

export const CAUTION_LABELS: Record<string, string> = {
  PRICE_FLUCTUATIONS: "가격 급변동",
  TRADING_VOLUME_SOARING: "거래량 급증",
  DEPOSIT_AMOUNT_SOARING: "예치량 급증",
  GLOBAL_PRICE_DIFFERENCES: "가격 괴리 확대",
  CONCENTRATION_OF_SMALL_ACCOUNTS: "소수 계정 집중",
};
