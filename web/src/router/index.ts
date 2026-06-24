import { createRouter, createWebHistory } from "vue-router";
import LandingPage from "../features/landing/LandingPage.vue";
import ExchangePage from "../features/exchange/ExchangePage.vue";
import NewsPage from "../features/news/NewsPage.vue";
import SentimentPage from "../features/sentiment/SentimentPage.vue";
import KimchiPage from "../features/kimchi/KimchiPage.vue";
import GlobalPage from "../features/global/GlobalPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: LandingPage },
    { path: "/exchange", name: "exchange", component: ExchangePage },
    { path: "/news", name: "news", component: NewsPage },
    { path: "/sentiment", name: "sentiment", component: SentimentPage },
    { path: "/kimchi", name: "kimchi", component: KimchiPage },
    { path: "/global", name: "global", component: GlobalPage },
  ],
});
