export type Channel = "ticker" | "orderbook" | "candle" | "trade";

export interface WorkerCommand {
  type: "subscribe" | "unsubscribe";
  channel: Channel;
  markets: string[];
}

export type WorkerResponse =
  | { type: Channel; data: unknown[] }
  | { type: "status"; connected: boolean };

const UPBIT_TYPE: Record<Channel, string> = {
  ticker: "ticker",
  orderbook: "orderbook",
  candle: "candle.1s",
  trade: "trade",
};

export function buildUpbitSubscription(subs: Record<Channel, Set<string>>): unknown[] {
  const message: unknown[] = [{ ticket: crypto.randomUUID() }];

  (Object.keys(subs) as Channel[]).forEach((channel) => {
    const codes = [...subs[channel]];
    if (codes.length > 0) {
      message.push({ type: UPBIT_TYPE[channel], codes });
    }
  });

  message.push({ format: "DEFAULT" });
  return message;
}
