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

const keyFeatures = [
  {
    title: "🎲 위험은 제로, 재미는 무한대!",
    description:
      "더 이상 실제 돈을 잃을까 걱정하지 마세요. CoinBurrow에서는 넉넉한 가상 포인트를 제공합니다. 실제 코인 종목을 사고팔며 자신만의 투자 전략을 마음껏 실험하고, 투자 실력을 키워보세요.",
  },
  {
    title: "⏱️ 기회는 단 30분! 전략적 베팅의 묘미",
    description:
      "매수 후 30분, 당신의 선택에 모든 것이 달렸습니다. 과감하게 추가 매수하여 수익을 극대화할 것인가, 안정적으로 매도하여 이익을 실현할 것인가? 매 순간 짜릿한 선택의 기로에서 최고의 전략을 펼쳐보세요.",
  },
  {
    title: "🔓 도전하고, 성취하고, 잠금 해제하라!",
    description:
      "처음에는 일부 메이저 코인만 거래할 수 있습니다. 게임을 플레이하며 포인트를 쌓고, 높은 승률을 기록하고, 특별 업적을 달성하면 숨겨진 알트코인들이 잠금 해제됩니다.",
  },
];

const coachSections = [
  {
    title: "📊 데이터로 말하는 당신의 투자 스타일",
    description:
      "당신은 공격적인 단타 투자자인가요, 아니면 신중한 장기 투자자인가요? CoinBurrow는 당신의 모든 투자 기록을 정밀하게 분석하여, 자신도 몰랐던 투자 성향과 패턴을 알려주는 개인화 리포트를 제공합니다.",
  },
  {
    title: "🧠 AI가 짚어주는 맞춤형 투자 조언",
    description:
      "CoinBurrow의 AI 코치가 당신의 투자 데이터를 분석하여 강점은 강화하고 약점은 보완할 수 있도록 개인화된 피드백을 제공합니다. 게임을 즐기면서 자연스럽게 투자 지식과 통찰력을 얻어보세요.",
  },
  {
    title: "📰 실시간으로 쏟아지는 가상 경제 뉴스",
    description:
      "CoinBurrow는 실제 코인 시장의 최신 정보를 수집하고 게임 내에 맞춤형 가상 뉴스를 생성하여 제공합니다. 실제와 같은 정보 흐름 속에서 시장을 읽는 눈을 키워보세요.",
  },
];

const techStack = ["Vue 3", "Vite", "Fastify", "Pinia", "RxJS", "Highcharts", "GSAP", "Spline"];

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
      <article class="spline-layer" aria-label="Coin 3D">
        <SplineScene :scene="scene" />
      </article>

      <article class="container" aria-hidden="true">
        <div class="sky">
          <div class="stars" />
          <div class="stars1" />
          <div class="stars2" />
          <div class="shooting_stars" />
        </div>
      </article>

      <article ref="heroRef" class="hero-copy">
        <p class="eyebrow">CoinBurrow</p>
        <h1>
          <span>Invest Like It’s Real</span>
          <span>But Risk-Free!</span>
        </h1>
        <div class="hero-subcopy">
          <h2>Awaken Your Inner Investor</h2>
          <p>
            CoinBurrow is a simulated investment platform where you use virtual points to invest
            in real market coins. Sharpen your strategies, discover your hidden talent, and climb
            to the top of the rankings—all without any real-world risk!
          </p>
        </div>
        <router-link to="/exchange" class="button button-green">Get Started</router-link>
      </article>
    </section>

    <section class="content-section reveal">
      <h2>CoinBurrow, 투자를 게임처럼 즐기는 새로운 방법</h2>
      <article class="feature-grid">
        <div v-for="feature in keyFeatures" :key="feature.title" class="glass-card">
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </article>
    </section>

    <section class="content-section reveal">
      <h2>당신만을 위한 AI 투자 코치, CoinBurrow</h2>
      <article class="coach-list">
        <div v-for="section in coachSections" :key="section.title" class="glass-card coach-card">
          <h3>{{ section.title }}</h3>
          <p>{{ section.description }}</p>
        </div>
      </article>
    </section>

    <section class="content-section reveal">
      <h2>현재 기술 스택으로 다시 구현된 빠른 투자 환경</h2>
      <p class="section-lead">
        Vue 3, Vite, Fastify, Pinia, RxJS 기반의 가벼운 구조로 실시간 시세와 대시보드를
        안정적으로 제공합니다.
      </p>
      <article class="tech-grid" aria-label="Current tech stack">
        <span v-for="tech in techStack" :key="tech" class="tech-pill">{{ tech }}</span>
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
      <div class="features-content">
        <h2>아직도 망설이고 계신가요?</h2>
        <p>
          수만 명의 예비 투자자들이 CoinBurrow에서 자신의 가능성을 시험하고 있습니다. 지금 바로 합류하여 당신의 투자 여정을 시작하세요!
        </p>
        <router-link to="/exchange" class="button button-gold">Get Started</router-link>
      </div>
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
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 80px 24px;
  background: #2f3b52;
}

.spline-layer {
  position: absolute;
  inset: 0;
}

.spline-layer {
  z-index: 2;
  opacity: 0.82;
}

.hero-copy {
  position: relative;
  z-index: 10;
  width: min(980px, 100%);
  text-align: center;
  text-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
}

.eyebrow {
  display: inline-flex;
  margin: 0 0 22px;
  background: linear-gradient(315deg, #a8d1a3, #ddb650);
  background-clip: text;
  color: transparent;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0;
}

h1 {
  display: grid;
  gap: 8px;
  margin: 0 0 28px;
  color: #ffffff;
  font-size: clamp(48px, 9vw, 92px);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: 0;
}

.hero-subcopy {
  display: grid;
  justify-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding: 24px 0 8px;
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

.button-gold {
  color: #ffffff;
  background: #ddb650;
}

.button-gold:hover {
  background: #c7a448;
}

.content-section {
  position: relative;
  z-index: 4;
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 140px 0;
  text-align: center;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.coach-list {
  display: grid;
  max-width: 920px;
  gap: 24px;
  margin: 48px auto 0;
}

.coach-card h3 {
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
    min-height: 92vh;
    padding: 72px 20px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .content-section {
    padding: 96px 0;
  }
}

@media (max-width: 640px) {
  h1 {
    font-size: clamp(42px, 16vw, 68px);
  }

  .hero-subcopy h2,
  .content-section h2,
  .final-cta h2,
  .features-content h2 {
    font-size: 32px;
  }

  .hero-subcopy p,
  .section-lead,
  .final-cta p,
  .features-content p {
    font-size: 16px;
  }

  .glass-card {
    padding: 24px;
  }
}
</style>
