<script setup lang="ts">
// 管理画面の入口: 登録の操作ごとのページへのリンクを並べる
</script>

<template>
  <nav class="menu" aria-label="登録の操作">
    <a class="admin-card item" href="/admin/entries">
      <span class="admin-heading">エントリーと動画を登録する</span>
      <span class="admin-hint">
        イベントの情報とエントリーを書き、動画を R2
        にアップロードして、出演者と一緒に登録する。登録済みのイベントを直す・消すのもここ
      </span>
    </a>
  </nav>
</template>

<style scoped>
.menu {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.item {
  color: inherit;
  text-decoration: none;
}

.item:hover {
  border-color: var(--color-border-strong);
}
</style>
