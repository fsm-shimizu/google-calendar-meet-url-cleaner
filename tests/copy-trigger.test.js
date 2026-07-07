const test = require('node:test');
const assert = require('node:assert/strict');

const { isLikelyCopyTrigger } = require('../copy-trigger.js');

function element(attributes = {}, parent = null) {
  return {
    parentElement: parent,
    getAttribute(name) {
      return attributes[name] || '';
    },
    textContent: attributes.textContent || '',
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
  };
}

test('detects Japanese Google Calendar copy controls', () => {
  const button = element({
    matches: 'button',
    'aria-label': 'ビデオ通話のリンクをコピー',
  });

  assert.equal(isLikelyCopyTrigger(button), true);
});

test('detects English Google Calendar copy controls', () => {
  const icon = element(
    { matches: 'span', textContent: '' },
    element({ matches: '[role="button"]', 'data-tooltip': 'Copy conference info' })
  );

  assert.equal(isLikelyCopyTrigger(icon), true);
});

test('does not treat unrelated controls as copy controls', () => {
  const button = element({
    matches: 'button',
    'aria-label': '予定を編集',
  });

  assert.equal(isLikelyCopyTrigger(button), false);
});
