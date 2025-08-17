import { Features } from "@/features/landing/Features";
import { AiCoach } from "@/features/landing/AiCoach";
import { FinalCTA } from "@/features/landing/FinalCTA";
import { Hero } from "@/features/landing/Hero";
import { KeyFeatures } from "@/features/landing/KeyFeatures";
import { TechStack } from "@/features/landing/TechStack";
import React from "react";
import Spline from "@splinetool/react-spline";

export const Landing = () => {
  return (
    <div className="landing-default-style">
      <div
        aria-label="Coin 3D"
        className="fixed top-0 left-0 w-full h-full z-20"
      >
        <Spline scene="https://prod.spline.design/54XoC-XFGmLSkJ1e/scene.splinecode" />
      </div>
      <Hero />
      <KeyFeatures />
      <AiCoach />
      <TechStack />
      <FinalCTA />
      <Features />
    </div>
  );
};
