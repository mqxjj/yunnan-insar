/* ============================================================
   VIEW · 专题监管（深基坑 / 地铁沿线 / 危旧房）
   ============================================================ */
(function () {
  'use strict';
  const APP = window.APP, $ = APP.$, $$ = APP.$$;
  const state = APP.state;
  const S = window.REG_STATS;

  let map, layer, psLayer;
  let tab = 'pit';
  let selId = null;
  let showPs = true;

  const PIT_VIDEO = {
    url: 'https://www.bilibili.com/video/BV1siNneqEHw/',
    src: 'assets/video/pit-construction.mp4',
    poster: 'assets/video/pit-construction-poster.jpg'
  };

  const TABS = {
    pit: { label: '深基坑', listTitle: '在建深基坑清单', mapTitle: '深基坑影响范围', meta: '1H / 2H 影响半径' },
    metro: { label: '地铁沿线', listTitle: '重点区间清单', mapTitle: '地铁沿线保护区', meta: '50m 重点 / 100m 一般保护区' },
    danger: { label: '危旧房', listTitle: 'C / D 级危房清单', mapTitle: '危旧房分布与汛期风险', meta: '按鉴定等级着色' }
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------------------------- KPI ---------------------------- */
  function kpis(t) {
    if (t === 'pit') return [
      { label: '在建深基坑', value: S.pit.total, unit: '处', sub: `红色 ${S.pit.red} · 橙色 ${S.pit.orange}` },
      { label: '影响范围内建筑', value: S.pit.affected, unit: '栋', sub: '抽样 6 处基坑' },
      { label: '自动化监测点', value: S.pit.points, unit: '个', sub: '测斜 / 轴力 / 水位' },
      { label: '超期未整改', value: S.pit.overdue, unit: '处', sub: '最长达 11 天', warn: true }
    ];
    if (t === 'metro') return [
      { label: '运营线路', value: S.metro.lines, unit: '条', sub: `${S.metro.segments} 个重点区间` },
      { label: '沿线保护建筑', value: S.metro.buildings, unit: '栋', sub: '50 / 100 m 保护区' },
      { label: '保护区内作业', value: 9, unit: '处', sub: '需建设 / 运营联审' },
      { label: '协同待办', value: 3, unit: '条', sub: '1 条已超期', warn: true }
    ];
    return [
      { label: 'C / D 级危房', value: S.danger.total, unit: '处', sub: `D 级 ${S.danger.d} · C 级 ${S.danger.c}` },
      { label: '住人危房', value: S.danger.occupied, unit: '处', sub: '涉及 1,284 户' },
      { label: '汛期重点', value: S.danger.rainy, unit: '处', sub: '暴雨橙色预警' },
      { label: '本年整治', value: 96, unit: '处', sub: '加固 61 · 搬迁 35' }
    ];
  }

  function renderKpis() {
    $('#regKpis').innerHTML = kpis(tab).map(k => `
      <div class="reg-kpi${k.warn ? ' warn' : ''}">
        <span>${k.label}</span>
        <div><b>${k.value}</b><em>${k.unit}</em></div>
        <small>${k.sub}</small>
      </div>`).join('');
  }

  /* ---------------------------- 数据 ---------------------------- */
  function items() {
    if (tab === 'pit') return window.PITS.slice();
    if (tab === 'metro') return window.METRO.segments.slice();
    return window.DANGER_HOUSES.slice();
  }

  function sorted() {
    const list = items();
    const rank = { red: 0, orange: 1, yellow: 2, green: 3 };
    if (tab === 'danger' && state.rain) list.sort((a, b) => b.rain - a.rain);
    else list.sort((a, b) => (rank[a.risk] ?? 3) - (rank[b.risk] ?? 3));
    return list;
  }

  function metricOf(s) {
    if (s.type === 'pit') return `开挖 ${s.depth} m · 影响 ${s.radius} m`;
    if (s.type === 'metro') return `沿线 ${s.buildings} 栋 · ${s.length} km`;
    return `${s.level} 级 · ${s.households} 户`;
  }

  /* ---------------------------- 列表 ---------------------------- */
  function renderList() {
    const list = sorted();
    $('#regListTitle').textContent = TABS[tab].listTitle;
    $('#regListCount').textContent = tab === 'metro'
      ? `${list.length} / ${S.metro.segments}`
      : `${list.length} / ${tab === 'pit' ? S.pit.total : S.danger.total}`;

    const tools = $('#regListTools');
    if (tab === 'danger') {
      tools.innerHTML = state.rain
        ? `<span class="reg-rain-chip on">${APP.icon('i-alert')}24h 降雨 ${window.RAIN.rainfall} mm · ${window.RAIN.warning}</span>`
        : `<span class="reg-rain-chip">${APP.icon('i-clock')}汛期模式关闭 · 按鉴定等级排序</span>`;
    } else if (tab === 'metro') {
      tools.innerHTML = `<span class="reg-rain-chip">${APP.icon('i-shield')}保护区审批与运营监测联动 · 示例</span>`;
    } else {
      tools.innerHTML = `<span class="reg-rain-chip">${APP.icon('i-gauge')}监测数据由第三方平台接入 · 示例</span>`;
    }

    $('#regList').innerHTML = list.map(s => {
      const color = APP.riskColor(s.risk);
      const active = s.id === selId ? ' is-active' : '';
      const extra = tab === 'danger' && state.rain ? `<i class="ri-rain">汛期 ${s.rain}</i>` : `<i>${APP.riskLabel(s.risk)}</i>`;
      return `<div class="reg-item${active}" data-id="${s.id}">
        <span class="ri-dot" style="background:${color};box-shadow:0 0 8px ${color}80"></span>
        <div class="ri-main">
          <b>${APP.esc(s.name)}</b>
          <span>${s.district} · ${metricOf(s)}</span>
        </div>
        <div class="ri-right">${extra}</div>
      </div>`;
    }).join('');

    $$('.reg-item', $('#regList')).forEach(el => {
      el.onclick = () => select(el.dataset.id, true);
    });
  }

  /* ---------------------------- 地图 ---------------------------- */
  function corridor(coords, meters) {
    const lat0 = coords[Math.floor(coords.length / 2)][0];
    const mPerLat = 111000, mPerLon = 111000 * Math.cos(lat0 * Math.PI / 180);
    const left = [], right = [];
    coords.forEach((c, i) => {
      const prev = coords[Math.max(0, i - 1)], next = coords[Math.min(coords.length - 1, i + 1)];
      const dx = next[1] - prev[1], dy = next[0] - prev[0];
      const len = Math.hypot(dx * mPerLon, dy * mPerLat) || 1;
      const px = -(dy * mPerLat) / len, py = (dx * mPerLon) / len;
      left.push([c[0] + py * meters / mPerLat, c[1] + px * meters / mPerLon]);
      right.push([c[0] - py * meters / mPerLat, c[1] - px * meters / mPerLon]);
    });
    return left.concat(right.reverse());
  }

  function pin(s, label, cls) {
    const color = APP.riskColor(s.risk);
    const icon = L.divIcon({
      className: '',
      html: `<div class="site-pin ${cls}" style="--c:${color}"><span class="sp-ring"></span><span class="sp-core">${label}</span></div>`,
      iconSize: [44, 26], iconAnchor: [22, 13]
    });
    const m = L.marker([s.lat, s.lon], { icon, riseOnHover: true, zIndexOffset: 320 });
    m.bindTooltip(`<b style="color:#fff">${s.name}</b><br/><span style="color:${color}">${APP.riskLabel(s.risk)} · ${metricOf(s)}</span>`, {
      className: 'map-tip', direction: 'top', offset: [0, -12], opacity: 1
    });
    m.on('click', e => { L.DomEvent.stopPropagation(e); select(s.id, true); });
    m.addTo(layer);
    return m;
  }

  function pitBounds(s) {
    return L.latLng(s.lat, s.lon).toBounds(s.radius * 2);
  }

  function psForPit(p) {
    const seed = p.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 20260803);
    const rnd = APP.seed(seed);
    const points = [];
    const mPerLon = 111000 * Math.cos(p.lat * Math.PI / 180);
    const baseRate = p.risk === 'red' ? -22 : p.risk === 'orange' ? -15 : -8;
    for (let i = 0; i < 180; i++) {
      const east = (rnd() * 2 - 1) * p.radius * 1.35;
      const north = (rnd() * 2 - 1) * p.radius * 1.35;
      if (Math.hypot(east, north) > p.radius) continue;
      points.push({
        lat: p.lat + north / 111000,
        lon: p.lon + east / mPerLon,
        rate: +Math.max(-35, Math.min(3, baseRate + (rnd() - .5) * 20)).toFixed(1)
      });
    }
    return points;
  }

  function updatePs() {
    if (!psLayer) return;
    psLayer.clearLayers();
    const toggle = $('#regPsToggle');
    toggle.style.display = tab === 'pit' ? 'inline-flex' : 'none';
    toggle.classList.toggle('is-active', showPs);
    toggle.setAttribute('aria-pressed', String(showPs));
    if (tab !== 'pit') return;
    if (!showPs) {
      $('#regPsCount').textContent = '已隐藏';
      return;
    }
    const p = APP.site(selId) || window.PITS[0];
    const points = psForPit(p);
    points.forEach((pt, i) => {
      L.circleMarker([pt.lat, pt.lon], {
        radius: 2.7, className: 'reg-ps-point', color: '#e8fbff', weight: .45, opacity: .75,
        fillColor: APP.velColor(pt.rate), fillOpacity: .95
      }).bindTooltip(`PS-${p.id}-${String(i + 1).padStart(3, '0')}<br/>垂直速率 ${pt.rate.toFixed(1)} mm/年`, {
        className: 'map-tip', direction: 'top', offset: [0, -4], opacity: 1
      }).addTo(psLayer);
    });
    $('#regPsCount').textContent = `${points.length} 点`;
  }

  function drawMap(shouldFit = true) {
    if (!map) return;
    layer.clearLayers();
    if (tab === 'pit') {
      window.PITS.forEach(p => {
        const color = APP.riskColor(p.risk);
        const selected = p.id === selId;
        L.circle([p.lat, p.lon], {
          radius: p.radius, color, weight: selected ? 2 : 1.1, opacity: selected ? .92 : .35,
          dashArray: '7 6', className: `reg-impact-outer${selected ? ' is-selected' : ''}`,
          fillColor: color, fillOpacity: selected ? .16 : .04, interactive: false
        }).addTo(layer);
        L.circle([p.lat, p.lon], {
          radius: Math.round(p.radius / 2), color, weight: selected ? 1.6 : 1, opacity: selected ? .9 : .55,
          className: `reg-impact-inner${selected ? ' is-selected' : ''}`,
          fillColor: color, fillOpacity: selected ? .22 : .05, interactive: false
        }).addTo(layer);
        pin(p, '基坑', 'pit');
      });
    } else if (tab === 'metro') {
      const M = window.METRO;
      L.polygon(corridor(M.line, 100), {
        color: 'rgba(56,217,255,.55)', weight: 1, fillColor: '#38d9ff', fillOpacity: .10, interactive: false
      }).addTo(layer);
      L.polygon(corridor(M.line, 50), {
        color: 'rgba(255,176,32,.75)', weight: 1, dashArray: '4 4', fillColor: '#ffb020', fillOpacity: .22, interactive: false
      }).addTo(layer);
      L.polyline(M.line, { color: '#38d9ff', weight: 2.6, opacity: .85, interactive: false }).addTo(layer);
      M.stations.forEach(st => {
        L.circleMarker([st.lat, st.lon], { radius: 3.2, color: '#8fe8ff', weight: 1, fillColor: '#0b2a44', fillOpacity: 1 })
          .bindTooltip(st.name, { className: 'map-tip', direction: 'top', offset: [0, -6], opacity: 1 }).addTo(layer);
      });
      M.segments.forEach(sg => pin(sg, '区间', 'metro'));
    } else {
      window.DANGER_HOUSES.forEach(d => {
        const p = pin(d, d.level, 'danger');
        if (state.rain) p.setZIndexOffset(360);
      });
    }
    updatePs();
    if (shouldFit) fitMap();
  }

  function fitMap() {
    const sel = APP.site(selId) || items()[0];
    if (tab === 'metro' && sel && sel.lat) {
      map.setView([sel.lat, sel.lon], 15);
      setTimeout(() => map.invalidateSize(), 60);
      return;
    }
    const pts = items().map(s => L.latLng(s.lat, s.lon));
    if (!pts.length) return;
    map.fitBounds(L.latLngBounds(pts), { padding: [26, 26], maxZoom: 13.6 });
    setTimeout(() => map.invalidateSize(), 60);
  }

  function focusMap(s) {
    if (!map || !s || !s.lat) return;
    if (s.type === 'pit') map.flyToBounds(pitBounds(s), { padding: [34, 34], maxZoom: 17, duration: .7 });
    else map.flyTo([s.lat, s.lon], s.type === 'metro' ? 15 : Math.max(13.6, map.getZoom()), { duration: .7 });
  }

  /* ---------------------------- 详情 ---------------------------- */
  function trendOf(s) {
    if (s.type === 'pit') {
      const b = window.BUILDINGS.find(x => s.affected.includes(x.id));
      if (b) return APP.buildingRates(b);
    }
    if (s.type === 'metro' && s.affected.length) {
      const b = window.BUILDINGS.find(x => x.id === s.affected[0]);
      if (b) return APP.buildingRates(b);
    }
    const seed = APP.seed(s.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    const out = [];
    for (let i = 0; i < 12; i++) out.push(-(4 + seed() * 12 + i * .8));
    return out;
  }

  function metaRows(s) {
    if (s.type === 'pit') return [
      ['开挖深度', s.depth + ' m'], ['支护形式', s.support],
      ['建设单位', s.builder], ['施工单位', s.contractor],
      ['监理单位', s.supervisor], ['监测单位', s.monitorUnit],
      ['监测内容', s.monitor], ['控制值', s.threshold]
    ];
    if (s.type === 'metro') return [
      ['所属线路', s.line], ['区间长度', s.length + ' km'],
      ['保护区范围', s.protect], ['运营单位', s.operator],
      ['沿线建筑', s.buildings + ' 栋'], ['当前状态', s.state]
    ];
    return [
      ['鉴定等级', s.level + ' 级'], ['建成年代', s.year + ' 年'],
      ['结构类型', s.structure], ['建筑面积', s.area + ' m²'],
      ['住户 / 人数', `${s.households} 户 / ${s.occupants} 人`],
      ['鉴定时间', s.identified], ['使用功能', s.use], ['主要隐患', s.note]
    ];
  }

  function affectedHtml(s) {
    if (!s.affected || !s.affected.length) return '';
    const rows = s.affected.map(id => {
      const b = window.BUILDINGS.find(x => x.id === id);
      if (!b) return '';
      return `<div class="reg-affect" data-bid="${b.id}">
        <b>${b.name}</b>
        <span>当前 ${b.rate.toFixed(1)} mm/年 · 12个月累计 ${b.cumulative.toFixed(1)} mm</span>
        <i style="color:${APP.riskColor(b.risk)}">${APP.riskLabel(b.risk)}</i>
      </div>`;
    }).join('');
    return `<div class="reg-block"><h5>关联建筑（影响范围内）</h5>${rows}</div>`;
  }

  function flowHtml(s) {
    const steps = s.type === 'pit'
      ? [['预警触发', '周边建筑沉降速率连续 3 期超控制值', '已完成'],
         ['派发处置单', '责任单位：建设 / 施工单位', '已完成'],
         ['现场核查', '监督员 + 第三方监测单位联合核查', '进行中'],
         ['整改销号', '复查合格后解除预警', '待完成']]
      : s.type === 'metro'
        ? [['预警触发', '保护区内建筑沉降超阈值', '已完成'],
           ['协同会商', '运营单位 + 属地 + 建设单位', '进行中'],
           ['联合核查', '保护区作业审批与监测复核', '待完成'],
           ['销号归档', '结论纳入保护区台账', '待完成']]
        : [['排查鉴定', `${s.level} 级危房，纳入台账`, '已完成'],
           ['责任告知', '属地街道 + 产权人签收', '已完成'],
           ['处置建议', state.rain ? '汛期优先转移 / 加固' : '加固修缮或搬迁', '进行中'],
           ['复查销号', '整治验收后降级或销号', '待完成']];
    return `<div class="reg-block"><h5>监管处置流程</h5>
      <div class="reg-flow">${steps.map((st, i) => `<div class="rf-step ${st[2] === '已完成' ? 'done' : st[2] === '进行中' ? 'doing' : ''}">
        <span class="rf-idx">${i + 1}</span><div><b>${st[0]}</b><span>${st[1]}</span></div><em>${st[2]}</em>
      </div>`).join('')}</div></div>`;
  }

  function detailHtml(s) {
    const color = APP.riskColor(s.risk);
    const rows = metaRows(s).map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
    const trend = trendOf(s);
    const rainBlock = tab === 'danger'
      ? `<div class="reg-block"><h5>汛期风险叠加</h5>
          <div class="reg-rain-box ${state.rain ? 'on' : ''}">
            <div><span>24h 降雨</span><b>${state.rain ? window.RAIN.rainfall : 0}<em>mm</em></b></div>
            <div><span>汛期风险指数</span><b>${state.rain ? s.rain : Math.round(s.rain * .7)}<em>/100</em></b></div>
            <p>${state.rain ? window.RAIN.warning + ' · ' + window.RAIN.forecast : '未开启汛期模式，按鉴定等级排序'}</p>
          </div>
        </div>`
      : '';
    const actions = `<div class="reg-actions">
      ${tab === 'pit' ? `<button class="btn btn-primary reg-video-btn" data-act="video">${APP.icon('i-play')}远程工地基坑施工视频</button>` : ''}
      <button class="btn btn-ghost" data-act="dispatch">${APP.icon('i-send')}派发处置单</button>
      ${tab === 'danger' ? `<button class="btn btn-primary" data-act="relocate">${APP.icon('i-alert')}生成转移清单</button>` : ''}
      ${tab === 'pit' || tab === 'metro' ? `<button class="btn btn-primary" data-act="insar">${APP.icon('i-satellite')}查看 InSAR 证据</button>` : ''}
    </div>`;

    return `
      <div class="reg-detail-hd">
        <span class="bp-risk" style="color:${color};border-color:${color}55;background:${color}18">${APP.riskLabel(s.risk)}</span>
        <b class="reg-code">${s.id}</b>
      </div>
      <h4>${s.name}</h4>
      <p class="reg-sub">${s.district} · ${TABS[tab].label}${s.type === 'metro' ? ' · ' + s.line : ''}</p>
      <div class="reg-metrics">
        ${s.type === 'pit' ? `<div><span>开挖深度</span><b>${s.depth}</b><em>m</em></div>
          <div><span>影响半径</span><b>${s.radius}</b><em>m</em></div>
          <div><span>预警次数</span><b>${s.alerts}</b><em>次</em></div>`
        : s.type === 'metro' ? `<div><span>区间长度</span><b>${s.length}</b><em>km</em></div>
          <div><span>沿线建筑</span><b>${s.buildings}</b><em>栋</em></div>
          <div><span>待处置</span><b>${s.alerts}</b><em>条</em></div>`
        : `<div><span>鉴定等级</span><b>${s.level}</b><em>级</em></div>
          <div><span>房龄</span><b>${2026 - s.year}</b><em>年</em></div>
          <div><span>住人</span><b>${s.occupants}</b><em>人</em></div>`}
      </div>
      <div class="reg-block"><h5>近 12 个月沉降趋势</h5>
        <div class="reg-spark">${APP.sparkline(trend, color, 300, 56)}</div>
        <div class="reg-spark-cap"><span>2025-09</span><span>2026-08</span></div>
      </div>
      <div class="reg-block"><h5>档案信息</h5><div class="reg-meta">${rows}</div></div>
      ${affectedHtml(s)}
      ${rainBlock}
      ${flowHtml(s)}
      ${actions}`;
  }

  function renderDetail() {
    const s = APP.site(selId) || sorted()[0];
    if (!s) return;
    selId = s.id;
    $('#regDetailTag').textContent = s.id;
    $('#regDetail').innerHTML = detailHtml(s);
    $$('.reg-affect', $('#regDetail')).forEach(el => {
      el.onclick = () => {
        state.buildingId = el.dataset.bid;
        APP.go('building');
        APP.buildingApi && APP.buildingApi.setBuilding(el.dataset.bid);
      };
    });
    $$('[data-act]', $('#regDetail')).forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.act;
        if (act === 'dispatch') APP.toast(`处置单已派发：${s.name} · 责任单位待签收`, 'ok', '监管派单');
        if (act === 'video') openPitVideo(s);
        if (act === 'insar') { APP.go('insar'); APP.toast('已定位到该对象周边 InSAR 形变点', 'info', '证据溯源'); }
        if (act === 'relocate') openRelocate();
      };
    });
  }

  function select(id, focus) {
    selId = id;
    renderList();
    renderDetail();
    drawMap(false);
    if (focus) focusMap(APP.site(id));
  }

  /* ---------------------------- 远程工地视频 ---------------------------- */
  function openPitVideo(s) {
    APP.modal({
      title: '远程工地基坑施工视频',
      sub: `${s.id} · 公开视频演示链路`,
      icon: 'i-play',
      wide: true,
      body: `<div class="pit-video-modal">
        <div class="pit-video-status"><span><i></i>施工现场画面</span><em>公开施工视频 · 演示链路，非本项目实时流</em></div>
        <div class="pit-video-frame"><video src="${PIT_VIDEO.src}" poster="${PIT_VIDEO.poster}" title="大型基坑施工现场实拍" controls preload="auto" playsinline></video></div>
        <div class="pit-video-caption"><b>看现场学市政 01 集 · 大型基坑施工</b><span>视频来源：哔哩哔哩 · 墨子市政建造师　｜　当前监管对象：${APP.esc(s.name)}</span></div>
        <div class="pit-video-fallback">视频已下载至本地，打开无需等待平台缓冲；若文件未加载，请点击下方“打开原视频”。</div>
      </div>`,
      footer: `<a class="btn btn-ghost pit-video-source" href="${PIT_VIDEO.url}" target="_blank" rel="noopener noreferrer">${APP.icon('i-play')}打开原视频</a>
        <button class="btn btn-primary" data-close>关闭</button>`,
      onMount(bd, close) {
        bd.parentElement.querySelector('[data-close]').onclick = close;
      }
    });
  }

  /* ---------------------------- 汛期转移清单 ---------------------------- */
  function openRelocate() {
    const list = window.DANGER_HOUSES.slice().sort((a, b) => b.rain - a.rain);
    const rows = list.map((d, i) => {
      const act = d.rain >= 85 ? '立即转移' : d.rain >= 75 ? '24h 内转移' : '加固观察';
      const cls = d.rain >= 85 ? 'red' : d.rain >= 75 ? 'orange' : '';
      const color = APP.riskColor(d.risk);
      return `<tr>
        <td><b>${pad(i + 1)}</b></td>
        <td><b>${d.name}</b><span class="cell-sub">${d.district} · ${d.level} 级 · ${d.structure}</span></td>
        <td>${d.households} 户 / ${d.occupants} 人</td>
        <td><span style="color:${color}">${d.rain}</span></td>
        <td><span class="reg-tag ${cls}">${act}</span></td>
        <td>${d.district}属地街道</td>
      </tr>`;
    }).join('');
    APP.modal({
      title: '汛期危房优先转移清单',
      sub: `${window.RAIN.warning} · 24h 降雨 ${window.RAIN.rainfall} mm · 按风险排序`,
      icon: 'i-alert',
      wide: true,
      body: `<div class="reg-note">依据《危险房屋鉴定标准》鉴定等级与汛期风险加权生成，供属地街道逐户核实后执行。示例数据。</div>
        <table class="reg-table">
          <thead><tr><th>序号</th><th>对象</th><th>住户</th><th>风险指数</th><th>建议措施</th><th>责任单位</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button>
        <button class="btn btn-primary" id="relocateExport">${APP.icon('i-download')}导出清单</button>`,
      onMount(bd, close) {
        bd.parentElement.querySelector('[data-close]').onclick = close;
        bd.parentElement.querySelector('#relocateExport').onclick = () => {
          APP.toast('清单已导出（示例）：汛期危房优先转移清单.xlsx', 'ok', '导出');
        };
      }
    });
  }

  /* ---------------------------- 报告 ---------------------------- */
  function openReport() {
    const t = TABS[tab];
    APP.modal({
      title: `${t.label}专题监管报告`,
      sub: '2026 年 8 月 · 示例数据',
      icon: 'i-file',
      wide: true,
      body: `<div class="reg-note">面向工程质量安全监管处履职留痕，报告自动汇总预警、处置与超期情况。</div>
        <div class="reg-report">
          <div><span>监管对象</span><b>${tab === 'pit' ? S.pit.total + ' 处' : tab === 'metro' ? '2 条线 / 14 区间' : S.danger.total + ' 处'}</b></div>
          <div><span>红色预警</span><b>${tab === 'pit' ? S.pit.red : tab === 'metro' ? S.metro.red : S.danger.d} 处</b></div>
          <div><span>超期未整改</span><b>${tab === 'pit' ? S.pit.overdue : tab === 'metro' ? S.metro.overdue : 0} 处</b></div>
          <div><span>本月处置</span><b>${tab === 'pit' ? 18 : tab === 'metro' ? 6 : 32} 处</b></div>
        </div>
        <div class="reg-report-body">
          <h5>一、总体情况</h5>
          <p>本月 ${t.label}监管对象风险总体可控，红色预警对象均已派发处置单并完成首次现场核查。</p>
          <h5>二、重点问题</h5>
          <p>${tab === 'pit' ? '2 处深基坑周边建筑沉降速率连续超控制值，已要求加密监测并局部停工核查。' : tab === 'metro' ? '1 个保护区内作业项目未按程序报审，已移交运营单位联合核查。' : '23 处住人危房在暴雨橙色预警下纳入优先转移范围，已推送属地街道。'}</p>
          <h5>三、下一步措施</h5>
          <p>持续跟踪红色对象，落实“一周一复查”；将超期工单纳入督办考核；汛期结束后复核危房等级。</p>
        </div>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button>
        <button class="btn btn-primary" id="reportExport">${APP.icon('i-download')}导出 PDF</button>`,
      onMount(bd, close) {
        bd.parentElement.querySelector('[data-close]').onclick = close;
        bd.parentElement.querySelector('#reportExport').onclick = () => APP.toast('报告已导出（示例）：专题监管月报.pdf', 'ok', '导出');
      }
    });
  }

  /* ---------------------------- 切换 ---------------------------- */
  function setTab(t) {
    if (!TABS[t]) t = 'pit';
    tab = t;
    state.regTab = t;
    const first = sorted()[0];
    selId = first ? first.id : null;
    $$('#regSeg button').forEach(b => b.classList.toggle('is-active', b.dataset.reg === t));
    $('#regMapTitle').textContent = TABS[t].mapTitle;
    $('#regMapMeta').textContent = TABS[t].meta;
    $('#regRain').style.display = t === 'danger' ? '' : 'none';
    $('#regMap').classList.toggle('rainy', t === 'danger' && state.rain);
    renderKpis();
    renderList();
    drawMap();
    renderDetail();
  }

  /* ---------------------------- 初始化 ---------------------------- */
  APP.views.regulate = {
    init() {
      map = L.map('regMap', { zoomControl: false, attributionControl: false, minZoom: 9, maxZoom: 18 })
        .setView([25.028, 102.729], 12);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18, minZoom: 9, crossOrigin: true
      }).addTo(map);
      layer = L.layerGroup().addTo(map);
      psLayer = L.layerGroup().addTo(map);

      const videoPreload = document.createElement('video');
      videoPreload.id = 'regPitVideoPreload';
      videoPreload.preload = 'auto';
      videoPreload.muted = true;
      videoPreload.src = PIT_VIDEO.src;
      videoPreload.style.display = 'none';
      videoPreload.setAttribute('aria-hidden', 'true');
      document.body.appendChild(videoPreload);
      videoPreload.load();

      $('#regPsToggle').onclick = () => { showPs = !showPs; updatePs(); };
      $$('#regSeg button').forEach(b => b.onclick = () => setTab(b.dataset.reg));
      $('#regRain').onclick = () => {
        state.rain = !state.rain;
        $('#regRain').classList.toggle('is-active', state.rain);
        $('#regRain').innerHTML = `${APP.icon('i-alert')}${state.rain ? '退出汛期' : '汛期模式'}`;
        $('#regMap').classList.toggle('rainy', state.rain);
        const first = sorted()[0];
        selId = first ? first.id : selId;
        renderList();
        drawMap();
        renderDetail();
        APP.toast(state.rain ? `已叠加 ${window.RAIN.warning}：24h 降雨 ${window.RAIN.rainfall} mm` : '已退出汛期模式', state.rain ? 'warn' : 'info', '汛期叠加');
      };
      $('#regExport').onclick = openReport;

      setTab(state.regTab || 'pit');
    },
    setTab(t) { if (map) { if (state.rain) { state.rain = false; $('#regRain').innerHTML = APP.icon('i-alert') + '汛期模式'; $('#regRain').classList.remove('is-active'); } setTab(t); } },
    resize() { if (map) setTimeout(() => map.invalidateSize(), 40); }
  };

  APP.regApi = {
    setTab(t) {
      state.regTab = TABS[t] ? t : 'pit';
      if (APP.views.regulate.inited) APP.views.regulate.setTab(t);
    }
  };

})();
