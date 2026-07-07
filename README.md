# Google Calendar Meet URL Cleaner

Google カレンダーでコピーされる予定情報を、予定名・日時・Google Meet URL だけに整形する Chrome 拡張です。

この拡張は Google カレンダー上の Meet コピーアイコン操作を対象にしています。Google カレンダー上のテキストをローカル（ブラウザ内）で処理し、外部サーバーへ送信しません。

## What It Does

Google カレンダーから下記のような内容がコピーされる場合:

```text
サンプル打ち合わせ
2026年 7月 8日 (水曜日) · 午後2:00～3:00
タイムゾーン: Asia/Tokyo
Google Meet の参加に必要な情報
ビデオ通話のリンク: https://meet.google.com/abc-defg-hij
ダイヤルイン: ‪(JP) +81 3-xxxx-xxxx‬ PIN: ‪123 456 789‬#
その他の電話番号: https://tel.meet/abc-defg-hij?pin=123456789
```

クリップボードには下記だけを保存します。

```text
サンプル打ち合わせ
2026/7/8(水) 14:00-15:00
ビデオ通話のリンク: https://meet.google.com/abc-defg-hij
```

## Features

- Google カレンダーの予定名、日時、Google Meet URL だけを残します。
- Google カレンダーの Meet コピーアイコンを押したときに動作します。
- 年が取得できる場合、日時を `2026/7/8(水) 14:00-15:00` の形式に変換します。
- タイムゾーン、参加情報、ダイヤルイン、電話番号、参加者情報などの余計な行を落とします。
- 予定名はコピー元の内容をそのまま使います。

## What It Does Not Do

- 外部サーバーへ予定情報や Meet URL を送信しません。
- OS 全体のクリップボードを常時監視しません。
- Google カレンダー以外のページでは動作しません。
- 拡張ボタンからの手動コピー、選択コピー、キーボードショートカットでの整形コピー機能はありません。
- 予定名に含まれる任意の補足情報を自動で削除しません。

## Privacy And Security

- 処理はブラウザ内で完結します。
- この拡張は Google カレンダー上の表示テキストをローカル（ブラウザ内）で処理し、整形した文字列をクリップボードへ書き込みます。
- 外部通信、外部API呼び出し、計測タグ、広告タグはありません。
- ソースコード内にAPIキー、トークン、シークレットは含まれていません。
- Google カレンダー上の Meet コピーアイコン操作時に、元のコピー内容を整形後の文字列へ書き換えます。

## Install

1. [Releases](https://github.com/fsm-shimizu/google-calendar-meet-url-cleaner/releases) から `google-calendar-meet-url-cleaner.zip` をダウンロードする。
2. ZIP を展開する。
3. Chrome で `chrome://extensions/` を開く。
4. 右上の「デベロッパー モード」をオンにする。
5. 「パッケージ化されていない拡張機能を読み込む」を押す。
6. `manifest.json` が入っている `google-calendar-meet-url-cleaner` フォルダを選ぶ。
7. Google カレンダーのタブを再読み込みする。

## Usage

1. Google カレンダーで対象の予定を開く。
2. Meet リンク周辺のコピーアイコンを押す。
3. 右下に「Meet情報だけコピーしました」と表示されることを確認する。
4. 貼り付け先に貼り付ける。

## Update

1. [Releases](https://github.com/fsm-shimizu/google-calendar-meet-url-cleaner/releases) から新しい ZIP をダウンロードする。
2. ZIP を展開し、古いフォルダを新しいフォルダで置き換える。
3. `chrome://extensions/` でこの拡張のリロードボタンを押す。
4. Google カレンダーのタブを再読み込みする。

## Permissions

- `https://calendar.google.com/*`: Google カレンダー上でコピー操作と表示テキストを処理するために使います。

この拡張は `clipboardWrite`、`activeTab`、`storage`、`contextMenus` などの追加権限を要求しません。

## Development

Run tests:

```sh
npm test
```

Run syntax checks:

```sh
npm run check
```

Create a release ZIP:

```sh
npm run package
```

The release ZIP includes only the extension files, README, and license. Tests and development metadata are not included.

## Troubleshooting

コピー内容が変わらない場合:

1. `chrome://extensions/` で拡張をリロードする。
2. Google カレンダーのタブを再読み込みする。
3. 拡張のバージョンが最新になっているか確認する。
4. 予定詳細を開いた状態で、Meet リンク周辺のコピーアイコンを押す。

コピー内容が想定と違う場合:

- Google カレンダーの表示形式が変わっている可能性があります。
- 実際にコピーされた文字列をもとに `tests/formatter.test.js` にケースを追加し、`formatter.js` を調整してください。

## Limitations

- Google カレンダーの画面構造やコピー形式が変わると、抽出ロジックの調整が必要になる場合があります。
- この拡張は Google カレンダー上のコピー操作を対象にしています。OS 全体のクリップボードは常時監視しません。
- 予定名はそのまま残すため、貼り付け前に機密情報が含まれていないか確認してください。

## License

MIT
