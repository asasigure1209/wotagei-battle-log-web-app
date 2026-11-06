<script setup lang="ts">
// エントリーと動画の登録。登録済みのイベントを選んで行う。?event=<シリーズID>/<イベントID> で、そのイベントを選んだ状態で開く
useHead({ title: 'エントリーと動画の登録 | 管理画面' })

const loggedIn = useAdminLoggedIn()
const initialEvent = String(useRoute().query.event ?? '')
</script>

<template>
  <div>
    <h2 class="heading">エントリーと動画の登録</h2>
    <AdminVideoEditor
      :initial-event="initialEvent"
      @unauthorized="loggedIn = false"
    />
  </div>
</template>

<style scoped>
.heading {
  margin: 0 0 16px;
  font-size: 18px;
}
</style>
