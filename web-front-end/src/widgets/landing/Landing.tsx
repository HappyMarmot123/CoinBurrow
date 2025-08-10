import { Features } from "@/features/landing/Features";
import { Hero } from "@/features/landing/Hero";
import React from "react";

type LayoutProps = {
  children: React.ReactNode;
};

export const Landing = () => {
  return (
    <div className="landing-default-style">
      <Hero />
      <Features />
    </div>
  );
};
