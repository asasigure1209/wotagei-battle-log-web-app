<script setup lang="ts">
// 4. DB に登録: 書いた内容を確かめて登録する。読み込んだイベントは消すこともできる
import { ref, watch } from 'vue'

const editor = useAdminEditor()
const { state, canRegister, currentKey, events } = editor

/** 消すボタンを 1 度押したか。もう一度押すと消す */
const confirmDelete = ref(false)
// ほかのイベントに切り替えたら、1 度押したことは忘れる
watch(
  () => state.loadedKey,
  () => {
    confirmDelete.value = false
  },
)

async function onDelete() {
  confirmDelete.value = !confirmDelete.value
  if (!confirmDelete.value) await editor.deleteEvent()
}
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">4. DB に登録</h2>
    <p class="admin-hint">
      すべての動画が「R2
      にあり」になったら登録できます。登録すると、このイベントのエントリー・動画・出演者を入れ直します
      (ほかのイベントには触れません)。
    </p>
    <div class="admin-actions">
      <button
        type="button"
        class="admin-btn"
        :disabled="!canRegister"
        @click="editor.register(true)"
      >
        確認だけ
      </button>
      <button
        type="button"
        class="admin-btn primary"
        :disabled="!canRegister"
        @click="editor.register(false)"
      >
        登録する
      </button>
      <a
        v-if="events.has(currentKey)"
        class="link"
        :href="`/${currentKey}`"
        target="_blank"
        rel="noopener"
        >公開ページを開く</a
      >
      <button
        v-if="state.loadedKey"
        type="button"
        class="admin-btn danger"
        :disabled="state.busy"
        @click="onDelete"
      >
        {{
          confirmDelete
            ? 'もう一度押すと DB から消します'
            : 'このイベントを消す'
        }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.link {
  color: var(--color-accent);
  font-size: 14px;
}
</style>
