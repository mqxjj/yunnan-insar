/* ============================================================
   BOOT · 启动入口 / 视图路由 / 全局 resize
   ============================================================ */
(function () {
  'use strict';
  const APP = window.APP;
  if (!APP) return;

  const VIEWS = ['map', 'regulate', 'insar', 'ai', 'alert', 'building'];
  const fromHash = () => {
    const h = (location.hash || '').replace('#', '').trim();
    return VIEWS.includes(h) ? h : null;
  };

  function start(name) {
    APP.state.view = '';
    APP.go(name || fromHash() || 'map');
  }

  window.addEventListener('hashchange', () => {
    const h = fromHash();
    if (h) APP.go(h);
  });

  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const v = APP.views[APP.state.view];
      if (v && v.resize) v.resize();
    }, 120);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => start());
  } else {
    start();
  }
})();
