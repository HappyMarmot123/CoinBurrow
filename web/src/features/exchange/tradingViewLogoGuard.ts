import { type Ref } from "vue";

export function createTradingViewLogoGuard(container: Ref<HTMLElement | null>) {
  let tvLogoObserver: MutationObserver | null = null;

  function hideTradingViewLogo() {
    if (!container.value) return;
    const logoNodes = container.value.querySelectorAll("#tv-attr-logo, [tv-attr-logo]");
    logoNodes.forEach((node) => {
      const element = node as HTMLElement;
      element.style.setProperty("display", "none", "important");
      element.setAttribute("aria-hidden", "true");
    });
  }

  function stopTradingViewLogoGuard() {
    tvLogoObserver?.disconnect();
    tvLogoObserver = null;
  }

  function startTradingViewLogoGuard() {
    stopTradingViewLogoGuard();
    hideTradingViewLogo();

    if (!container.value || typeof MutationObserver === "undefined") return;

    tvLogoObserver = new MutationObserver(() => {
      hideTradingViewLogo();
    });
    tvLogoObserver.observe(container.value, {
      childList: true,
      subtree: true,
    });
  }

  function hideTradingViewLogoAfterMount() {
    if (typeof requestAnimationFrame === "undefined") {
      hideTradingViewLogo();
      return;
    }

    requestAnimationFrame(() => {
      hideTradingViewLogo();
      startTradingViewLogoGuard();
    });
  }

  return {
    hideTradingViewLogoAfterMount,
    stopTradingViewLogoGuard,
  };
}
