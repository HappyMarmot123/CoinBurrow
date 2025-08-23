"use client";

import { Button } from "@/shared/components/Button";
import React from "react";

export const Features = () => {
  return (
    <section className="relative bg-[#5A6349] text-white !mt-20 !py-20 !px-8">
      <div className="absolute bottom-full left-0 w-full overflow-hidden leading-none">
        <svg
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-[150px]"
          style={{ fill: "#5A6349" }}
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            className="shape-fill"
          ></path>
        </svg>
      </div>
      <div>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold sm:text-5xl md:text-6xl mb-4">
            Key Features
          </h2>
          <p className="text-xl max-w-3xl mx-auto">
            Built on a foundation of security and user-centric design,
            CoinBurrow offers a seamless and intuitive experience for managing
            your digital assets.
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <Button
            variant="primaryGold"
            className="text-lg"
            onClick={() => alert("Get Started clicked")}
          >
            Get Started
          </Button>
        </div>
      </div>
    </section>
  );
};
