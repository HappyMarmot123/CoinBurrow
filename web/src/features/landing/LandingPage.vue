<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import gsap from "gsap";
import SplineScene from "./SplineScene.vue";
import { DEFAULT_SPLINE_SCENE } from "../../constants/landing.js";
import "./legacyHeroStars.scss";

const heroRef = ref<HTMLElement | null>(null);
const landingRef = ref<HTMLElement | null>(null);
const cursorLayerRef = ref<HTMLElement | null>(null);
const scene =
  (import.meta.env.VITE_SPLINE_SCENE as string | undefined) ??
  DEFAULT_SPLINE_SCENE;
let cleanupCursorEffects: (() => void) | null = null;

function setupCursorEffects(): (() => void) | null {
  const landing = landingRef.value;
  const cursorLayer = cursorLayerRef.value;

  if (!landing || !cursorLayer || typeof window.matchMedia !== "function") {
    return null;
  }

  const pointerFine = window.matchMedia("(pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!pointerFine.matches) {
    return null;
  }

  let cursorX = 0;
  let cursorY = 0;
  let animationFrame = 0;
  let lastSparkAt = 0;
  let sparkIndex = 0;

  const updateCursorPosition = () => {
    cursorLayer.style.setProperty("--cursor-x", `${cursorX}px`);
    cursorLayer.style.setProperty("--cursor-y", `${cursorY}px`);
    animationFrame = 0;
  };

  const queueCursorPosition = () => {
    if (animationFrame === 0) {
      animationFrame = window.requestAnimationFrame(updateCursorPosition);
    }
  };

  const spawnSpark = () => {
    if (reducedMotion.matches) return;

    const now = performance.now();
    if (now - lastSparkAt < 70) return;

    lastSparkAt = now;

    const spark = document.createElement("span");
    const angle = (sparkIndex * 137.5) % 360;
    const distance = 14 + (sparkIndex % 4) * 4;
    const radians = (angle * Math.PI) / 180;

    spark.className = "cursor-spark";
    spark.style.setProperty("--spark-x", `${cursorX}px`);
    spark.style.setProperty("--spark-y", `${cursorY}px`);
    spark.style.setProperty("--spark-dx", `${Math.cos(radians) * distance}px`);
    spark.style.setProperty("--spark-dy", `${Math.sin(radians) * distance}px`);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });

    cursorLayer.append(spark);
    sparkIndex += 1;
  };

  const handlePointerMove = (event: PointerEvent) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    queueCursorPosition();
    spawnSpark();
  };

  const handlePointerEnter = (event: PointerEvent) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    cursorLayer.classList.add("is-active");
    queueCursorPosition();
  };

  const handlePointerLeave = () => {
    cursorLayer.classList.remove("is-active", "is-pressed");
  };

  const handlePointerDown = () => {
    cursorLayer.classList.add("is-pressed");
  };

  const handlePointerUp = () => {
    cursorLayer.classList.remove("is-pressed");
  };

  landing.addEventListener("pointerenter", handlePointerEnter);
  landing.addEventListener("pointermove", handlePointerMove);
  landing.addEventListener("pointerleave", handlePointerLeave);
  landing.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointerup", handlePointerUp);

  return () => {
    landing.removeEventListener("pointerenter", handlePointerEnter);
    landing.removeEventListener("pointermove", handlePointerMove);
    landing.removeEventListener("pointerleave", handlePointerLeave);
    landing.removeEventListener("pointerdown", handlePointerDown);
    window.removeEventListener("pointerup", handlePointerUp);

    if (animationFrame !== 0) {
      window.cancelAnimationFrame(animationFrame);
    }

    cursorLayer.classList.remove("is-active", "is-pressed");
    cursorLayer.querySelectorAll(".cursor-spark").forEach((spark) => spark.remove());
  };
}

