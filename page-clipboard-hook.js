(function () {
  const formatter = globalThis.MeetInfoFormatter || (window && window.MeetInfoFormatter);
  const copyTrigger = globalThis.MeetCopyTrigger || (window && window.MeetCopyTrigger);

  if (!formatter || globalThis.__meetCopyCleanerHooked) return;

  globalThis.__meetCopyCleanerHooked = true;
  const MEET_URL_RE = /(?:https:\/\/)?meet\.google\.com\/[A-Za-z0-9-]+(?:\?[^\s"'<>]*)?/i;
  const COPY_CONTEXT_TTL_MS = 1500;
  const CONTEXT_SELECTORS = [
    '[role="dialog"]',
    '[aria-modal="true"]',
    '[data-eventid]',
    '[data-eventchip]',
  ];
  let lastCopyContext = null;

  function notifyStored(text, source) {
    if (!window || typeof window.postMessage !== 'function') return;

    window.postMessage(
      {
        type: 'meet-url-cleaner:stored',
        text,
        source,
      },
      window.location.origin
    );
  }

  function elementIsVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function visibleText(element) {
    return (element.innerText || element.textContent || '').trim();
  }

  function extractMeetUrl(text) {
    const match = String(text || '').match(MEET_URL_RE);
    if (!match) return null;

    const stripped = match[0].replace(/[)\]}>、。，．,.;:]+$/u, '');
    return /^https:\/\//i.test(stripped) ? stripped : `https://${stripped}`;
  }

  function meetUrlKey(text) {
    return String(text || '').replace(/^https:\/\//i, '');
  }

  function textIncludesMeetUrl(text, meetUrl) {
    if (!meetUrl) return true;
    return text.includes(meetUrl) || text.includes(meetUrlKey(meetUrl));
  }

  function inferDefaultYear() {
    const urlMatch = String((window.location && window.location.href) || '').match(/\/(?:week|day|month|agenda|schedule)\/(\d{4})\b/);
    if (urlMatch) return Number(urlMatch[1]);

    const titleMatch = String(document.title || '').match(/(\d{4})\s*年/);
    if (titleMatch) return Number(titleMatch[1]);

    const bodyMatch = String((document.body && document.body.innerText) || '').match(/(\d{4})\s*年/);
    return bodyMatch ? Number(bodyMatch[1]) : undefined;
  }

  function uniquePush(items, value) {
    const text = String(value || '').trim();
    if (!text || items.includes(text)) return;
    items.push(text);
  }

  function collectCopyContextTexts(target) {
    const texts = [];

    for (const selector of CONTEXT_SELECTORS) {
      const container = target && typeof target.closest === 'function' ? target.closest(selector) : null;
      if (container && elementIsVisible(container)) {
        uniquePush(texts, visibleText(container));
      }
    }

    let current = target && target.parentElement;
    for (let depth = 0; current && current !== document.body && depth < 8; depth += 1) {
      if (elementIsVisible(current)) {
        const text = visibleText(current);
        if (text.includes('meet.google.com')) {
          uniquePush(texts, text);
        }
      }
      current = current.parentElement;
    }

    return texts.sort((a, b) => a.length - b.length);
  }

  function rememberCopyContext(event) {
    if (!copyTrigger || !copyTrigger.isLikelyCopyTrigger(event && event.target)) return;

    const texts = collectCopyContextTexts(event.target);
    if (!texts.length) return;

    lastCopyContext = {
      createdAt: Date.now(),
      texts,
    };
  }

  function recentCopyContextTexts(meetUrl) {
    if (!lastCopyContext || Date.now() - lastCopyContext.createdAt > COPY_CONTEXT_TTL_MS) {
      return [];
    }

    if (!meetUrl) return lastCopyContext.texts;

    return lastCopyContext.texts.filter((text) => textIncludesMeetUrl(text, meetUrl));
  }

  function formatCandidates(candidates) {
    const options = { defaultYear: inferDefaultYear() };

    for (const candidate of candidates) {
      const formatted = formatter.formatCalendarMeetInfo(candidate, options);
      if (formatted) return formatted;
    }

    return null;
  }

  function getDialogTexts() {
    const selectors = ['[role="dialog"]', '[aria-modal="true"]', '[data-eventid]', '[data-eventchip]'];

    return Array.from(document.querySelectorAll(selectors.join(',')))
      .filter(elementIsVisible)
      .map(visibleText)
      .filter((text) => text.includes('meet.google.com'))
      .sort((a, b) => a.length - b.length);
  }

  function makeFormatted(preferredText) {
    const candidates = [];
    const preferredUrl = extractMeetUrl(preferredText);

    uniquePush(candidates, preferredText);

    for (const text of recentCopyContextTexts(preferredUrl)) {
      uniquePush(candidates, text);
    }

    for (const text of getDialogTexts()) {
      if (textIncludesMeetUrl(text, preferredUrl)) {
        uniquePush(candidates, text);
      }
    }

    return formatCandidates(candidates);
  }

  function clipboardEventText(event) {
    if (!event || !event.clipboardData || typeof event.clipboardData.getData !== 'function') {
      return '';
    }

    return event.clipboardData.getData('text/plain') || event.clipboardData.getData('Text') || '';
  }

  function writeCopyEventText(event, text) {
    if (!event || !event.clipboardData || typeof event.clipboardData.setData !== 'function') {
      return false;
    }

    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    event.clipboardData.setData('text/plain', text);
    notifyStored(text, 'page-copy-event');
    return true;
  }

  function handleCopyEvent(event) {
    const copiedText = clipboardEventText(event);
    const contextTexts = recentCopyContextTexts(extractMeetUrl(copiedText));
    if (!contextTexts.length) return;

    const formatted = copiedText.includes('meet.google.com') ? makeFormatted(copiedText) : formatCandidates(contextTexts);
    if (!formatted) return;

    writeCopyEventText(event, formatted);
  }

  document.addEventListener('click', rememberCopyContext, true);
  document.addEventListener('copy', handleCopyEvent, true);

  if (typeof Clipboard === 'function' && Clipboard.prototype && Clipboard.prototype.writeText) {
    const originalWriteText = Clipboard.prototype.writeText;

    Clipboard.prototype.writeText = function writeText(text) {
      const originalText = String(text || '');
      const formatted = originalText.includes('meet.google.com') ? makeFormatted(originalText) : null;

      if (formatted) {
        notifyStored(formatted, 'page-clipboard-write');
        return originalWriteText.call(this, formatted);
      }

      return originalWriteText.call(this, text);
    };
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);

    navigator.clipboard.writeText = function writeText(text) {
      const originalText = String(text || '');
      const formatted = originalText.includes('meet.google.com') ? makeFormatted(originalText) : null;

      if (formatted) {
        notifyStored(formatted, 'page-clipboard-write');
        return originalWriteText(formatted);
      }

      return originalWriteText(text);
    };
  }
})();
