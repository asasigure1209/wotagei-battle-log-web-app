<script setup lang="ts">
// 動画の一覧。並び順がイベントの中での動画の No. になる
const { state } = useAdminEditor()
</script>

<template>
  <div class="table-wrap">
    <table class="videos">
      <thead>
        <tr>
          <th>No.</th>
          <th>パス</th>
          <th>長さ (秒)</th>
          <th>サイズ</th>
          <th>出演 No.</th>
          <th>R2</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <AdminVideoRow
          v-for="(row, i) in state.rows"
          :key="row.id"
          :row="row"
          :index="i"
          :last="i === state.rows.length - 1"
        />
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
}

.videos {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.videos th {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-muted);
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
}
</style>
