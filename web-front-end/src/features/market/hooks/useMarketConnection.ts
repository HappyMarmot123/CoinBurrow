import { useEffect } from "react";
import { useMarketSocketWorker } from "@/features/market/hooks/useMarketSocketWorker";

export const useMarketConnection = () => {
  const { connect } = useMarketSocketWorker();

  useEffect(() => {
    connect("/market");

    return () => {
      // Disconnect handled by useMarketSocketWorker's cleanup
    };
  }, [connect]);
};
