(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.MeetCopyTrigger = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const COPY_TEXT_RE = /コピー|copy|clipboard|クリップボード|content_copy/i;
  const CONTROL_SELECTOR = [
    'button',
    '[role="button"]',
    '[aria-label]',
    '[data-tooltip]',
    '[data-tooltip-content]',
    '[title]',
  ].join(',');

  function readAttribute(element, name) {
    if (!element || typeof element.getAttribute !== 'function') return '';
    return element.getAttribute(name) || '';
  }

  function controlText(element) {
    if (!element) return '';

    return [
      readAttribute(element, 'aria-label'),
      readAttribute(element, 'data-tooltip'),
      readAttribute(element, 'data-tooltip-content'),
      readAttribute(element, 'title'),
      readAttribute(element, 'data-tooltip-id'),
      element.textContent || '',
    ]
      .join(' ')
      .trim();
  }

  function closestControl(target) {
    if (!target || typeof target.closest !== 'function') return null;
    return target.closest(CONTROL_SELECTOR);
  }

  function isLikelyCopyTrigger(target) {
    const control = closestControl(target);
    return COPY_TEXT_RE.test(controlText(control));
  }

  return {
    isLikelyCopyTrigger,
  };
});
