<script setup lang="ts">
// 動画の一覧の 1 行。長さと出演 No. をその場で直し、並べ替えや取り外しをする
import { computed } from 'vue'
import type { VideoRow } from '~/utils/adminEditor/state'

const props = defineProps<{
  /** 動画の行 (エディターの状態の中の行。v-model で直接書き換える) */
  row: VideoRow
  /** 一覧の中での位置 (0 から) */
  index: number
  /** 一覧の最後の行か */
  last: boolean
}>()

const editor = useAdminEditor()
const status = computed(() => editor.rowStates.value.get(props.row.id))
const durationTitle = computed(() =>
  props.row.durationSec === null
    ? '長さが読めませんでした。秒で書いてください'
    : formatSeconds(props.row.durationSec),
)
</script>

<template>
  <tr>
    <td class="mono">{{ index + 1 }}</td>
    <td class="mono">{{ row.relPath }}</td>
    <td>
      <input
        v-model.number="row.durationSec"
        class="admin-input num"
        type="number"
        min="0"
        :title="durationTitle"
      >
    </td>
    <td class="mono">{{ formatBytes(row.sizeBytes) }}</td>
    <td>
      <input
        v-model="row.performersText"
        class="admin-input performers"
        placeholder="1, 2"
      >
    </td>
    <td>
      <span :class="['state', status?.kind]">{{ status?.label }}</span>
    </td>
    <td>
      <div class="ops">
        <button
          type="button"
          class="admin-btn"
          aria-label="上へ"
          :disabled="editor.state.busy || index === 0"
          @click="editor.moveRow(row.id, -1)"
        >
          ↑
        </button>
        <button
          type="button"
          class="admin-btn"
          aria-label="下へ"
          :disabled="editor.state.busy || last"
          @click="editor.moveRow(row.id, 1)"
        >
          ↓
        </button>
        <button
          type="button"
          class="admin-btn"
          aria-label="外す"
          :disabled="editor.state.busy"
          @click="editor.removeRow(row.id)"
        >
          ✕
        </button>
      </div>
    </td>
  </tr>
</template>

<style scoped>
td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-line);
  vertical-align: middle;
}

.mono {
  font-family: var(--font-mono);
  white-space: nowrap;
}

.num {
  width: 80px;
}

.performers {
  width: 90px;
}

.ops {
  display: flex;
  gap: 4px;
}

.ops .admin-btn {
  min-height: 32px;
  padding: 0 10px;
}

.state {
  white-space: nowrap;
}

.ok {
  color: var(--color-accent);
}

.pending,
.unknown {
  color: var(--color-muted);
}

.uploading {
  color: #7ad7ff;
}

.error {
  color: #ff7a7a;
}
</style>
