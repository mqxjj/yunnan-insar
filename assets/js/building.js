/* ============================================================
   VIEW · 重点建筑沉降详情（3D 模型 / 传感器 / 时序）
   ============================================================ */
(function () {
  'use strict';
  const APP = window.APP, $ = APP.$, $$ = APP.$$, state = APP.state;

  let settleChart, crackChart, inited = false, sceneMode = '3d', rowsCache = [];

  /* ---------------------------- 传感器数值 ---------------------------- */
  function sensorRows(b) {
    const f = Math.max(0.45, Math.min(1.15, Math.abs(b.rate) / 28.3));
    return window.SENSOR_ROWS.map(s => {
      let value = s.value;
      const n = parseFloat(s.value);
      if (s.kind === 'tilt') value = (n * (0.62 + 0.38 * f)).toFixed(2) + '°';
      else if (s.kind === 'crack') value = (n * (0.72 + 0.28 * f)).toFixed(2) + ' mm';
      else value = (n * (0.72 + 0.28 * f)).toFixed(1) + ' mm';
      return Object.assign({}, s, { value, n: parseFloat(value) });
    });
  }

  /* ---------------------------- 3D 场景 ---------------------------- */
  const FACE_L = { tl: [190, 150], tr: [260, 190], br: [260, 370], bl: [190, 330] };
  const FACE_R = { tl: [260, 190], tr: [400, 160], br: [400, 340], bl: [260, 370] };
  const PLANE = { tl: [186, 96], tr: [452, 96], br: [452, 374], bl: [186, 374] };

  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function at(f, u, v) {
    const top = lerp(f.tl, f.tr, u), bot = lerp(f.bl, f.br, u);
    return lerp(top, bot, v);
  }
  function poly(points, cls, extra = '') {
    return `<polygon class="${cls}" points="${points.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" ${extra}/>`;
  }
  function windows(face, cols, rows, rand, cls = 'win') {
    let s = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u0 = (c + 0.18) / cols, u1 = (c + 0.82) / cols;
        const v0 = (r + 0.18) / rows, v1 = (r + 0.72) / rows;
        const pts = [at(face, u0, v0), at(face, u1, v0), at(face, u1, v1), at(face, u0, v1)];
        const lit = rand() > 0.68 ? ' ' + cls + '-lit' : '';
        s += poly(pts, cls + lit, 'opacity=".9"');
      }
    }
    return s;
  }
  function dot(x, y, color, sid) {
    return `<g class="sensor-dot" data-sid="${sid}" transform="translate(${x},${y})">
      <circle class="halo" r="7.5" fill="none" stroke="${color}" stroke-width="1"/>
      <circle class="core" r="3.4" fill="${color}"/>
    </g>`;
  }

  function sensorDots(kind) {
    const list = rowsCache.filter(r => r.kind === kind);
    const posTilt = [[223, 150], [292, 134], [342, 150], [262, 176]];
    const posCrack = [[214, 244], [240, 306], [296, 240], [322, 276], [352, 214], [372, 296]];
    const posLevel = [[204, 331], [318, 361]];
    const posPlane = { tilt: [[250, 118], [330, 118], [410, 118], [360, 140]], crack: [[240, 220], [300, 190], [370, 250], [270, 290], [410, 300], [330, 330]], level: [[220, 366], [400, 366]] };
    const pos = { tilt: posTilt, crack: posCrack, level: posLevel };
    const color = { tilt: '#ffc53d', crack: '#38d9ff', level: '#22d67d' };
    return list.map((s, i) => {
      const p = sceneMode === 'plane' ? posPlane[kind][i] : pos[kind][i];
      return p ? dot(p[0], p[1], color[kind], s.id) : '';
    }).join('');
  }

  function scene3d(b) {
    const rand = APP.seed(b.id.length * 31 + b.floors * 7);
    const rows = Math.max(6, Math.min(12, Math.round(b.floors * 0.62)));
    return `<svg class="scene" viewBox="110 12 420 428" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="faceL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="rgba(24,86,140,.92)"/><stop offset="1" stop-color="rgba(8,34,60,.96)"/>
        </linearGradient>
        <linearGradient id="faceR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="rgba(34,110,170,.9)"/><stop offset="1" stop-color="rgba(10,44,78,.96)"/>
        </linearGradient>
        <linearGradient id="roofG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="rgba(90,210,255,.5)"/><stop offset="1" stop-color="rgba(30,100,160,.35)"/>
        </linearGradient>
      </defs>
      <ellipse cx="292" cy="378" rx="142" ry="24" fill="rgba(20,120,190,.18)"/>
      ${poly([FACE_L.tl, FACE_L.tr, FACE_L.br, FACE_L.bl], 'face', 'fill="url(#faceL)"')}
      ${poly([FACE_R.tl, FACE_R.tr, FACE_R.br, FACE_R.bl], 'face', 'fill="url(#faceR)"')}
      ${poly([FACE_L.tl, FACE_L.bl, FACE_L.br, FACE_L.tr], 'face-edge', 'fill="none"')}
      ${poly([FACE_R.tl, FACE_R.tr, FACE_R.br, FACE_R.bl], 'face-edge', 'fill="none"')}
      ${poly([[190, 150], [330, 120], [400, 160], [260, 190]], 'face', 'fill="url(#roofG)"')}
      ${poly([[190, 150], [330, 120], [400, 160], [260, 190]], 'face-edge', 'fill="none"')}
      ${windows(FACE_L, 2, rows, rand)}
      ${windows(FACE_R, 5, rows, rand)}
      <line x1="292" y1="128" x2="292" y2="72" stroke="rgba(120,220,255,.55)" stroke-width="1"/>
      <circle cx="292" cy="70" r="3" fill="#ff3b5c"><animate attributeName="opacity" values="1;.25;1" dur="1.8s" repeatCount="indefinite"/></circle>
      <text class="model-label" x="152" y="392">H ${(b.floors * 3.4).toFixed(1)} m</text>
      <text class="model-label" x="404" y="336">${b.floors}F</text>
      ${sensorDots('level')}${sensorDots('crack')}${sensorDots('tilt')}
      <circle cx="292" cy="70" r="16" fill="none" stroke="rgba(255,59,92,.18)" stroke-width="1"/>
    </svg>`;
  }

  function scenePlane(b) {
    const rand = APP.seed(b.floors * 13 + 5);
    const rows = Math.max(6, Math.min(12, Math.round(b.floors * 0.62)));
    return `<svg class="scene" viewBox="110 12 420 428" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="planeG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(30,104,160,.9)"/><stop offset="1" stop-color="rgba(8,36,64,.96)"/>
      </linearGradient></defs>
      <ellipse cx="320" cy="392" rx="180" ry="20" fill="rgba(20,120,190,.16)"/>
      ${poly([PLANE.tl, PLANE.tr, PLANE.br, PLANE.bl], 'face', 'fill="url(#planeG)"')}
      ${poly([PLANE.tl, PLANE.tr, PLANE.br, PLANE.bl], 'face-edge', 'fill="none"')}
      ${windows(PLANE, 7, rows, rand)}
      ${poly([[170, 96], [468, 96], [468, 84], [170, 84]], 'face', 'fill="rgba(90,210,255,.18)"')}
      <line x1="170" y1="380" x2="170" y2="96" stroke="rgba(120,220,255,.35)" stroke-width="1" stroke-dasharray="4 4"/>
      <text class="model-label" x="120" y="250" transform="rotate(-90 120 250)">H ${(b.floors * 3.4).toFixed(1)} m</text>
      <text class="model-label" x="300" y="76">${b.floors}F · ${b.structure}</text>
      ${sensorDots('level')}${sensorDots('crack')}${sensorDots('tilt')}
    </svg>`;
  }

  function sceneStructure(b) {
    const rand = APP.seed(b.id.length * 17 + 9);
    const rows = Math.max(6, Math.min(12, Math.round(b.floors * 0.62)));
    const colsL = 3, colsR = 6;
    let lines = '';
    for (let c = 0; c <= colsL; c++) {
      const u = c / colsL;
      const a = at(FACE_L, u, 0), z = at(FACE_L, u, 1);
      lines += `<line x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}" stroke="rgba(56,196,255,.55)" stroke-width="${c === 0 || c === colsL ? 1.4 : .7}"/>`;
    }
    for (let c = 0; c <= colsR; c++) {
      const u = c / colsR;
      const a = at(FACE_R, u, 0), z = at(FACE_R, u, 1);
      lines += `<line x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}" stroke="rgba(56,196,255,.5)" stroke-width="${c === 0 || c === colsR ? 1.4 : .7}"/>`;
    }
    for (let r = 0; r <= rows; r++) {
      const v = r / rows;
      const a = at(FACE_L, 0, v), z = at(FACE_L, 1, v);
      lines += `<line x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}" stroke="rgba(120,230,255,.38)" stroke-width=".7"/>`;
      const a2 = at(FACE_R, 0, v), z2 = at(FACE_R, 1, v);
      lines += `<line x1="${a2[0]}" y1="${a2[1]}" x2="${z2[0]}" y2="${z2[1]}" stroke="rgba(120,230,255,.32)" stroke-width=".7"/>`;
    }
    // 结构柱高亮（底层）
    let cols = '';
    for (let i = 0; i < 4; i++) {
      const p = at(FACE_R, (i + .5) / 4, .62 + rand() * .3);
      cols += `<circle cx="${p[0]}" cy="${p[1]}" r="2.2" fill="#ff8a1f" opacity=".85"/>`;
    }
    return `<svg class="scene" viewBox="110 12 420 428" preserveAspectRatio="xMidYMid meet">
      <ellipse cx="292" cy="378" rx="142" ry="24" fill="rgba(20,120,190,.18)"/>
      ${poly([[190, 150], [330, 120], [400, 160], [260, 190]], 'face-edge', 'fill="rgba(20,90,140,.18)"')}
      ${lines}${cols}
      <line x1="190" y1="330" x2="260" y2="370" stroke="rgba(56,196,255,.7)" stroke-width="1.4"/>
      <line x1="260" y1="370" x2="400" y2="340" stroke="rgba(56,196,255,.7)" stroke-width="1.4"/>
      <text class="model-label" x="404" y="336">框架剪力墙</text>
      ${sensorDots('level')}${sensorDots('crack')}${sensorDots('tilt')}
    </svg>`;
  }

  function renderScene(b) {
    const box = $('#buildingScene');
    $$('svg.scene', box).forEach(n => n.remove());
    const pop = $('#sensorPop');
    if (pop) pop.classList.add('hide');
    box.insertAdjacentHTML('beforeend', sceneMode === 'plane' ? scenePlane(b) : sceneMode === 'structure' ? sceneStructure(b) : scene3d(b));
  }

  /* ---------------------------- 档案 ---------------------------- */
  function renderMeta(b) {
    const rows = [
      ['建筑编号', b.id], ['所属行政区', b.district],
      ['结构类型', b.structure], ['建筑层数', b.floors + ' 层'],
      ['建筑面积', b.area + ' m²'], ['建成年份', b.year + ' 年'],
      ['使用功能', b.use], ['产权单位', b.owner],
      ['监测方式', b.coverage], ['监测状态', b.online ? '在线监测' : '离线']
    ];
    $('#buildingMeta').innerHTML = rows.map(r => `<div><span>${r[0]}</span><b title="${r[1]}">${r[1]}</b></div>`).join('');
    $('#bScore').textContent = b.score.toFixed(1);
    $('#bScoreBar').style.width = b.score.toFixed(1) + '%';
  }

  /* ---------------------------- 图表 ---------------------------- */
  function renderSettle(b) {
    const rates = APP.buildingRates(b);
    const cum = APP.buildingCumulative(b);
    if (!settleChart) settleChart = APP.chart('bSettle');
    settleChart.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, {
        trigger: 'axis',
        formatter: ps => {
          const rate = ps.find(p => p.seriesName === '沉降速率');
          const c = ps.find(p => p.seriesName === '累计沉降');
          return `${ps[0].axisValue}<br/>累计沉降 <b style="color:#5fe4ff">${c ? c.value.toFixed(1) : '-'} mm</b><br/>沉降速率 <b style="color:#ffb14d">${rate ? rate.value.toFixed(1) : '-'} mm/年</b>`;
        }
      }),
      grid: { left: 42, right: 44, top: 22, bottom: 20 },
      xAxis: APP.axis({
        type: 'category', data: window.MONTHS, boundaryGap: true,
        axisLabel: { color: '#617f98', fontSize: 7.5, interval: 1, fontFamily: 'Bahnschrift' },
        splitLine: { show: false }
      }),
      yAxis: [
        APP.axis({
          type: 'value', name: '累计 mm', nameTextStyle: { color: '#5f7f9b', fontSize: 7.5, padding: [0, 0, 0, -28] },
          axisLabel: { color: '#617f98', fontSize: 7.5, fontFamily: 'Bahnschrift' }
        }),
        APP.axis({
          type: 'value', name: '速率 mm/年', nameTextStyle: { color: '#5f7f9b', fontSize: 7.5, padding: [0, -34, 0, 0] },
          axisLabel: { color: '#617f98', fontSize: 7.5, fontFamily: 'Bahnschrift' },
          splitLine: { show: false }
        })
      ],
      series: [
        {
          name: '沉降速率', type: 'bar', yAxisIndex: 1, data: rates, barWidth: '46%',
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            color: p => APP.velColor(p.value)
          }
        },
        {
          name: '累计沉降', type: 'line', yAxisIndex: 0, data: cum, smooth: .25,
          symbol: 'circle', symbolSize: 3.2,
          lineStyle: { width: 1.8, color: '#38d9ff' }, itemStyle: { color: '#38d9ff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56,217,255,.22)' }, { offset: 1, color: 'rgba(56,217,255,0)' }
            ])
          },
          markLine: {
            symbol: 'none', silent: true,
            lineStyle: { color: 'rgba(255,59,92,.5)', type: 'dashed', width: 1 },
            label: { color: '#ff8a9f', fontSize: 7, formatter: '红警 -25mm', position: 'insideEndTop' },
            data: [{ yAxis: -25 }]
          }
        }
      ]
    });
    $('#bCum').textContent = b.cumulative.toFixed(1);
  }

  function renderCrack(b) {
    if (!crackChart) crackChart = APP.chart('bCrack');
    const d = window.CRACK_SERIES;
    crackChart.setOption({
      textStyle: APP.chartTheme.textStyle,
      tooltip: Object.assign({}, APP.chartTheme.tooltip, {
        trigger: 'axis', formatter: ps => ps.map(p => `${p.seriesName} <b>${p.value} mm</b>`).join('<br/>')
      }),
      grid: { left: 34, right: 8, top: 20, bottom: 20 },
      xAxis: APP.axis({
        type: 'category', data: d.labels,
        axisLabel: { color: '#617f98', fontSize: 7.5, fontFamily: 'Bahnschrift' },
        splitLine: { show: false }
      }),
      yAxis: APP.axis({
        type: 'value', min: 0, max: 1.4,
        axisLabel: { color: '#617f98', fontSize: 7.5, fontFamily: 'Bahnschrift' }
      }),
      series: [
        {
          name: '上期', type: 'bar', data: d.previous, barWidth: '32%',
          itemStyle: { color: 'rgba(120,170,210,.28)', borderRadius: [2, 2, 0, 0] }
        },
        {
          name: '本期', type: 'bar', data: d.current, barWidth: '32%',
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            color: p => p.value >= .58 ? '#ff8a1f' : '#38d9ff'
          }
        },
        {
          name: '预警值', type: 'line', data: d.threshold, symbol: 'none', silent: true,
          lineStyle: { color: '#ff3b5c', width: 1, type: 'dashed' }
        }
      ]
    });
  }

  /* ---------------------------- 倾斜仪表 ---------------------------- */
  function setGauge(n, val) {
    const ratio = Math.min(1, val / 0.5);
    const fill = $(`#tgFill${n}`), needle = $(`#tgNeedle${n}`);
    if (fill) fill.style.strokeDashoffset = (210 - ratio * 196).toFixed(1);
    if (needle) needle.style.transform = `rotate(${(-62 + ratio * 124).toFixed(1)}deg)`;
    $(`#tilt${n}Val`).textContent = val.toFixed(2) + '°';
  }

  /* ---------------------------- 传感器表 ---------------------------- */
  function renderSensorTable(b) {
    rowsCache = sensorRows(b);
    const tb = $('#sensorTable tbody');
    tb.innerHTML = rowsCache.map(s => `<tr data-sid="${s.id}">
      <td class="sensor-id" data-sid="${s.id}">${s.id}</td>
      <td>${s.type}</td>
      <td>${s.pos}</td>
      <td class="sensor-val">${s.value}</td>
      <td><span class="sensor-status"><i></i>在线</span></td>
      <td style="color:${s.battery < 75 ? '#ffa34d' : '#8aa6bd'};font-family:var(--num)">${s.battery}%</td>
      <td><span style="color:#38d9ff;font-size:8px">${'▮'.repeat(s.signal)}</span><span style="color:#27445c;font-size:8px">${'▮'.repeat(5 - s.signal)}</span></td>
      <td class="t-time">${s.time.slice(11)}</td>
    </tr>`).join('');
    $$('#sensorTable tbody tr').forEach(tr => tr.onclick = () => {
      const s = rowsCache.find(x => x.id === tr.dataset.sid);
      sensorDetail(b, s);
    });
  }

  function sensorDetail(b, s) {
    const rnd = APP.seed(s.id.length * 37 + b.floors);
    const vals = [];
    let base = s.n;
    for (let i = 0; i < 24; i++) {
      base += (rnd() - .5) * (s.kind === 'tilt' ? .006 : .03);
      vals.push(+base.toFixed(s.kind === 'tilt' ? 3 : 2));
    }
    APP.modal({
      title: `传感器 ${s.id}`, sub: s.type, icon: 'i-cpu',
      body: `<div class="detail-kv">
          <div><span>安装位置</span><b>${s.pos}</b></div>
          <div><span>实时值</span><b style="color:#7fe2ff">${s.value}</b></div>
          <div><span>电量</span><b>${s.battery}%</b></div>
          <div><span>信号强度</span><b>${s.signal}/5</b></div>
          <div><span>采集频率</span><b>5 分钟</b></div>
          <div><span>最新数据</span><b>${s.time}</b></div>
        </div>
        <div style="height:86px;margin:6px 0 10px">${APP.sparkline(vals, '#38d9ff', 420, 80)}</div>
        <p style="font-size:9.5px;line-height:1.7;color:#8aa6bd">近 24 小时数据平稳，未见跳变。阈值：倾角 0.50°，裂缝 0.80mm，水准 ±5mm。</p>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button><button class="btn btn-primary" data-b>查看建筑</button>`,
      onMount: (body, close) => {
        body.querySelector('[data-close]').onclick = close;
        body.querySelector('[data-b]').onclick = () => {
          close();
          state.buildingId = b.id;
          APP.go('building');
          setTimeout(() => APP.buildingApi && APP.buildingApi.setBuilding(b.id), 120);
        };
      }
    });
  }

  /* ---------------------------- 告警历史 ---------------------------- */
  function renderAlarms(b) {
    const list = window.BUILDING_ALARMS.map((a, i) => Object.assign({}, a, {
      time: a.time,
      un: a.state === '未处理'
    }));
    $('#alarmList').innerHTML = list.map((a, i) => `<div class="alarm-card lv-${a.level} ${a.un ? 'un' : ''}" data-i="${i}">
      <div class="ac-top"><span class="ac-dot"></span><b>${a.type}</b><span class="ac-state">${a.state}</span></div>
      <p>${a.text}</p><em>${a.time}</em></div>`).join('');
    $$('.alarm-card').forEach(card => card.onclick = () => alarmDetail(b, list[+card.dataset.i]));
  }

  function alarmDetail(b, a) {
    APP.modal({
      title: `${a.type} · 告警详情`, sub: b.name, icon: 'i-bell',
      body: `<div class="flow-target" style="margin-bottom:12px">
          <span class="lv-tag ${a.level}"><i></i>${APP.riskLabel(a.level)}</span>
          <b>${a.state}</b><em>${a.time}</em></div>
        <div class="report-sec"><h4>告警内容</h4><p>${a.text}</p></div>
        <div class="report-sec"><h4>处置情况</h4><p>${a.state === '未处理' ? '该告警尚未处置，已推送至属地责任人，建议尽快完成现场核查。' : '已完成现场核查与处置，数据恢复正常，告警已关闭。'}</p></div>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button><button class="btn btn-primary" data-flow>进入处置流程</button>`,
      onMount: (body, close) => {
        body.querySelector('[data-close]').onclick = close;
        body.querySelector('[data-flow]').onclick = () => { close(); APP.go('alert'); };
      }
    });
  }

  /* ---------------------------- 报告 ---------------------------- */
  function reportModal(b) {
    const cum = APP.buildingCumulative(b);
    APP.modal({
      title: '建筑沉降风险评估报告', sub: `${b.name} · 2026-08`, icon: 'i-file', wide: true,
      body: `<div class="report-metrics">
        <div><span>近12个月累计</span><b class="hot">${b.cumulative.toFixed(1)}<small>mm</small></b></div>
        <div><span>当前速率</span><b class="hot">${b.rate.toFixed(1)}<small>mm/年</small></b></div>
        <div><span>倾斜</span><b>${(0.12 * (0.6 + 0.4 * Math.abs(b.rate) / 28.3)).toFixed(2)}<small>°</small></b></div>
        <div><span>风险评分</span><b>${b.score.toFixed(1)}<small>/100</small></b></div>
      </div>
      <div class="report-sec"><h4>一、建筑概况</h4>
        <p>${b.name}（${b.id}）位于${b.district}${b.address}，${b.structure}，${b.floors} 层，建筑面积 ${b.area} m²，建成于 ${b.year} 年，产权单位为${b.owner}。</p></div>
      <div class="report-sec"><h4>二、监测结果</h4>
        <p>近 12 个月累计沉降 <span class="hl">${b.cumulative.toFixed(1)} mm</span>，当前速率 <span class="hl">${b.rate.toFixed(1)} mm/年</span>，
        加速度 <span class="hl">${b.accel} mm/月²</span>。地面 IoT 12 台传感器全部在线，倾角与裂缝指标处于${b.risk === 'red' ? '超限' : '关注'}区间。</p></div>
      <div class="report-sec"><h4>三、风险判定</h4>
        <p>综合 InSAR 形变、地质条件、结构属性与施工影响，AI 模型判定为 <span class="wr">${APP.riskLabel(b.risk)}</span>，风险评分 ${b.score.toFixed(1)} 分。</p></div>
      <div class="report-sec"><h4>四、处置建议</h4>
        <p>1. 对建筑基础与裙楼连接部位开展专项检查；<br/>2. 加密 InSAR 与地面 IoT 观测频次；<br/>3. 排查周边地下管线渗漏与基坑施工影响；<br/>4. 30 天后复测并复评风险等级。</p></div>
      <div style="margin-top:12px;font-size:8.5px;color:#4d647a">演示报告 · 数据为脱敏示例，不作为真实评估依据。</div>`,
      footer: `<button class="btn btn-ghost" data-close>关闭</button><button class="btn btn-primary" data-dl>导出报告</button>`,
      onMount: (body, close) => {
        body.querySelector('[data-close]').onclick = close;
        body.querySelector('[data-dl]').onclick = () => APP.toast('评估报告已生成（示例）', 'ok', '报告导出');
      }
    });
  }

  /* ---------------------------- 交互 ---------------------------- */
  function bindUI() {
    $$('#modelSeg button').forEach(btn => btn.onclick = () => {
      sceneMode = btn.dataset.model;
      $$('#modelSeg button').forEach(x => x.classList.toggle('is-active', x === btn));
      renderScene(APP.building(state.buildingId));
      APP.toast(`已切换至${btn.textContent.trim()}`, 'info', '建筑模型');
    });

    $('#bBack').onclick = () => APP.go('map');
    $('#bAi').onclick = () => {
      state.aiBuildingId = state.buildingId;
      APP.go('ai');
      setTimeout(() => APP.aiApi && APP.aiApi.setBuilding(state.buildingId), 120);
    };
    $('#bReport').onclick = () => reportModal(APP.building(state.buildingId));
    $('#alarmMore').onclick = () => {
      const b = APP.building(state.buildingId);
      APP.modal({
        title: '历史告警记录', sub: b.name, icon: 'i-bell', wide: true,
        body: `<table class="mini-table"><thead><tr><th>告警类型</th><th>告警内容</th><th>等级</th><th>时间</th><th>状态</th></tr></thead><tbody>
          ${window.BUILDING_ALARMS.map(a => `<tr><td>${a.type}</td><td>${a.text}</td><td><span class="lv-tag ${a.level}"><i></i>${APP.riskLabel(a.level)}</span></td><td class="mt-num">${a.time}</td><td>${a.state}</td></tr>`).join('')}
        </tbody></table>`,
        footer: `<button class="btn btn-ghost" data-close>关闭</button>`,
        onMount: (body, close) => { body.querySelector('[data-close]').onclick = close; }
      });
    };

    // 传感器悬浮提示
    const scene = $('#buildingScene');
    const pop = document.createElement('div');
    pop.className = 'sensor-pop hide';
    pop.id = 'sensorPop';
    scene.appendChild(pop);

    scene.addEventListener('mouseover', e => {
      const g = e.target.closest('.sensor-dot');
      if (!g) return;
      const s = rowsCache.find(x => x.id === g.dataset.sid);
      if (!s) return;
      const r = scene.getBoundingClientRect();
      pop.innerHTML = `${s.id} · ${s.type}<b>${s.value}</b><em>实时</em>`;
      pop.style.left = (e.clientX - r.left) + 'px';
      pop.style.top = (e.clientY - r.top - 6) + 'px';
      pop.classList.remove('hide');
    });
    scene.addEventListener('mouseout', e => {
      if (e.target.closest('.sensor-dot')) pop.classList.add('hide');
    });
    scene.addEventListener('click', e => {
      const g = e.target.closest('.sensor-dot');
      if (!g) return;
      const s = rowsCache.find(x => x.id === g.dataset.sid);
      if (s) sensorDetail(APP.building(state.buildingId), s);
    });
  }

  /* ---------------------------- 渲染 ---------------------------- */
  function renderAll() {
    const b = APP.building(state.buildingId);
    $('#bName').textContent = b.name;
    const badge = $('#bRiskBadge');
    badge.className = 'risk-badge ' + b.risk;
    badge.textContent = APP.riskLabel(b.risk);
    $('#bSubline').textContent = `${b.district}${b.address.replace(b.district, '')} · ${b.type} · ${b.floors} 层 · 建成于 ${b.year} 年`;

    renderMeta(b);
    renderScene(b);
    renderSettle(b);
    renderCrack(b);
    rowsCache = sensorRows(b);
    const tilt = rowsCache.filter(s => s.kind === 'tilt');
    setGauge('X', tilt[0] ? tilt[0].n : 0.12);
    setGauge('Y', tilt[1] ? tilt[1].n : 0.08);
    renderSensorTable(b);
    renderAlarms(b);
  }

  APP.views.building = {
    init() {
      inited = true;
      bindUI();
      renderAll();
    },
    resize() {
      ['bSettle', 'bCrack'].forEach(id => {
        const inst = echarts.getInstanceByDom(document.getElementById(id));
        if (inst) inst.resize();
      });
    }
  };

  APP.buildingApi = {
    setBuilding(id) {
      state.buildingId = id;
      if (inited) renderAll();
    }
  };
})();
