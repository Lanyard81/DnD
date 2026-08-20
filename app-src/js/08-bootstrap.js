/* ---------- 8. BOOTSTRAP ---------- */
window.addEventListener('hashchange', () => Router.render());
window.addEventListener('DOMContentLoaded', () => {
  applyTheme(getActiveTheme());
  Router.render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
