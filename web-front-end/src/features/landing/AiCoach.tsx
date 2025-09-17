"use client";

import React, { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

const sections = [
  {
    title: "📊 데이터로 말하는 당신의 투자 스타일",
    description:
      "당신은 공격적인 단타 투자자인가요, 아니면 신중한 장기 투자자인가요? CoinBurrow는 당신의 모든 투자 기록을 정밀하게 분석하여, 자신도 몰랐던 투자 성향과 패턴을 알려주는 개인화 리포트를 제공합니다. 데이터 기반의 통찰력으로 투자 전략을 한 단계 업그레이드하세요.",
  },
  {
    title: "🧠 AI가 짚어주는 맞춤형 투자 조언",
    description:
      "더 이상 혼자 고민하지 마세요. CoinBurrow의 AI 코치가 당신의 투자 데이터를 분석하여 강점은 강화하고 약점은 보완할 수 있도록 개인화된 피드백을 제공합니다. 게임을 즐기면서 자연스럽게 투자 지식과 통찰력을 얻어보세요.",
  },
  {
    title: "📰 실시간으로 쏟아지는 가상 경제 뉴스",
    description:
      "성공적인 투자는 정보력에 달려있습니다. CoinBurrow는 웹 크롤링 기술과 AI를 활용하여 실제 코인 시장의 최신 정보를 수집하고, 게임 내에 맞춤형 가상 뉴스를 생성하여 제공합니다. 실제와 같은 정보의 흐름 속에서 시장을 읽는 눈을 키워보세요.",
  },
];

export const AiCoach = () => {
  const sectionRef = useRef(null);
  const q = gsap.utils.selector(sectionRef);

  useLayoutEffect(() => {
    const cards = q(".ai-card");
    gsap.fromTo(
      cards,
      { x: -50, opacity: 0 },
      {
        x: 0,
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
        당신만을 위한 AI 투자 코치, CoinBurrow
      </h2>
      <article className="flex flex-col gap-8 mt-12 max-w-4xl mx-auto">
        {sections.map((section, index) => (
          <div
            key={index}
            className="ai-card bg-white/10 p-10 rounded-xl border border-white/20 text-left"
          >
            <h3 className="text-xl font-bold mb-4 text-lime-300">
              {section.title}
            </h3>
            <p className="text-gray-400">{section.description}</p>
          </div>
        ))}
      </article>
    </section>
  );
};
