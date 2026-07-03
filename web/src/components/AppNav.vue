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
  gap: 10px 14px;
  flex-wrap: wrap;
}

.app-nav__left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.app-nav__links {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
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
  min-height: 34px;
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
.app-nav__link.router-link-active:not(.app-nav__brand),
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
    align-items: center;
    gap: 8px 10px;
  }

  .app-nav__left {
    flex: 1 1 auto;
    min-width: 120px;
  }

  .app-nav__right {
    flex: 999 1 220px;
    min-width: 0;
    margin-left: 0;
    justify-content: flex-end;
  }

  .app-nav__links {
    width: 100%;
    justify-content: flex-end;
    gap: 6px;
  }

  .app-nav__links a {
    flex: 1 1 96px;
    min-height: 38px;
    text-align: center;
  }

  .app-nav__brand {
    min-height: 38px;
    align-items: center;
  }
}
</style>

<style scoped lang="scss">
@media (max-width: 640px) {
  .app-nav {
    align-items: stretch;
    width: min(100%, 370px);
    max-width: 100%;
  }

  .app-nav__left,
  .app-nav__right {
    flex: 0 0 100%;
    min-width: 0;
    margin-left: 0;
  }

  .app-nav__right {
    justify-content: stretch;
  }

  .app-nav__brand {
    width: fit-content;
  }

  .app-nav__links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .app-nav__link {
    min-width: 0;
    justify-content: center;
  }
}
</style>
