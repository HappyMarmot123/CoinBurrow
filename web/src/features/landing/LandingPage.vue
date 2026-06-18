<script setup lang="ts">
import { onMounted, ref } from "vue";
import gsap from "gsap";
import SplineScene from "./SplineScene.vue";
import "./legacyHeroStars.css";

const heroRef = ref<HTMLElement | null>(null);
const landingRef = ref<HTMLElement | null>(null);
const scene =
  (import.meta.env.VITE_SPLINE_SCENE as string | undefined) ??
  "https://prod.spline.design/54XoC-XFGmLSkJ1e/scene.splinecode";

const marketSignals = [
  {
    label: "Ticker",
    title: "실시간 티커",
    description: "주요 KRW 마켓의 현재가, 등락률, 24시간 거래대금을 빠르게 비교합니다.",
  },
  {
    label: "Candle",
    title: "캔들 차트",
    description: "초기 1분봉 데이터를 불러오고 실시간 봉 업데이트로 가격 흐름을 추적합니다.",
  },
  {
    label: "Orderbook",
    title: "호가",
    description: "매수와 매도 잔량을 한눈에 확인해 단기 수급 변화를 읽습니다.",
  },
  {
    label: "Trades",
    title: "체결",
    description: "최근 체결 방향과 거래량을 실시간으로 반영해 시장의 속도를 보여줍니다.",
  },
];

const streamFeatures = [
  {
    title: "Web Worker 직결",
    description: "브라우저 Worker가 Upbit WebSocket에 직접 연결해 메인 스레드 부담을 줄입니다.",
  },
  {
    title: "RxJS 스트림 정리",
    description: "고빈도 ticker, orderbook, trade 메시지를 throttle하고 최신값 중심으로 합칩니다.",
  },
  {
    title: "Pinia 상태 반영",
    description: "정규화된 실시간 데이터를 화면 상태로 반영해 차트와 패널을 일관되게 갱신합니다.",
  },
];

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
});
</script>

<template>
  <main id="landing-widget" ref="landingRef" class="landing">
    <div id="noise" aria-hidden="true" />

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
          <router-link to="/exchange" class="button button-green">대시보드 열기</router-link>
        </div>
      </article>
    </section>

    <section id="signals" class="content-section reveal">
      <p class="section-kicker">Live Market Signals</p>
      <h2>필요한 시장 신호만 선명하게</h2>
      <p class="section-lead">
        가격, 캔들, 호가, 체결 데이터를 분산된 화면 없이 하나의 대시보드에서 읽습니다.
      </p>
      <article class="feature-grid">
        <div v-for="feature in marketSignals" :key="feature.title" class="glass-card signal-card">
          <span>{{ feature.label }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </article>
    </section>

    <section class="content-section reveal stream-section">
      <p class="section-kicker">Built For Fast Streams</p>
      <h2>고빈도 시세를 가볍게 다루는 구조</h2>
      <article class="stream-grid">
        <div v-for="section in streamFeatures" :key="section.title" class="glass-card stream-card">
          <h3>{{ section.title }}</h3>
          <p>{{ section.description }}</p>
        </div>
      </article>
    </section>

    <section class="content-section final-cta reveal">
      <p class="section-kicker">No Account, No Keys</p>
      <h2>로그인 없이 바로 보는 공개 시장 데이터</h2>
      <p>
        API 키, 계정, DB 없이 Upbit 공개 REST와 WebSocket 데이터를 이용합니다.
      </p>
    </section>

    <section class="features-band reveal">
      <article class="wave" aria-hidden="true">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
          />
        </svg>
      </article>
    </section>
  </main>
</template>

<style scoped>
.landing {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #f2f0dd;
  background: linear-gradient(to bottom right, #111827, #1f2937);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
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
  opacity: 1;
}

.hero-section {
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
  top: 50%;
  left: 50%;
  z-index: 10;
  display: grid;
  row-gap: clamp(28px, 4vh, 44px);
  width: min(1120px, calc(100% - 48px));
  transform: translate(-50%, -50%);
  justify-items: center;
  text-align: center;
  text-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
}

.eyebrow {
  display: inline-flex;
  background: linear-gradient(315deg, #a8d1a3, #ddb650);
  background-clip: text;
  color: transparent;
}

h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(76px, 13vw, 164px);
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: 0;
  filter: drop-shadow(0 26px 70px rgba(0, 0, 0, 0.42));
}

.hero-subcopy {
  display: grid;
  justify-items: center;
  gap: clamp(16px, 2vh, 22px);
  margin-bottom: 0;
  padding: 0;
}

.hero-subcopy h2,
.content-section h2,
.final-cta h2,
.features-content h2 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(32px, 5vw, 54px);
  font-weight: 850;
  line-height: 1.05;
  letter-spacing: 0;
}

.hero-subcopy p,
.section-lead,
.final-cta p,
.features-content p {
  max-width: 760px;
  margin: 0 auto;
  color: #cbd5e1;
  font-size: 19px;
  line-height: 1.7;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border-radius: 8px;
  padding: 0 24px;
  font-weight: 700;
  text-decoration: none;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease;
}

.button:hover {
  transform: translateY(-2px);
}

.button-green {
  color: #ffffff;
  background: #5f8d4e;
}

.button-green:hover {
  background: #4c7a3b;
}

.button-secondary {
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #f8fbff;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.button-secondary:hover {
  background: rgba(255, 255, 255, 0.16);
}

.button-gold {
  color: #ffffff;
  background: #ddb650;
}

.button-gold:hover {
  background: #c7a448;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.hero-visual {
  position: absolute;
  top: 10rem;
  left: 50%;
  z-index: 5;
  width: min(980px, 92vw);
  height: 21rem;
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
  height: 230%;
}

.content-section {
  position: relative;
  z-index: 4;
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 140px 0;
  text-align: center;
}

.section-kicker {
  margin: 0 0 16px;
  color: #a8d1a3;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
  margin-top: 48px;
}

.glass-card {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  padding: 32px;
  background: rgba(255, 255, 255, 0.09);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
  text-align: left;
}

.glass-card h3 {
  margin: 0 0 16px;
  color: #ffffff;
  font-size: 21px;
  line-height: 1.35;
  letter-spacing: 0;
}

.glass-card p {
  margin: 0;
  color: #9ca3af;
  font-size: 17px;
  line-height: 1.7;
}

.signal-card {
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background-color 0.2s ease;
}

.signal-card:hover,
.stream-card:hover {
  border-color: rgba(168, 209, 163, 0.45);
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-4px);
}