onMounted(() => {
  if (heroRef.value) {
    gsap.from(heroRef.value.children, {
      opacity: 0,
      y: 38,
      duration: 0.85,
      ease: "power3.out",
      stagger: 0.1,
    });
  }

  const animated = landingRef.value?.querySelectorAll<HTMLElement>(".reveal");
  if (animated?.length) {
    gsap.from(animated, {
      opacity: 0,
      y: 46,
      duration: 0.72,
      ease: "power3.out",
      stagger: 0.08,
      delay: 0.2,
    });
  }

  cleanupCursorEffects = setupCursorEffects();
});

onUnmounted(() => {
  cleanupCursorEffects?.();
  cleanupCursorEffects = null;
});
</script>

<template>
  <main id="landing-widget" ref="landingRef" class="landing">
    <div id="noise" aria-hidden="true" />
    <div ref="cursorLayerRef" class="cursor-effects" aria-hidden="true">
      <span class="cursor-ring" />
    </div>

    <section class="hero-section">
      <article class="container" aria-hidden="true">
        <div class="sky">
          <div class="stars" />
          <div class="stars1" />
          <div class="stars2" />
          <div class="shooting_stars" />
        </div>
      </article>
      <article class="hero-visual" aria-label="Coin 3D">
        <SplineScene class="spline-layer" :scene="scene" />
      </article>
      <article ref="heroRef" class="hero-copy">
        <h1 class="eyebrow">CoinBurrow</h1>
        <div class="hero-subcopy">
          <h2>Realtime Market Dashboard</h2>
          <p>
            Upbit 공개 시세, 캔들, 호가, 체결 흐름을 한 화면에서 모니터링합니다.
          </p>
        </div>
        <div class="hero-actions">
          <router-link to="/exchange" class="button button-green">Burying</router-link>
        </div>
      </article>
    </section>

    <section class="features-band reveal">
      <article class="wave" aria-hidden="true">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
          />
        </svg>
      </article>
      <article class="final-cta reveal">
        <a
          class="creator-link"
          href="https://github.com/HappyMarmot123"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="HappyMarmot123 GitHub profile"
        >
          <svg
            class="github-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 2C6.48 2 2 6.58 2 12.25c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 6.98c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.1 10.1 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
            />
          </svg>
          <span>Made by @HappyMarmot123</span>
        </a>
      </article>
    </section>
  </main>
</template>

<style scoped lang="scss">
.landing {
  --landing-band: #5a6349;
  --landing-text: #f8fbff;
  --landing-accent: #a8d1a3;

  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #f2f0dd;
  background: #111827;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  user-select: none;
}

:global(body) {
  margin: 0;
  background: #111827;
}

#noise {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 20;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  background: url("/noise.webp") no-repeat center center;
  background-size: cover;
  mix-blend-mode: overlay;
  opacity: 0.62;
}

