<script setup lang="ts">
// 管理画面の外枠。ログインを確かめ、ログインしていれば子のページ (pages/admin/) を出す。
// ログインしているかで中身が変わるので、サーバーでは描画しない (nuxt.config.ts の routeRules)
import { onMounted } from 'vue'
import '~/assets/css/admin.css'

useHead({
  title: '管理画面',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const loggedIn = useAdminLoggedIn()

onMounted(async () => {
  try {
    await $fetch('/api/admin/session')
    loggedIn.value = true
  } catch {
    loggedIn.value = false
  }
})

async function logout() {
  await adminPost('/api/admin/logout', {}).catch(() => {})
  loggedIn.value = false
}
</script>

<template>
  <div class="admin">
    <AdminLogin v-if="loggedIn === false" @login="loggedIn = true" />
    <template v-else-if="loggedIn">
      <header class="bar">
        <h1 class="title">
          <NuxtLink to="/admin" class="home">管理画面</NuxtLink>
        </h1>
        <button type="button" class="admin-btn" @click="logout">
          ログアウト
        </button>
      </header>
      <NuxtPage />
    </template>
  </div>
</template>

<style scoped>
.admin {
  box-sizing: border-box;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 16px;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.home {
  color: inherit;
  text-decoration: none;
}
</style>
