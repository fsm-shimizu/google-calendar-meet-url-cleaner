(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.MeetInfoFormatter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CONTROL_CHARS_RE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
  const MEET_URL_RE = /(?:https:\/\/)?meet\.google\.com\/[A-Za-z0-9-]+(?:\?[^\s"'<>]*)?/i;
  const JAPANESE_DATE_RE = /(?:(?:\d{4}\s*年)\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日(?:\s*\([^)]+\))?/;
  const JAPANESE_DATE_PARTS_RE = /(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日/;
  const JAPANESE_TIME_RANGE_RE =
    /(?:午前|午後)?\s*\d{1,2}(?::\d{2}|時(?:\d{1,2}分?)?)?\s*[~～〜-]\s*(?:(?:午前|午後)\s*)?\d{1,2}(?::\d{2}|時(?:\d{1,2}分?)?)?/;
  const JAPANESE_TIME_RANGE_PARTS_RE =
    /(午前|午後)?\s*(\d{1,2})(?::(\d{2})|時(?:(\d{1,2})分?)?)?\s*[~～〜-]\s*(?:(午前|午後)\s*)?(\d{1,2})(?::(\d{2})|時(?:(\d{1,2})分?)?)?/;
  const JAPANESE_WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

  const EXACT_NOISE_LINES = new Set([
    '閉じる',
    '編集',
    '削除',
    '保存',
    'ゲスト',
    'コピー',
    'その他のオプション',
    'Google Meet に参加する',
    'Join with Google Meet',
    'Join Google Meet',
  ]);

  function normalizeText(value) {
    return String(value || '')
      .replace(CONTROL_CHARS_RE, '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ');
  }

  function toLines(value) {
    return normalizeText(value)
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  function stripUrlSuffix(url) {
    return url.replace(/[)\]}>、。，．,.;:]+$/u, '');
  }

  function normalizeMeetUrl(url) {
    const stripped = stripUrlSuffix(url);
    return /^https:\/\//i.test(stripped) ? stripped : `https://${stripped}`;
  }

  function findMeetUrl(lines, normalizedText) {
    const labelledLine = lines.find((line) => {
      return (
        MEET_URL_RE.test(line) &&
        /ビデオ通話のリンク|Video call link|Meet link|Google Meet/i.test(line)
      );
    });

    const match = (labelledLine || normalizedText).match(MEET_URL_RE);
    return match ? normalizeMeetUrl(match[0]) : null;
  }

  function isDateTimeLine(line) {
    const hasJapaneseDate = /\d{1,2}\s*月\s*\d{1,2}\s*日/.test(line);
    const hasEnglishDate = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/i.test(line);
    const hasTime = /(?:午前|午後|AM|PM|\b\d{1,2}:\d{2}\b)/i.test(line);
    const hasRange = /[~～〜-]| to /i.test(line);

    return (hasJapaneseDate || hasEnglishDate) && hasTime && hasRange;
  }

  function normalizeJapaneseDateTimeLine(line, options = {}) {
    const dateMatch = line.match(JAPANESE_DATE_RE);
    const timeMatch = line.match(JAPANESE_TIME_RANGE_RE);

    if (!dateMatch || !timeMatch) return line;

    const hasExtraCalendarMetadata =
      /、/.test(line) || MEET_URL_RE.test(line) || /場所\s*:/.test(line) || /承諾|辞退|未定/.test(line);

    if (!hasExtraCalendarMetadata) return convertJapaneseDateTimeLine(line, options) || line;

    return convertJapaneseDateTimeLine(`${dateMatch[0]} ${timeMatch[0]}`, options) || `${dateMatch[0]} ${timeMatch[0]}`.replace(/\s+/g, ' ').trim();
  }

  function to24Hour(period, hour) {
    const numericHour = Number(hour);

    if (period === '午前') {
      return numericHour === 12 ? 0 : numericHour;
    }

    if (period === '午後') {
      return numericHour === 12 ? 12 : numericHour + 12;
    }

    return numericHour;
  }

  function formatTime(period, hour, minute) {
    return `${String(to24Hour(period, hour)).padStart(2, '0')}:${String(Number(minute || 0)).padStart(2, '0')}`;
  }

  function weekdayForDate(year, month, day) {
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return JAPANESE_WEEKDAYS[date.getDay()];
  }

  function convertJapaneseDateTimeLine(line, options = {}) {
    const dateParts = line.match(JAPANESE_DATE_PARTS_RE);
    const timeParts = line.match(JAPANESE_TIME_RANGE_PARTS_RE);

    if (!dateParts || !timeParts) return null;

    const [, year, month, day] = dateParts;
    const resolvedYear = year || options.defaultYear;
    if (!resolvedYear) return null;

    const [, startPeriod, startHour, startMinuteColon, startMinuteKanji, endPeriodRaw, endHour, endMinuteColon, endMinuteKanji] =
      timeParts;
    const endPeriod = endPeriodRaw || startPeriod;
    const startMinute = startMinuteColon || startMinuteKanji || '0';
    const endMinute = endMinuteColon || endMinuteKanji || '0';

    return `${Number(resolvedYear)}/${Number(month)}/${Number(day)}(${weekdayForDate(resolvedYear, month, day)}) ${formatTime(startPeriod, startHour, startMinute)}-${formatTime(
      endPeriod,
      endHour,
      endMinute
    )}`;
  }

  function isNoiseLine(line) {
    if (!line) return true;
    if (EXACT_NOISE_LINES.has(line)) return true;
    if (MEET_URL_RE.test(line)) return true;
    if (isDateTimeLine(line)) return true;
    if (/^タイムゾーン\s*:/i.test(line)) return true;
    if (/^Time zone\s*:/i.test(line)) return true;
    if (/Google Meet の参加に必要な情報/i.test(line)) return true;
    if (/Google Meet joining info/i.test(line)) return true;
    if (/^ビデオ通話のリンク\s*:/i.test(line)) return true;
    if (/^Video call link\s*:/i.test(line)) return true;
    if (/^ダイヤルイン\s*:/i.test(line)) return true;
    if (/^Dial[- ]?in\s*:/i.test(line)) return true;
    if (/^その他の電話番号\s*:/i.test(line)) return true;
    if (/^More phone numbers\s*:/i.test(line)) return true;
    if (/^https?:\/\//i.test(line)) return true;

    return false;
  }

  function findTitle(lines, dateIndex) {
    if (dateIndex > 0) {
      for (let index = dateIndex - 1; index >= 0; index -= 1) {
        const line = lines[index];
        if (!isNoiseLine(line)) return line;
      }
    }

    return lines.find((line) => !isNoiseLine(line)) || null;
  }

  function formatCalendarMeetInfo(value, options = {}) {
    const normalizedText = normalizeText(value);
    const lines = toLines(normalizedText);
    const meetUrl = findMeetUrl(lines, normalizedText);

    if (!meetUrl) return null;

    const dateIndex = lines.findIndex(isDateTimeLine);
    if (dateIndex === -1) return null;

    const title = findTitle(lines, dateIndex);
    if (!title) return null;

    return [title, normalizeJapaneseDateTimeLine(lines[dateIndex], options), `ビデオ通話のリンク: ${meetUrl}`].join('\n');
  }

  return {
    formatCalendarMeetInfo,
    normalizeText,
    toLines,
  };
});