.cursor-effects {
  --cursor-x: -100px;
  --cursor-y: -100px;

  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.cursor-effects.is-active {
  opacity: 1;
}

.cursor-ring {
  position: fixed;
  top: var(--cursor-y);
  left: var(--cursor-x);
  border-radius: 999px;
  translate: -50% -50%;
  will-change: top, left, scale;
}

.cursor-ring {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(217, 255, 102, 0.76);
  box-shadow:
    0 0 0 1px rgba(255, 176, 46, 0.18),
    0 0 22px rgba(217, 255, 102, 0.2);
  scale: 1;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
  scale 0.18s ease;
}

.cursor-effects.is-pressed .cursor-ring {
  border-color: rgba(255, 176, 46, 0.9);
  box-shadow:
    0 0 0 1px rgba(217, 255, 102, 0.24),
    0 0 28px rgba(255, 176, 46, 0.28);
  scale: 0.72;
}

:deep(.cursor-spark) {
  position: fixed;
  top: var(--spark-y);
  left: var(--spark-x);
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #d9ff66;
  box-shadow: 0 0 12px rgba(217, 255, 102, 0.72);
  pointer-events: none;
  translate: -50% -50%;
  animation: cursor-spark-pop 720ms ease-out forwards;
}

@keyframes cursor-spark-pop {
  to {
    opacity: 0;
    scale: 0.2;
    translate: calc(-50% + var(--spark-dx)) calc(-50% + var(--spark-dy));
  }
}

@media (pointer: coarse), (prefers-reduced-motion: reduce) {
  .cursor-effects {
    display: none;
  }
}

.hero-section {
  --hero-copy-top: 50%;
  --hero-copy-row-gap: clamp(28px, 4vh, 44px);
  --hero-visual-top: 10rem;
  --hero-visual-width: min(980px, 92vw);
  --hero-visual-height: 21rem;
  --spline-layer-height: 230%;
  --features-band-padding: 2rem;
  --wave-height: 100px;

  position: relative;
  display: grid;
  min-height: 100svh;
  place-items: center;
  isolation: isolate;
  overflow: hidden;
  padding: clamp(56px, 8vh, 92px) 24px;
  background: #2f3b52;
}

.hero-copy {
  position: absolute;
  top: var(--hero-copy-top);
  left: 50%;
  z-index: 10;
  display: grid;
  row-gap: var(--hero-copy-row-gap);
  width: min(1120px, calc(100% - 48px));
  transform: translate(-50%, -50%);
  justify-items: center;
  text-align: center;
  text-shadow: 0 18px 44px rgba(0, 0, 0, 0.32);
}

.eyebrow {
  display: inline-flex;
  background: linear-gradient(315deg, #d9ff66, #ffb02e);
  background-clip: text;
  color: transparent;
  filter:
    drop-shadow(0 4px 0 rgba(92, 58, 6, 0.28))
    drop-shadow(0 14px 18px rgba(0, 0, 0, 0.22))
    drop-shadow(0 0 18px rgba(255, 176, 46, 0.22));
}

h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(76px, 13vw, 164px);
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: 0;
}

.hero-subcopy {
  display: grid;
  justify-items: center;
  gap: clamp(16px, 2vh, 22px);
  margin-bottom: 0;
  padding: 0;
}

.hero-subcopy h2 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(28px, 4.2vw, 46px);
  font-weight: 850;
  line-height: 1.05;
  letter-spacing: 0;
  text-wrap: balance;
}

.hero-subcopy p {
  max-width: 760px;
  margin: 0 auto;
  color: #cbd5e1;
  font-size: 19px;
  line-height: 1.7;
  text-wrap: pretty;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border-radius: 8px;
  padding: 0 24px;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  transition:
    box-shadow 0.18s ease,
    transform 0.18s ease,
    background-color 0.18s ease;
}

.button:focus-visible {
  outline: 2px solid var(--landing-accent);
  outline-offset: 4px;
}

.button-green {
  color: #ffffff;
  background: #5f8d4e;
  box-shadow: 0 14px 36px rgba(37, 61, 30, 0.18);
}

@media (hover: hover) {
  .button:hover {
    transform: translateY(-2px);
  }

  .button-green:hover {
    background: #4c7a3b;
    box-shadow: 0 16px 42px rgba(37, 61, 30, 0.22);
  }
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.hero-visual {
  position: absolute;
  top: var(--hero-visual-top);
  left: 50%;
  z-index: 5;
  width: var(--hero-visual-width);
  height: var(--hero-visual-height);
  transform: translateX(-50%);
  overflow: visible;
  border-radius: 24px;
  pointer-events: none;
}

.spline-layer,
.hero-visual :deep(.spline-canvas) {
  position: absolute;
  bottom: auto;
  left: 0;
  width: 100%;
  height: var(--spline-layer-height);
}

.creator-link {
  display: inline-flex;
  max-width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 0 18px;
  color: var(--landing-text);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.12);
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

@media (hover: hover) {
  .creator-link:hover {
    border-color: rgba(168, 209, 163, 0.46);
    color: #ffffff;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
    transform: translateY(-2px);
  }
}

.creator-link:focus-visible {
  outline: 2px solid var(--landing-accent);
  outline-offset: 4px;
}

.github-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  fill: currentColor;
}

