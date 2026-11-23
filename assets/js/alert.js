/* ============================================================
   VIEW · 预警处置（闭环流程 / 工单 / 位置分布）
   ============================================================ */
(function () {
  'use strict';
  const APP = window.APP, $ = APP.$, $$ = APP.$$, state = APP.state;

  const STATUS_CLASS = {
    '待核查': 's-wait', '已派单': 's-dispatch', '核查中': 's-doing',
    '已整改': 's-fixed', '待销号': 's-closing', '已销号': 's-done'
  };
  const PROGRESS = { '待核查': 1, '已派单': 2, '核查中': 2, '已整改': 4, '待销号': 4, '已销号': 5 };
  const NEXT = {
    '待核查': { label: '派发处置单', next: '已派单', icon: 'i-send' },
    '已派单': { label: '开始现场核查', next: '核查中', icon: 'i-locate' },
    '核查中': { label: '提交核查结果', next: '已整改', icon: 'i-file' },
    '已整改': { label: '提交销号申请', next: '待销号', icon: 'i-check' },
    '待销号': { label: '复核销号', next: '已销号', icon: 'i-check' },
    '已销号': { label: '已归档', next: null, icon: 'i-database' }
  };
  const STEPS = [
    { name: '预警生成', desc: 'AI 模型识别沉降异常并自动分级' },
    { name: '智能派单', desc: '按属地与责任人自动派发工单' },
    { name: '现场核查', desc: '现场复核沉降、裂缝与倾斜情况' },
    { name: '整改处置', desc: '制定处置方案并跟踪落实' },
    { name: '复核销号', desc: '复测确认稳定后归档销号' }
  ];

  let map, pinGroup, inited = false, page = 1, pageSize = 8;

  const filtered = () => {
    const f = state.alertFilter;
    return window.ALERTS.filter(a => {
      if (f.type !== 'all' && a.type !== f.type) return false;
      if (f.level !== 'all' && a.level !== f.level) return false;
      if (f.status !== 'all' && a.status !== f.status) return false;
      return true;
    });
  };

  /* ---------------------------- KPI ---------------------------- */
  function refreshKpi() {
    const k = state.alertKpi;
    const cards = $$('.kpi-cards .big-kpi');
    if (!cards.length) return;
    cards[0].querySelector('.bk-txt b').innerHTML = `${k.pending}<small>条</small>`;
    cards[1].querySelector('.bk-txt b').innerHTML = `${k.doing}<small>条</small>`;
    cards[2].querySelector('.bk-txt b').innerHTML = `${k.fixed}<small>条</small>`;
    cards[3].querySelector('.bk-txt b').innerHTML = `${k.avg}<small>小时</small>`;
  }

  /* ---------------------------- 表格 ---------------------------- */
  function renderTable() {
    const list = filtered();
    const totalPage = Math.max(1, Math.ceil(list.length / pageSize));
    page = Math.min(page, totalPage);
    const rows = list.slice((page - 1) * pageSize, page * pageSize);

    const tb = $('#alertTable tbody');
    tb.innerHTML = rows.length ? rows.map((a, i) => {
      const b = APP.building(a.buildingId);
      const sel = a.id === state.selectedAlertId ? ' class="is-selected"' : '';
      return `<tr data-id="${a.id}"${sel}>
        <td class="t-num">${String((page - 1) * pageSize + i + 1).padStart(2, '0')}</td>
        <td class="t-id">${a.id}</td>
        <td class="t-name">${b.name}</td>
        <td>${b.district}</td>
        <td>${a.type}</td>
        <td><span class="lv-tag ${a.level}"><i></i>${APP.riskLabel(a.level)}</span></td>
        <td class="t-time">${a.time.slice(5, 16)}</td>
        <td><span class="st-tag ${STATUS_CLASS[a.status]}">${a.status}</span></td>
        <td><button class="op-btn primary" data-op="flow">处置</button><button class="op-btn" data-op="detail">详情</button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="9" style="text-align:center;color:#4d647a;padding:30px">当前筛选条件下暂无预警工单</td></tr>`;

    $$('#alertTable tbody tr[data-id]').forEach(tr => {
      tr.onclick = () => select(tr.dataset.id);
      $$('[data-op]', tr).forEach(btn => btn.onclick = e => {
        e.stopPropagation();
        select(tr.dataset.id);
        if (btn.dataset.op === 'detail') detailModal(APP.alert(tr.dataset.id));
      });
    });

    $('#alertCount').textContent = `共 ${list.length} 条预警工单`;
    const pager = $('.pager');
    if (pager) {
      pager.innerHTML = `<button data-pg="prev" ${page === 1 ? 'disabled style="opacity:.4"' : ''}><svg style="transform:rotate(180deg)"><use href="#i-chevron-right"></use></svg></button>` +
        Array.from({ length: totalPage }, (_, i) => i + 1).map(p =>
          p === page ? `<b>${p}</b>` : `<button data-pg="${p}">${p}</button>`).join('') +
        `<button data-pg="next" ${page === totalPage ? 'disabled style="opacity:.4"' : ''}><svg><use href="#i-chevron-right"></use></svg></button>`;
      $$('[data-pg]', pager).forEach(btn => btn.onclick = () => {
        const v = btn.dataset.pg;
        if (v === 'prev') page = Math.max(1, page - 1);
        else if (v === 'next') page = Math.min(totalPage, page + 1);
        else page = +v;
        renderTable();
      });
    }
    renderPins();
  }

  /* ---------------------------- 处置流程 ---------------------------- */
  function fmtTime(base, addH) {
    const d = new Date(base.replace(/-/g, '/'));
    d.setHours(d.getHours() + addH);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function renderFlow() {
    const a = APP.alert(state.selectedAlertId);
    const b = APP.building(a.buildingId);
    const prog = PROGRESS[a.status] || 1;
    $('#flowAlertId').textContent = a.id;
    $('#flowTarget').innerHTML = `<span class="warn-ico ${a.level}" style="width:20px;height:20px">${APP.icon('i-building')}</span>
      <b>${b.name}</b><span style="font-size:8px;color:#8aa6bd">${a.type}</span>
      <em>${a.handler}</em>`;

    const offsets = [0, 0.2, 1.6, 9, 32];
    $('#stepper').innerHTML = STEPS.map((s, i) => {
      const cls = i < prog ? 'done' : (i === prog ? 'doing' : '');
      const ico = i < prog ? 'i-check' : (i === prog ? 'i-settings' : 'i-clock');
      const t = i < prog ? fmtTime(a.time, offsets[i]) : (i === prog ? '进行中' : '待处理');
      return `<div class="step-row ${cls}">
        <span class="step-dot">${APP.icon(ico)}</span>
        <div class="step-main">
          <div class="step-top"><b>${s.name}</b><em>${t}</em></div>
          <p>${s.desc}</p>
        </div></div>`;
    }).join('');

    const act = NEXT[a.status] || NEXT['已销号'];
    const regDays = a.level === 'red' ? 3 : a.level === 'orange' ? 7 : 15;
    const regMeasure = a.level === 'red' ? '立即停工核查' : a.level === 'orange' ? '7 日内整改' : '加密监测';
    const dl = new Date(a.time.replace(/-/g, '/'));
    dl.setDate(dl.getDate() + regDays);
    const deadline = `${dl.getMonth() + 1}-${String(dl.getDate()).padStart(2, '0')}`;
    $('#flowReg').innerHTML = `<div class="fr-hd">监管要素</div>
      <div class="fr-grid">
        <div><span>责任单位</span><b>${b.district}住建局</b></div>
        <div><span>协同单位</span><b>${b.owner}</b></div>
        <div><span>监管措施</span><b class="hl">${regMeasure}</b></div>
        <div><span>整改时限</span><b>${deadline} · ${regDays} 日</b></div>
        <div><span>执法文书</span><b>滇建监〔2026〕${a.id.slice(-3)}</b></div>
        <div><span>督办状态</span><b style="color:${a.status === '已销号' ? 'var(--green)' : a.level === 'red' ? 'var(--red)' : 'var(--yellow)'}">${a.status === '已销号' ? '已闭环' : '督办中'}</b></div>
      </div>`;
    $('#flowActions').innerHTML = `<button class="btn btn-primary" data-act="advance" ${act.next ? '' : 'disabled style="opacity:.5"'}>
        ${APP.icon(act.icon)}${act.label}</button>
      <button class="btn btn-ghost" data-act="building">${APP.icon('i-building')}查看建筑</button>`;
    $('#flowActions [data-act="advance"]').onclick = () => advance(a);
    $('#flowActions [data-act="building"]').onclick = () => {
      state.buildingId = a.buildingId;
      APP.go('building');
      setTimeout(() => APP.buildingApi && APP.buildingApi.setBuilding(a.buildingId), 120);
    };
  }

  function advance(a) {
    const act = NEXT[a.status];
    if (!act || !act.next) { APP.toast('该工单已完成销号归档', 'info', '处置流程'); return; }
    const prev = a.status;
    a.status = act.next;
    a.progress = PROGRESS[act.next];
    if (a.handler === '未指派' && act.next === '已派单') {
      a.handler = `${APP.building(a.buildingId).district}住建局 · 值班工程师`;
    }
    const k = state.alertKpi;
    if (prev === '待核查') { k.pending = Math.max(0, k.pending - 1); k.doing += 1; }
    else if (prev === '核查中' && act.next === '已整改') { k.doing = Math.max(0, k.doing - 1); k.fixed += 1; }
    else if (prev === '待销号' && act.next === '已销号') { /* 已计入已处置 */ }
    refreshKpi();
    renderTable();
    renderFlow();
    const msg = act.next === '已销号'
      ? `${a.id} 已完成复核销号，处置闭环`
      : `${a.id} 状态更新为「${a.status}」，已同步至责任单位`;
    APP.toast(msg, act.next === '已销号' ? 'ok' : 'info', '处置流程');
  }

  /* ---------------------------- 选择 ---------------------------- */
  function select(id) {
    state.selectedAlertId = state.alertId = id;
    $$('#alertTable tbody tr').forEach(tr => tr.classList.toggle('is-selected', tr.dataset.id === id));
    renderFlow();
    if (map) {
      const a = APP.alert(id);
      const b = APP.building(a.buildingId);
      map.panTo([b.lat, b.lon], { animate: true, duration: .5 });
      renderPins();
    }
  }

  /* ---------------------------- 小地图 ---------------------------- */
  function initMap() {
    map = L.map('alertMap', {
      zoomControl: false, attributionControl: false,
      dragging: true, scrollWheelZoom: false, minZoom: 10, maxZoom: 16
    }).setView([25.028, 102.729], 11.5);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16, minZoom: 10
    }).addTo(map);
    pinGroup = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 120);
  }

  function renderPins() {
    if (!pinGroup) return;
    pinGroup.clearLayers();
    const list = filtered().filter(a => ['待核查', '已派单', '核查中', '待销号'].includes(a.status));
    list.forEach(a => {
      const b = APP.building(a.buildingId);
      const active = a.id === state.selectedAlertId;
      const ico = L.divIcon({
        className: '',
        html: `<div class="alert-pin ${active ? 'active' : ''}" style="--c:${APP.riskColor(a.level)}"><i></i></div>`,
        iconSize: [22, 22], iconAnchor: [11, 22]
      });
      L.marker([b.lat, b.lon], { icon: ico, zIndexOffset: active ? 500 : 100 })
        .bindTooltip(`${b.name} · ${a.type} · ${a.status}`, { className: 'map-tip', direction: 'top', offset: [0, -16] })
        .on('click', e => { L.DomEvent.stopPropagation(e); select(a.id); })
        .addTo(pinGroup);
    });
  }

  /* ---------------------------- 详情 / 周报 ---------------------------- */
  function detailModal(a) {
    const b = APP.building(a.buildingId);
    APP.modal({
      title: `预警详情 · ${a.id}`, sub: a.type, icon: 'i-alert', wide: true,
      body: `<div class="flow-target" style="margin-bottom:12px">
          <span class="lv-tag ${a.level}"><i></i>${APP.riskLabel(a.level)}</span>
          <b>${b.name}</b><span style="font-size:8px">${b.district} · ${b.type}</span>
          <em>${a.time}</em>
        </div>
        <div class="report-metrics">
          <div><span>沉降速率</span><b class="hot">${b.rate.toFixed(1)}<small>mm/年</small></b></div>
          <div><span>累计沉降</span><b class="hot">${b.cumulative.toFixed(1)}<small>mm</small></b></div>
          <div><span>风险评分</span><b>${b.score.toFixed(1)}</b></div>
          <div><span>处置状态</span><b style="font-size:14px">${a.status}</b></div>
        </div>
        <div class="report-sec"><h4>预警描述</h4><p>${a.desc}</p></div>
        <div class="report-sec"><h4>处置建议</h4><p>${a.suggestion}</p></div>
        <div class="report-sec"><h4>工单信息</h4><p>数据来源：${a.source} · 责任人：${a.handler} · 当前进度：第 ${PROGRESS[a.status]} / 5 步</p></div>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button><button class="btn btn-primary" data-b>查看建筑详情</button>`,
      onMount: (body, close) => {
        body.querySelector('[data-close]').onclick = close;
        body.querySelector('[data-b]').onclick = () => {
          close();
          state.buildingId = a.buildingId;
          APP.go('building');
          setTimeout(() => APP.buildingApi && APP.buildingApi.setBuilding(a.buildingId), 120);
        };
      }
    });
  }

  function weeklyModal() {
    const list = filtered();
    const byType = {};
    list.forEach(a => byType[a.type] = (byType[a.type] || 0) + 1);
    const rows = Object.keys(byType).map(t => {
      const n = byType[t];
      const fixed = list.filter(a => a.type === t && (a.status === '已整改' || a.status === '已销号')).length;
      return `<tr><td>${t}</td><td class="nums">${n}</td><td class="nums" style="color:#4be79a">${fixed}</td><td class="nums">${(n - fixed)}</td>
        <td class="nums">${(fixed / n * 100).toFixed(0)}%</td></tr>`;
    }).join('');
    APP.modal({
      title: '预警处置周报', sub: '2026-07-28 ~ 2026-08-03', icon: 'i-download', wide: true,
      body: `<div class="province-summary">
          <div><span>本期预警</span><b>${state.alertKpi.pending + state.alertKpi.doing}<small>条</small></b></div>
          <div><span>已处置</span><b style="color:#4be79a">${state.alertKpi.fixed}<small>条</small></b></div>
          <div><span>平均处置时长</span><b>${state.alertKpi.avg}<small>小时</small></b></div>
          <div><span>闭环率</span><b>91.8<small>%</small></b></div>
        </div>
        <table class="province-table"><thead><tr><th>预警类型</th><th class="nums">数量</th><th class="nums">已处置</th><th class="nums">处置中</th><th class="nums">闭环率</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div style="margin-top:12px" class="report-sec"><h4>本周结论</h4>
          <p>本周共接收预警工单 ${list.length} 条，红色预警 ${list.filter(a => a.level === 'red').length} 条，均已落实责任人。
          沉降类预警集中在五华、官渡两区，建议下周对东风东路与巫家坝片区开展加密观测。</p></div>
        <div style="margin-top:10px;font-size:8.5px;color:#4d647a">演示数据 · 周报由系统自动生成。</div>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button><button class="btn btn-primary" data-dl>导出周报</button>`,
      onMount: (body, close) => {
        body.querySelector('[data-close]').onclick = close;
        body.querySelector('[data-dl]').onclick = () => APP.toast('周报已导出（示例）', 'ok', '导出');
      }
    });
  }

  /* ---------------------------- 交互 ---------------------------- */
  function bindUI() {
    $('#alertFilterBtn').onclick = () => {
      state.alertFilter = {
        type: $('#alertTypeFilter').value,
        level: $('#alertLevelFilter').value,
        status: $('#alertStatusFilter').value
      };
      page = 1;
      renderTable();
      APP.toast(`筛选结果：${filtered().length} 条预警工单`, 'ok', '工单筛选');
    };
    $('#alertFilterReset').onclick = () => {
      $('#alertTypeFilter').value = 'all';
      $('#alertLevelFilter').value = 'all';
      $('#alertStatusFilter').value = 'all';
      state.alertFilter = { type: 'all', level: 'all', status: 'all' };
      page = 1;
      renderTable();
      APP.toast('筛选条件已重置', 'info', '工单筛选');
    };
    $('#alertRefresh').onclick = () => {
      renderTable();
      refreshKpi();
      APP.toast('预警工单已刷新 · 2026-08-03 10:30', 'ok', '数据同步');
    };
    $('#alertExport').onclick = weeklyModal;
    $('#alertMapRefresh').onclick = () => {
      renderPins();
      APP.toast('预警位置已同步', 'ok', '位置分布');
    };
  }

  /* ---------------------------- 初始化 ---------------------------- */
  APP.views.alert = {
    init() {
      inited = true;
      initMap();
      bindUI();
      refreshKpi();
      renderTable();
      renderFlow();
      const a = APP.alert(state.selectedAlertId);
      const b = APP.building(a.buildingId);
      map.setView([b.lat, b.lon], 12.5, { animate: false });
    },
    resize() { if (map) setTimeout(() => map.invalidateSize(), 30); }
  };

  APP.alertApi = {
    select(id) {
      state.selectedAlertId = id;
      if (inited) { page = 1; renderTable(); renderFlow(); select(id); }
    }
  };
})();
