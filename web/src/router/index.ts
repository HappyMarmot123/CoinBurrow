import { createRouter, createWebHistory } from "vue-router";
import LandingPage from "../features/landing/LandingPage.vue";
import ExchangePage from "../features/exchange/ExchangePage.vue";
import NewsPage from "../features/news/NewsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: LandingPage },
    { path: "/exchange", name: "exchange", component: ExchangePage },
    { path: "/news", name: "news", component: NewsPage },
  ],
});
