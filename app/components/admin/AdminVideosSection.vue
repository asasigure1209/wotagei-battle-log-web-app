<script setup lang="ts">
// 2. 動画: ファイルを選んで並べ、R2 にアップロードし、出演者を選ぶ。
// 選んだイベントにエントリーがまだなければ、出演者を選べないので、エントリーの登録へ案内する

import { ref } from 'vue'
import { useAdminVideoEditor } from '~/composables/useAdminVideoEditor'
import { formatBytes } from '~/utils/adminManifest'
import AdminVideoTable from './AdminVideoTable.vue'

const {
  state,
  selected,
  hasEntries,
  currentKey,
  canPickFiles,
  targets,
  totalUploadBytes,
  canUpload,
  addFiles,
  refreshRemote,
  sortRows,
  uploadAll,
  cancelUpload,
} = useAdminVideoEditor()

/** ファイルだけを選ぶときに置く分類 (予選など) */
const category = ref('')

async function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  await addFiles(Array.from(input.files ?? []), category.value)
  // 同じファイルを選び直しても change が起きるよう空にする
  input.value = ''
}
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">2. 動画</h2>
    <p class="admin-hint">
      撮影したファイルをそのまま送ります
      (エンコードはしません)。フォルダを選ぶと、その下の分類 (予選・本戦など)
      のフォルダ構成がキーになります。並び順がイベントの中での動画の No.
      になります。出演者は、登録済みのエントリーから 1〜2 人選びます。
    </p>
    <p v-if="selected && !hasEntries" class="admin-warn">
      このイベントにはまだエントリーがないので、出演者を選べず、登録もできません。
      <NuxtLink class="link" :to="`/admin/entries?event=${currentKey}`"
        >先にエントリーを登録してください</NuxtLink
      >。
    </p>
    <div class="admin-actions">
      <label class="admin-btn picker">
        フォルダを選ぶ
        <input
          type="file"
          webkitdirectory
          multiple
          :disabled="!canPickFiles"
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
          :disabled="!canPickFiles"
          @change="onPickFiles"
        >
      </label>
      <button
        type="button"
        class="admin-btn"
        :disabled="!selected || state.busy"
        @click="refreshRemote"
      >
        R2 を確認
      </button>
      <button
        type="button"
        class="admin-btn"
        :disabled="state.busy"
        @click="sortRows"
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
        @click="uploadAll"
      >
        R2 にアップロード ({{ targets.length }} 本 /
        {{ formatBytes(totalUploadBytes) }})
      </button>
      <button v-else type="button" class="admin-btn" @click="cancelUpload">
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

.link {
  color: var(--color-accent);
}
</style>
