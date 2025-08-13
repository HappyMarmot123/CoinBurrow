import { useEffect, useRef } from "react";

export const useHeader = (headerRef: React.RefObject<HTMLElement | null>) => {
  const animationFrameId = useRef<number | null>(null);

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
        const progress = Math.min(scrollY / 500, 1);

        if (scrollY > 50) {
          header.style.background = `linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, ${
            0.1 - progress * 0.1
          }) 100%)`;
          header.style.backdropFilter = `blur(${progress * 12}px)`;
          header.style.setProperty(
            "-webkit-backdrop-filter",
            `blur(${progress * 12}px)`
          );
          header.style.boxShadow = `0 0 20px rgba(0, 0, 0, ${progress * 0.2})`;
        } else {
          header.style.background = "transparent";
          header.style.backdropFilter = "blur(0px)";
          header.style.setProperty("-webkit-backdrop-filter", "blur(0px)");
          header.style.boxShadow = "none";
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);
};
