"use client";

import { Button } from "@/shared/ui/Button";
import React from "react";
import styles from "@/shared/styles/Hero.module.css";

export const Hero = () => {
  return (
    <section className="relative flex items-center justify-center py-20 min-h-screen overflow-hidden">
      <div className={styles.container}>
        <div className={styles.sky}>
          <div className={styles.stars}></div>
          <div className={styles.stars1}></div>
          <div className={styles.stars2}></div>
          <div className={styles.shooting_stars}></div>
        </div>
      </div>

      <div className="text-center z-10">
        <h2 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">
          Your Next-Gen Crypto Wallet
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-xl">
          Securely manage, exchange, and grow your crypto assets with
          CoinBurrow.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            variant="primaryGreen"
            className="text-lg"
            onClick={() => alert("Get Started clicked")}
          >
            Get Started
          </Button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
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
    </section>
  );
};
