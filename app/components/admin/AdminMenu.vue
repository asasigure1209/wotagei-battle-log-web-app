<script setup lang="ts">
// 管理画面の入口: 登録の操作ごとのページへのリンクを並べる。
// 親のページ (pages/admin.vue) のログインの状態を保つよう、NuxtLink でページを読み直さずに移る
</script>

<template>
  <nav class="menu" aria-label="登録の操作">
    <NuxtLink class="admin-card item" to="/admin/events">
      <span class="admin-heading">イベントを登録する</span>
      <span class="admin-hint">
        シリーズ・イベント名・開催日・運営の連絡先を登録する。登録済みのイベントを直す・消すのもここ
      </span>
    </NuxtLink>
    <NuxtLink class="admin-card item" to="/admin/entries">
      <span class="admin-heading">エントリーを登録する</span>
      <span class="admin-hint">
        登録済みのイベントを選び、エントリーの名前を 1 行に 1
        人ずつ書いて登録する。No. は書いた順に付く
      </span>
    </NuxtLink>
    <NuxtLink class="admin-card item" to="/admin/videos">
      <span class="admin-heading">動画を登録する</span>
      <span class="admin-hint">
        登録済みのイベントを選び、動画を R2
        にアップロードして、出演者と一緒に登録する
        (エントリーもここで書き直せる)
      </span>
    </NuxtLink>
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