.signal-card span {
  display: inline-flex;
  margin-bottom: 18px;
  color: #ddb650;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stream-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin-top: 48px;
}

.stream-card h3 {
  color: #d9f99d;
}

.tech-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 44px;
}

.tech-pill {
  display: inline-flex;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  padding: 0 22px;
  color: #f5f5eb;
  background: rgba(255, 255, 255, 0.08);
  font-size: 17px;
  font-weight: 700;
  opacity: 0.82;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.tech-pill:hover {
  opacity: 1;
  transform: translateY(-2px);
}

.final-cta {
  padding-bottom: 180px;
}

.final-cta p {
  margin-top: 24px;
  margin-bottom: 30px;
}

.features-band {
  position: relative;
  z-index: 4;
  margin-top: 20px;
  padding: 92px 24px 96px;
  color: #ffffff;
  background: #5a6349;
  text-align: center;
}

.wave {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 100%;
  overflow: hidden;
  line-height: 0;
}

.wave svg {
  display: block;
  width: 100%;
  height: 150px;
}

.wave path {
  fill: #5a6349;
}

.features-content {
  max-width: 860px;
  margin: 0 auto;
}

.features-content p {
  margin-top: 18px;
  margin-bottom: 32px;
  color: #eef2e8;
}

@media (max-width: 900px) {
  .hero-section {
    min-height: 100svh;
    padding: clamp(48px, 8svh, 72px) 20px clamp(36px, 7svh, 56px);
  }

  .hero-copy {
    top: 52%;
    row-gap: clamp(22px, 3.4vh, 34px);
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
    font-size: clamp(30px, 6vw, 42px);
  }

  .hero-subcopy p {
    max-width: min(680px, 100%);
    font-size: 18px;
    line-height: 1.65;
  }

  .hero-visual {
    top: clamp(5.5rem, 13svh, 8rem);
    width: min(760px, 116vw);
    height: clamp(16rem, 32svh, 20rem);
  }

  .spline-layer,
  .hero-visual :deep(.spline-canvas) {
    height: 220%;
  }

  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stream-grid {
    grid-template-columns: 1fr;
    max-width: 720px;
    margin-right: auto;
    margin-left: auto;
  }

  .content-section {
    width: min(960px, calc(100% - 32px));
    padding: clamp(80px, 11vw, 112px) 0;
  }

  .glass-card {
    padding: 28px;
  }
}

@media (max-width: 760px) {
  .feature-grid,
  .stream-grid {
    grid-template-columns: 1fr;
  }

  .content-section {
    width: min(680px, calc(100% - 28px));
    padding: 76px 0;
  }

  .glass-card {
    padding: 26px;
  }
}

@media (max-width: 640px) {
  .hero-section {
    padding: 44px 16px 32px;
  }

  .hero-copy {
    top: 53%;
    row-gap: clamp(18px, 3svh, 26px);
    width: min(520px, calc(100% - 28px));
  }

  h1 {
    font-size: clamp(48px, 15.5vw, 76px);
    line-height: 0.9;
  }

  .hero-subcopy {
    gap: 12px;
  }

  .hero-subcopy h2,
  .content-section h2,
  .final-cta h2,
  .features-content h2 {
    font-size: clamp(24px, 7.5vw, 32px);
    line-height: 1.12;
  }

  .hero-subcopy p,
  .section-lead,
  .final-cta p,
  .features-content p {
    font-size: 15.5px;
    line-height: 1.65;
  }

  .button {
    width: min(100%, 240px);
    min-height: 52px;
    padding: 0 18px;
  }

  .glass-card {
    padding: 22px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .hero-visual {
    top: clamp(4rem, 10svh, 5.5rem);
    width: min(132vw, 560px);
    height: clamp(12.5rem, 30svh, 16rem);
    border-radius: 18px;
  }

  .spline-layer,
  .hero-visual :deep(.spline-canvas) {
    height: 240%;
  }

  .features-band {
    padding: 72px 18px 76px;
  }

  .wave svg {
    height: 100px;
  }
}

@media (max-width: 900px) and (max-height: 700px) {
  .hero-copy {
    top: 56%;
    row-gap: 18px;
  }

  .hero-visual {
    top: 3.5rem;
    height: 12rem;
  }
}
</style>
