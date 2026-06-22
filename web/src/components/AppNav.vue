<script setup lang="ts">
</script>

<template>
  <nav class="app-nav" aria-label="주요 네비게이션">
    <div class="app-nav__left">
      <router-link to="/" class="app-nav__brand">CoinBurrow</router-link>
      <div class="app-nav__links">
        <router-link to="/exchange">거래소</router-link>
        <router-link to="/news">뉴스</router-link>
      </div>
    </div>

    <div class="app-nav__right">
      <slot name="actions" />
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
}

.app-nav__right {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.app-nav a:not(.app-nav__brand) {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}

.app-nav a:not(.app-nav__brand):hover,
.app-nav a:not(.app-nav__brand):focus-visible,
.app-nav a:not(.app-nav__brand)[aria-current="page"] {
  color: var(--brand-lime);
  outline: none;
}

.app-nav__brand {
  border: 0 !important;
  outline: none;
  box-shadow: none;
  padding-inline: 0;
  text-decoration: none;
  display: inline-flex;
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
  line-height: 1;
  letter-spacing: 0;
}

@media (max-width: 640px) {
  .app-nav {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .app-nav__left {
    width: 100%;
    flex-wrap: wrap;
  }

  .app-nav__links {
    width: 100%;
  }

  .app-nav__links a {
    flex: 1 1 0;
    text-align: center;
  }

  .app-nav__right {
    margin-left: 0;
    width: 100%;
  }
}
</style>
