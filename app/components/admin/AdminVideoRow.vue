<script setup lang="ts">
// 動画の一覧の 1 行。長さと出演 No. をその場で直し、並べ替えや取り外しをする

import { computed } from 'vue'
import { useAdminEditor } from '~/composables/useAdminEditor'
import { rowState } from '~/utils/adminEditor/rows'
import type { VideoRow } from '~/utils/adminEditor/state'
import { formatBytes, formatSeconds } from '~/utils/adminManifest'

const props = defineProps<{
  /** 動画の行。書き換えはエディターの updateRow を通す */
  row: VideoRow
  /** 一覧の中での位置 (0 から) */
  index: number
}>()

const { state, updateRow, moveRow, removeRow } = useAdminEditor()
// 行ごとに出すので、ほかの行が送信中でも、この行は描き直さない
const status = computed(() => rowState(props.row, state.remote))
const last = computed(() => props.index === state.rows.length - 1)
const durationTitle = computed(() =>
  props.row.durationSec === null
    ? '長さが読めませんでした。秒で書いてください'
    : formatSeconds(props.row.durationSec),
)

function onDuration(e: Event) {
  const input = e.target as HTMLInputElement
  updateRow(props.row.id, {
    durationSec: input.value === '' ? null : input.valueAsNumber,
  })
}

function onPerformers(e: Event) {
  updateRow(props.row.id, {
    performersText: (e.target as HTMLInputElement).value,
  })
}
</script>

<template>
  <tr>
    <td class="mono">{{ index + 1 }}</td>
    <td class="mono">{{ row.relPath }}</td>
    <td>
      <input
        :value="row.durationSec"
        class="admin-input num"
        type="number"
        min="0"
        :title="durationTitle"
        @input="onDuration"
      >
    </td>
    <td class="mono">{{ formatBytes(row.sizeBytes) }}</td>
    <td>
      <input
        :value="row.performersText"
        class="admin-input performers"
        placeholder="1, 2"
        @input="onPerformers"
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
          :disabled="state.busy || index === 0"
          @click="moveRow(row.id, -1)"
        >
          ↑
        </button>
        <button
          type="button"
          class="admin-btn"
          aria-label="下へ"
          :disabled="state.busy || last"
          @click="moveRow(row.id, 1)"
        >
          ↓
        </button>
        <button
          type="button"
          class="admin-btn"
          aria-label="外す"
          :disabled="state.busy"
          @click="removeRow(row.id)"
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
  color: var(--color-info);
}

.error {
  color: var(--color-danger);
}
</style>
