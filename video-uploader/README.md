# ヲタ芸バトルログの動画ファイルアップロード

撮影した動画を Cloudflare R2 にアップロードし、Web アプリの DB に取り込むデータ (manifest) を書き出す mise タスク集。もとは wotagei-battle-log-video-uploader という別のリポジトリだったものを、Web アプリのリポジトリの `video-uploader/` に移した。

`mise upload` / `mise manifest` は、このディレクトリ (`video-uploader/`) で実行する。リポジトリのルートでは実行できない。

本番に動画をアップロードして、Web アプリで表示を確かめるまでの通しの手順は [docs/production-upload.md](docs/production-upload.md) にまとめている。

## 前提

- [mise](https://mise.jdx.dev/) / ffmpeg (`mise manifest` が動画の長さを調べるのに、同梱の ffprobe を使う) / rclone がインストールされていること
  - Homebrew なら `brew install ffmpeg rclone` で入る
- rclone のリモート `r2-wotagei-battle-log` (Cloudflare R2) が `rclone config` で設定済みであること
  - R2 の API トークンをこのバケットだけに絞っている場合は、`no_check_bucket = true` も設定する。設定しないと、rclone がバケットを作れるか確かめようとして 403 になることがある

    ```bash
    rclone config update r2-wotagei-battle-log no_check_bucket true
    ```

  - 接続は `rclone lsf r2-wotagei-battle-log:wotagei-battle-log` で確かめられる (バケットを絞ったトークンでは、全バケットを一覧する `rclone lsd r2-wotagei-battle-log:` は 403 になるが問題ない)
- 初回は `video-uploader/` で `mise trust` を実行し、このディレクトリの設定を信頼させる (リポジトリのルートの `mise.toml` とは別に信頼させる必要がある)

## 手順

### 1. 動画ファイルを分類してディレクトリに分けて保存する

撮影した動画ファイルを、以下のように`videos`配下に保存する。拡張子は`.mp4`でも`.MP4`でもよい。

動画はエンコードし直さず、撮影したファイルのままアップロードして配る。撮影するときに、圧縮率が高く、配る相手が再生できるフォーマットで撮っておく（HEVC (H.265) は、古い Windows や Android では再生できないことがある）。
- videos/
  - 予選
    - M1256.mp4
    - M1267.mp4
  - 本戦
    - M1268.mp4

### 2. 動画をR2のバケットにアップロードする

`--series`にイベントシリーズID、`--event`にイベントIDを指定する（どちらも必須。英数字と`_` `-`のみ）。

```bash
# すべての動画ファイルをアップロード
mise upload --series elnino --event elnino_vol_5 --all

# 指定した動画ファイルをアップロード
mise upload --series elnino --event elnino_vol_5 --include "本戦/*.mp4"

# 実際には転送せず、対象のファイルだけを確認する
mise upload --series elnino --event elnino_vol_5 --all --dry-run
```

オブジェクトキーは`<イベントシリーズID>/<イベントID>/<videos配下の相対パス>`になる（例: `elnino/elnino_vol_5/予選/M1256.mp4`）。ファイル名は変えないので、`.MP4`のファイルはキーも`.MP4`になり、ダウンロードしたときのファイル名もそのままになる。

### 3. Web アプリの DB に取り込むデータを作る

```bash
mise manifest --series elnino --event elnino_vol_5
```

`videos`配下の動画を調べ、`manifests/<イベントシリーズID>/<イベントID>.yaml`に、Web アプリの DB に取り込むデータの雛形を書き出す。動画ごとのオブジェクトキー・長さ（秒）・サイズ（バイト）は自動で入る。

書き出した YAML に、次を書き込む。
- `series.name` / `event.name` / `event.date`（`YYYY-MM-DD`）/ `event.contact`
- `entries`: エントリー No. と名前（1 行に 1 人。例: `1: BLAZE`）
- 動画ごとの `performers`: 出ているエントリー No.（予選は 1 人で`[1]`、本戦は 2 人で`[1, 2]`）

`videos`の並び順が、イベントの中での動画の No. になる。書き出した直後は分類のディレクトリ順・ファイル名順なので、必要なら並べ替える。

書き込んだ内容を消さないよう、YAML がすでにあるときは書き出さない。作り直すときは`--force`を付ける。書き終えた YAML は、リポジトリのルートで`bun run db:import video-uploader/manifests/<イベントシリーズID>/<イベントID>.yaml`を実行して DB に取り込む（ルートの README.md の「イベントの取り込み」）。

## 開発

スクリプト (`mise-tasks/` 配下) を変えたら、shellcheck でチェックする。shellcheck は `mise.toml` の `[tools]` に入れているので、`mise install` で入る。

```bash
shellcheck mise-tasks/*
```

スクリプトは macOS 標準の bash 3.2 でも動くように書く。たとえば `set -u` の下で空の配列を `"${arr[@]}"` と展開するとエラーになるので、`${arr[@]+"${arr[@]}"}` と書く。
