import { useEffect } from "react";
import { useMarketStore } from "../../../app/store/useMarketStore";

export const useMarketConnection = () => {
  const { setMarkets, setError } = useMarketStore();

  useEffect(() => {
    async function fetchInitialMarkets() {
      try {
        const response = await fetch(`/api/market/all`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const initialMarkets = await response.json();
        setMarkets(initialMarkets);
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "An unknown error occurred.";
        setError(`데이터를 불러오는 데 실패했습니다: ${errorMessage}`);
      }
    }

    fetchInitialMarkets();
  }, [setMarkets, setError]);
};
