# 프론트엔드 웹소켓 성능 최적화 명세서

## 1. 개요

본 문서는 웹소켓을 통해 대용량 데이터를 처리하는 실시간 암호화폐 투자 플랫폼의 프론트엔드 성능 최적화 방안을 정의합니다. **Web Worker**를 사용하여 네트워크 통신을 메인 UI 스레드에서 분리하고, **RxJS**를 통해 데이터 스트림을 효율적으로 관리하여 애플리케이션의 반응성과 안정성을 극대화하는 것을 핵심 목표로 합니다.

웹 워커는 웹 애플리케이션의 메인 실행 스레드와는 별도로 백그라운드에서 스크립트를 실행할 수 있게 해주는 자바스크립트 기능입니다. 이 기능을 사용하면 사용자 인터페이스(UI)를 멈추게 하는 블로킹(blocking) 없이 복잡하고 시간이 오래 걸리는 연산을 처리할 수 있습니다. 웹 워커는 새로운 전역 실행 컨텍스트에서 작동하며, 메인 스레드와는 완전히 분리되어 있습니다. 따라서 웹 워커는 **DOM(문서 객체 모델)**에 접근할 수 없습니다.

RxJS는 리액티브 프로그래밍을 위한 자바스크립트 라이브러리입니다. 비동기적이거나 이벤트 기반의 데이터 스트림을 다루는 데 사용됩니다. 핵심 개념인 **Observable(관찰 가능한 객체)**을 통해 시간의 흐름에 따라 변화하는 데이터를 관리하고, 이를 구독하여 다양한 연산을 수행할 수 있게 해줍니다.

## 2. 목표

- **UI 렌더링 성능 보장**: 대량의 웹소켓 메시지를 수신하고 처리하는 중에도 메인 스레드의 부하를 최소화하여 60 FPS 수준의 부드러운 사용자 경험을 유지합니다.
- **안정적인 데이터 처리**: RxJS를 활용하여 복잡한 비동기 데이터 스트림을 선언적으로 관리하고, 예측 가능한 상태 업데이트를 보장합니다.
- **강력한 연결 관리**: 웹소켓 연결 끊김 발생 시 자동으로 재연결을 시도하는 로직을 구현하여 데이터 유실을 최소화하고 안정성을 높입니다.
- **모듈화 및 유지보수성 향상**: 웹소켓 관련 로직을 별도의 Worker와 서비스 모듈로 분리하여 코드의 응집도를 높이고 유지보수를 용이하게 합니다.

## 3. 핵심 아키텍처

아키텍처는 세 가지 주요 부분으로 구성됩니다.

1.  **메인 스레드 (Main Thread)**:

    - React 컴포넌트, UI 렌더링, 사용자 상호작용을 처리합니다.
    - Web Worker를 생성하고, 데이터 수신/송신 명령을 전달합니다.
    - Worker로부터 처리된 데이터를 받아 최종적으로 UI 상태(State)를 업데이트합니다.

2.  **웹 워커 (Web Worker)**:

    - 메인 스레드와 완전히 분리된 백그라운드 스레드에서 실행됩니다.
    - 실제 웹소켓 연결 생성, 메시지 수신 및 파싱, 데이터 가공 등 모든 네트워크 관련 작업을 전담합니다.
    - RxJS를 사용하여 웹소켓 데이터 스트림을 관리합니다.
    - 메인 스레드와는 `postMessage` API를 통해서만 통신합니다.

3.  **RxJS 데이터 스트림**:
    - Worker 내에서 웹소켓 연결과 이벤트를 Observable 스트림으로 추상화합니다.
    - `rxjs/webSocket`을 사용하여 연결, 메시지 수신, 에러 처리, 재연결 로직을 손쉽게 구현합니다.
    - 수신된 데이터를 `map`, `filter`, `scan` 등의 연산자로 파이프라인처럼 처리합니다.

### 데이터 흐름도

