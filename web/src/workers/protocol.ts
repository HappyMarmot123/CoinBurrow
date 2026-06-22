export type Channel = "ticker" | "orderbook" | "candle" | `candle.${string}` | "trade";

export interface WorkerCommand {
  type: "subscribe" | "unsubscribe";
  channel: Channel;
  markets: string[];
}

export type WorkerResponse =
  | { type: Channel; data: unknown[] }
  | { type: "status"; connected: boolean };

function normalizeCandleChannel(channel: Channel): string {
  if (channel === "candle") return "candle.1m";
  if (channel.startsWith("candle.")) return channel;
  return channel;
}

function isUpbitSubscriptionChannel(channel: string): boolean {
  return (
    channel === "ticker"
    || channel === "orderbook"
    || channel === "trade"
    || channel.startsWith("candle.")
  );
}

export function buildUpbitSubscription(subs: Record<string, Set<string>>): unknown[] {
  const message: unknown[] = [{ ticket: crypto.randomUUID() }];

  (Object.keys(subs) as Channel[]).forEach((channel) => {
    const codes = [...subs[channel]];
    if (codes.length > 0) {
      const type = channel === "ticker"
        || channel === "orderbook"
        || channel === "trade"
        ? channel
        : normalizeCandleChannel(channel);

      if (isUpbitSubscriptionChannel(type)) {
        message.push({ type, codes });
      }
    }
  });

  message.push({ format: "DEFAULT" });
  return message;
}
