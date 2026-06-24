<script setup lang="ts">
import AppNav from "../../components/AppNav.vue";
import KimchiView from "./KimchiView.vue";
</script>

<template>
  <main class="kimchi-page">
    <AppNav class="kimchi-nav" />
    <section class="kimchi-layout">
      <KimchiView />
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) { margin: 0; }
.kimchi-page {
  min-height: 100svh;
  padding: clamp(8px, 1.4vh, 14px) 0;
  color: var(--text);
  font-family: $font-sans;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1100px 500px at 50% -120px, var(--bg-glow), transparent 65%),
    linear-gradient(to bottom right, var(--bg-page), var(--bg-page-mid) 38%, var(--bg-page-soft) 72%);
}
.kimchi-nav {
  flex: 0 0 auto;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto clamp(8px, 1.2vh, 12px);
}
.kimchi-layout {
  flex: 1;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto;
  padding: 14px;
}
</style>
