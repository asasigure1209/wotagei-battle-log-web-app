// イベントの出場プレイヤー (エントリー No. 順)
export default defineEventHandler((event) =>
  listPlayers(
    getRouterParam(event, 'series') ?? '',
    getRouterParam(event, 'event') ?? '',
  ),
)