<img width="1850" height="930" alt="Image" src="https://github.com/user-attachments/assets/b69243d1-13ee-4042-82c6-2908dbd4a7b4" />

이 아키텍처의 데이터 흐름은 사용자의 UI 상호작용부터 시작하여 최종적으로 UI가 업데이트되기까지 다음과 같은 순서로 진행됩니다.

### 단계별 상세 흐름

1.  **연결 요청 (`React Component` → `useSocket` 훅)**

    - 사용자가 마켓 페이지에 진입하면, `MarketPage` 컴포넌트가 렌더링되면서 내부에 있는 `useSocket` 커스텀 훅의 `connect` 함수를 호출하여 웹소켓 연결을 요청합니다.

2.  **연결 명령 전달 (`useSocket` 훅 → `Web Worker`)**

    - `useSocket` 훅은 메인 스레드에서 실행되고 있으며, Web Worker에게 `{ type: 'CONNECT', ... }`와 같은 형식의 메시지를 `postMessage`를 통해 전달하여 실제 연결 작업을 위임합니다.

3.  **웹소켓 연결 생성 (`Web Worker` → `RxJS`)**

    - 메인 스레드와 분리된 `Web Worker`는 연결 명령 메시지를 수신합니다.
    - Worker는 `rxjs/webSocket`을 사용하여 WebSocket 연결을 관리하는 `WebSocketSubject` (Observable의 일종)를 생성합니다. 이 시점부터 모든 웹소켓 관련 처리는 Worker가 전담합니다.

4.  **실시간 데이터 수신 (`WebSocket` 서버 → `Web Worker`)**

    - 웹소켓 연결이 성공적으로 수립되면, WebSocket 서버는 실시간 암호화폐 시세 데이터를 지속적으로 Worker에게 전송합니다.

5.  **데이터 스트림 처리 (Worker 내부)**

    - Worker 내의 `RxJS` 스트림은 서버로부터 데이터를 수신할 때마다 `tap`, `map`과 같은 연산자를 통해 데이터를 파싱하거나 필요한 형태로 가공합니다.
    - 연결이 끊어졌을 경우, `retryWhen` 연산자가 자동으로 재연결을 시도하여 데이터 스트림의 안정성을 보장합니다.

6.  **처리된 데이터 전송 (`Web Worker` → `useSocket` 훅)**

    - 가공이 완료된 데이터는 다시 `postMessage`를 통해 메인 스레드에 있는 `useSocket` 훅으로 전송됩니다. 이 데이터는 UI 렌더링에 최적화된 순수한 정보(JSON 객체 등)입니다.

7.  **전역 상태 업데이트 (`useSocket` 훅 → `Zustand`)**

    - `useSocket` 훅은 Worker로부터 데이터를 수신하면, 전역 상태 관리 라이브러리인 `Zustand`의 `updateMarketData` 같은 액션을 호출하여 상태를 업데이트합니다.

8.  **UI 자동 업데이트 (`Zustand` → `React Component`)**
    - `MarketPage` 컴포넌트는 `Zustand` 스토어를 구독하고 있으므로, `marketData` 상태가 변경되면 자동으로 리렌더링(re-rendering)되어 사용자 화면에 최신 데이터가 표시됩니다.

## 4. 세부 구현 계획

### Phase 1: Web Worker 설정

1.  **Worker 파일 생성 (`public/socket.worker.ts`)**

    - 이 파일은 웹소켓 연결, RxJS 스트림 설정, 메시지 핸들링 로직을 포함합니다.
    - `self.onmessage`를 통해 메인 스레드로부터 명령(예: `{ type: 'CONNECT', url: '...' }`)을 수신합니다.
    - `self.postMessage`를 통해 처리된 데이터를 메인 스레드로 전송합니다.

