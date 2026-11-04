<script setup lang="ts">
// 管理画面の入り口。イベントを登録してから、そのイベントにエントリー・動画を登録する
useHead({ title: '' })
</script>

<template>
  <nav class="menu" aria-label="登録">
    <a class="admin-card item" href="/admin/events">
      <span class="admin-heading">1. イベントを登録する</span>
      <span class="admin-hint">
        シリーズ・イベント名・開催日・運営の連絡先を登録します。登録済みのイベントの情報を直す・消すのもここです。
      </span>
    </a>
    <a class="admin-card item" href="/admin/entries">
      <span class="admin-heading">2. エントリー・動画を登録する</span>
      <span class="admin-hint">
        登録済みのイベントを選び、エントリーを書いて、動画を R2
        にアップロードし、各動画の出演者と合わせて登録します。
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
