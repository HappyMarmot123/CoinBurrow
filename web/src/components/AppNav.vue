<script setup lang="ts">
</script>

<template>
  <nav class="app-nav" aria-label="주요 네비게이션">
    <div class="app-nav__left">
      <router-link to="/" class="app-nav__link app-nav__brand">CoinBurrow</router-link>
    </div>

    <div class="app-nav__right">
      <div class="app-nav__links" aria-label="주요 네비게이션 메뉴">
        <router-link to="/exchange" class="app-nav__link">거래소</router-link>
        <router-link to="/insights" class="app-nav__link">시장 동향</router-link>
        <router-link to="/news" class="app-nav__link">뉴스</router-link>
        <slot name="actions" />
      </div>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.app-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.app-nav__left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.app-nav__links {
  display: flex;
  gap: 8px;
  align-items: center;
}

.app-nav__right {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.app-nav__link {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1;
  font-weight: 850;
  text-decoration: none;
  background: transparent;
  cursor: pointer;
  transition:
    border-color var(--ease),
    color var(--ease),
    background var(--ease);
}

.app-nav__link:hover,
.app-nav__link:focus-visible,
.app-nav__link.router-link-active,
.app-nav__link[aria-current="page"] {
  color: var(--brand-lime);
  border-color: var(--panel-border-hover);
  background: var(--panel-bg-strong);
  outline: none;
}

.app-nav__brand {
  border: none;
  padding: 0;
  background: linear-gradient(315deg, #d9ff66, #ffb02e);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter:
    drop-shadow(0 4px 0 rgba(92, 58, 6, 0.28))
    drop-shadow(0 14px 18px rgba(0, 0, 0, 0.22))
    drop-shadow(0 0 18px rgba(255, 176, 46, 0.22));
  font-size: 17px;
  margin: 0;
  font-weight: 900;
  letter-spacing: 0;
}

.app-nav__brand:hover,
.app-nav__brand:focus-visible {
  color: transparent;
  border: none;
  background: linear-gradient(315deg, #d9ff66, #ffb02e);
  background-clip: text;
  -webkit-background-clip: text;
}

@media (max-width: 640px) {
  .app-nav {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .app-nav__left,
  .app-nav__links,
  .app-nav__right {
    width: 100%;
  }

  .app-nav__left {
    width: auto;
    flex-wrap: nowrap;
  }

  .app-nav__links a {
    flex: 1 1 0;
    text-align: center;
  }

  .app-nav__right {
    margin-left: 0;
  }
}
</style>
