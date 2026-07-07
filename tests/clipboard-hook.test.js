const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');

function createBrowserLikeContext() {
  const calls = [];
  const eventListeners = {};

  function Clipboard() {}
  Clipboard.prototype.writeText = function writeText(text) {
    calls.push(String(text));
    return Promise.resolve();
  };

  const listeners = {};
  const clipboard = new Clipboard();
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Clipboard,
    navigator: { clipboard },
    document: {
      body: { innerText: '' },
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
    },
    window: {
      location: { href: 'https://calendar.google.com/calendar/u/0/r/week/2026/7/6', origin: 'https://calendar.google.com' },
      getSelection() {
        return { toString: () => '' };
      },
      getComputedStyle() {
        return { display: 'block', visibility: 'visible' };
      },
      postMessage(message) {
        listeners.message = message;
      },
      addEventListener() {},
    },
  };

  context.globalThis = context;
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.navigator = context.navigator;
  context.window.Clipboard = Clipboard;
  context.window.globalThis = context.window;

  return { context, calls, listeners };
}

function createElement(attributes = {}, parentElement = null) {
  const element = {
    parentElement,
    innerText: attributes.innerText || attributes.textContent || '',
    textContent: attributes.textContent || attributes.innerText || '',
    getAttribute(name) {
      return attributes[name] || '';
    },
    matches(selector) {
      return selector
        .split(',')
        .map((item) => item.trim())
        .some((item) => item === attributes.matches);
    },
    closest(selector) {
      let current = this;
      while (current) {
        if (current.matches(selector)) return current;
        current = current.parentElement;
      }
      return null;
    },
    getBoundingClientRect() {
      return { width: 10, height: 10 };
    },
  };

  return element;
}

function createBrowserContextWithDom() {
  const calls = [];
  const documentListeners = {};
  const windowMessages = [];

  function Clipboard() {}
  Clipboard.prototype.writeText = function writeText(text) {
    calls.push(String(text));
    return Promise.resolve();
  };

  const clipboard = new Clipboard();
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Clipboard,
    navigator: { clipboard },
    document: {
      body: { innerText: '' },
      addEventListener(type, handler) {
        documentListeners[type] = handler;
      },
      querySelectorAll() {
        return [];
      },
    },
    window: {
      location: { href: 'https://calendar.google.com/calendar/u/0/r/week/2026/7/6', origin: 'https://calendar.google.com' },
      getComputedStyle() {
        return { display: 'block', visibility: 'visible' };
      },
      postMessage(message) {
        windowMessages.push(message);
      },
      addEventListener() {},
    },
  };

  context.globalThis = context;
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.navigator = context.navigator;
  context.window.Clipboard = Clipboard;
  context.window.globalThis = context.window;

  return { context, calls, documentListeners, windowMessages };
}

function runScript(context, fileName) {
  const code = fs.readFileSync(path.join(projectRoot, fileName), 'utf8');
  vm.runInNewContext(code, context, { filename: fileName });
}

test('main-world clipboard hook formats Google Calendar writeText payloads', async () => {
  const { context, calls, listeners } = createBrowserLikeContext();
  const input = [
    'テストイベント',
    '7月 8日 (水曜日) · 午後6:00～7:00',
    'タイムゾーン: Asia/Tokyo',
    'Google Meet の参加に必要な情報',
    'ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy',
  ].join('\n');

  runScript(context, 'formatter.js');
  runScript(context, 'page-clipboard-hook.js');

  await context.navigator.clipboard.writeText(input);

  assert.deepEqual(calls, [
    [
      'テストイベント',
      '2026/7/8(水) 18:00-19:00',
      'ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy',
    ].join('\n'),
  ]);
  assert.equal(listeners.message.type, 'meet-url-cleaner:stored');
});

test('main-world clipboard hook uses the clicked Meet copy context when Google Calendar writes only a URL', async () => {
  const { context, calls, documentListeners } = createBrowserContextWithDom();
  const dialog = createElement({
    matches: '[role="dialog"]',
    innerText: [
      '別の打ち合わせ',
      '7月 9日 (木曜日) · 午前10:00～11:00',
      'Google Meet に参加する',
      'meet.google.com/bbb-bbbb-bbb',
      'content_copy',
      '会議情報をコピー',
    ].join('\n'),
  });
  const button = createElement({ matches: 'button', 'aria-label': 'ビデオ通話のリンクをコピー' }, dialog);

  context.document.body.innerText = [
    '別件サンプル定例',
    '2026年 7月 8日 (水曜日) · 午後2:00～3:00',
    'ビデオ通話のリンク: https://meet.google.com/xoq-zmrq-zie',
    dialog.innerText,
  ].join('\n');

  runScript(context, 'formatter.js');
  runScript(context, 'copy-trigger.js');
  runScript(context, 'page-clipboard-hook.js');

  documentListeners.click({ target: button });
  await context.navigator.clipboard.writeText('https://meet.google.com/bbb-bbbb-bbb');

  assert.deepEqual(calls, [
    [
      '別の打ち合わせ',
      '2026/7/9(木) 10:00-11:00',
      'ビデオ通話のリンク: https://meet.google.com/bbb-bbbb-bbb',
    ].join('\n'),
  ]);
});

test('main-world clipboard hook formats execCommand copy events after a Meet copy click', () => {
  const { context, documentListeners } = createBrowserContextWithDom();
  const copied = {};
  const calls = [];
  const dialog = createElement({
    matches: '[role="dialog"]',
    innerText: [
      'テストイベント',
      '7月 8日 (水曜日)⋅午後6:00～7:00',
      'Google Meet に参加する',
      'meet.google.com/zsh-icpe-kuy',
      'content_copy',
      '会議情報をコピー',
    ].join('\n'),
  });
  const button = createElement({ matches: 'button', 'aria-label': 'ビデオ通話のリンクをコピー' }, dialog);

  runScript(context, 'formatter.js');
  runScript(context, 'copy-trigger.js');
  runScript(context, 'page-clipboard-hook.js');

  documentListeners.click({ target: button });
  documentListeners.copy({
    target: button,
    clipboardData: {
      getData() {
        return '';
      },
      setData(type, value) {
        copied[type] = value;
      },
    },
    preventDefault() {
      calls.push('preventDefault');
    },
    stopImmediatePropagation() {
      calls.push('stopImmediatePropagation');
    },
  });

  assert.equal(
    copied['text/plain'],
    [
      'テストイベント',
      '2026/7/8(水) 18:00-19:00',
      'ビデオ通話のリンク: https://meet.google.com/zsh-icpe-kuy',
    ].join('\n')
  );
  assert.deepEqual(calls, ['preventDefault', 'stopImmediatePropagation']);
});
