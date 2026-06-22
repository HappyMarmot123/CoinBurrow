<template>
  <div class="news-skeleton" aria-hidden="true">
    <span v-for="item in 6" :key="item" />
  </div>
</template>

<style scoped lang="scss">
.news-skeleton {
  display: grid;
  gap: 12px;
}

.news-skeleton span {
  min-height: 142px;
  border: 1px solid var(--panel-border-soft);
  border-radius: var(--radius-sm);
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent),
    var(--panel-bg);
  background-size: 220% 100%;
  animation: news-skeleton 1.2s ease-in-out infinite;
}

@keyframes news-skeleton {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -120% 0;
  }
}
</style>
