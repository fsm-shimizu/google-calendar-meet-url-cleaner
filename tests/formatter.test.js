const test = require('node:test');
const assert = require('node:assert/strict');

const { formatCalendarMeetInfo } = require('../formatter.js');

test('keeps only title, datetime, and Meet link from Japanese Google Calendar copy text', () => {
  const input = `
テストイベント
7月 8日 (水曜日) · 午後6:00～7:00
タイムゾーン: Asia/Tokyo
Google Meet の参加に必要な情報
ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy
`;

  assert.equal(
    formatCalendarMeetInfo(input),
    [
      'テストイベント',
      '7月 8日 (水曜日) · 午後6:00～7:00',
      'ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy',
    ].join('\n')
  );
});

test('ignores dial-in and tel.meet noise when present', () => {
  const input = `
打ち合わせ
1月 9日 (火曜日) · 午後1:00～2:00
タイムゾーン: Asia/Tokyo
Google Meet の参加に必要な情報
ビデオ通話のリンク: https://meet.google.com/zcx-xxxx-hif
ダイヤルイン: ‪(JP) +81 3-xxxx-xxxx‬ PIN: ‪813 xxx 408 xxxx‬#
その他の電話番号: https://tel.meet/zcx-xxxx-hif?pin=813xxx408xxxx
`;

  assert.equal(
    formatCalendarMeetInfo(input),
    [
      '打ち合わせ',
      '1月 9日 (火曜日) · 午後1:00～2:00',
      'ビデオ通話のリンク: https://meet.google.com/zcx-xxxx-hif',
    ].join('\n')
  );
});

test('finds the event title immediately before the date inside dialog text', () => {
  const input = `
閉じる
編集
削除
テストイベント
7月 8日 (水曜日) · 午後6:00～7:00
ゲスト
ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy
`;

  assert.equal(
    formatCalendarMeetInfo(input),
    [
      'テストイベント',
      '7月 8日 (水曜日) · 午後6:00～7:00',
      'ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy',
    ].join('\n')
  );
});

test('returns null when text has no Meet URL', () => {
  assert.equal(formatCalendarMeetInfo('テストイベント\n7月 8日 (水曜日) · 午後6:00～7:00'), null);
});

test('normalizes Google Calendar list row text to date and time only', () => {
  const input = `
サンプル打ち合わせ
2026年 7月 8日 (水曜日) · 午後2:00～3:00
タイムゾーン: Asia/Tokyo
Google Meet の参加に必要な情報
ビデオ通話のリンク: https://meet.google.com/abc-defg-hij
ダイヤルイン: ‪(JP) +81 3-xxxx-xxxx‬ PIN: ‪123 456 789‬#
その他の電話番号: https://tel.meet/abc-defg-hij?pin=123456789
`;

  assert.equal(
    formatCalendarMeetInfo(input),
    [
      'サンプル打ち合わせ',
      '2026/7/8(水) 14:00-15:00',
      'ビデオ通話のリンク: https://meet.google.com/abc-defg-hij',
    ].join('\n')
  );
});

test('converts Japanese calendar dialog datetime to slash date and 24-hour time', () => {
  const input = `
テストイベント
2026年 7月 8日 (水曜日) · 午後6:00～7:00
ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy
`;

  assert.equal(
    formatCalendarMeetInfo(input),
    [
      'テストイベント',
      '2026/7/8(水) 18:00-19:00',
      'ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy',
    ].join('\n')
  );
});

test('formats Google Calendar visible event dialog text with protocol-less Meet URL', () => {
  const input = `
閉じる
編集
予定を削除
テストイベント
7月 8日 (水曜日)⋅午後6:00～7:00
Google Meet に参加する
meet.google.com/zsh-icpe-kuy
content_copy
会議情報をコピー
`;

  assert.equal(
    formatCalendarMeetInfo(input, { defaultYear: 2026 }),
    [
      'テストイベント',
      '2026/7/8(水) 18:00-19:00',
      'ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy',
    ].join('\n')
  );
});

test('uses default year for Japanese calendar dialog datetime without year', () => {
  const input = `
サンプル定例
7月 10日 (金曜日)⋅午後2:00～3:00
Google Meet に参加する
meet.google.com/vng-nsme-ouq
content_copy
会議情報をコピー
`;

  assert.equal(
    formatCalendarMeetInfo(input, { defaultYear: 2026 }),
    [
      'サンプル定例',
      '2026/7/10(金) 14:00-15:00',
      'ビデオ通話のリンク: https://meet.google.com/vng-nsme-ouq',
    ].join('\n')
  );
});
