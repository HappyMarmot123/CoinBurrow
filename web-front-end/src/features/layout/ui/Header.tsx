"use client";

import { Button } from "@/shared/ui/Button";
import React, { useEffect, useRef } from "react";
import { useModal } from "@/shared/contexts/ModalContext";

export const Header = () => {
  const headerRef = useRef<HTMLElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const { openModal } = useModal();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    header.style.transition =
      "background 0.5s ease-out, backdrop-filter 0.5s ease-out, -webkit-backdrop-filter 0.5s ease-out, box-shadow 0.5s ease-out";

    const handleScroll = () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      animationFrameId.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const progress = Math.min(scrollY / 500, 1); // Full effect at 500px scroll

        if (scrollY > 50) {
          header.style.background = `linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, ${
            0.1 - progress * 0.1
          }) 100%)`;
          header.style.backdropFilter = `blur(${progress * 12}px)`;
          header.style.setProperty(
            "-webkit-backdrop-filter",
            `blur(${progress * 12}px)`
          ); // For Safari
          header.style.boxShadow = `0 0 20px rgba(0, 0, 0, ${progress * 0.2})`;
        } else {
          header.style.background = "transparent";
          header.style.backdropFilter = "blur(0px)";
          header.style.setProperty("-webkit-backdrop-filter", "blur(0px)"); // For Safari
          header.style.boxShadow = "none";
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-xl font-bold logo-gradient">CoinBurrow</h1>
        <nav>
          <Button variant="primaryGreen" onClick={() => alert("Login clicked")}>
            Login
          </Button>
          <Button variant="secondary" className="ml-4" onClick={openModal}>
            Sign Up
          </Button>
        </nav>
      </div>
    </header>
  );
};
