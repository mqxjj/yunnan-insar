/* ============================================================
   CORE · 工具、导航、弹窗、图表主题
   ============================================================ */
(function () {
  'use strict';
  const APP = window.APP = {};
  const $ = APP.$ = (s, r = document) => r.querySelector(s);
  const $$ = APP.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  APP.state = {
    view: 'map',
    month: 11,
    playing: false,
    buildingId: 'B001',
    aiBuildingId: 'B001',
    alertId: 'YJ-2026-0803-001',
    regTab: 'pit',
    rain: false,
    district: 'all',
    risk: 'all',
    type: 'all',
    layers: { heat: true, buildings: true, boxes: true, districts: true, labels: true, cim: false, pits: true, metro: true, dangerous: true },
    orbit: 'asc',
    insarMode: 'vertical',
    coherence: 0.6,
    selectedPoint: null,
    selectedAlertId: 'YJ-2026-0803-001',
    alertKpi: { pending: 23, doing: 15, fixed: 67, avg: 4.2 },
    alertFilter: { type: 'all', level: 'all', status: 'all' }
  };

  APP.building = id => window.BUILDINGS.find(b => b.id === id) || window.BUILDINGS[0];
  APP.site = id => (window.PITS || []).find(s => s.id === id)
    || (window.METRO ? window.METRO.segments.find(s => s.id === id) : null)
    || (window.DANGER_HOUSES || []).find(s => s.id === id);
  APP.alert = id => window.ALERTS.find(a => a.id === id) || window.ALERTS[0];
  APP.riskColor = r => (window.RISK_META[r] || window.RISK_META.green).color;
  APP.riskLabel = r => (window.RISK_META[r] || window.RISK_META.green).label;

  APP.fmt = (n, d = 1) => Number(n).toFixed(d).replace(/\.0$/, '');
  APP.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  APP.icon = (id, cls = '') => `<svg class="${cls}"><use href="#${id}"></use></svg>`;

  APP.velColor = v => {
    if (v >= 0) return '#38d9ff';
    if (v > -5) return '#2ecc71';
    if (v > -10) return '#7ee787';
    if (v > -20) return '#ffb020';
    if (v > -30) return '#ff6b35';
    return '#ff2d55';
  };

  APP.seed = function (s) {
    let a = s >>> 0;
    return function () {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------------------------- toast ---------------------------- */
  APP.toast = function (msg, type = 'info', title = '') {
    const wrap = $('#toastWrap');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { ok: 'i-check', warn: 'i-alert', err: 'i-close', info: 'i-target' };
    el.innerHTML = `<span class="t-ico">${APP.icon(icons[type] || 'i-target')}</span>
      <div>${title ? `<b>${APP.esc(title)}</b>` : ''}${APP.esc(msg)}</div>`;
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 280); }, 3200);
  };

  /* ---------------------------- modal ---------------------------- */
  let openModals = [];
  APP.modal = function ({ title, sub = '', icon = 'i-file', body = '', footer = '', wide = false, onMount }) {
    const root = $('#modalRoot');
    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog">
      <div class="modal-hd">
        <span class="mh-ico">${APP.icon(icon)}</span>
        <h3>${title}</h3>${sub ? `<em>${sub}</em>` : ''}
        <button class="modal-close" aria-label="关闭">${APP.icon('i-close')}</button>
      </div>
      <div class="modal-bd">${body}</div>
      ${footer ? `<div class="modal-ft">${footer}</div>` : ''}
    </div>`;
    root.appendChild(mask);
    openModals.push(mask);
    const close = () => {
      mask.style.opacity = '0';
      mask.style.transition = '.18s';
      setTimeout(() => mask.remove(), 180);
      openModals = openModals.filter(m => m !== mask);
    };
    mask.querySelector('.modal-close').onclick = close;
    mask.addEventListener('mousedown', e => { if (e.target === mask) close(); });
    APP.lastModalClose = close;
    if (onMount) onMount(mask.querySelector('.modal-bd'), close);
    return { close, el: mask, body: mask.querySelector('.modal-bd') };
  };
  APP.closeModals = function () {
    $$('.modal-mask').forEach(m => m.remove());
    openModals = [];
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') APP.closeModals();
  });

  /* ---------------------------- charts ---------------------------- */
  APP.charts = {};
  APP.chart = function (id) {
    const el = document.getElementById(id);
    if (!el) return null;
    let inst = echarts.getInstanceByDom(el);
    if (!inst) inst = echarts.init(el, null, { renderer: 'canvas' });
    return inst;
  };
  APP.chartTheme = {
    textStyle: { fontFamily: 'Microsoft YaHei, sans-serif', color: '#8aa6bd' },
    color: ['#38d9ff', '#ff8a1f', '#ff3b5c', '#22d67d', '#a78bfa', '#ffc53d'],
    tooltip: {
      backgroundColor: 'rgba(5,20,37,.97)',
      borderColor: 'rgba(56,196,255,.38)',
      borderWidth: 1,
      padding: [7, 10],
      textStyle: { color: '#e2f5ff', fontSize: 10 },
      extraCssText: 'box-shadow:0 10px 30px rgba(0,0,0,.55);border-radius:4px;'
    }
  };
  APP.axis = function (extra = {}) {
    return Object.assign({
      axisLine: { lineStyle: { color: 'rgba(92,150,196,.22)' } },
      axisTick: { show: false },
      axisLabel: { color: '#6d8ba4', fontSize: 9, fontFamily: 'Bahnschrift, Microsoft YaHei' },
      splitLine: { lineStyle: { color: 'rgba(86,150,200,.09)', type: 'dashed' } }
    }, extra);
  };
  APP.grid = { left: 38, right: 12, top: 18, bottom: 24, containLabel: false };

  /* ---------------------------- views ---------------------------- */
  APP.views = {};
  APP.registerView = function (name, obj) { APP.views[name] = obj; };

  APP.go = function (name, opts = {}) {
    if (APP.state.view === name) {
      const v = APP.views[name];
      if (v && v.resize) setTimeout(v.resize, 20);
      return;
    }
    $$('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + name));
    $$('#mainNav .nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === name));
    APP.state.view = name;
    const v = APP.views[name];
    if (v) {
      if (!v.inited) { v.inited = true; setTimeout(() => { v.init(); if (v.resize) v.resize(); }, 40); }
      else setTimeout(() => v.resize && v.resize(), 40);
    }
    APP.closeModals();
    if (name !== 'map') APP.hideBuildingPreview && APP.hideBuildingPreview();
  };

  $$('#mainNav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => APP.go(btn.dataset.view));
  });
  $('#notifyBtn').addEventListener('click', () => APP.go('alert'));
  $$('[data-collapse]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.closest('.panel');
      p.classList.toggle('collapsed');
    });
  });

  /* ---------------------------- province ---------------------------- */
  APP.provinceModal = function () {
    const cities = window.PROVINCE_CITIES;
    const total = cities.reduce((s, c) => s + c.total, 0);
    const red = cities.reduce((s, c) => s + c.red, 0);
    const orange = cities.reduce((s, c) => s + c.orange, 0);
    const yellow = cities.reduce((s, c) => s + c.yellow, 0);
    const rows = cities.map(c => `<tr data-city="${c.name}" class="${c.current ? 'current' : ''}">
      <td class="pc-name">${c.name}${c.current ? ' <span style="font-size:8px;color:#38d9ff">当前</span>' : ''}</td>
      <td class="nums">${c.total.toLocaleString()}</td>
      <td class="nums" style="color:#ff7086">${c.red}</td>
      <td class="nums" style="color:#ffa34d">${c.orange}</td>
      <td class="nums" style="color:#ffd469">${c.yellow}</td>
    </tr>`).join('');
    APP.modal({
      title: '云南省 · 州市监测态势', sub: 'YUNNAN PROVINCE', icon: 'i-hex', wide: true,
      body: `<div class="province-summary">
        <div><span>全省监测建筑</span><b>${total.toLocaleString()}<small>栋</small></b></div>
        <div><span>红色预警</span><b style="color:#ff7086">${red}<small>栋</small></b></div>
        <div><span>橙色预警</span><b style="color:#ffa34d">${orange}<small>栋</small></b></div>
        <div><span>黄色预警</span><b style="color:#ffd469">${yellow}<small>栋</small></b></div>
      </div>
      <table class="province-table"><thead><tr><th>州市</th><th class="nums">监测建筑</th><th class="nums">红色</th><th class="nums">橙色</th><th class="nums">黄色</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="margin-top:12px;font-size:9px;color:#4d647a">注：州市数据为示例汇总，本期演示聚焦昆明市主城区。</div>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button><button class="btn btn-primary" data-km>进入昆明市一张图</button>`,
      onMount: (body, close) => {
        body.querySelector('[data-close]').onclick = close;
        body.querySelector('[data-km]').onclick = () => { close(); APP.go('map'); };
        $$('tr[data-city]', body).forEach(tr => {
          tr.onclick = () => {
            if (tr.dataset.city === '昆明市') { close(); APP.go('map'); }
            else { APP.toast(`已切换至 ${tr.dataset.city} 演示视图（示例）`, 'info', '全省态势'); close(); }
          };
        });
      }
    });
  };
  $('#scopeBtn').addEventListener('click', APP.provinceModal);

  /* ---------------------------- clock ---------------------------- */
  (function clock() {
    const t = $('#clockTime'), d = $('#clockDate');
    if (!t) return;
    let base = new Date(2026, 7, 3, 10, 24, 36);
    const tick = () => {
      base = new Date(base.getTime() + 1000);
      const p = n => String(n).padStart(2, '0');
      t.textContent = `${p(base.getHours())}:${p(base.getMinutes())}:${p(base.getSeconds())}`;
      d.textContent = `2026-08-03 周一`;
    };
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------------------------- sparkline ---------------------------- */
  APP.sparkline = function (values, color = '#38d9ff', w = 262, h = 40, fill = true) {
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => [i / (values.length - 1) * (w - 10) + 5, h - 5 - (v - min) / span * (h - 12)]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
    const last = pts[pts.length - 1];
    const gid = 'spk' + Math.random().toString(36).slice(2, 8);
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:100%;overflow:visible">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      ${fill ? `<path d="${area}" fill="url(#${gid})" opacity=".8"/>` : ''}
      <path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="#fff" stroke="${color}" stroke-width="1.4"/>
    </svg>`;
  };

  /* ---------------------------- series helpers ---------------------------- */
  APP.buildingRates = function (b) {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const f = 0.56 + 0.44 * Math.pow(i / 11, 1.32);
      const noise = Math.sin(i * 1.73 + b.name.length) * 0.55 + Math.cos(i * .71) * 0.28;
      out.push(+(b.rate * f + noise).toFixed(2));
    }
    out[11] = b.rate;
    return out;
  };
  APP.buildingCumulative = function (b) {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const f = Math.pow(i / 11, 1.28);
      out.push(+(b.cumulative * f).toFixed(2));
    }
    out[11] = b.cumulative;
    return out;
  };
  APP.aiSeries = function (b) {
    const H = window.AI_HISTORY.length;
    const hist = [];
    for (let i = 0; i < H; i++) {
      const f = Math.pow(i / (H - 1), 1.32);
      hist.push(+(b.cumulative * f + Math.sin(i * .9) * .18).toFixed(2));
    }
    hist[H - 1] = b.cumulative;
    const fc = [];
    let cur = b.cumulative;
    for (let k = 1; k <= 6; k++) {
      cur -= (Math.abs(b.rate) / 12) * (1 + .055 * k);
      fc.push(+cur.toFixed(2));
    }
    const lower = [hist[H - 1]], upper = [hist[H - 1]];
    fc.forEach((v, k) => {
      const w = 0.9 + k * 0.75;
      lower.push(+(v - w).toFixed(2));
      upper.push(+(v + w).toFixed(2));
    });
    let cross = '已超阈值';
    const ti = fc.findIndex(v => v <= -25);
    if (ti >= 0) cross = window.AI_FORECAST[ti];
    const move = +(fc[fc.length - 1] - b.cumulative).toFixed(1);
    return { hist, fc, lower, upper, cross, move };
  };

  APP.axisValue = function (v) { return (+v).toFixed(1).replace(/\.0$/, ''); };



  /* expose */
  APP.$ = $;
  APP.$$ = $$;
})();
