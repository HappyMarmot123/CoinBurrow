import { createRouter, createWebHistory } from "vue-router";
import LandingPage from "../features/landing/LandingPage.vue";
import ExchangePage from "../features/exchange/ExchangePage.vue";
import NewsPage from "../features/news/NewsPage.vue";
import InsightsPage from "../features/insights/InsightsPage.vue";
import GlobalView from "../features/global/GlobalView.vue";
import SentimentView from "../features/sentiment/SentimentView.vue";
import KimchiView from "../features/kimchi/KimchiView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: LandingPage },
    { path: "/exchange", name: "exchange", component: ExchangePage },
    { path: "/news", name: "news", component: NewsPage },
    {
      path: "/insights",
      component: InsightsPage,
      children: [
        { path: "", redirect: { name: "insights-global" } },
        { path: "global", name: "insights-global", component: GlobalView },
        { path: "sentiment", name: "insights-sentiment", component: SentimentView },
        { path: "kimchi", name: "insights-kimchi", component: KimchiView },
      ],
    },
    { path: "/global", redirect: "/insights/global" },
    { path: "/sentiment", redirect: "/insights/sentiment" },
    { path: "/kimchi", redirect: "/insights/kimchi" },
  ],
});
