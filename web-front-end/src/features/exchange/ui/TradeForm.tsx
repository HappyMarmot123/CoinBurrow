import React from "react";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/shared/components/Button";
import Image from "next/image";

export const TradeForm = () => {
  const selectedCoin = useExchangeStore(
    useShallow((state) => state.selectedCoin)
  );

  return (
    <section className="p-4 grid grid-cols-1 gap-4">
      {/* Article 1: 사용자 이미지, 닉네임, 랭킹순위. 스토어 버튼 */}
      <article className="flex items-center justify-between p-4 bg-gray-700 rounded-md shadow-lg">
        <div className="flex items-center space-x-4">
          <Image
            src="/file.svg"
            alt="User Profile"
            width={48}
            height={48}
            className="rounded-full"
          />{" "}
          {/* 사용자 이미지 */}
          <div>
            <p className="text-white text-lg font-semibold">사용자 닉네임</p>{" "}
            {/* 닉네임 */}
            <p className="text-gray-400 text-sm">랭킹: #123</p> {/* 랭킹순위 */}
          </div>
        </div>
        <Button variant="secondary" size="small">
          스토어
        </Button>{" "}
        {/* 스토어 버튼 */}
      </article>

      {/* Article 2: 총 자산, 평균 수익률, 전적/승률, 보너스 포인트 퍼센트 */}
      <article className="grid grid-cols-2 gap-4 p-4 bg-gray-700 rounded-md shadow-lg">
        <div>
          <p className="text-gray-400 text-sm">총 자산</p>
          <p className="text-white text-lg font-bold">123,456,789 VP</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">평균 수익률</p>
          <p className="text-green-400 text-lg font-bold">+15.23%</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">전적/승률</p>
          <p className="text-white text-lg font-bold">120승 80패 (60%)</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">보너스 포인트</p>
          <p className="text-yellow-400 text-lg font-bold">+5%</p>
        </div>
      </article>

      {/* Article 3: 현재 선택된 코인 및 기타 */}
      <article className="p-4 bg-gray-700 rounded-md shadow-lg">
        <h3 className="text-white text-lg font-semibold mb-2">선택된 코인</h3>
        {selectedCoin ? (
          <div className="flex items-center space-x-2">
            <Image
              src={`/coin/${selectedCoin.market
                .toLowerCase()
                .replace("krw-", "")}.png`}
              alt={selectedCoin.korean_name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
            <p className="text-white text-xl font-bold">
              {selectedCoin.korean_name} (
              {selectedCoin.market.replace("KRW-", "")})
            </p>
          </div>
        ) : (
          <p className="text-gray-400">코인을 선택해주세요.</p>
        )}
        <p className="text-gray-400 text-sm mt-2">
          선택된 코인에 대한 추가 정보...
        </p>
      </article>

      {/* Article 4: 게임 시작 버튼 */}
      <Button variant="primaryGreen" size="large" className="mt-4 w-full">
        게임 시작
      </Button>
    </section>
  );
};
