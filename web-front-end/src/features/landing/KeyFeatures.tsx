"use client";

import React, { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    title: "🎲 위험은 제로, 재미는 무한대!",
    description:
      "더 이상 실제 돈을 잃을까 걱정하지 마세요. CoinBurrow에서는 넉넉한 가상 포인트를 제공합니다. 실제 코인 종목을 사고팔며 자신만의 투자 전략을 마음껏 실험하고, 투자 실력을 키워보세요.",
  },
  {
    title: "⏱️ 기회는 단 30분! 전략적 베팅의 묘미",
    description:
      "매수 후 30분, 당신의 선택에 모든 것이 달렸습니다. 과감하게 추가 매수하여 수익을 극대화할 것인가, 안정적으로 매도하여 이익을 실현할 것인가? 매 순간 짜릿한 선택의 기로에서 최고의 전략을 펼쳐보세요. 연속 승리 보너스로 더 큰 보상을 획득하는 재미도 놓치지 마세요!",
  },
  {
    title: "🔓 도전하고, 성취하고, 잠금 해제하라!",
    description:
      "처음에는 일부 메이저 코인만 거래할 수 있습니다. 하지만 걱정마세요! 게임을 플레이하며 포인트를 쌓고, 높은 승률을 기록하고, 특별 업적을 달성하면 숨겨진 알트코인들이 잠금 해제됩니다. 끊임없이 새로운 목표에 도전하며 투자 세계를 넓혀가는 즐거움을 느껴보세요.",
  },
];

export const KeyFeatures = () => {
  const sectionRef = useRef(null);
  const q = gsap.utils.selector(sectionRef);

  useLayoutEffect(() => {
    const cards = q(".feature-card");
    gsap.fromTo(
      cards,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.2,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );
  }, [q]);

  return (
    <section ref={sectionRef}>
      <h2 className="text-4xl font-bold text-center">
        CoinBurrow, 투자를 게임처럼 즐기는 새로운 방법
      </h2>
      <div className="grid md:grid-cols-3 gap-8 mt-12">
        {features.map((feature, index) => (
          <div
            key={index}
            className="feature-card bg-white/10 p-8 rounded-xl border border-white/20"
          >
            <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
