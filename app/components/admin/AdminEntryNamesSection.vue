<script setup lang="ts">
// 2. エントリー: 名前だけを 1 行に 1 人ずつ書く。エントリー No. は書いた順に 1 から付くので、横に No. と名前を並べて見せる

import { useAdminEntriesForm } from '~/composables/useAdminEntriesForm'

const { state, names, selected } = useAdminEntriesForm()
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">2. エントリー</h2>
    <div class="columns">
      <div class="admin-field">
        <label for="admin-entry-names">1 行に 1 人、名前だけを書く</label>
        <textarea
          id="admin-entry-names"
          v-model="state.namesText"
          class="admin-input names"
          rows="12"
          placeholder="BLAZE&#10;しぐれ"
          :disabled="!selected || state.busy"
        />
        <!-- 人数はラベルに入れず、書くたびに読み上げを繰り返さないよう、変わったときだけ控えめに知らせる -->
        <p class="admin-hint" aria-live="polite">{{ names.length }} 人</p>
      </div>
      <div class="table-wrap">
        <table class="numbered" aria-label="エントリー No. と名前">
          <thead>
            <tr>
              <th>No.</th>
              <th>名前</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(name, i) in names" :key="i">
              <td class="no">{{ i + 1 }}</td>
              <td>{{ name }}</td>
            </tr>
            <tr v-if="!names.length">
              <td colspan="2" class="empty">まだ名前がありません</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="admin-warn">
      エントリー No.
      は書いた順に付きます。途中の行を消したり足したりすると、それより後ろのエントリーの
      No. がずれ、動画の出演者もずれた No. の人に付きます (No. はダウンロードの
      URL
      <code>/players/&lt;No.&gt;</code>
      にも入ります)。直すのは名前だけにし、エントリーを足すときは最後に書いてください。
    </p>
  </section>
</template>

<style scoped>
.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  align-items: start;
}

.names {
  padding: 10px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.table-wrap {
  max-height: 320px;
  overflow: auto;
}

.numbered {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.numbered th {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.numbered td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--color-border);
}

.empty {
  color: var(--color-muted);
}

.no {
  width: 3em;
  color: var(--color-muted);
  font-family: var(--font-mono);
  text-align: right;
}
</style>
