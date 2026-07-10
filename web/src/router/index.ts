import { createRouter, createWebHistory } from "vue-router";
import LandingPage from "../features/landing/LandingPage.vue";
import ExchangePage from "../features/exchange/ExchangePage.vue";
import InsightsPage from "../features/insights/InsightsPage.vue";
import MyPage from "../features/mypage/MyPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: LandingPage },
    { path: "/exchange", name: "exchange", component: ExchangePage },
    { path: "/insights", name: "insights", component: InsightsPage },
    { path: "/mypage", name: "mypage", component: MyPage },
    // 기존/구 경로 호환 — 모두 단일 시장 동향 페이지로
    { path: "/global", redirect: "/insights" },
    { path: "/sentiment", redirect: "/insights" },
    { path: "/kimchi", redirect: "/insights" },
    { path: "/insights/:rest(.*)", redirect: "/insights" },
  ],
});
