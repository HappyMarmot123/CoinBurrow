import { useQuery } from "@tanstack/react-query";
import { useCoinListStore } from "@/app/store/useCoinListStore";
import { Market } from "@/entities/market/types/types";
import { useEffect } from "react";

const COIN_LIST_QUERY_KEY = ["coinList"];
const COIN_LIST_STALE_TIME = 1000 * 60 * 60 * 24; // 1일 캐싱

export const useCoinList = () => {
  const setCoinList = useCoinListStore((state) => state.actions.setCoinList);

  const { data, isLoading, error } = useQuery<
    Market[],
    Error,
    Market[],
    string[]
  >({
    queryKey: COIN_LIST_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/market/coin-list");
      if (!response.ok) {
        throw new Error("Failed to fetch coin list");
      }
      return response.json();
    },
    staleTime: COIN_LIST_STALE_TIME,
  });

  useEffect(() => {
    if (data) {
      setCoinList(data);
    }
  }, [data, setCoinList]);

  return { coinList: data, isLoading, error };
};
