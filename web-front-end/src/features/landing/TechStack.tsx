"use client";

import React, { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

const techIcons = [
  "https://cdn.simpleicons.org/nextdotjs/f5f5eb",
  "https://cdn.simpleicons.org/react/61DAFB",
  "https://cdn.simpleicons.org/nestjs/E0234E",
  "https://cdn.simpleicons.org/fastify/f5f5eb",
  "https://cdn.simpleicons.org/supabase/3ECF8E",
  "https://cdn.simpleicons.org/tailwindcss/06B6D4",
  "https://cdn.simpleicons.org/drizzle/C5F74F",
  "https://cdn.simpleicons.org/redis/DC382D",
];

export const TechStack = () => {
  const sectionRef = useRef(null);
  const q = gsap.utils.selector(sectionRef);

  useLayoutEffect(() => {
    const icons = q(".tech-icon");
    gsap.fromTo(
      icons,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 0.7, // Set final opacity to 0.7 to match tailwind style
        stagger: 0.1,
        duration: 0.5,
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
        최신 기술로 구현된 안정적이고 빠른 투자 환경
      </h2>
      <p className="text-gray-400 text-center max-w-3xl mx-auto mt-4">
        Next.js 15, React 19, NestJS, Fastify 등 최신 기술 스택을 기반으로
        최고의 사용자 경험을 제공합니다. 빠르고 안정적인 환경에서 끊김 없이 투자
        시뮬레이션에 몰입해보세요.
      </p>
      <div className="flex flex-wrap justify-center items-center gap-8 mt-12">
        {techIcons.map((iconUrl, index) => (
          <img
            key={index}
            src={iconUrl}
            alt="Tech Icon"
            className="tech-icon h-16 grayscale opacity-70 transition-all duration-300 hover:grayscale-0 hover:opacity-100 hover:scale-110"
          />
        ))}
      </div>
    </section>
  );
};
