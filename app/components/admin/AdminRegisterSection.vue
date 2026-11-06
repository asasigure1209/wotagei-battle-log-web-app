<script setup lang="ts">
// 3. DB に登録: 動画と選んだ出演者を確かめて、選んだイベントに登録する

import { useAdminVideoEditor } from '~/composables/useAdminVideoEditor'

const { canRegister, currentKey, register } = useAdminVideoEditor()
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">3. DB に登録</h2>
    <p class="admin-hint">
      すべての動画が「R2
      にあり」になったら登録できます。登録すると、選んだイベントのエントリー・動画・出演者を入れ直します
      (ほかのイベントには触れません)。
    </p>
    <div class="admin-actions">
      <button
        type="button"
        class="admin-btn"
        :disabled="!canRegister"
        @click="register(true)"
      >
        確認だけ
      </button>
      <button
        type="button"
        class="admin-btn primary"
        :disabled="!canRegister"
        @click="register(false)"
      >
        登録する
      </button>
      <a
        v-if="currentKey"
        class="link"
        :href="`/${currentKey}`"
        target="_blank"
        rel="noopener"
        >公開ページを開く</a
      >
    </div>
  </section>
</template>

<style scoped>
.link {
  color: var(--color-accent);
  font-size: 14px;
}
</style>
