/* ============================================================
   VIEW · 沉降风险一张图（实时卫星底图 / 热力 / 图层 / 统计）
   ============================================================ */
(function () {
  'use strict';
  const APP = window.APP, $ = APP.$, $$ = APP.$$;
  const state = APP.state;

  let map, heatLayer, markersGroup, boxesGroup, districtLayer, labelGroup, cimGroup, heatImg;
  let pitGroup, metroGroup, dangerGroup;
  let previewSparkChart = null;
  let trendChart = null;
  let measure = { on: false, pts: [], layer: null };
  let tlTimer = null;
  const HEAT_BOUNDS = { n: 25.145, s: 24.835, w: 102.575, e: 102.930 };
  const CITY_VIEW = { center: [25.028, 102.729], zoom: 12 };
  const CITY_FIT = [[24.862, 102.618], [25.108, 102.885]];

  const RATE_CLASSES = [
    { c: '#ff2d55', label: '≤ -30' },
    { c: '#ff6b35', label: '-30 ~ -20' },
    { c: '#ffb020', label: '-20 ~ -10' },
    { c: '#ffe066', label: '-10 ~ -5' },
    { c: '#7ee787', label: '-5 ~ -2' },
    { c: '#2ecc71', label: '> -2' }
  ];

  /* ---------------------------- 热力场 ---------------------------- */
  function buildHeatImage() {
    const W = 360, H = 300;
    const cvs = document.createElement('canvas');
    cvs.width = W; cvs.height = H;
    const ctx = cvs.getContext('2d');
    const img = ctx.createImageData(W, H);
    const data = img.data;
    const clusters = window.HEAT_CLUSTERS.concat([
      { lon: 102.7235, lat: 25.0150, sx: 0.0055, sy: 0.012, w: 0.52 },
      { lon: 102.7245, lat: 25.0450, sx: 0.0055, sy: 0.010, w: 0.42 },
      { lon: 102.7360, lat: 25.0300, sx: 0.0070, sy: 0.009, w: 0.36 }
    ]);
    const total = W * H;
    const field = new Float32Array(total);
    let max = 0.0001;
    for (let y = 0; y < H; y++) {
      const lat = HEAT_BOUNDS.n - (y + .5) / H * (HEAT_BOUNDS.n - HEAT_BOUNDS.s);
      for (let x = 0; x < W; x++) {
        const lon = HEAT_BOUNDS.w + (x + .5) / W * (HEAT_BOUNDS.e - HEAT_BOUNDS.w);
        let v = 0;
        for (let k = 0; k < clusters.length; k++) {
          const cl = clusters[k];
          const dx = (lon - cl.lon) / cl.sx, dy = (lat - cl.lat) / cl.sy;
          v += cl.w * Math.exp(-(dx * dx + dy * dy) * 0.62);
        }
        // 滇池水面弱化
        if (lon > 102.615 && lon < 102.735 && lat < 24.985 && lat > 24.885) {
          const ld = Math.min(1, Math.max(0, (24.985 - lat) / 0.03 + (lon - 102.615) / 0.05));
          v *= .18 * ld + .04;
        }
        field[y * W + x] = v;
        if (v > max) max = v;
      }
    }
    const stops = [
      [0.00, [30, 180, 110, 0]],
      [0.14, [46, 204, 113, 38]],
      [0.30, [126, 231, 135, 96]],
      [0.46, [255, 197, 61, 140]],
      [0.62, [255, 138, 31, 180]],
      [0.80, [255, 59, 92, 214]],
      [1.00, [255, 8, 55, 240]]
    ];
    for (let i = 0; i < total; i++) {
      let v = field[i] / max;
      v = Math.pow(v, 0.86);
      v = Math.max(0, Math.min(1, v));
      const s4 = i * 4;
      if (v < 0.11) { data[s4 + 3] = 0; continue; }
      let a = stops[0], b = stops[stops.length - 1];
      for (let k = 0; k < stops.length - 1; k++) {
        if (v >= stops[k][0] && v <= stops[k + 1][0]) { a = stops[k]; b = stops[k + 1]; break; }
      }
      const t = (v - a[0]) / (b[0] - a[0] || 1);
      data[s4] = a[1][0] + (b[1][0] - a[1][0]) * t;
      data[s4 + 1] = a[1][1] + (b[1][1] - a[1][1]) * t;
      data[s4 + 2] = a[1][2] + (b[1][2] - a[1][2]) * t;
      data[s4 + 3] = (a[1][3] + (b[1][3] - a[1][3]) * t) * (0.92 + 0.08 * Math.sin(i * 1.7));
    }
    ctx.putImageData(img, 0, 0);
    // 轻微模糊，贴近真实热力图
    const blur = document.createElement('canvas');
    blur.width = W; blur.height = H;
    const bctx = blur.getContext('2d');
    bctx.filter = 'blur(1.1px)';
    bctx.drawImage(cvs, 0, 0);
    return blur;
  }

  const HeatLayer = L.Layer.extend({
    initialize(bounds, img) {
      this._bounds = bounds;
      this._img = img;
      this._opacity = 0.92;
    },
    onAdd(m) {
      this._map = m;
      this._canvas = L.DomUtil.create('canvas', 'heat-canvas');
      this._canvas.style.cssText = 'position:absolute;pointer-events:none;transition:opacity .45s;';
      this._canvas.style.opacity = this._opacity;
      m.getPane('heatPane').appendChild(this._canvas);
      m.on('moveend zoomend resize viewreset', this._redraw, this);
      this._redraw();
    },
    onRemove(m) {
      m.off('moveend zoomend resize viewreset', this._redraw, this);
      if (this._canvas) this._canvas.remove();
    },
    setOpacity(o) {
      this._opacity = o;
      if (this._canvas) this._canvas.style.opacity = o;
    },
    _redraw() {
      if (!this._map || !this._canvas) return;
      const nw = this._map.latLngToLayerPoint([this._bounds.n, this._bounds.w]);
      const se = this._map.latLngToLayerPoint([this._bounds.s, this._bounds.e]);
      const w = Math.max(1, Math.round(se.x - nw.x)), h = Math.max(1, Math.round(se.y - nw.y));
      this._canvas.width = w; this._canvas.height = h;
      this._canvas.style.width = w + 'px'; this._canvas.style.height = h + 'px';
      L.DomUtil.setPosition(this._canvas, nw);
      const ctx = this._canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(this._img, 0, 0, w, h);
    }
  });

  /* ---------------------------- 图层 ---------------------------- */
  function initMap() {
    map = L.map('mainMap', {
      zoomControl: false, attributionControl: false, preferCanvas: true,
      minZoom: 9, maxZoom: 18, zoomSnap: .5, maxBoundsViscosity: .8
    }).setView(CITY_VIEW.center, CITY_VIEW.zoom);
    map.setMaxBounds([[24.20, 101.90], [26.95, 103.62]]);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18, minZoom: 9, crossOrigin: true
    }).addTo(map);
    map.createPane('heatPane');
    map.getPane('heatPane').style.zIndex = 350;
    map.getPane('heatPane').style.pointerEvents = 'none';

    heatImg = buildHeatImage();
    heatLayer = new HeatLayer(HEAT_BOUNDS, heatImg).addTo(map);
    heatLayer.setOpacity(0.92);

    // 行政区划
    districtLayer = L.geoJSON(window.KUNMING_GEO, {
      style: f => ({
        color: 'rgba(56,196,255,.26)', weight: 1, opacity: .9,
        fillColor: '#0b3b5e', fillOpacity: .035, dashArray: '5 5'
      }),
      onEachFeature: (f, lyr) => {
        lyr.on('mouseover', () => lyr.setStyle({ color: 'rgba(90,220,255,.7)', fillOpacity: .07, weight: 1.4 }));
        lyr.on('mouseout', () => districtLayer.resetStyle(lyr));
      }
    }).addTo(map);

    // 地名 / 区划标注
    labelGroup = L.layerGroup().addTo(map);
    const mainDistricts = ['五华区', '盘龙区', '官渡区', '西山区', '呈贡区', '晋宁区'];
    window.KUNMING_GEO.features.forEach(f => {
      if (!mainDistricts.includes(f.properties.name)) return;
      const c = f.properties.center || f.properties.centroid;
      if (!c) return;
      L.marker([c[1], c[0]], {
        icon: L.divIcon({ className: 'district-label', html: f.properties.name, iconSize: [0, 0] }),
        interactive: false, keyboard: false
      }).addTo(labelGroup);
    });
    window.LANDMARKS.forEach(lm => {
      L.marker([lm.lat, lm.lon], {
        icon: L.divIcon({ className: 'landmark-label', html: `<span>·&nbsp;${lm.name}</span>`, iconSize: [0, 0] }),
        interactive: false, keyboard: false
      }).addTo(labelGroup);
    });

    // 风险围斑
    boxesGroup = L.layerGroup().addTo(map);
    renderBoxes();

    // 重点建筑
    markersGroup = L.layerGroup().addTo(map);
    renderMarkers();

    // 监管对象（抽样）
    metroGroup = L.layerGroup().addTo(map);
    renderMetro();
    pitGroup = L.layerGroup().addTo(map);
    renderPits();
    dangerGroup = L.layerGroup().addTo(map);
    renderDangerous();

    // CIM 体块
    cimGroup = L.layerGroup();
    buildCim();

    map.on('click', () => { hidePreview(); });
    map.on('mousemove', e => {
      const c = $('#coordReadout');
      if (c) c.textContent = `${e.latlng.lng.toFixed(4)}°E, ${e.latlng.lat.toFixed(4)}°N`;
    });
    map.on('zoomend', () => { if (state.layers.cim && map.getZoom() < 12) cimGroup.remove(); else if (state.layers.cim) cimGroup.addTo(map); });
    setTimeout(() => map.invalidateSize(), 120);
  }

  function renderMarkers() {
    markersGroup.clearLayers();
    const filtered = filteredBuildings();
    filtered.forEach(b => {
      const color = APP.riskColor(b.risk);
      const icon = L.divIcon({
        className: '',
        html: `<div class="hotspot-marker" style="--c:${color}">
          <span class="hm-ring"></span><span class="hm-ring2"></span><span class="hm-core"></span></div>`,
        iconSize: [26, 26], iconAnchor: [13, 13]
      });
      const m = L.marker([b.lat, b.lon], { icon, riseOnHover: true, zIndexOffset: 200 });
      m.bindTooltip(`<b style="color:#fff">${b.name}</b>&nbsp; <span style="color:${color}">${b.rate} mm/年</span>`, {
        className: 'map-tip', direction: 'top', offset: [0, -12], opacity: 1
      });
      m.on('click', e => { L.DomEvent.stopPropagation(e); showPreview(b); });
      m.addTo(markersGroup);
    });
    // 城市中心光点
  }

  function renderBoxes() {
    boxesGroup.clearLayers();
    filteredBuildings().forEach((b, i) => {
      const box = window.RISK_BOXES.find(x => x.buildingId === b.id);
      if (!box) return;
      const rect = L.rectangle(box.bounds, {
        color: box.color, weight: 1.4, opacity: .85, fillColor: box.color, fillOpacity: .045,
        dashArray: '7 5', className: 'risk-box'
      });
      rect.bindTooltip(b.name + ' · ' + APP.riskLabel(b.risk), { permanent: false, className: 'map-tip', direction: 'top' });
      rect.on('click', e => { L.DomEvent.stopPropagation(e); showPreview(b); });
      rect.addTo(boxesGroup);
    });
  }

  function buildCim() {
    cimGroup.clearLayers();
    const rand = APP.seed(20260803);
    window.RISK_BOXES.forEach(box => {
      const b = APP.building(box.buildingId);
      for (let i = 0; i < 8; i++) {
        const lat = b.lat + (rand() - .5) * .0055;
        const lon = b.lon + (rand() - .5) * .0065;
        const h = 18 + rand() * 34;
        const w = 8 + rand() * 12;
        const icon = L.divIcon({
          className: '',
          html: `<div class="cim-block" style="--h:${h.toFixed(0)}px;--w:${w.toFixed(0)}px"><i class="cb-top"></i><i class="cb-face"></i><i class="cb-side"></i></div>`,
          iconSize: [w, h], iconAnchor: [w / 2, h]
        });
        L.marker([lat, lon], { icon, interactive: false }).addTo(cimGroup);
      }
    });
  }

  /* ---------------------------- 监管对象图层 ---------------------------- */
  function corridor(coords, meters) {
    const lat0 = coords[Math.floor(coords.length / 2)][0];
    const mPerLat = 111000, mPerLon = 111000 * Math.cos(lat0 * Math.PI / 180);
    const left = [], right = [];
    coords.forEach((c, i) => {
      const prev = coords[Math.max(0, i - 1)], next = coords[Math.min(coords.length - 1, i + 1)];
      const dx = next[1] - prev[1], dy = next[0] - prev[0];
      const len = Math.hypot(dx * mPerLon, dy * mPerLat) || 1;
      const px = -(dy * mPerLat) / len, py = (dx * mPerLon) / len;
      const dLat = py * meters / mPerLat, dLon = px * meters / mPerLon;
      left.push([c[0] + dLat, c[1] + dLon]);
      right.push([c[0] - dLat, c[1] - dLon]);
    });
    return left.concat(right.reverse());
  }

  function renderPits() {
    pitGroup.clearLayers();
    window.PITS.forEach(p => {
      const color = APP.riskColor(p.risk);
      L.circle([p.lat, p.lon], {
        radius: p.radius, color, weight: 1.1, opacity: .5,
        fillColor: color, fillOpacity: .045, dashArray: '7 6', interactive: false
      }).addTo(pitGroup);
      L.circle([p.lat, p.lon], {
        radius: Math.round(p.radius / 2), color, weight: 1, opacity: .8,
        fillColor: color, fillOpacity: .055, interactive: false
      }).addTo(pitGroup);
      const icon = L.divIcon({
        className: '',
        html: `<div class="site-pin pit" style="--c:${color}"><span class="sp-ring"></span><span class="sp-core">基坑</span></div>`,
        iconSize: [40, 26], iconAnchor: [20, 13]
      });
      const m = L.marker([p.lat, p.lon], { icon, riseOnHover: true, zIndexOffset: 320 });
      m.bindTooltip(`<b style="color:#fff">${p.name}</b><br/><span style="color:${color}">${APP.riskLabel(p.risk)} · 开挖 ${p.depth} m</span>`, {
        className: 'map-tip', direction: 'top', offset: [0, -12], opacity: 1
      });
      m.on('click', e => { L.DomEvent.stopPropagation(e); showSitePreview(p); });
      m.addTo(pitGroup);
    });
  }

  function renderMetro() {
    metroGroup.clearLayers();
    const M = window.METRO;
    L.polygon(corridor(M.line, 100), {
      color: 'rgba(56,217,255,.42)', weight: 1, fillColor: '#38d9ff', fillOpacity: .07, interactive: false
    }).addTo(metroGroup);
    L.polygon(corridor(M.line, 50), {
      color: 'rgba(56,217,255,.55)', weight: 1, dashArray: '4 4', fillColor: '#38d9ff', fillOpacity: .08, interactive: false
    }).addTo(metroGroup);
    L.polyline(M.line, { color: '#38d9ff', weight: 2.6, opacity: .85, interactive: false }).addTo(metroGroup);
    M.stations.forEach(s => {
      L.circleMarker([s.lat, s.lon], {
        radius: 3.2, color: '#8fe8ff', weight: 1, fillColor: '#0b2a44', fillOpacity: 1
      }).bindTooltip(s.name, { className: 'map-tip', direction: 'top', offset: [0, -6], opacity: 1 }).addTo(metroGroup);
    });
    M.segments.forEach(sg => {
      const color = APP.riskColor(sg.risk);
      const icon = L.divIcon({
        className: '',
        html: `<div class="site-pin metro" style="--c:${color}"><span class="sp-ring"></span><span class="sp-core">区间</span></div>`,
        iconSize: [44, 26], iconAnchor: [22, 13]
      });
      const m = L.marker([sg.lat, sg.lon], { icon, riseOnHover: true, zIndexOffset: 280 });
      m.bindTooltip(`<b style="color:#fff">${sg.name}</b><br/><span style="color:${color}">${APP.riskLabel(sg.risk)} · 沿线 ${sg.buildings} 栋</span>`, {
        className: 'map-tip', direction: 'top', offset: [0, -12], opacity: 1
      });
      m.on('click', e => { L.DomEvent.stopPropagation(e); showSitePreview(sg); });
      m.addTo(metroGroup);
    });
  }

  function renderDangerous() {
    dangerGroup.clearLayers();
    window.DANGER_HOUSES.forEach(d => {
      const color = APP.riskColor(d.risk);
      const icon = L.divIcon({
        className: '',
        html: `<div class="site-pin danger" style="--c:${color}"><span class="sp-ring"></span><span class="sp-core">${d.level}</span></div>`,
        iconSize: [30, 26], iconAnchor: [15, 13]
      });
      const m = L.marker([d.lat, d.lon], { icon, riseOnHover: true, zIndexOffset: 300 });
      m.bindTooltip(`<b style="color:#fff">${d.name}</b><br/><span style="color:${color}">${d.level} 级危房 · ${d.households} 户 / ${d.occupants} 人</span>`, {
        className: 'map-tip', direction: 'top', offset: [0, -12], opacity: 1
      });
      m.on('click', e => { L.DomEvent.stopPropagation(e); showSitePreview(d); });
      m.addTo(dangerGroup);
    });
  }

  /* ---------------------------- 监管对象预览 ---------------------------- */
  function siteTypeName(s) {
    return s.type === 'pit' ? '在建深基坑' : s.type === 'metro' ? '地铁沿线保护区' : '危旧房';
  }

  function showSitePreview(s) {
    hidePreview();
    const color = APP.riskColor(s.risk);
    const body = $('#spBody');
    let stats = '', rows = '', addr = '';
    if (s.type === 'pit') {
      addr = `${s.district} · ${s.stage} · ${s.progress}`;
      stats = `<div><span>开挖深度</span><b>${s.depth}</b><em>m</em></div>
        <div><span>影响半径 2H</span><b>${s.radius}</b><em>m</em></div>
        <div><span>周边建筑</span><b>${s.affected.length}</b><em>栋</em></div>`;
      rows = `<div><span>建设单位</span><b>${s.builder}</b></div>
        <div><span>施工单位</span><b>${s.contractor}</b></div>
        <div><span>自动化监测</span><b>${s.monitor}</b></div>`;
    } else if (s.type === 'metro') {
      addr = `${s.district} · ${s.line} · 保护区 ${s.protect.includes('50m') ? '50 / 100 m' : '按地方规定'}`;
      stats = `<div><span>区间长度</span><b>${s.length}</b><em>km</em></div>
        <div><span>沿线建筑</span><b>${s.buildings}</b><em>栋</em></div>
        <div><span>待处置</span><b>${s.alerts}</b><em>条</em></div>`;
      rows = `<div><span>运营单位</span><b>${s.operator}</b></div>
        <div><span>保护范围</span><b>${s.protect}</b></div>
        <div><span>当前状态</span><b>${s.state}</b></div>`;
    } else {
      addr = `${s.district} · ${s.use} · 鉴定于 ${s.identified}`;
      stats = `<div><span>鉴定等级</span><b>${s.level}</b><em>级</em></div>
        <div><span>房龄</span><b>${2026 - s.year}</b><em>年</em></div>
        <div><span>住人</span><b>${s.occupants}</b><em>人</em></div>`;
      rows = `<div><span>结构类型</span><b>${s.structure}</b></div>
        <div><span>建筑面积</span><b>${s.area} m²</b></div>
        <div><span>主要隐患</span><b>${s.note}</b></div>`;
    }
    body.innerHTML = `
      <div class="bp-head">
        <span class="bp-risk" style="color:${color};border-color:${color}55;background:${color}18">${APP.riskLabel(s.risk)}</span>
        <span class="bp-code">${s.id}</span>
      </div>
      <div class="sp-type">${siteTypeName(s)}</div>
      <h4>${s.name}</h4>
      <p class="bp-addr">${addr}</p>
      <div class="bp-stats">${stats}</div>
      <div class="sp-meta">${rows}</div>
      <div class="bp-actions">
        <button class="btn btn-ghost" id="spDispatch"><svg><use href="#i-send"></use></svg>派发处置单</button>
        <button class="btn btn-primary" id="spOpen"><svg><use href="#i-arrow-left"></use></svg>进入专题监管</button>
      </div>`;
    $('#sitePreview').classList.add('show');
    $('#spClose').onclick = hideSitePreview;
    $('#spDispatch').onclick = () => {
      APP.toast(`已生成处置单：${s.name} · 责任单位待签收`, 'ok', '监管派单');
    };
    $('#spOpen').onclick = () => {
      state.regTab = s.type;
      APP.go('regulate');
      setTimeout(() => APP.regApi && APP.regApi.setTab(s.type), 160);
    };
    if (map.getZoom() < 12.5) map.flyTo([s.lat, s.lon], 14, { duration: .9 });
    else map.panTo([s.lat, s.lon], { animate: true, duration: .6 });
  }

  function hideSitePreview() {
    const el = $('#sitePreview');
    if (el) el.classList.remove('show');
  }

  function filteredBuildings() {
    return window.BUILDINGS.filter(b => {
      if (state.district !== 'all' && b.district !== state.district) return false;
      if (state.risk !== 'all' && b.risk !== state.risk) return false;
      if (state.type !== 'all' && b.type !== state.type) return false;
      return true;
    });
  }

  /* ---------------------------- 右侧统计 ---------------------------- */
  function initStats() {
    const meta = window.RISK_META;
    const el = $('#rateLegend');
    el.innerHTML = RATE_CLASSES.map(r => `<div class="rl-item"><i style="background:${r.c};color:${r.c}"></i>${r.label}</div>`).join('');

    const donut = APP.chart('riskDonut');
    donut.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, { trigger: 'item', formatter: p => `${p.name}<br/><b style="font-size:12px">${p.value.toLocaleString()}</b> 栋 · ${p.percent}%` }),
      title: {
        text: '12,847', subtext: '总计', left: 'center', top: '34%',
        textStyle: { color: '#f0fbff', fontSize: 19, fontFamily: 'Bahnschrift', fontWeight: 500 },
        subtextStyle: { color: '#6d8ba4', fontSize: 8 }
      },
      series: [{
        type: 'pie', radius: ['64%', '86%'], center: ['50%', '51%'],
        avoidLabelOverlap: true, label: { show: false }, labelLine: { show: false },
        itemStyle: { borderColor: '#07182b', borderWidth: 2 },
        emphasis: { scale: true, scaleSize: 4, itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,180,255,.35)' } },
        data: [
          { value: meta.red && window.CITY_STATS.red, name: '红色预警', itemStyle: { color: meta.red.color } },
          { value: window.CITY_STATS.orange, name: '橙色预警', itemStyle: { color: meta.orange.color } },
          { value: window.CITY_STATS.yellow, name: '黄色预警', itemStyle: { color: meta.yellow.color } },
          { value: window.CITY_STATS.green, name: '正常', itemStyle: { color: meta.green.color } }
        ]
      }]
    });
    donut.off('click');
    donut.on('click', p => quickRisk(['red', 'orange', 'yellow', 'green'][p.dataIndex]));

    $$('#riskLegend li').forEach(li => li.onclick = () => quickRisk(li.dataset.risk));

    trendChart = APP.chart('trendMini');
    updateTrend(11);

    // 预览 spark
    previewSparkChart = null;
  }

  function updateTrend(month) {
    if (!trendChart) return;
    const data = window.RATE_TREND;
    trendChart.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, {
        trigger: 'axis', formatter: ps => `${ps[0].axisValue}<br/>最大沉降速率 <b style="color:#ff8a9f">${ps[0].data} mm/年</b>`
      }),
      grid: { left: 33, right: 25, top: 16, bottom: 18 },
      xAxis: APP.axis({
        type: 'category', data: window.MONTHS, boundaryGap: false,
        axisLabel: { color: '#617f98', fontSize: 7, interval: 2, fontFamily: 'Bahnschrift' },
        splitLine: { show: false }
      }),
      yAxis: APP.axis({
        type: 'value', min: -32, max: -6, interval: 10,
        axisLabel: { color: '#617f98', fontSize: 7.5, fontFamily: 'Bahnschrift' },
        splitLine: { lineStyle: { color: 'rgba(86,150,200,.08)', type: 'dashed' } }
      }),
      series: [{
        type: 'line', data, smooth: .3, symbol: 'circle', symbolSize: 3,
        itemStyle: { color: '#38d9ff' },
        lineStyle: {
          width: 1.6, color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#22d67d' }, { offset: .55, color: '#ffc53d' }, { offset: 1, color: '#ff3b5c' }
          ])
        },
        areaStyle: {
          opacity: 1, color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,197,61,.22)' }, { offset: 1, color: 'rgba(255,59,92,0)' }
          ])
        },
        markPoint: {
          symbol: 'circle', symbolSize: 6,
          itemStyle: { color: '#fff', borderColor: '#ff3b5c', borderWidth: 1.5, shadowBlur: 8, shadowColor: '#ff3b5c' },
          label: {
            show: true, position: 'right', offset: [2, 0], color: '#ff9aab',
            fontFamily: 'Bahnschrift', fontSize: 9, formatter: p => p.value.toFixed(1)
          },
          data: [{ coord: [month, data[month]], value: data[month] }]
        }
      }]
    });
  }

  function quickRisk(risk) {
    const sel = $('#filterRisk');
    state.risk = risk;
    sel.value = risk === 'green' ? 'green' : risk;
    renderMarkers(); renderBoxes();
    const n = filteredBuildings().length;
    if (risk === 'green') {
      APP.toast('正常建筑 12,657 栋（98.52%），当前视图展示重点监测建筑 12 栋', 'info', '风险筛选');
    } else {
      APP.toast(`已聚焦${APP.riskLabel(risk)}建筑，当前视图 ${n} 栋重点建筑`, 'info', '风险筛选');
    }
  }

  /* ---------------------------- 时间轴 ---------------------------- */
  function initTimeline() {
    const ticks = $('#tlTicks');
    ticks.innerHTML = window.MONTHS.map((_, i) => `<i data-i="${i}"></i>`).join('');
    const range = $('#tlRange');
    range.addEventListener('input', () => { stopPlay(); setMonth(+range.value); });
    $('#tlPlay').addEventListener('click', togglePlay);
    setMonth(11);
  }

  function setMonth(m) {
    state.month = m;
    $('#tlLabel').textContent = window.MONTHS[m];
    $('#tlRange').value = m;
    $$('#tlTicks i').forEach((t, i) => t.classList.toggle('on', i <= m));
    if (heatLayer) heatLayer.setOpacity(0.48 + m * 0.041);
    const rate = window.RATE_TREND[m];
    const mc = $('.mc-value');
    if (mc) mc.innerHTML = `${rate.toFixed(1)}<span>mm/年</span>`;
    updateTrend(m);
  }

  function togglePlay() {
    if (state.playing) { stopPlay(); return; }
    state.playing = true;
    $('#tlPlay').innerHTML = APP.icon('i-pause');
    $('#tlPlay').style.color = '#ffd469';
    if (state.month >= 11) setMonth(0);
    tlTimer = setInterval(() => {
      const next = state.month + 1;
      if (next > 11) { stopPlay(); return; }
      setMonth(next);
    }, 900);
  }
  function stopPlay() {
    state.playing = false;
    clearInterval(tlTimer);
    tlTimer = null;
    const btn = $('#tlPlay');
    btn.innerHTML = APP.icon('i-play');
    btn.style.color = '';
  }

  /* ---------------------------- 预览 ---------------------------- */
  function showPreview(b) {
    hideSitePreview();
    const card = $('#buildingPreview');
    $('#bpRisk').textContent = APP.riskLabel(b.risk);
    $('#bpRisk').style.cssText = `color:${APP.riskColor(b.risk)};border-color:${APP.riskColor(b.risk)}55;background:${APP.riskColor(b.risk)}18`;
    $('#bpCode').textContent = b.id;
    $('#bpName').textContent = b.name;
    $('#bpAddr').textContent = b.address;
    $('#bpRate').textContent = b.rate.toFixed(1);
    $('#bpCum').textContent = b.cumulative.toFixed(1);
    $('#bpScore').textContent = b.score.toFixed(1);
    $('#bpSpark').innerHTML = APP.sparkline(APP.buildingRates(b).slice().reverse(), APP.riskColor(b.risk));
    card.classList.add('show');
    state.previewId = b.id;
    const btnD = $('#bpDetail');
    btnD.onclick = () => { state.buildingId = b.id; APP.go('building'); APP.buildingApi && APP.buildingApi.setBuilding(b.id); };
    $('#bpAi').onclick = () => { state.aiBuildingId = b.id; APP.go('ai'); APP.aiApi && APP.aiApi.setBuilding(b.id); };
    if (map.getZoom() < 12.5) map.flyTo([b.lat, b.lon], 13.5, { duration: .9 });
    else map.panTo([b.lat, b.lon], { animate: true, duration: .6 });
  }
  function hidePreview() {
    const card = $('#buildingPreview');
    if (card) card.classList.remove('show');
    hideSitePreview();
  }
  APP.hideBuildingPreview = hidePreview;

  /* ---------------------------- 交互 ---------------------------- */
  function bindUI() {
    // 图层开关
    $$('.switch[data-layer]').forEach(sw => {
      sw.addEventListener('click', () => {
        const key = sw.dataset.layer;
        state.layers[key] = !state.layers[key];
        sw.classList.toggle('is-on', state.layers[key]);
        applyLayer(key);
      });
    });

    // 筛选
    $('#filterApply').addEventListener('click', () => {
      state.district = $('#filterDistrict').value;
      state.risk = $('#filterRisk').value;
      state.type = $('#filterType').value;
      renderMarkers(); renderBoxes();
      if (state.district !== 'all') {
        const f = window.KUNMING_GEO.features.find(x => x.properties.name === state.district);
        if (f) {
          const b = L.geoJSON(f).getBounds();
          map.fitBounds(b, { paddingTopLeft: [310, 50], paddingBottomRight: [370, 80] });
        }
      } else {
        map.flyTo(CITY_VIEW.center, CITY_VIEW.zoom, { duration: .8 });
      }
      const n = filteredBuildings().length;
      APP.toast(`筛选结果：${n} 栋重点监测建筑`, n ? 'ok' : 'warn', '空间筛选');
    });
    $('#filterReset').addEventListener('click', () => {
      $('#filterDistrict').value = 'all';
      $('#filterRisk').value = 'all';
      $('#filterType').value = 'all';
      state.district = 'all'; state.risk = 'all'; state.type = 'all';
      renderMarkers(); renderBoxes();
      map.flyTo(CITY_VIEW.center, CITY_VIEW.zoom, { duration: .8 });
      APP.toast('筛选条件已重置', 'ok', '空间筛选');
    });

    // 工具条
    $$('.map-toolbar button').forEach(btn => {
      btn.addEventListener('click', () => mapAction(btn.dataset.mapAction, btn));
    });

    // 搜索
    const input = $('#searchInput'), dropdown = $('#searchDropdown');
    const searchData = [];
    window.BUILDINGS.forEach(b => searchData.push({ type: 'building', label: b.name, sub: b.district + ' · ' + APP.riskLabel(b.risk), id: b.id }));
    window.LANDMARKS.forEach(l => searchData.push({ type: 'landmark', label: l.name, sub: l.kind, id: l.name, lat: l.lat, lon: l.lon }));
    window.ALERTS.forEach(a => searchData.push({ type: 'alert', label: a.buildingId, sub: a.id + ' · ' + a.type, id: a.id, alert: a }));
    window.PITS.forEach(p => searchData.push({ type: 'site', label: p.name, sub: '深基坑 · ' + p.district, id: p.id }));
    window.METRO.segments.forEach(s => searchData.push({ type: 'site', label: s.name, sub: '地铁沿线 · ' + s.district, id: s.id }));
    window.DANGER_HOUSES.forEach(d => searchData.push({ type: 'site', label: d.name, sub: `${d.level} 级危房 · ${d.district}`, id: d.id }));

    function renderSearch(q) {
      const kw = q.trim();
      if (!kw) {
        dropdown.innerHTML = `<div class="sd-empty">输入建筑名称、地名或预警编号</div>`;
        return;
      }
      const res = searchData.filter(d => (d.label + d.sub).toLowerCase().includes(kw.toLowerCase())).slice(0, 7);
      if (!res.length) { dropdown.innerHTML = `<div class="sd-empty">未找到 “${APP.esc(kw)}” 相关结果</div>`; return; }
      dropdown.innerHTML = res.map(d => {
        const ico = d.type === 'building' ? 'i-building' : d.type === 'alert' ? 'i-bell' : d.type === 'site' ? 'i-shield' : 'i-pin';
        return `<div class="sd-item" data-type="${d.type}" data-id="${d.id}">
          <span class="sd-ic">${APP.icon(ico)}</span><b>${APP.esc(d.label)}</b><span>${APP.esc(d.sub)}</span></div>`;
      }).join('');
      $$('.sd-item', dropdown).forEach(it => it.addEventListener('click', () => {
        const d = res.find(x => x.id === it.dataset.id && x.type === it.dataset.type);
        dropdown.classList.remove('show');
        input.value = '';
        if (!d) return;
        if (d.type === 'building') { const b = APP.building(d.id); showPreview(b); }
        else if (d.type === 'site') { showSitePreview(APP.site(d.id)); }
        else if (d.type === 'landmark') { map.flyTo([d.lat, d.lon], 14, { duration: 1 }); APP.toast(`已定位到 ${d.label}`, 'ok', '地图定位'); }
        else { APP.go('alert'); setTimeout(() => APP.alertApi && APP.alertApi.select(d.id), 200); }
      }));
    }
    input.addEventListener('input', () => { renderSearch(input.value); dropdown.classList.add('show'); });
    input.addEventListener('focus', () => { renderSearch(input.value); dropdown.classList.add('show'); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = $('.sd-item', dropdown);
        if (first) first.click();
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#searchBox')) dropdown.classList.remove('show');
    });
    dropdown.addEventListener('mousedown', e => e.stopPropagation());

    $('#bpClose').addEventListener('click', hidePreview);
    window.addEventListener('resize', () => { if (map) setTimeout(() => map.invalidateSize(), 80); });
  }

  function applyLayer(key) {
    const on = state.layers[key];
    if (key === 'heat') { on ? heatLayer.addTo(map) : map.removeLayer(heatLayer); }
    if (key === 'buildings') { on ? markersGroup.addTo(map) : map.removeLayer(markersGroup); }
    if (key === 'boxes') { on ? boxesGroup.addTo(map) : map.removeLayer(boxesGroup); }
    if (key === 'districts') { on ? districtLayer.addTo(map) : map.removeLayer(districtLayer); }
    if (key === 'labels') { on ? labelGroup.addTo(map) : map.removeLayer(labelGroup); }
    if (key === 'pits') { on ? pitGroup.addTo(map) : map.removeLayer(pitGroup); }
    if (key === 'metro') { on ? metroGroup.addTo(map) : map.removeLayer(metroGroup); }
    if (key === 'dangerous') { on ? dangerGroup.addTo(map) : map.removeLayer(dangerGroup); }
    if (key === 'cim') {
      if (on) { cimGroup.addTo(map); APP.toast('CIM LOD1 体块已叠加（示意）', 'info', '图层控制'); }
      else map.removeLayer(cimGroup);
    }
  }

  function mapAction(action, btn) {
    switch (action) {
      case 'in': map.zoomIn(); break;
      case 'out': map.zoomOut(); break;
      case 'fit':
        map.flyTo(CITY_VIEW.center, CITY_VIEW.zoom, { duration: .9 });
        APP.toast('已返回昆明市主城区全图', 'info', '地图操作');
        break;
      case 'legend':
        $('#mapLegend').classList.toggle('hide');
        btn.classList.toggle('is-active');
        break;
      case 'refresh':
        renderMarkers(); renderBoxes(); setMonth(11); hidePreview();
        map.flyTo(CITY_VIEW.center, CITY_VIEW.zoom, { duration: .9 });
        APP.toast('数据已刷新 · 2026-08-03 07:30', 'ok', '数据同步');
        break;
      case 'clear':
        if (measure.layer) measure.layer.clearLayers();
        measure.pts = []; hidePreview();
        APP.toast('已清除标注与选择', 'info');
        break;
      case 'measure':
        toggleMeasure(btn);
        break;
    }
  }

  function toggleMeasure(btn) {
    measure.on = !measure.on;
    btn.classList.toggle('is-active', measure.on);
    map.getContainer().classList.toggle('leaflet-crosshair', measure.on);
    if (!measure.layer) measure.layer = L.layerGroup().addTo(map);
    if (measure.on) APP.toast('测距已开启：点击地图依次选取节点，右键结束', 'info', '测距工具');
    else { measure.pts = []; measure.layer.clearLayers(); APP.toast('测距已关闭', 'info'); }
  }

  function initMeasure() {
    map.on('click', e => {
      if (!measure.on) return;
      measure.pts.push(e.latlng);
      L.circleMarker(e.latlng, { radius: 3.5, color: '#38d9ff', fillColor: '#fff', fillOpacity: 1, weight: 1.5 }).addTo(measure.layer);
      if (measure.pts.length > 1) {
        const a = measure.pts[measure.pts.length - 2], b = measure.pts[measure.pts.length - 1];
        L.polyline([a, b], { color: '#38d9ff', weight: 1.6, dashArray: '5 4', opacity: .9 }).addTo(measure.layer);
        const d = map.distance(a, b);
        const total = measure.pts.reduce((s, p, i) => i ? s + map.distance(measure.pts[i - 1], p) : 0, 0);
        const txt = d > 1000 ? (d / 1000).toFixed(2) + ' km' : d.toFixed(0) + ' m';
        const tot = total > 1000 ? (total / 1000).toFixed(2) + ' km' : total.toFixed(0) + ' m';
        L.tooltip({ permanent: true, className: 'measure-tip', direction: 'center', offset: [0, -4] })
          .setLatLng(L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2))
          .setContent(`${txt} · 累计 ${tot}`).addTo(measure.layer);
      }
      if (measure.pts.length > 5) {
        measure.layer.clearLayers(); measure.pts = [e.latlng];
      }
    });
    map.on('contextmenu', e => {
      if (!measure.on) return;
      L.DomEvent.preventDefault(e);
      measure.on = false;
      const btn = $('[data-map-action="measure"]');
      if (btn) btn.classList.remove('is-active');
      map.getContainer().classList.remove('leaflet-crosshair');
      APP.toast('测距完成', 'ok');
    });
  }

  /* ---------------------------- 初始化 ---------------------------- */
  APP.views.map = {
    init() {
      initMap();
      initStats();
      initTimeline();
      bindUI();
      initMeasure();
      $('#maxLocation').textContent = '五华区 东风东路88号';
    },
    resize() { if (map) setTimeout(() => map.invalidateSize(), 30); }
  };

})();
