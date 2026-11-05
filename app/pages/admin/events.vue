<script setup lang="ts">
// イベントの登録 (直す・消すのもここ)
useHead({ title: 'イベントの登録 | 管理画面' })

const loggedIn = useAdminLoggedIn()
</script>

<template>
  <div>
    <h2 class="heading">イベントの登録</h2>
    <AdminEventRegistration @unauthorized="loggedIn = false" />
  </div>
</template>

<style scoped>
.heading {
  margin: 0 0 16px;
  font-size: 18px;
}
</style>
