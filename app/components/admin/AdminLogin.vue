<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  /** ログインできたとき */
  login: []
}>()

const password = ref('')
const error = ref('')
const pending = ref(false)

async function submit() {
  pending.value = true
  error.value = ''
  try {
    await adminPost('/api/admin/login', { password: password.value })
    password.value = ''
    emit('login')
  } catch (e) {
    error.value = adminErrorMessages(e).join('\n')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="admin-login" @submit.prevent="submit">
    <h1 class="title">管理画面</h1>
    <p class="lead">
      動画のアップロードとイベントの登録をします。合言葉を入れてください。
    </p>
    <label class="admin-field">
      <span>合言葉</span>
      <input
        v-model="password"
        class="admin-input"
        type="password"
        autocomplete="current-password"
        required
      >
    </label>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <button
      class="admin-btn primary submit"
      type="submit"
      :disabled="pending || !password"
    >
      {{ pending ? '確認中…' : 'ログイン' }}
    </button>
  </form>
</template>

<style scoped>
.admin-login {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 360px;
  margin: 80px auto;
  padding: 0 16px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-muted);
}

.error {
  margin: 0;
  font-size: 13px;
  color: var(--color-danger);
  white-space: pre-line;
}

.submit {
  justify-content: center;
  min-height: 48px;
  border-radius: 12px;
}
</style>
