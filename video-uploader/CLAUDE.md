# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in the `video-uploader/` directory.

## 概要

ヲタ芸バトルログの動画を rclone で Cloudflare R2 にアップロードし、Web アプリの DB に取り込む manifest を書き出すための mise タスク集。もとは別リポジトリ (wotagei-battle-log-video-uploader) だったものを、Web アプリのリポジトリの `video-uploader/` に移した。ビルド・テストはなく、実体は `mise-tasks/` 配下の bash スクリプト 2 本 (upload / manifest) のみ。mise タスクは `video-uploader/` で実行する (ここに `mise.toml` があるので `MISE_PROJECT_ROOT` が `video-uploader/` になり、スクリプトはそこへ `cd` する。リポジトリのルートからはタスクが見えない)。前提ツールは mise / ffmpeg (manifest が ffprobe を使う) / rclone で、rclone リモート `r2-wotagei-battle-log` が設定済みであること（詳細は README.md）。

## コマンド

```bash
mise upload --series elnino --event elnino_vol_5 --all --dry-run   # 転送せず対象だけ確認
mise upload --series elnino --event elnino_vol_5 --include "本戦/*.mp4"
mise manifest --series elnino --event elnino_vol_5   # DB に取り込む YAML の雛形を manifests/ に書き出す
shellcheck mise-tasks/*                # スクリプト変更時の静的チェック (shellcheck は mise.toml の [tools] で入る)
```

## 構成と仕組み

- **データの流れ**: `videos/<分類>/*.mp4` → `mise upload` → R2。エンコードはしない (撮影時に圧縮率の高いフォーマットで撮る前提で、撮影したファイルをそのまま配る。以前あった `mise encode` は削除した)。オブジェクトキーは `<シリーズID>/<イベントID>/<videos/ からの相対パス>`（例: `elnino/elnino_vol_5/予選/M1256.mp4`）。シリーズID・イベントIDは `upload` の必須フラグ `--series` / `--event` で指定し、英数字と `_` `-` だけを許可している。ローカルの `videos/` はイベント単位の作業場所で、イベントの階層は持たない。動画本体は `.gitignore` で除外し、`.gitkeep` だけ管理している。
- **mise のファイルタスク**: `mise-tasks/` 内の実行可能ファイルがそのままタスクになる。`#MISE description=...` と `#USAGE flag ...` コメントがタスク定義で、フラグは `usage_<name>` 環境変数（`--dry-run` → `usage_dry_run`、値は `"true"`）としてスクリプトに渡る。タスクを追加する際はファイルに実行権限を付けること。
- **設定値**: R2 のリモート名とバケット名は `mise.toml` の `[env]` (`R2_REMOTE`, `R2_BUCKET`) で定義し、`upload` が参照する。
- **対象ファイルの選び方**: `upload` と `manifest` は同じ方法で対象を選ぶ。`find ... -iname '*.mp4'` で列挙し (カメラが書き出す `.MP4` も拾う)、`upload` は相対パスを bash の `[[ $rel == $pattern ]]` で glob 照合する（`*` は `/` もまたぐので、`本戦/*.mp4` はサブディレクトリにもマッチする）。照合は `shopt -s nocasematch` で大文字・小文字を区別しない。ファイル名は変えないので、`.MP4` はキーも `.MP4` になる (Web アプリはキーの最後の部分をファイル名に使うだけで、拡張子は見ない)。`upload` は rclone の `--include` を使わず、選んだ一覧を `--files-from-raw` で渡している。列挙の方法を変えるときは両方のスクリプトを揃えること。

- **DB に取り込むデータ (manifest)**: `mise manifest` は `videos/` の .mp4 (.MP4 も) を `find | sort` でパス順に並べ、`ffprobe` の長さ (秒に丸める) と `wc -c` のサイズを、Web アプリ (リポジトリのルートの `bun run db:import`、実装は `server/db/manifest.ts` / `server/db/import.ts`) が読む YAML の雛形として `manifests/<シリーズID>/<イベントID>.yaml` に書く。並び順がイベントの中での動画の No. になる。イベント情報・`entries`・`performers` は人が書くので、既存の YAML は `--force` なしでは上書きしない。キーはダブルクオートで書き、`\` と `"` をエスケープしている。YAML の形を変えるときは `db:import` 側も揃えること。

## 注意点

- `upload` は `rclone copy` なので、ローカルで削除したファイルは R2 側から消えない。
- スクリプトは `#!/usr/bin/env bash` で、macOS では標準の bash 3.2 で動く。`set -u` の下で空の配列を `"${arr[@]}"` と展開するとエラーになるので、空になりうる配列は `${arr[@]+"${arr[@]}"}` と書く（`upload` の `dry_run`）。
