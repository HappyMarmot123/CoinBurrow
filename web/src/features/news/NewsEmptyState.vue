<template>
  <div class="news-empty">
    <h2>표시할 뉴스가 없습니다</h2>
    <p>검색어 또는 필터 조건을 줄여 다시 확인하세요.</p>
  </div>
</template>

<style scoped lang="scss">
.news-empty {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 220px;
  border: 1px dashed var(--panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-align: center;
}

.news-empty h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  letter-spacing: 0;
}

.news-empty p {
  margin: 0;
  font-size: 13px;
}
</style>