.features-band {
  position: relative;
  z-index: 4;
  padding: var(--features-band-padding);
  color: #ffffff;
  background: #5a6349;
  text-align: center;
}

.wave {
  position: absolute;
  bottom: 100%;
  left: 0;
  z-index: 1;
  width: 100%;
  overflow: hidden;
  line-height: 0;
}

.wave svg {
  display: block;
  width: 100%;
  height: var(--wave-height);
}

.wave path {
  fill: var(--landing-band);
}

.final-cta {
  position: relative;
  z-index: 1;
  width: min(1120px, 100%);
  margin: 0 auto;
}

@media (max-width: 900px) {
  .hero-section {
    --hero-copy-top: 52%;
    --hero-copy-row-gap: clamp(22px, 3.4vh, 34px);
    --hero-visual-top: clamp(5.5rem, 13svh, 8rem);
    --hero-visual-width: min(760px, 116vw);
    --hero-visual-height: clamp(16rem, 32svh, 20rem);
    --spline-layer-height: 220%;

    min-height: 100svh;
    padding: clamp(48px, 8svh, 72px) 20px clamp(36px, 7svh, 56px);
  }

  .hero-copy {
    width: min(760px, calc(100% - 40px));
  }

  h1 {
    font-size: clamp(68px, 15vw, 124px);
    line-height: 0.88;
  }

  .hero-subcopy {
    gap: clamp(14px, 2svh, 20px);
  }

  .hero-subcopy h2 {
    font-size: clamp(26px, 5.4vw, 36px);
  }

  .hero-subcopy p {
    max-width: min(680px, 100%);
    font-size: 18px;
    line-height: 1.65;
  }

}

@media (max-width: 640px) {
  .hero-section {
    --hero-copy-top: 53%;
    --hero-copy-row-gap: clamp(18px, 3svh, 26px);
    --hero-visual-top: clamp(4rem, 10svh, 5.5rem);
    --hero-visual-width: min(132vw, 560px);
    --hero-visual-height: clamp(12.5rem, 30svh, 16rem);
    --spline-layer-height: 240%;
    --features-band-padding: 56px 18px 60px;
    --wave-height: 76px;

    padding: 44px 16px 32px;
  }

  .hero-copy {
    width: min(520px, calc(100% - 28px));
  }

  h1 {
    font-size: clamp(48px, 15.5vw, 76px);
    line-height: 0.9;
  }

  .hero-subcopy {
    gap: 12px;
  }

  .hero-subcopy h2 {
    font-size: clamp(22px, 6.8vw, 28px);
    line-height: 1.12;
  }

  .hero-subcopy p {
    font-size: 15.5px;
    line-height: 1.65;
  }

  .button {
    width: min(100%, 240px);
    min-height: 52px;
    padding: 0 18px;
  }

  .hero-visual {
    border-radius: 18px;
  }
}

@media (max-width: 900px) and (max-height: 700px) {
  .hero-section {
    --hero-copy-top: 56%;
    --hero-copy-row-gap: 18px;
    --hero-visual-top: 3.5rem;
    --hero-visual-height: 12rem;
  }
}

@media (max-width: 640px) and (max-height: 700px) {
  .hero-section {
    --hero-copy-top: 58%;
    --hero-copy-row-gap: 14px;
    --hero-visual-top: 2.75rem;
    --hero-visual-height: 10.5rem;
    --features-band-padding: 44px 16px 48px;
  }
}
</style>

<style scoped lang="scss">
@media (max-width: 640px) {
  .eyebrow {
    max-width: 92vw;
    font-size: clamp(34px, 10vw, 40px);
    white-space: nowrap;
  }

  .hero-subcopy h2 {
    max-width: 92vw;
    font-size: clamp(18px, 4.8vw, 20px);
    white-space: nowrap;
  }

  .hero-subcopy p {
    max-width: 92vw;
  }
}
</style>
