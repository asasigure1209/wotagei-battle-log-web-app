<script setup lang="ts">
// 動画の出演者を 1 人選ぶ欄。選択肢は登録済みのエントリー (「No. 名前」)。
// 選んでいる No. が登録済みのエントリーにない (古いデータ) ときは、そのことが分かる選択肢で出す

import { computed } from 'vue'
import { isRegistered, performerOptions } from '~/utils/adminVideos/performers'
import type { Manifest } from '~~/server/db/manifest'

const props = defineProps<{
  /** 欄のアクセシブルな名前 (見出しは表の列名なので、画面には出さない) */
  label: string
  /** 選ばないときの選択肢の文 (「なし」など) */
  emptyLabel: string
  /** 登録済みのエントリー */
  entries: Manifest['entries']
}>()

/** 選んだエントリー No.。選んでいなければ null */
const selected = defineModel<number | null>({ required: true })

const options = computed(() => performerOptions(props.entries, selected.value))
const unregistered = computed(
  () => selected.value !== null && !isRegistered(props.entries, selected.value),
)
</script>

<template>
  <select
    v-model="selected"
    :class="['admin-input', 'performer', { unregistered }]"
    :aria-label="label"
    :aria-invalid="unregistered || undefined"
  >
    <option :value="null">{{ emptyLabel }}</option>
    <option v-for="o in options" :key="o.value" :value="o.value">
      {{ o.label }}
    </option>
  </select>
</template>

<style scoped>
.performer {
  min-width: 140px;
  font-size: 13px;
}

.unregistered {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
</style>
