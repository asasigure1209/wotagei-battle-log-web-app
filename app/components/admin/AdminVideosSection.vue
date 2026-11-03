<script setup lang="ts">
// 3. 動画: ファイルを選んで並べ、R2 にアップロードする
import { computed, ref } from 'vue'

const editor = useAdminEditor()
const { state, idsValid, targets } = editor

/** ファイルだけを選ぶときに置く分類 (予選など) */
const category = ref('')

const totalUploadBytes = computed(() =>
  targets.value.reduce((n, r) => n + r.sizeBytes, 0),
)
const canUpload = computed(
  () =>
    idsValid.value && !!state.remote && targets.value.length > 0 && !state.busy,
)

async function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  await editor.addFiles(Array.from(input.files ?? []), category.value)
  // 同じファイルを選び直しても change が起きるよう空にする
  input.value = ''
  if (!state.remote) await editor.refreshRemote()
}
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">3. 動画</h2>
    <p class="admin-hint">
      撮影したファイルをそのまま送ります
      (エンコードはしません)。フォルダを選ぶと、その下の分類 (予選・本戦など)
      のフォルダ構成がキーになります。並び順がイベントの中での動画の No.
      になります。
    </p>
    <div class="admin-actions">
      <label class="admin-btn picker">
        フォルダを選ぶ
        <input
          type="file"
          webkitdirectory
          multiple
          :disabled="state.busy"
          @change="onPickFiles"
        >
      </label>
      <span class="or">または</span>
      <input
        v-model.trim="category"
        class="admin-input category"
        placeholder="分類 (例: 予選)"
        aria-label="ファイルを置く分類"
      >
      <label class="admin-btn picker">
        ファイルを選ぶ
        <input
          type="file"
          accept=".mp4,video/mp4"
          multiple
          :disabled="state.busy"
          @change="onPickFiles"
        >
      </label>
      <button
        type="button"
        class="admin-btn"
        :disabled="!idsValid || state.busy"
        @click="editor.refreshRemote"
      >
        R2 を確認
      </button>
      <button
        type="button"
        class="admin-btn"
        :disabled="state.busy"
        @click="editor.sortRows"
      >
        パス順に並べる
      </button>
    </div>

    <AdminVideoTable v-if="state.rows.length" />
    <p v-else class="admin-hint">まだ動画がありません。</p>

    <div class="admin-actions">
      <button
        v-if="!state.uploadAbort"
        type="button"
        class="admin-btn primary"
        :disabled="!canUpload"
        @click="editor.uploadAll"
      >
        R2 にアップロード ({{ targets.length }} 本 /
        {{ formatBytes(totalUploadBytes) }})
      </button>
      <button
        v-else
        type="button"
        class="admin-btn"
        @click="editor.cancelUpload"
      >
        アップロードを中止
      </button>
    </div>
  </section>
</template>

<style scoped>
.picker input {
  display: none;
}

.or {
  font-size: 13px;
  color: var(--color-muted);
}

.category {
  width: 160px;
}
</style>
