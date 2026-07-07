(function () {
  const TOAST_ID = 'meet-url-cleaner-toast';

  function showToast(message) {
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      zIndex: '2147483647',
      padding: '10px 12px',
      borderRadius: '8px',
      background: '#202124',
      color: '#fff',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      font: '13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    });

    document.documentElement.appendChild(toast);
    window.setTimeout(() => toast.remove(), 1800);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'meet-url-cleaner:stored') return;
    if (typeof event.data.text !== 'string') return;

    showToast('Meet情報だけコピーしました');
  });
})();
