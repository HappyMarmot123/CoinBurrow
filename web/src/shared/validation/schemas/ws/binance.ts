import { z } from "zod";

// 결합 스트림(wss://.../stream?streams=...) miniTicker 메시지
export const binanceMiniTickerSchema = z.object({
  stream: z.string(),
  data: z.object({
    s: z.string(), // 심볼 (예: BTCUSDT)
    c: z.string(), // 현재가(마지막 체결가)
  }),
});

export type BinanceMiniTickerMessage = z.infer<typeof binanceMiniTickerSchema>;
