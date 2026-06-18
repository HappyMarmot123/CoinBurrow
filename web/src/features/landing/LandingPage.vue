<script setup lang="ts">
import { onMounted, ref } from "vue";
import gsap from "gsap";
import SplineScene from "./SplineScene.vue";

const heroRef = ref<HTMLElement | null>(null);
const scene = import.meta.env.VITE_SPLINE_SCENE as string | undefined;

onMounted(() => {
  if (heroRef.value) {
    gsap.from(heroRef.value, { opacity: 0, y: 40, duration: 0.8, ease: "power2.out" });
  }
});
</script>

<template>
  <main class="landing">
    <SplineScene :scene="scene" />
    <section ref="heroRef" class="hero">
      <h1>CoinBurrow</h1>
      <p>가상 포인트로 즐기는 실시간 크립토 대시보드</p>
      <router-link to="/exchange" class="cta">거래소로 이동</router-link>
    </section>
  </main>
</template>

<style scoped>
.landing {
  position: relative;
  display: grid;
  min-height: 100vh;
  overflow: hidden;
  place-items: center;
  color: #f8fbff;
  background: #111827;
}

.landing::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(90deg, rgba(17, 24, 39, 0.86), rgba(17, 24, 39, 0.34));
}

.hero {
  position: relative;
  z-index: 1;
  width: min(880px, calc(100% - 48px));
}

h1 {
  margin: 0 0 16px;
  font-size: clamp(48px, 8vw, 96px);
  line-height: 0.95;
}

p {
  max-width: 560px;
  margin: 0 0 28px;
  color: #d7e1ee;
  font-size: 20px;
}

.cta {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  border-radius: 6px;
  padding: 0 18px;
  color: #111827;
  background: #f8fbff;
  font-weight: 700;
  text-decoration: none;
}
</style>
