<script setup lang="ts">
// 앱 공통 상단 헤더 — 로고(워드마크) + 마켓/뉴스 라우터 버튼.
// 활성 표시는 RouterLink가 현재 경로에 aria-current="page"를 자동 부여한다.
// 페이지별 폭/여백은 부모가 클래스로 지정한다(예: .exchange-nav, .news-nav).
</script>

<template>
  <nav class="app-nav" aria-label="주요 메뉴">
    <router-link to="/" class="app-nav__brand">CoinBurrow</router-link>
    <div class="app-nav__links">
      <router-link to="/exchange">마켓</router-link>
      <router-link to="/news">뉴스</router-link>
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

.app-nav__links {
  display: flex;
  gap: 8px;
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
    align-items: stretch;
    flex-direction: column;
  }

  .app-nav__links {
    width: 100%;
  }

  .app-nav__links a {
    flex: 1 1 0;
    text-align: center;
  }
}
</style>
