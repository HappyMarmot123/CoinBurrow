import { useEffect, useRef, useCallback } from "react";
import { useCoinListStore } from "@/app/store/useCoinListStore";
import {
  WorkerCommand,
  WorkerResponse,
  SocketNamespace,
} from "@/shared/types/socket";

export function useMarketSocketWorker() {
  const worker = useRef<Worker | null>(null);
  const { setCoinList } = useCoinListStore((state) => state.actions);

  useEffect(() => {
    const workerInstance = new Worker(
      new URL("@/shared/workers/socket.worker.ts", import.meta.url)
    );
    worker.current = workerInstance;

    workerInstance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data;
      switch (type) {
        case "CONNECTED":
          // handle connected state if needed, e.g., set a market-specific connected state
          break;
        case "DISCONNECTED":
          // handle disconnected state if needed
          break;
        case "ERROR": {
          console.error("Market Socket Worker Error:", payload.message);
          break;
        }
      }
    };

    return () => {
      workerInstance.postMessage({
        type: "DISCONNECT",
        payload: { namespace: "/market" },
      } as WorkerCommand);
      workerInstance.terminate();
    };
  }, []);

  const connect = useCallback((namespace: SocketNamespace) => {
    worker.current?.postMessage({
      type: "CONNECT",
      payload: { namespace, url: process.env.NEXT_PUBLIC_WEBSOCKET_URL },
    } as WorkerCommand);
  }, []);

  return {
    connect,
  };
}
