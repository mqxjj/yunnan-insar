/* ============================================================
   VIEW · AI 智能研判（趋势预测 / 风险矩阵 / 多因子）
   ============================================================ */
(function () {
  'use strict';
  const APP = window.APP, $ = APP.$, $$ = APP.$$, state = APP.state;

  let trendChart, radarChart, inited = false;

  const FACTORS = [
    { key: 'rate', name: '沉降速率', desc: 'InSAR 垂直向速率' },
    { key: 'accel', name: '沉降加速度', desc: '近 6 期二阶差分' },
    { key: 'geology', name: '地质条件', desc: '软弱地层分布' },
    { key: 'age', name: '建筑年代', desc: '结构老化程度' },
    { key: 'structure', name: '结构类型', desc: '抗震与整体性' },
    { key: 'construction', name: '施工影响', desc: '周边基坑扰动' }
  ];

  function factorValues(b) {
    return {
      rate: Math.min(100, Math.abs(b.rate) / 30 * 100),
      accel: Math.min(100, Math.abs(b.accel) / 0.12 * 100),
      geology: b.geology,
      age: Math.min(100, (2026 - b.year) / 41 * 100),
      structure: b.structureScore,
      construction: b.construction
    };
  }

  function riskText(b) {
    return APP.riskLabel(b.risk);
  }

  /* ---------------------------- 趋势预测 ---------------------------- */
  function renderTrend(b) {
    const s = APP.aiSeries(b);
    const xData = window.AI_HISTORY.concat(window.AI_FORECAST);
    const histData = s.hist.concat(Array(window.AI_FORECAST.length).fill(null));
    const fcData = Array(s.hist.length - 1).fill(null).concat([b.cumulative], s.fc);
    const upperData = Array(s.hist.length - 1).fill(null).concat(s.upper);
    const bandData = Array(s.hist.length - 1).fill(null).concat(s.lower.map((v, i) => +(v - s.upper[i]).toFixed(2)));

    const H = window.AI_HISTORY.length;
    const crossIdx = xData.indexOf(s.cross);
    const crossVal = crossIdx >= H ? s.fc[crossIdx - H] : null;

    if (!trendChart) trendChart = APP.chart('aiTrend');
    trendChart.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, {
        trigger: 'axis',
        formatter: ps => {
          const idx = ps[0].dataIndex;
          const isFc = idx >= H;
          const lines = [`${ps[0].axisValue}${isFc ? ' <span style="color:#7fe2ff">AI预测</span>' : ''}`];
          const h = histData[idx], f = fcData[idx];
          if (!isFc && h != null) lines.push(`累计沉降 <b style="color:#eafaff">${h.toFixed(1)} mm</b>`);
          if (f != null && isFc) {
            lines.push(`预测沉降 <b style="color:#7fe2ff">${f.toFixed(1)} mm</b>`);
            lines.push(`置信区间 <b style="color:#8aa6bd">${(upperData[idx] + bandData[idx]).toFixed(1)} ~ ${upperData[idx].toFixed(1)} mm</b>`);
          }
          return lines.join('<br/>');
        }
      }),
      grid: { left: 44, right: 16, top: 16, bottom: 26 },
      xAxis: APP.axis({
        type: 'category', data: xData, boundaryGap: false,
        axisLabel: { color: '#617f98', fontSize: 7.5, interval: 3, fontFamily: 'Bahnschrift' },
        splitLine: { show: false }
      }),
      yAxis: APP.axis({
        type: 'value', max: 3,
        axisLabel: { color: '#617f98', fontSize: 8, fontFamily: 'Bahnschrift', formatter: v => v.toFixed(0) },
        splitLine: { lineStyle: { color: 'rgba(86,150,200,.08)', type: 'dashed' } }
      }),
      series: [
        {
          name: '95% 置信区间', type: 'line', stack: 'conf', data: upperData, symbol: 'none',
          lineStyle: { opacity: 0 }, areaStyle: { color: 'transparent' }, silent: true
        },
        {
          name: '95% 置信区间', type: 'line', stack: 'conf', data: bandData, symbol: 'none',
          lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(56,217,255,.13)' }, silent: true
        },
        {
          name: '历史沉降量', type: 'line', data: histData, smooth: .28, symbol: 'none',
          lineStyle: { width: 2, color: '#38d9ff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56,217,255,.24)' }, { offset: 1, color: 'rgba(56,217,255,0)' }
            ])
          },
          markLine: {
            symbol: 'none', silent: true,
            lineStyle: { color: 'rgba(255,138,31,.7)', type: 'dashed', width: 1 },
            label: { color: '#ffa34d', fontSize: 8, formatter: '红色阈值 -25mm', position: 'insideEndTop' },
            data: [{ yAxis: -25 }]
          },
          markPoint: crossIdx >= H ? {
            symbol: 'circle', symbolSize: 7,
            itemStyle: { color: '#fff', borderColor: '#ff8a1f', borderWidth: 2, shadowBlur: 10, shadowColor: '#ff8a1f' },
            label: { color: '#ffc27a', fontSize: 8, formatter: '触及阈值', position: 'top' },
            data: [{ coord: [crossIdx, crossVal] }]
          } : undefined
        },
        {
          name: 'AI预测', type: 'line', data: fcData, smooth: .28, symbol: 'circle', symbolSize: 3,
          lineStyle: { width: 1.8, color: '#ffc53d', type: 'dashed' },
          itemStyle: { color: '#ffc53d' }
        }
      ]
    });

    $('#akDelta').innerHTML = `${s.move.toFixed(1)}<em>mm</em>`;
    $('#akCross').textContent = s.cross === '已超阈值' ? '已超阈值' : s.cross;
    const conf = Math.max(78, Math.min(96, 84 + (b.score - 60) * 0.18));
    $('#akConf').innerHTML = `${conf.toFixed(1)}<em>%</em>`;
    const action = b.risk === 'red' ? '立即现场核查' : b.risk === 'orange' ? '7 日内现场核查' : '加密观测';
    $('#akAction').textContent = action;
  }

  /* ---------------------------- 预警推送 ---------------------------- */
  function renderWarnings(b) {
    const own = window.ALERTS.filter(a => a.buildingId === b.id);
    const rest = window.ALERTS.filter(a => a.buildingId !== b.id && (a.level === 'red' || a.level === 'orange'));
    const list = own.concat(rest).slice(0, 3);
    const box = $('#warnList');
    box.innerHTML = list.map(a => `<div class="warn-item" data-id="${a.id}">
      <span class="warn-ico ${a.level}">${APP.icon('i-alert')}</span>
      <div class="warn-main">
        <div class="warn-top"><b>${a.type} · ${APP.building(a.buildingId).name}</b>
          <span class="warn-lv ${a.level}">${APP.riskLabel(a.level)}</span>
          <em>${a.time.slice(5)}</em></div>
        <p>${a.desc}</p>
      </div></div>`).join('');
    $('#aiWarnCount').textContent = `${list.length} 条`;
    $$('.warn-item', box).forEach(it => it.onclick = () => {
      APP.go('alert');
      setTimeout(() => APP.alertApi && APP.alertApi.select(it.dataset.id), 160);
    });
  }

  /* ---------------------------- 风险矩阵 ---------------------------- */
  function matrixCellLevel(x, y) {
    return Math.min(4, Math.max(0, Math.round((x + y) / 2)));
  }

  function renderMatrix(b) {
    const ys = window.MATRIX_LABELS.y.slice().reverse();
    $('#matrixY').innerHTML = ys.map(t => `<span>${t}</span>`).join('');
    $('#matrixX').innerHTML = window.MATRIX_LABELS.x.map(t => `<span>${t}</span>`).join('');

    const xIdx = [0.01, 0.03, 0.06, 0.10].filter(t => b.accel > t).length;
    const yIdx = [0.1, 0.5, 1.0, 2.0].filter(t => Math.abs(b.rate) / 12 > t).length;

    const grid = $('#matrixGrid');
    let html = '';
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const yv = 4 - row;
        const lv = matrixCellLevel(col, yv);
        const sel = col === xIdx && yv === yIdx ? ' sel' : '';
        html += `<div class="mx-cell lv${lv}${sel}" data-x="${col}" data-y="${yv}" title="沉降速率 ${ys[row]} × 加速度 ${window.MATRIX_LABELS.x[col]}"></div>`;
      }
    }
    grid.innerHTML = html;
    $$('.mx-cell', grid).forEach(cell => cell.onclick = () => {
      const lv = +cell.className.match(/lv(\d)/)[1];
      const labels = ['低风险', '较低风险', '中风险', '较高风险', '高风险'];
      const colors = ['#22d67d', '#7ee787', '#ffc53d', '#ff8a1f', '#ff3b5c'];
      $('#matrixResult').innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${colors[lv]};box-shadow:0 0 8px ${colors[lv]}"></span>
        风险分区：<b style="color:${colors[lv]}">${labels[lv]}</b>
        <em>速率 ${ys[4 - cell.dataset.y]} × 加速度 ${window.MATRIX_LABELS.x[cell.dataset.x]}</em>`;
    });

    const lv = matrixCellLevel(xIdx, yIdx);
    const colors = ['#22d67d', '#7ee787', '#ffc53d', '#ff8a1f', '#ff3b5c'];
    $('#matrixResult').innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${colors[lv]};box-shadow:0 0 8px ${colors[lv]}"></span>
      综合判定：<b style="color:${colors[lv]}">${riskText(b)}</b>
      <em>速率 ${APP.fmt(Math.abs(b.rate) / 12, 2)} mm/月 · 加速度 ${b.accel} mm/月²</em>`;
  }

  /* ---------------------------- 雷达 + 因子 ---------------------------- */
  function renderRadar(b) {
    const v = factorValues(b);
    if (!radarChart) radarChart = APP.chart('aiRadar');
    radarChart.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, { trigger: 'item' }),
      radar: {
        center: ['50%', '52%'], radius: '66%',
        splitNumber: 4,
        axisName: { color: '#7fa3bf', fontSize: 8.5 },
        axisLine: { lineStyle: { color: 'rgba(86,150,200,.16)' } },
        splitLine: { lineStyle: { color: 'rgba(86,150,200,.14)' } },
        splitArea: { areaStyle: { color: ['rgba(10,40,68,.18)', 'rgba(6,22,40,.12)'] } },
        indicator: FACTORS.map(f => ({ name: f.name, max: 100 }))
      },
      series: [{
        type: 'radar',
        symbolSize: 3,
        data: [
          {
            value: FACTORS.map(f => +v[f.key].toFixed(0)), name: b.name,
            lineStyle: { color: '#ff6b35', width: 1.8 },
            itemStyle: { color: '#ff8a1f' },
            areaStyle: { color: 'rgba(255,138,31,.22)' }
          },
          {
            value: [56, 48, 62, 58, 54, 46], name: '区域均值',
            lineStyle: { color: 'rgba(56,217,255,.65)', width: 1, type: 'dashed' },
            itemStyle: { color: '#38d9ff' },
            areaStyle: { color: 'rgba(56,217,255,.1)' }
          }
        ]
      }]
    });
    $('#radarScoreTag').textContent = `${b.score.toFixed(1)} 分`;

    $('#factorGrid').innerHTML = FACTORS.map(f => `<div>
      <i style="background:${v[f.key] > 75 ? '#ff6b35' : v[f.key] > 55 ? '#ffc53d' : '#38d9ff'};box-shadow:0 0 5px ${v[f.key] > 75 ? '#ff6b35' : v[f.key] > 55 ? '#ffc53d' : '#38d9ff'}"></i>
      <span title="${f.desc}">${f.name}</span><b>${v[f.key].toFixed(0)}</b></div>`).join('');
  }

  /* ---------------------------- 研判结论 ---------------------------- */
  function renderSummary(b) {
    const s = APP.aiSeries(b);
    const main = b.rate < -20 ? '地基软弱与周边施工扰动' : '地层压缩与排水条件变化';
    $('#aiSummary').innerHTML = `<b>AI 研判结论</b><br/>
      模型融合 InSAR 时序、地面 IoT 与建筑属性，判定当前为 <span class="wr">${riskText(b)}</span>。
      近 12 个月累计沉降 <span class="hl">${b.cumulative.toFixed(1)} mm</span>，当前速率 <span class="hl">${b.rate.toFixed(1)} mm/年</span>，
      加速度 <span class="hl">${b.accel} mm/月²</span>，风险评分 <b>${b.score.toFixed(1)}</b>。
      未来 6 个月预计再沉降 <span class="hl">${Math.abs(s.move).toFixed(1)} mm</span>，
      ${s.cross === '已超阈值' ? '当前已突破' : `<span class="wr">${s.cross}</span> 将触及`} -25 mm 红色阈值。
      主要驱动因素为 <b>${main}</b>，建议${b.risk === 'red' ? ' 24 小时内完成现场核查并布设加密观测' : ' 7 日内完成现场核查'}。`;
  }

  /* ---------------------------- 报告 ---------------------------- */
  function reportModal(b) {
    const s = APP.aiSeries(b);
    const fcRows = window.AI_FORECAST.map((m, i) => `<tr>
      <td class="mt-num">${m}</td>
      <td class="mt-num">${s.fc[i].toFixed(1)}</td>
      <td class="mt-num">${s.lower[i + 1].toFixed(1)} ~ ${s.upper[i + 1].toFixed(1)}</td>
      <td>${s.fc[i] <= -25 ? '<span style="color:#ff6d86">超阈值</span>' : '<span style="color:#ffd469">关注</span>'}</td>
    </tr>`).join('');

    APP.modal({
      title: 'AI 建筑沉降研判报告', sub: `${b.name} · 2026-08-03`, icon: 'i-file', wide: true,
      body: `<div class="report-metrics">
        <div><span>建筑编号</span><b>${b.id}</b></div>
        <div><span>当前累计沉降</span><b class="hot">${b.cumulative.toFixed(1)}<small>mm</small></b></div>
        <div><span>沉降速率</span><b class="hot">${b.rate.toFixed(1)}<small>mm/年</small></b></div>
        <div><span>AI 风险评分</span><b>${b.score.toFixed(1)}<small>/100</small></b></div>
      </div>
      <div class="report-sec"><h4>一、监测概况</h4>
        <p>${b.name}位于${b.district}${b.address}，${b.structure}，共 ${b.floors} 层，建成于 ${b.year} 年。
        采用 ${b.coverage} 联合监测，InSAR 垂直向速率 ${b.rate.toFixed(1)} mm/年，地面 IoT 传感器 12 台在线。</p></div>
      <div class="report-sec"><h4>二、AI 趋势预测（未来 6 个月）</h4>
        <table class="mini-table"><thead><tr><th>月份</th><th>预测累计沉降 mm</th><th>95% 置信区间</th><th>阈值状态</th></tr></thead><tbody>${fcRows}</tbody></table></div>
      <div class="report-sec"><h4>三、风险因子</h4>
        <p>${FACTORS.map(f => `${f.name} ${factorValues(b)[f.key].toFixed(0)} 分`).join(' · ')}。</p>
        <div>${['软弱地层', '差异沉降', '周边施工', '结构老化', '排水条件'].map(t => `<span class="report-tag">${t}</span>`).join('')}</div></div>
      <div class="report-sec"><h4>四、处置建议</h4>
        <p>1. ${b.risk === 'red' ? '24 小时内' : '7 日内'}组织现场核查，重点检查基础与裙楼连接部位；<br/>
        2. 布设静力水准仪与倾角计，观测频次加密至 1 次/小时；<br/>
        3. 对周边地下管线与基坑开展联合排查；<br/>
        4. 30 天后复评，若速率未收敛则启动结构安全性鉴定。</p></div>
      <div style="margin-top:12px;font-size:8.5px;color:#4d647a">本报告由 ${window.AI_MODEL.engine} 自动生成 · 演示数据，不作为真实监测结论。</div>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button><button class="btn btn-primary" data-dl>导出 PDF</button>`,
      onMount: (body, close) => {
        body.querySelector('[data-close]').onclick = close;
        body.querySelector('[data-dl]').onclick = () => APP.toast('研判报告已生成（示例），未提供真实文件', 'ok', '报告导出');
      }
    });
  }

  /* ---------------------------- 渲染入口 ---------------------------- */
  function render(b) {
    renderTrend(b);
    renderWarnings(b);
    renderMatrix(b);
    renderRadar(b);
    renderSummary(b);
  }

  function fillSelect() {
    const sel = $('#aiBuildingSelect');
    sel.innerHTML = window.BUILDINGS.map(b =>
      `<option value="${b.id}">${b.name} · ${APP.riskLabel(b.risk)}</option>`).join('');
    sel.value = state.aiBuildingId;
  }

  function bindUI() {
    $('#aiBuildingSelect').onchange = e => {
      state.aiBuildingId = e.target.value;
      render(APP.building(state.aiBuildingId));
      APP.toast(`已切换至 ${APP.building(state.aiBuildingId).name}`, 'info', 'AI 研判对象');
    };
    $('#aiRerun').onclick = () => {
      APP.toast('正在重新推演时序模型…', 'info', 'AI 引擎');
      setTimeout(() => {
        render(APP.building(state.aiBuildingId));
        APP.toast('推演完成 · 模型 v3.2.1 · 置信度已更新', 'ok', 'AI 引擎');
      }, 650);
    };
    $('#aiReportBtn').onclick = () => reportModal(APP.building(state.aiBuildingId));
    $('#aiWarnAll').onclick = () => APP.go('alert');
  }

  APP.views.ai = {
    init() {
      inited = true;
      fillSelect();
      bindUI();
      render(APP.building(state.aiBuildingId));
    },
    resize() {
      ['aiTrend', 'aiRadar'].forEach(id => {
        const inst = echarts.getInstanceByDom(document.getElementById(id));
        if (inst) inst.resize();
      });
    }
  };

  APP.aiApi = {
    setBuilding(id) {
      state.aiBuildingId = id;
      const sel = $('#aiBuildingSelect');
      if (sel) sel.value = id;
      if (inited) render(APP.building(id));
    }
  };
})();