2.  **타입 정의 (`src/shared/types/socket.ts`)**

    - 메인 스레드와 Worker 간의 통신을 위한 명확한 타입 인터페이스를 정의합니다.

    ```typescript
    // Main Thread -> Worker
    export type WorkerCommand =
      | { type: "CONNECT"; payload: { url: string } }
      | { type: "DISCONNECT" }
      | { type: "SUBSCRIBE"; payload: { symbols: string[] } };

    // Worker -> Main Thread
    export type WorkerResponse =
      | { type: "CONNECTED" }
      | { type: "DISCONNECTED" }
      | { type: "DATA"; payload: any } // 'any'를 실제 데이터 타입으로 교체하세요
      | { type: "ERROR"; payload: { message: string } };
    ```

### Phase 2: Worker 내 RxJS 스트림 구현

`public/socket.worker.ts` 파일 내에서 RxJS를 사용하여 웹소켓을 관리합니다.

```typescript
// public/socket.worker.ts
import { webSocket, WebSocketSubject } from "rxjs/webSocket";
import { retryWhen, delay, tap } from "rxjs/operators";
import { WorkerCommand, WorkerResponse } from "../src/shared/types/socket";

let socket$: WebSocketSubject<any> | null = null;

const RECONNECT_DELAY = 5000; // 5초 후 재연결

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const { type, payload } = event.data;

  switch (type) {
    case "CONNECT":
      if (socket$) {
        socket$.unsubscribe();
      }
      socket$ = webSocket(payload.url);

      socket$
        .pipe(
          tap({
            error: (error) =>
              postMessage({
                type: "ERROR",
                payload: { message: error.message },
              }),
            complete: () => postMessage({ type: "DISCONNECTED" }),
          }),
          retryWhen((errors) =>
            errors.pipe(
              tap((err) => console.error("Socket connection error:", err)),
              delay(RECONNECT_DELAY)
            )
          )
        )
        .subscribe((data) => {
          // 옵션: 데이터 처리 (예: JSON.parse, 구조 변환 등)
          const processedData = data;
          const response: WorkerResponse = {
            type: "DATA",
            payload: processedData,
          };
          postMessage(response);
        });

      const connectedResponse: WorkerResponse = { type: "CONNECTED" };
      postMessage(connectedResponse);
      break;

    case "DISCONNECT":
      socket$?.complete();
      socket$ = null;
      break;

    case "SUBSCRIBE":
      if (socket$) {
        // 백엔드 API 명세에 따라 구독 메시지 전송
        socket$.next({ type: "subscribe", symbols: payload.symbols });
      }
      break;
  }
};
```

### Phase 3: 메인 스레드 연동 레이어 (Custom Hook & State)

1.  **전역 상태 관리 (Zustand 사용)**

    - 웹소켓 데이터와 연결 상태를 저장할 스토어를 생성합니다.

    ```typescript
    // src/entities/market/model/useMarketStore.ts
    import { create } from "zustand";

    interface MarketState {
      isConnected: boolean;
      marketData: Record<string, any>; // key: symbol, value: data
      actions: {
        setConnected: (status: boolean) => void;
        updateMarketData: (data: any) => void;
      };
    }

    export const useMarketStore = create<MarketState>((set) => ({
      isConnected: false,
      marketData: {},
      actions: {
        setConnected: (status) => set({ isConnected: status }),
        updateMarketData: (data) => {
          // 예시 업데이트 로직
          set((state) => ({
            marketData: { ...state.marketData, [data.symbol]: data },
          }));
        },
      },
    }));
    ```

