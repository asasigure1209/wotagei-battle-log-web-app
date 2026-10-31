<script setup lang="ts">
import { computed, useId, useTemplateRef, watchPostEffect } from 'vue'
import AppButton from './AppButton.vue'
import AppIconButton from './AppIconButton.vue'
import AppNotice from './AppNotice.vue'
import AppProgressBar from './AppProgressBar.vue'
import MethodOption, { type Method } from './MethodOption.vue'

const props = withDefaults(
  defineProps<{
    /** 段階。choose は保存のしかたを選ぶ、preparing はダウンロードの準備中 */
    step?: 'choose' | 'preparing'
    /** プレイヤーの名前 */
    playerName: string
    /** ダウンロードする動画の本数 */
    count: number
    /** ダウンロードする動画の合計の容量 */
    totalSize: string
    /** 準備の進み具合 (0〜100。preparing のときに使う) */
    progress: number
    /** 進み具合の詳細 (ZIP なら容量、1 本ずつなら本数。preparing のときに使う) */
    detail: string
    /** 選べなくする保存のしかた */
    disabledMethods?: Method[]
  }>(),
  { step: 'choose', disabledMethods: () => [] },
)

/** 開いているかどうか。閉じるボタン・キャンセルボタン・Esc で閉じると false になる */
const open = defineModel<boolean>('open', { default: false })
/** 選ばれている保存のしかた */
const method = defineModel<Method>('method', { default: 'zip' })

defineEmits<{
  /** ダウンロードを開始するボタンが押されたとき */
  start: []
}>()

// dialog の showModal で開き、背面を操作できなくする・シートにフォーカスを移す・Esc で閉じる、をブラウザに任せる
const dialog = useTemplateRef('dialog')
watchPostEffect(() => {
  if (open.value) dialog.value?.showModal()
  else dialog.value?.close()
})

const titleId = useId()
const methodName = useId()

// 保存のしかたごとの、準備中の見出しと注意
const preparingCopy = {
  zip: {
    title: 'ZIPを作成しています',
    note: '準備ができると、自動でダウンロードが始まります。',
  },
  seq: {
    title: '順番に保存しています',
    note: 'ブラウザに保存の確認が表示されたら「許可」を選んでください。',
  },
}

const title = computed(() =>
  props.step === 'choose'
    ? 'まとめてダウンロード'
    : preparingCopy[method.value].title,
)
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet"
    :aria-labelledby="titleId"
    @close="open = false"
  >
    <div class="bulk-download-sheet">
      <div class="handle" aria-hidden="true" />
      <div class="head">
        <div class="heading">
          <h2 :id="titleId" class="title">
            {{ title }}
          </h2>
          <p class="summary">
            {{ playerName }} ·
            <span class="mono">{{ count }}本 · {{ totalSize }}</span>
          </p>
        </div>
        <AppIconButton
          v-if="step === 'choose'"
          class="close"
          icon="close"
          variant="ghost"
          label="閉じる"
          @click="open = false"
        />
      </div>
      <template v-if="step === 'choose'">
        <fieldset class="methods">
          <legend class="legend">保存のしかた</legend>
          <MethodOption
            v-for="m in ['zip', 'seq'] as const"
            :key="m"
            v-model="method"
            :method="m"
            :name="methodName"
            :disabled="disabledMethods.includes(m)"
          />
        </fieldset>
        <AppNotice
          type="wifi"
          text="Wi-Fi 環境でのダウンロードをおすすめします"
        />
        <AppButton
          label="ダウンロードを開始"
          size="L"
          icon="download"
          full
          @click="$emit('start')"
        />
      </template>
      <template v-else>
        <AppProgressBar
          :value="progress"
          :detail="detail"
          label="ダウンロードの進み具合"
        />
        <AppNotice
          type="caution"
          :text="`${preparingCopy[method].note}\n完了まで、この画面を開いたままにしてください。`"
        />
        <AppButton
          label="キャンセル"
          variant="secondary"
          size="L"
          full
          @click="open = false"
        />
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.sheet {
  width: 100%;
  max-width: 480px;
  /* 画面の下に寄せる */
  margin: auto auto 0;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
}

.sheet::backdrop {
  background: rgb(0 0 0 / 66%);
}

.bulk-download-sheet {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  padding: 10px 20px 28px;
  background: var(--color-surface-raised);
  border-top: 1px solid var(--color-border);
  border-radius: 20px 20px 0 0;
}

.handle {
  align-self: center;
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 22px;
}

.summary {
  margin: 0;
  font-size: 13px;
  color: var(--color-muted);
}

.mono {
  font-family: var(--font-mono);
}

.close {
  margin: -6px -10px 0 0;
}

.methods {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  border: none;
}

.legend {
  margin-bottom: 10px;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-muted);
}
</style>
