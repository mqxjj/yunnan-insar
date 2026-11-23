/* ============================================================
   VIEW · InSAR 数据分析（PS 点云 / 升降轨 / 时序 / 精度验证）
   ============================================================ */
(function () {
  'use strict';
  const APP = window.APP, $ = APP.$, $$ = APP.$$, state = APP.state;

  const CITY = { center: [25.028, 102.729], zoom: 12 };
  const MONTHS36 = (() => {
    const out = [];
    for (let i = 0; i < 36; i++) {
      const d = new Date(2023, 8 + i, 1);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
  })();

  let map, psLayer, psPoints = [], selected = null;
  let histChart, seriesChart, scatterChart, yearChart;

  /* ---------------------------- PS 点云生成 ---------------------------- */
  function genPoints() {
    const rnd = APP.seed(20260803);
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 0.72;
    const totalW = window.HEAT_CLUSTERS.reduce((s, c) => s + c.w, 0);
    const out = [];
    let idn = 1;
    window.HEAT_CLUSTERS.forEach(cl => {
      const n = Math.round(4200 * cl.w / totalW);
      for (let i = 0; i < n; i++) {
        const lon = cl.lon + gauss() * cl.sx * 1.45;
        const lat = cl.lat + gauss() * cl.sy * 1.45;
        const dist = Math.hypot((lon - cl.lon) / cl.sx, (lat - cl.lat) / cl.sy);
        const coh = Math.max(0.32, Math.min(0.98, 0.93 - dist * 0.1 + (rnd() - .5) * 0.09));
        const base = -(2.4 + cl.w * 27) + (rnd() - .5) * 5;
        const vVert = +Math.max(-33, Math.min(1.5, base)).toFixed(1);
        const vLos = +(vVert * 1.28 + (rnd() - .5) * 1.1).toFixed(1);
        const vEast = +(vVert * 0.33 + (rnd() - .5) * 2.4).toFixed(1);
        out.push({
          id: 'PS-' + String(1000 + idn).slice(1), n: idn,
          lon, lat, coh: +coh.toFixed(2), vVert, vLos, vEast,
          vDiff: +(0.4 + rnd() * 2.5).toFixed(1)
        });
        idn++;
      }
    });
    return out;
  }

  function modeValue(p) {
    if (state.insarMode === 'los') return p.vLos;
    if (state.insarMode === 'east') return p.vEast;
    if (state.insarMode === '3d') return -Math.hypot(p.vVert, p.vEast);
    return p.vVert;
  }

  /* ---------------------------- 点云图层 ---------------------------- */
  const PsLayer = L.Layer.extend({
    initialize() { this._sel = null; },
    onAdd(m) {
      this._map = m;
      this._canvas = L.DomUtil.create('canvas', 'ps-canvas');
      this._canvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
      m.getPanes().overlayPane.appendChild(this._canvas);
      m.on('moveend zoomend resize viewreset', this._draw, this);
      this._draw();
    },
    onRemove(m) {
      m.off('moveend zoomend resize viewreset', this._draw, this);
      if (this._canvas) this._canvas.remove();
    },
    setSelected(p) { this._sel = p; this._draw(); },
    refresh() { this._draw(); },
    _draw() {
      const map = this._map, c = this._canvas;
      if (!map || !c) return;
      const size = map.getSize();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = size.x * dpr; c.height = size.y * dpr;
      c.style.width = size.x + 'px'; c.style.height = size.y + 'px';
      L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);
      const zoom = map.getZoom();
      const r = Math.max(1.2, 2.5 * Math.pow(1.17, zoom - 12));
      let visible = 0;
      for (let i = 0; i < psPoints.length; i++) {
        const p = psPoints[i];
        if (p.coh < state.coherence) continue;
        const pt = map.latLngToContainerPoint([p.lat, p.lon]);
        if (pt.x < -4 || pt.y < -4 || pt.x > size.x + 4 || pt.y > size.y + 4) continue;
        visible++;
        ctx.fillStyle = APP.velColor(modeValue(p));
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const vs = Math.round(1284563 * visible / psPoints.length);
      const lbl = $('#psVisible');
      if (lbl) lbl.textContent = '可见 PS 点 ' + vs.toLocaleString();
      if (this._sel) {
        const pt = map.latLngToContainerPoint([this._sel.lat, this._sel.lon]);
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 10, 0, 6.2832); ctx.stroke();
        ctx.strokeStyle = 'rgba(56,217,255,.9)';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 15, 0, 6.2832); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pt.x - 20, pt.y); ctx.lineTo(pt.x - 12, pt.y);
        ctx.moveTo(pt.x + 12, pt.y); ctx.lineTo(pt.x + 20, pt.y);
        ctx.moveTo(pt.x, pt.y - 20); ctx.lineTo(pt.x, pt.y - 12);
        ctx.moveTo(pt.x, pt.y + 12); ctx.lineTo(pt.x, pt.y + 20);
        ctx.stroke();
      }
    }
  });

  /* ---------------------------- 地图 ---------------------------- */
  function initMap() {
    map = L.map('insarMap', {
      zoomControl: false, attributionControl: false, preferCanvas: true,
      minZoom: 10, maxZoom: 17, zoomSnap: .5
    }).setView(CITY.center, CITY.zoom);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 17, minZoom: 10, crossOrigin: true
    }).addTo(map);

    L.geoJSON(window.KUNMING_GEO, {
      style: { color: 'rgba(56,196,255,.24)', weight: 1, fillOpacity: 0, dashArray: '5 5' },
      interactive: false
    }).addTo(map);

    psLayer = new PsLayer().addTo(map);

    window.BUILDINGS.forEach(b => {
      L.circleMarker([b.lat, b.lon], {
        radius: 3, color: '#eafcff', weight: 1,
        fillColor: APP.riskColor(b.risk), fillOpacity: 1
      }).bindTooltip(`${b.name} · ${b.rate} mm/年`, { className: 'map-tip', direction: 'top' }).addTo(map);
    });

    map.on('click', e => {
      const cp = map.latLngToContainerPoint(e.latlng);
      let best = null, bd = 16;
      psPoints.forEach(p => {
        if (p.coh < state.coherence) return;
        const q = map.latLngToContainerPoint([p.lat, p.lon]);
        const d = Math.hypot(q.x - cp.x, q.y - cp.y);
        if (d < bd) { bd = d; best = p; }
      });
      if (best) selectPoint(best);
    });

    setTimeout(() => map.invalidateSize(), 120);
  }

  /* ---------------------------- 左侧面板 ---------------------------- */
  function renderOrbit() {
    const o = window.INSAR.orbits.find(x => x.id === state.orbit);
    const tag = $('#orbitTag');
    if (tag) tag.textContent = (o.id === 'asc' ? 'ASC' : 'DESC') + ' · ' + o.track;
    const card = $('#orbitCard');
    if (!card) return;
    card.innerHTML = `<div class="orbit-head">
        <span class="oh-sat">${APP.icon('i-satellite')}</span>
        <div><b>${o.sat}</b><span>${o.name} · Track ${o.track}</span></div>
      </div>
      <div class="param-grid">
        <div><span>入射角</span><b>${o.angle}</b></div>
        <div><span>飞行方位</span><b>${o.heading}</b></div>
        <div><span>重访周期</span><b>${o.revisit}</b></div>
        <div><span>空间基线</span><b>${o.baseline}</b></div>
        <div><span>极化方式</span><b>${o.polarization}</b></div>
        <div><span>分辨率</span><b>${o.resolution}</b></div>
        <div><span>影像数量</span><b>${o.images}</b></div>
        <div><span>时间跨度</span><b>${o.period}</b></div>
      </div>
      <div class="orbit-foot"><i></i>最近过境 2026-08-01 · 数据链路正常</div>`;
  }

  function renderPanels() {
    const pl = $('#pipelineList');
    if (pl) pl.innerHTML = window.INSAR.pipeline.map(p => `<li>
      <span class="pl-dot">${APP.icon('i-check')}</span>
      <div class="pl-main">
        <div class="pl-top"><b>${p.name}</b><em>${p.cost}</em></div>
        <p>${p.desc}</p>
        <div class="pl-time">${p.time}<span>完成</span></div>
      </div></li>`).join('');

    const ql = $('#qualityList');
    if (ql) ql.innerHTML = window.INSAR.quality.map(q => `<div class="q-row">
      <span>${q.name}</span>
      <div class="q-bar"><i style="width:${q.pct}%"></i></div>
      <b class="q-val">${q.value}</b></div>`).join('');

    const rows = [
      ['数据源', 'Sentinel-1A/B 升降轨', 'C 波段 · 5.405 GHz'],
      ['处理算法', 'SBAS-InSAR + PS 联合解算', '时序反演 · 迭代回归'],
      ['影像数量', '1,248 景', '2024-08 ~ 2026-08'],
      ['干涉对', '1,248 对', '时空基线 150m / 48d'],
      ['相位解缠', 'SNAPHU 最小费用流', '成功率 97.4%'],
      ['大气校正', 'GACOS + 高程相关模型', '残差 1.2 mm'],
      ['参考基准', '昆明 CORS 站 KMCG', 'ITRF2014'],
      ['精度验证', '12 组水准点同期对比', 'RMSE ±2.8 mm']
    ];
    const tb = $('#insarParamTable');
    if (tb) tb.innerHTML = `<thead><tr><th>参数类别</th><th>取值 / 方法</th><th>说明</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="mt-num">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>`;
  }

  /* ---------------------------- 图表 ---------------------------- */
  function initCharts() {
    histChart = APP.chart('insarHist');
    histChart.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, {
        trigger: 'axis',
        formatter: ps => `${ps[0].axisValue} mm/年<br/>PS 点 <b>${Number(ps[0].value).toLocaleString()}</b> 个`
      }),
      grid: { left: 36, right: 8, top: 14, bottom: 20 },
      xAxis: APP.axis({
        type: 'category', data: window.INSAR.histogram.labels,
        axisLabel: { color: '#617f98', fontSize: 7.5, interval: 0, fontFamily: 'Bahnschrift' },
        splitLine: { show: false }
      }),
      yAxis: APP.axis({
        type: 'value',
        axisLabel: { color: '#617f98', fontSize: 7.5, formatter: v => v >= 1000 ? (v / 1000) + 'k' : v },
        splitLine: { lineStyle: { color: 'rgba(86,150,200,.08)', type: 'dashed' } }
      }),
      series: [{
        type: 'bar', barWidth: '58%',
        data: window.INSAR.histogram.counts.map((v, i) => ({
          value: v,
          itemStyle: {
            color: ['#ff3b5c', '#ff5a48', '#ff8a1f', '#ffb020', '#ffc53d', '#9bd85e', '#2ecc71', '#38d9ff'][i],
            borderRadius: [2, 2, 0, 0], opacity: .9
          }
        }))
      }]
    });

    seriesChart = APP.chart('insarSeries');
    scatterChart = APP.chart('insarScatter');
    renderScatter();
    yearChart = APP.chart('insarYear');
    renderYear();
  }

  function pointSeries(p) {
    const out = [];
    const rnd = APP.seed(p.n * 97 + 13);
    let cum = 0;
    for (let i = 0; i < 36; i++) {
      const season = Math.sin((i % 12) / 12 * Math.PI * 2) * 0.16;
      cum += p.vVert / 12 + season + (rnd() - .5) * 0.12;
      out.push(+cum.toFixed(2));
    }
    return out;
  }

  function renderPointChart(p) {
    const vals = pointSeries(p);
    seriesChart.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, {
        trigger: 'axis',
        formatter: ps => {
          const v = ps[0].data;
          return `${ps[0].axisValue}<br/>累计形变 <b style="color:${v < -20 ? '#ff8a9f' : '#5fe4ff'}">${v.toFixed(1)} mm</b>`;
        }
      }),
      grid: { left: 40, right: 12, top: 14, bottom: 18 },
      xAxis: APP.axis({
        type: 'category', data: MONTHS36, boundaryGap: false,
        axisLabel: { color: '#617f98', fontSize: 7, interval: 7, fontFamily: 'Bahnschrift' },
        splitLine: { show: false }
      }),
      yAxis: APP.axis({
        type: 'value',
        axisLabel: { color: '#617f98', fontSize: 7, formatter: v => v.toFixed(0) },
        splitLine: { lineStyle: { color: 'rgba(86,150,200,.08)', type: 'dashed' } }
      }),
      series: [{
        type: 'line', data: vals, smooth: .25, symbol: 'none',
        lineStyle: { width: 1.7, color: '#38d9ff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(56,217,255,.28)' }, { offset: 1, color: 'rgba(56,217,255,0)' }
          ])
        },
        markLine: {
          symbol: 'none', silent: true,
          lineStyle: { color: 'rgba(255,138,31,.55)', type: 'dashed', width: 1 },
          label: { color: '#ffa34d', fontSize: 7.5, formatter: '阈值 -25mm', position: 'insideEndTop' },
          data: [{ yAxis: -25 }]
        },
        markPoint: {
          symbol: 'circle', symbolSize: 6,
          itemStyle: { color: '#fff', borderColor: '#38d9ff', borderWidth: 1.5 },
          label: { color: '#9fe4ff', fontSize: 8, formatter: p => p.value.toFixed(1), position: 'top' },
          data: [{ coord: [35, vals[35]], value: vals[35] }]
        }
      }]
    });
    $('#pointTag').textContent = p.id;
    $('#pqV').textContent = p.vVert.toFixed(1);
    $('#pqC').textContent = p.coh.toFixed(2);
    $('#pqD').textContent = p.vDiff.toFixed(1);
  }

  function renderScatter() {
    const pts = window.INSAR.validation.map(v => [v.x, v.y, v.name, v.diff]);
    scatterChart.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, {
        trigger: 'item',
        formatter: d => d.seriesType === 'scatter'
          ? `${d.data[2]}<br/>InSAR <b>${d.data[0]}</b> · 水准 <b>${d.data[1]}</b><br/>偏差 ${d.data[3]} mm`
          : '1:1 参考线'
      }),
      grid: { left: 42, right: 14, top: 16, bottom: 26 },
      xAxis: APP.axis({
        type: 'value', min: -32, max: -6, name: 'InSAR mm/年',
        nameTextStyle: { color: '#5f7f9b', fontSize: 8, padding: [8, 0, 0, 0] },
        axisLabel: { color: '#617f98', fontSize: 7.5, fontFamily: 'Bahnschrift' }
      }),
      yAxis: APP.axis({
        type: 'value', min: -32, max: -6, name: '水准 mm/年',
        nameTextStyle: { color: '#5f7f9b', fontSize: 8, padding: [0, 0, 4, 0] },
        axisLabel: { color: '#617f98', fontSize: 7.5, fontFamily: 'Bahnschrift' }
      }),
      series: [
        {
          type: 'line', data: [[-32, -32], [-6, -6]], symbol: 'none',
          lineStyle: { color: 'rgba(140,190,225,.35)', type: 'dashed', width: 1 }, silent: true
        },
        {
          type: 'scatter', data: pts, symbolSize: 7,
          itemStyle: { color: '#38d9ff', borderColor: 'rgba(255,255,255,.65)', borderWidth: .8, shadowBlur: 8, shadowColor: 'rgba(56,217,255,.5)' }
        }
      ]
    });
  }

  function renderYear() {
    const y = window.INSAR.yearly;
    yearChart.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, {
        trigger: 'axis',
        formatter: ps => `${ps[0].axisValue} 年<br/>均值 <b>${ps[0].data} mm/年</b><br/>P95 <b style="color:#ff8a9f">${ps[1].data} mm/年</b>`
      }),
      legend: {
        right: 6, top: 0, itemWidth: 12, itemHeight: 5, itemGap: 10,
        textStyle: { color: '#7f9db5', fontSize: 8 }, data: ['年均速率', 'P95 速率']
      },
      grid: { left: 38, right: 12, top: 24, bottom: 20 },
      xAxis: APP.axis({
        type: 'category', data: y.years, boundaryGap: false,
        axisLabel: { color: '#617f98', fontSize: 8, fontFamily: 'Bahnschrift' },
        splitLine: { show: false }
      }),
      yAxis: APP.axis({
        type: 'value', min: -32, max: 0, interval: 10,
        axisLabel: { color: '#617f98', fontSize: 7.5, fontFamily: 'Bahnschrift' }
      }),
      series: [
        {
          name: '年均速率', type: 'line', data: y.mean, smooth: .3, symbol: 'circle', symbolSize: 3.5,
          lineStyle: { width: 1.5, color: '#22d67d' }, itemStyle: { color: '#22d67d' },
          areaStyle: { color: 'rgba(34,214,125,.1)' }
        },
        {
          name: 'P95 速率', type: 'line', data: y.p95, smooth: .3, symbol: 'circle', symbolSize: 3.5,
          lineStyle: { width: 1.7, color: '#ff6b35' }, itemStyle: { color: '#ff6b35' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255,107,53,.18)' }, { offset: 1, color: 'rgba(255,59,92,0)' }
            ])
          }
        }
      ]
    });
  }

  /* ---------------------------- 交互 ---------------------------- */
  function selectPoint(p) {
    selected = p;
    state.selectedPoint = p;
    psLayer.setSelected(p);
    renderPointChart(p);
    APP.toast(`${p.id} 已选中 · 垂直速率 ${p.vVert.toFixed(1)} mm/年`, 'ok', 'PS 点位');
  }

  function bindUI() {
    $$('#orbitSeg button').forEach(btn => {
      btn.onclick = () => {
        state.orbit = btn.dataset.orbit;
        $$('#orbitSeg button').forEach(b => b.classList.toggle('is-active', b === btn));
        renderOrbit();
        psLayer.refresh();
        $('#insarMapMeta').textContent = `${state.orbit === 'asc' ? '升轨' : '降轨'} ${state.insarMode === 'vertical' ? '垂直向' : ''} · 1,284,563 PS`;
        APP.toast(`已切换至${btn.textContent.trim()}数据 · 12 天重访`, 'info', '轨道切换');
      };
    });

    const modeLabel = { los: 'LOS 视线向', vertical: '垂直向', east: '东西向', '3d': '三维融合' };
    $$('#deformSeg button').forEach(btn => {
      btn.onclick = () => {
        state.insarMode = btn.dataset.mode;
        $$('#deformSeg button').forEach(b => b.classList.toggle('is-active', b === btn));
        psLayer.refresh();
        $('#insarMapMeta').textContent = `${state.orbit === 'asc' ? '升轨' : '降轨'} ${modeLabel[state.insarMode]} · 1,284,563 PS`;
        APP.toast(`形变模式：${modeLabel[state.insarMode]}（示例解算）`, 'info', '显示模式');
      };
    });

    const coh = $('#cohRange');
    coh.value = state.coherence;
    $('#cohVal').textContent = state.coherence.toFixed(2);
    coh.addEventListener('input', () => {
      state.coherence = +coh.value;
      $('#cohVal').textContent = state.coherence.toFixed(2);
      psLayer.refresh();
    });

    $('#insarExport').onclick = exportModal;
  }

  function exportModal() {
    APP.modal({
      title: 'InSAR 成果导出', sub: '2026-08 · 示例成果包', icon: 'i-download',
      body: `<div class="report-metrics">
        <div><span>形变速率场</span><b>GeoTIFF<small>.tif</small></b></div>
        <div><span>PS 点云</span><b>1.28M<small>点</small></b></div>
        <div><span>干涉图</span><b>624<small>景</small></b></div>
        <div><span>技术报告</span><b>PDF<small>32页</small></b></div>
      </div>
      <table class="mini-table"><thead><tr><th>成果名称</th><th>格式</th><th>大小</th><th>生成时间</th><th>操作</th></tr></thead><tbody>
        <tr><td>昆明主城区垂直向形变速率</td><td class="mt-num">GeoTIFF</td><td>186 MB</td><td>2026-08-03 07:30</td><td><button class="op-btn primary" data-dl>下载</button></td></tr>
        <tr><td>PS 永久散射点时序数据集</td><td class="mt-num">CSV</td><td>2.4 GB</td><td>2026-08-03 07:30</td><td><button class="op-btn primary" data-dl>下载</button></td></tr>
        <tr><td>升降轨干涉对清单</td><td class="mt-num">XLSX</td><td>1.2 MB</td><td>2026-08-02 19:40</td><td><button class="op-btn primary" data-dl>下载</button></td></tr>
        <tr><td>InSAR 形变监测技术报告</td><td class="mt-num">PDF</td><td>8.6 MB</td><td>2026-08-03 08:10</td><td><button class="op-btn primary" data-dl>下载</button></td></tr>
      </tbody></table>
      <div style="margin-top:10px;font-size:9px;color:#4d647a">注：演示环境不提供真实文件下载，点击仅作交互演示。</div>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button>`,
      onMount: (body, close) => {
        body.querySelector('[data-close]').onclick = close;
        $$('[data-dl]', body).forEach(b => b.onclick = () => APP.toast('示例成果已加入下载队列（演示）', 'ok', '成果导出'));
      }
    });
  }

  /* ---------------------------- 初始化 ---------------------------- */
  APP.views.insar = {
    init() {
      psPoints = genPoints();
      initMap();
      renderOrbit();
      renderPanels();
      initCharts();
      bindUI();

      const target = APP.building('B001');
      let best = psPoints[0], bd = 1e9;
      psPoints.forEach(p => {
        if (p.coh < state.coherence) return;
        const d = Math.hypot(p.lon - target.lon, p.lat - target.lat);
        if (d < bd) { bd = d; best = p; }
      });
      selected = best;
      state.selectedPoint = best;
      psLayer.setSelected(best);
      renderPointChart(best);
    },
    resize() {
      if (map) setTimeout(() => map.invalidateSize(), 30);
      ['insarHist', 'insarSeries', 'insarScatter', 'insarYear'].forEach(id => {
        const inst = echarts.getInstanceByDom(document.getElementById(id));
        if (inst) inst.resize();
      });
    }
  };
})();