2.  **Worker 통신을 위한 커스텀 훅 (`useSocketWorker.ts`)**

    - Worker 인스턴스 생성 및 메시지 핸들링을 캡슐화합니다.
    - Worker로부터 받은 데이터로 Zustand 스토어를 업데이트합니다.

    ```typescript
    // src/features/market/hooks/useSocketWorker.ts
    import { useEffect, useRef } from "react";
    import { useMarketStore } from "@/entities/market/model/useMarketStore";
    import { WorkerCommand, WorkerResponse } from "@/shared/types/socket";

    export function useSocketWorker() {
      const worker = useRef<Worker | null>(null);
      const { setConnected, updateMarketData } = useMarketStore(
        (state) => state.actions
      );

      useEffect(() => {
        const workerInstance = new Worker(
          new URL("/socket.worker.ts", import.meta.url)
        );
        worker.current = workerInstance;

        workerInstance.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { type, payload } = event.data;
          switch (type) {
            case "CONNECTED":
              setConnected(true);
              break;
            case "DISCONNECTED":
              setConnected(false);
              break;
            case "DATA":
              updateMarketData(payload);
              break;
            case "ERROR":
              console.error("Socket Worker Error:", payload.message);
              break;
          }
        };

        return () => {
          workerInstance.postMessage({ type: "DISCONNECT" } as WorkerCommand);
          workerInstance.terminate();
        };
      }, [setConnected, updateMarketData]);

      const connect = (url: string) => {
        worker.current?.postMessage({
          type: "CONNECT",
          payload: { url },
        } as WorkerCommand);
      };

      const subscribe = (symbols: string[]) => {
        worker.current?.postMessage({
          type: "SUBSCRIBE",
          payload: { symbols },
        } as WorkerCommand);
      };

      return { connect, subscribe };
    }
    ```

### Phase 4: UI 컴포넌트 연동

`useSocketWorker` 훅과 `useMarketStore`를 사용하여 컴포넌트에서 실시간 데이터를 렌더링합니다.

```tsx
// src/app/market/page.tsx

const WEBSOCKET_URL = "wss://api.example.com/ws"; // 실제 웹소켓 URL 사용

export const TickerItem = memo(({ symbol }: { symbol: string }) => {
  const data = useMarketStore((state) => state.marketData[symbol]);
  if (!data) {
    return <li>{symbol}: Loading...</li>;
  }

  return (
    <li key={symbol}>
      {symbol}: {data.price}
    </li>
  );
});

export default function MarketPage() {
  const { connect, subscribe } = useSocketWorker();
  const isConnected = useMarketStore((state) => state.isConnected);

  const symbols = useMarketStore(
    (state) => Object.keys(state.marketData),
    shallow
  );

  useEffect(() => {
    connect(WEBSOCKET_URL);
  }, [connect]);

  useEffect(() => {
    if (isConnected) {
      subscribe(["BTC-KRW", "ETH-KRW"]);
    }
  }, [isConnected, subscribe]);

  return (
    <div>
      <h1>Market Status: {isConnected ? "Connected" : "Disconnected"}</h1>
      <ul>
        {symbols.map((symbol) => (
          <TickerItem key={symbol} symbol={symbol} />
        ))}
      </ul>
    </div>
  );
}
```

## 5. 주요 고려사항

- **Worker 번들링**: 설정에 따라 Web Worker를 올바르게 처리하기 위해 `next.config.js`를 조정해야 할 수 있습니다. 위 예제는 worker 파일을 `public` 디렉토리에 두는 간단한 접근 방식을 사용합니다.
- **데이터 직렬화**: 메인 스레드와 worker 간에 전달되는 데이터는 직렬화 가능해야 합니다 (예: JSON 객체). 복잡한 클래스 인스턴스나 함수는 직접 전달할 수 없습니다.
- **에러 핸들링**: worker 내에서 발생하는 네트워크 에러와 데이터 파싱 에러를 구분하고, 적절한 사용자 피드백을 위해 명확하게 메인 스레드에 전달해야 합니다.
- **Worker 생명주기**: 더 이상 필요하지 않을 때 (예: 사용자가 페이지를 벗어날 때) `worker.terminate()`를 호출하여 시스템 리소스를 항상 해제해야 합니다.
- **Zustand 성능 최적화**: 선택적 구독(Selector)과 같은 패턴으로 렌더링 최적화를 꼭 고려해야 합니다.
