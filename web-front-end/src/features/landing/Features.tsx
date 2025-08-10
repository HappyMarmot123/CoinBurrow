import { Button } from "@/shared/ui/Button";
import React from "react";

export const Features = () => {
  return (
    <section style={{ backgroundColor: "#5A6349" }} className="relative py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-extrabold sm:text-5xl md:text-6xl mb-4">
          Key Features
        </h2>
        <p className="text-xl max-w-3xl mx-auto">
          Built on a foundation of security and user-centric design, CoinBurrow
          offers a seamless and intuitive experience for managing your digital
          assets.
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
    </section>
  );
};
