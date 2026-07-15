import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

describe("simulator information architecture", () => {
  it("uses mypage as the account route and keeps the old path compatible", () => {
    const router = readSource("src/router/index.ts");
    const nav = readSource("src/components/AppNav.vue");
    const auth = readSource("src/stores/auth.ts");
    const landing = readSource("src/features/landing/LandingPage.vue");
    const exchange = readSource("src/features/exchange/ExchangePage.vue");
    const insights = readSource("src/features/insights/InsightsPage.vue");
    const mypage = readSource("src/features/simulator/MyPage.vue");

    expect(router).toContain('{ path: "/mypage", name: "mypage", component: MyPage }');
    expect(router).toContain('{ path: "/simulator", redirect: "/mypage" }');
    expect(nav).toContain('<router-link to="/mypage" class="app-nav__link">마이페이지</router-link>');
    expect(nav).not.toContain('to="/simulator"');
    expect(nav).toContain('class="app-nav__auth"');
    expect(landing).toContain('<AppNav class="landing-nav" />');
    expect(exchange).toContain('<AppNav class="exchange-nav" />');
    expect(insights).toContain('<AppNav class="insights-nav" />');
    expect(mypage).toContain('<AppNav class="mypage-nav" />');
    expect(auth).toContain("options: { redirectTo: currentAuthRedirectUrl() }");
    expect(auth).not.toContain('redirectTo: `${window.location.origin}/mypage`');
  });

  it("places mock trading in the existing exchange page", () => {
    const exchange = readSource("src/features/exchange/ExchangePage.vue");
    const mypage = readSource("src/features/simulator/MyPage.vue");
    const workspaceIndex = exchange.indexOf('class="trade-workspace"');
    const orderbookIndex = exchange.indexOf("<OrderbookPanel");
    const simulatorIndex = exchange.indexOf("<ExchangeSimulatorPanel");
    const tradesIndex = exchange.indexOf("<TradeList");

    expect(exchange).toContain("<ExchangeSimulatorPanel");
    expect(exchange).toContain(':market="market"');
    expect(workspaceIndex).toBeGreaterThan(-1);
    expect(orderbookIndex).toBeGreaterThan(workspaceIndex);
    expect(simulatorIndex).toBeGreaterThan(orderbookIndex);
    expect(tradesIndex).toBeGreaterThan(simulatorIndex);
    expect(mypage).not.toContain("SimulatorOrderForm");
    expect(mypage).toContain('to="/exchange">거래소에서 주문</router-link>');
  });
});
