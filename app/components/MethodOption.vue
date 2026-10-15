<script setup lang="ts">
defineProps<{
  /** この選択肢が表す保存のしかた。zip は ZIP にまとめる、seq は 1 本ずつ続けて保存する */
  method: 'zip' | 'seq'
  /** ラジオボタンのグループ名。同じグループの選択肢には同じ名前を付ける */
  name: string
}>()

/** 選ばれている保存のしかた */
const model = defineModel<'zip' | 'seq'>()

const copy = {
  zip: {
    title: 'ZIPでまとめて保存',
    description:
      '1つのファイルにまとめてダウンロード。PC・Android におすすめ。',
  },
  seq: {
    title: '1本ずつ続けて保存',
    description:
      '動画ごとに順番に保存。iPhone の写真アプリに入れたい方におすすめ。',
  },
}
</script>

<template>
  <label :class="['method-option', { selected: model === method }]">
    <input
      v-model="model"
      class="radio"
      type="radio"
      :name="name"
      :value="method"
    >
    <span class="text">
      <span class="title">{{ copy[method].title }}</span>
      <span class="description">{{ copy[method].description }}</span>
    </span>
  </label>
</template>

<style scoped>
.method-option {
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: #0f0f14;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: var(--color-text);
  font-family: var(--font-body);
  cursor: pointer;
}

.selected {
  border-color: var(--color-accent);
}

.radio {
  flex: none;
  width: 20px;
  height: 20px;
  margin: 2px 0 0;
  accent-color: var(--color-accent);
}

.text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  font-size: 15px;
  font-weight: 700;
}

.description {
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-muted);
}
</style>
