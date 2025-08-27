"use client";

import React from "react";
// import { useMarketConnection } from "@/features/market/hooks/useMarketConnection";
import { useCoinList } from "@/features/market/hooks/useCoinList"; // useCoinList 훅 임포트

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // useMarketConnection(); // /market 네임스페이스 연결 및 구독 관리
  useCoinList(); // 코인 목록 패칭 및 zustand 스토어에 저장

  return <>{children}</>;
}
