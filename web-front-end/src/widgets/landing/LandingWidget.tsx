import { Features } from "@/features/landing/Features";
import { AiCoach } from "@/features/landing/AiCoach";
import { FinalCTA } from "@/features/landing/FinalCTA";
import { Hero } from "@/features/landing/Hero";
import { KeyFeatures } from "@/features/landing/KeyFeatures";
import { TechStack } from "@/features/landing/TechStack";
import React from "react";

export const LandingWidget = () => {
  return (
    <>
      <div id="noise" />
      <div id="landing-widget">
        <Hero />
        <KeyFeatures />
        <AiCoach />
        <TechStack />
        <FinalCTA />
        <Features />
      </div>
    </>
  );
};
