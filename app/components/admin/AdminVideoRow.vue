<script setup lang="ts">
// 動画の一覧の 1 行。長さと出演者をその場で直し、並べ替えや取り外しをする。
// 出演者は、登録済みのエントリーから出演者 1 (必須)・出演者 2 (任意) を選ぶ

import { computed } from 'vue'
import { useAdminVideoEditor } from '~/composables/useAdminVideoEditor'
import { formatBytes, formatSeconds } from '~/utils/adminManifest'
import {
  droppedPerformersWarning,
  NO_FIRST_PERFORMER,
  type Performers,
  performerProblems,
} from '~/utils/adminVideos/performers'
import { rowState } from '~/utils/adminVideos/rows'
import type { VideoRow } from '~/utils/adminVideos/state'
import AdminPerformerSelect from './AdminPerformerSelect.vue'

const props = defineProps<{
  /** 動画の行。書き換えはエディターの updateRow を通す */
  row: VideoRow
  /** 一覧の中での位置 (0 から) */
  index: number
}>()

const { state, updateRow, moveRow, removeRow } = useAdminVideoEditor()
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

/**
 * 出演者の警告。同じ人を 2 回選んだ・登録されていない No. は、送る前にその場で出す
 * (出演者 1 をまだ選んでいないのは、足したばかりの行ではいつもなので、登録のときにだけ出す)。
 * 読み込んだときに 3 人目からいた出演者は、登録すると外れるので、登録するまで出し続ける
 */
const performerWarnings = computed(() =>
  [
    ...performerProblems(
      props.row.performers,
      state.entries.map((e) => e.entryNo),
    ).filter((p) => p !== NO_FIRST_PERFORMER),
    droppedPerformersWarning(props.row.droppedPerformers),
  ].filter(Boolean),
)

function setPerformer(slot: 0 | 1, no: number | null) {
  const performers: Performers = [...props.row.performers]
  performers[slot] = no
  updateRow(props.row.id, { performers })
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
      <AdminPerformerSelect
        :model-value="row.performers[0]"
        :label="`${row.relPath} の出演者 1`"
        empty-label="選んでください"
        :entries="state.entries"
        @update:model-value="setPerformer(0, $event)"
      />
    </td>
    <td>
      <AdminPerformerSelect
        :model-value="row.performers[1]"
        :label="`${row.relPath} の出演者 2`"
        empty-label="なし"
        :entries="state.entries"
        @update:model-value="setPerformer(1, $event)"
      />
      <p v-for="w in performerWarnings" :key="w" class="admin-warn warning">
        {{ w }}
      </p>
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

.warning {
  margin-top: 4px;
  white-space: nowrap;
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
