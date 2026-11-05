<script setup lang="ts">
// エントリーと動画の登録 (イベントの情報もここで書く)
useHead({ title: 'エントリーと動画の登録 | 管理画面' })

const loggedIn = useAdminLoggedIn()
</script>

<template>
  <div>
    <h2 class="heading">エントリーと動画の登録</h2>
    <AdminEntriesEditor @unauthorized="loggedIn = false" />
  </div>
</template>

<style scoped>
.heading {
  margin: 0 0 16px;
  font-size: 18px;
}
</style>
