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
    <label class="field">
      <span>合言葉</span>
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      >
    </label>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <button class="submit" type="submit" :disabled="pending || !password">
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

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--color-muted);
}

.field input {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: 10px;
  background: var(--color-surface-sunken);
  color: var(--color-text);
  font: inherit;
  font-size: 16px;
}

.error {
  margin: 0;
  font-size: 13px;
  color: #ff7a7a;
  white-space: pre-line;
}

.submit {
  min-height: 48px;
  border: none;
  border-radius: 12px;
  background: var(--color-accent);
  color: var(--color-bg);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.submit:disabled {
  background: var(--color-border);
  color: #8a8a96;
  cursor: default;
}
</style>
