"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import io from "socket.io-client";

// 타입 정의
interface Market {
  market: string;
  korean_name: string;
}

interface Ticker {
  code: string; // market code
  trade_price: number;
  signed_change_rate: number;
  signed_change_price: number;
  acc_trade_price_24h: number;
  change: "RISE" | "FALL" | "EVEN";
}

// TypeScript에서 window.io를 인식하도록 설정
declare global {
  interface Window {
    io: typeof io;
  }
}

const ChangeDisplay = ({ ticker }: { ticker: Ticker }) => {
  const changeRate = (ticker.signed_change_rate * 100).toFixed(2);
  const changePrice = ticker.signed_change_price.toLocaleString("ko-KR");
  let changeClass = "price-even";
  if (ticker.change === "RISE") changeClass = "price-up";
  if (ticker.change === "FALL") changeClass = "price-down";

  return (
    <>
      <span className={changeClass}>{changeRate}%</span>
      <br />
      <span className={changeClass}>{changePrice}</span>
    </>
  );
};

const MarketPage = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const handleScriptLoad = () => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    async function fetchInitialMarkets() {
      try {
        const response = await fetch(`${BACKEND_URL}/market/all`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const initialMarkets: Market[] = await response.json();
        setMarkets(initialMarkets);
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "An unknown error occurred.";
        setError(`데이터를 불러오는 데 실패했습니다: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }

    function connectWebSocket() {
      const socket = window.io(`${BACKEND_URL}/market`, {
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        console.log("WebSocket connected successfully:", socket.id);
      });

      socket.on("ticker", (tickerData: Ticker) => {
        setTickers((prevTickers) => ({
          ...prevTickers,
          [tickerData.code]: tickerData,
        }));
      });

      socket.on("disconnect", () => {
        console.log("WebSocket disconnected.");
      });

      socket.on("connect_error", (err: Error) => {
        console.error("WebSocket connection error:", err);
        setError("실시간 데이터 연결에 실패했습니다.");
      });

      socketRef.current = socket;
    }

    fetchInitialMarkets();
    connectWebSocket();
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const styles = `
    body {
      font-family: Arial, sans-serif;
      background-color: #1a1a1a;
      color: #f5f5eb;
    }
    .market-container {
      background-color: #2d2d2d;
      padding: 20px;
      border-radius: 8px;
    }
    h1 {
      color: #8cb37a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }
    th,
    td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #444;
    }
    thead {
      background-color: #383838;
    }
    tbody tr {
      background-color: #2d2d2d;
    }
    tbody tr:nth-child(even) {
      background-color: #333333;
    }
    .price-up {
      color: #c53030;
    }
    .price-down {
      color: #2b6cb0;
    }
    .price-even {
      color: #f5f5eb;
    }
  `;

  return (
    <div className="container mx-auto py-24 px-4">
      <style>{styles}</style>
      <Script
        src="https://cdn.socket.io/4.7.5/socket.io.min.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      <div className="market-container">
        <h1>실시간 시세</h1>
        <table>
          <thead>
            <tr>
              <th>한글명</th>
              <th>현재가</th>
              <th>전일대비</th>
              <th>24시간 거래대금</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  데이터를 불러오는 중입니다...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "red" }}>
                  {error}
                </td>
              </tr>
            ) : (
              markets.map((market) => {
                const ticker = tickers[market.market];
                return (
                  <tr key={market.market}>
                    <td>
                      {market.korean_name} ({market.market})
                    </td>
                    <td>
                      {ticker
                        ? ticker.trade_price.toLocaleString("ko-KR")
                        : "-"}
                    </td>
                    <td>{ticker ? <ChangeDisplay ticker={ticker} /> : "-"}</td>
                    <td>
                      {ticker
                        ? `${Math.round(
                            ticker.acc_trade_price_24h / 1000000
                          ).toLocaleString("ko-KR")} 백만`
                        : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketPage;
