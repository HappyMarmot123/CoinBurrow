"use client";

import { Button } from "@/shared/components/Button";
import React from "react";
import styles from "@/shared/styles/Hero.module.css";
import Spline from "@splinetool/react-spline";

export const Hero = () => {
  return (
    <section className="relative flex items-center justify-center py-20 min-h-screen overflow-hidden">
      <article
        aria-label="Coin 3D"
        className="absolute top-0 left-0 w-full h-full z-[-1]"
      >
        <Spline scene="https://prod.spline.design/54XoC-XFGmLSkJ1e/scene.splinecode" />
      </article>
      <article className={styles.container}>
        <div className={styles.sky}>
          <div className={styles.stars}></div>
          <div className={styles.stars1}></div>
          <div className={styles.stars2}></div>
          <div className={styles.shooting_stars}></div>
        </div>
      </article>

      <article className="text-center z-10">
        <h1 className="text-5xl font-extrabold sm:text-6xl md:text-7xl mb-4">
          Invest Like It’s Real
        </h1>
        <h1 className="text-5xl font-extrabold sm:text-6xl md:text-7xl mb-4">
          But Risk-Free!
        </h1>
        <div className="flex flex-col items-center py-8">
          <h2 className="text-3xl font-bold sm:text-4xl md:text-5xl">
            Awaken Your Inner Investor
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-xl">
            CoinBurrow is a simulated investment platform where you use virtual
            points to invest in real market coins. Sharpen your strategies,
            discover your hidden talent, and climb to the top of the
            rankings—all without any real-world risk!
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <Button
            variant="primaryGreen"
            className="text-lg"
            size="large"
            onClick={() => alert("Get Started clicked")}
          >
            Get Started
          </Button>
        </div>
      </article>
    </section>
  );
};
