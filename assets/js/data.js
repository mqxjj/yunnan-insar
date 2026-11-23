/* ============================================================
   云南省城市建筑沉降风险安全监测平台 — 演示数据
   所有数据均为脱敏示例数据，仅用于产品演示
   ============================================================ */
(function (w) {
  'use strict';

  w.MONTHS = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
    '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];

  // AI 历史窗口与一张图时间轴保持一致（近 12 个月），避免口径错位
  w.AI_HISTORY = w.MONTHS.slice();

  w.AI_FORECAST = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02'];

  w.CITY_STATS = {
    name: '昆明市',
    total: 12847,
    newRisk: 23,
    red: 15,
    orange: 48,
    yellow: 127,
    green: 12657,
    maxRate: -28.3,
    maxBuildingId: 'B001',
    maxLocation: '五华区 东风东路88号',
    coverage: 2186,
    psPoints: 1284563,
    sensors: 1246,
    updated: '2026-08-03',
    districts: 6
  };

  w.AI_MODEL = {
    version: 'v3.2.1',
    training: '12,847 栋建筑',
    accuracy: 94.6,
    updated: '2026-08-01',
    engine: 'InSAR-Temporal Transformer 时序反演模型'
  };

  w.DISTRICTS = ['五华区', '盘龙区', '官渡区', '西山区', '呈贡区', '晋宁区', '安宁市'];

  w.BUILDINGS = [
    {
      id: 'B001', name: '东风东路88号', short: '东风东路88号', district: '五华区', type: '商务办公',
      year: 2003, floors: 18, area: '28,600', structure: '框架剪力墙', risk: 'red',
      rate: -28.3, cumulative: -18.9, accel: 0.098, lon: 102.7248, lat: 25.0402,
      address: '五华区东风东路88号', construction: 86, geology: 78, structureScore: 62,
      coverage: 'Sentinel-1 + 天仪空间', online: true, alerts: 3, score: 94.6,
      owner: '云南滇中城市建设投资有限公司', use: '商业办公 / 裙楼商业'
    },
    {
      id: 'B002', name: '北京路23号院', short: '北京路23号院', district: '盘龙区', type: '老旧住宅',
      year: 1996, floors: 7, area: '9,800', structure: '砖混结构', risk: 'red',
      rate: -24.6, cumulative: -17.2, accel: 0.082, lon: 102.7238, lat: 25.0522,
      address: '盘龙区北京路23号院', construction: 72, geology: 70, structureScore: 84,
      coverage: 'Sentinel-1 + 地面IoT', online: true, alerts: 2, score: 88.4,
      owner: '盘龙区公有房屋管理中心', use: '住宅 / 底层商业'
    },
    {
      id: 'B003', name: '巫家坝路1号', short: '巫家坝路1号', district: '官渡区', type: '商业综合体',
      year: 2018, floors: 32, area: '126,000', structure: '框架核心筒', risk: 'red',
      rate: -26.1, cumulative: -14.8, accel: 0.112, lon: 102.7428, lat: 24.9972,
      address: '官渡区巫家坝路1号', construction: 95, geology: 66, structureScore: 48,
      coverage: 'Sentinel-1 升降轨 + 天仪空间', online: true, alerts: 4, score: 96.2,
      owner: '昆明巫家坝建设发展有限责任公司', use: '商业综合体 / 办公'
    },
    {
      id: 'B004', name: '春融街188号', short: '春融街188号', district: '呈贡区', type: '商务办公',
      year: 2016, floors: 22, area: '46,000', structure: '框架结构', risk: 'orange',
      rate: -18.7, cumulative: -12.6, accel: 0.064, lon: 102.7995, lat: 24.8905,
      address: '呈贡区春融街188号', construction: 68, geology: 58, structureScore: 52,
      coverage: 'Sentinel-1 + 天仪空间', online: true, alerts: 2, score: 77.8,
      owner: '昆明呈贡新区开发建设有限公司', use: '商务办公'
    },
    {
      id: 'B005', name: '滇池路1399号', short: '滇池路1399号', district: '西山区', type: '住宅小区',
      year: 2005, floors: 11, area: '21,500', structure: '框架结构', risk: 'orange',
      rate: -16.8, cumulative: -11.4, accel: 0.047, lon: 102.6865, lat: 25.0095,
      address: '西山区滇池路1399号', construction: 54, geology: 88, structureScore: 58,
      coverage: 'Sentinel-1 + 地面IoT', online: true, alerts: 1, score: 72.3,
      owner: '西山区住房和城乡建设局', use: '住宅'
    },
    {
      id: 'B006', name: '翠湖南路12号', short: '翠湖南路12号', district: '五华区', type: '历史建筑',
      year: 1985, floors: 5, area: '6,400', structure: '砖混结构', risk: 'orange',
      rate: -22.2, cumulative: -16.1, accel: 0.071, lon: 102.7065, lat: 25.0465,
      address: '五华区翠湖南路12号', construction: 44, geology: 62, structureScore: 90,
      coverage: 'Sentinel-1 + 地面IoT', online: true, alerts: 2, score: 84.1,
      owner: '五华区文化和旅游局', use: '文保 / 住宅'
    },
    {
      id: 'B007', name: '关上中路45号', short: '关上中路45号', district: '官渡区', type: '商业办公',
      year: 2001, floors: 9, area: '14,200', structure: '框架结构', risk: 'orange',
      rate: -14.2, cumulative: -9.1, accel: 0.038, lon: 102.7485, lat: 25.0195,
      address: '官渡区关上中路45号', construction: 61, geology: 52, structureScore: 55,
      coverage: 'Sentinel-1', online: true, alerts: 1, score: 66.9,
      owner: '官渡区国有资产投资经营有限公司', use: '商业办公'
    },
    {
      id: 'B008', name: '圆通街33号', short: '圆通街33号', district: '五华区', type: '住宅',
      year: 1992, floors: 6, area: '7,100', structure: '砖混结构', risk: 'orange',
      rate: -19.4, cumulative: -13.8, accel: 0.058, lon: 102.7108, lat: 25.0538,
      address: '五华区圆通街33号', construction: 57, geology: 60, structureScore: 86,
      coverage: 'Sentinel-1 + 地面IoT', online: true, alerts: 1, score: 78.6,
      owner: '五华区公有房屋管理中心', use: '住宅'
    },
    {
      id: 'B009', name: '昆明北站铁路小区', short: '北站铁路小区', district: '盘龙区', type: '老旧住宅',
      year: 1988, floors: 6, area: '11,600', structure: '砖混结构', risk: 'orange',
      rate: -21.5, cumulative: -15.2, accel: 0.066, lon: 102.7228, lat: 25.0618,
      address: '盘龙区北京路北站铁路小区', construction: 79, geology: 64, structureScore: 88,
      coverage: 'Sentinel-1 + 地面IoT', online: true, alerts: 2, score: 82.5,
      owner: '中国铁路昆明局集团有限公司', use: '住宅'
    },
    {
      id: 'B010', name: '兴呈路566号', short: '兴呈路566号', district: '呈贡区', type: '公共建筑',
      year: 2012, floors: 5, area: '18,900', structure: '框架结构', risk: 'yellow',
      rate: -12.4, cumulative: -8.3, accel: 0.031, lon: 102.8085, lat: 24.8785,
      address: '呈贡区兴呈路566号', construction: 48, geology: 55, structureScore: 46,
      coverage: 'Sentinel-1', online: true, alerts: 1, score: 58.2,
      owner: '呈贡区教育体育局', use: '学校'
    },
    {
      id: 'B011', name: '世博路10号', short: '世博路10号', district: '盘龙区', type: '公共建筑',
      year: 2010, floors: 4, area: '23,400', structure: '钢结构', risk: 'yellow',
      rate: -10.8, cumulative: -6.9, accel: 0.024, lon: 102.7425, lat: 25.0825,
      address: '盘龙区世博路10号', construction: 32, geology: 48, structureScore: 34,
      coverage: 'Sentinel-1', online: true, alerts: 1, score: 51.7,
      owner: '昆明世界园艺博览园有限公司', use: '展馆'
    },
    {
      id: 'B012', name: '西山万达广场', short: '西山万达广场', district: '西山区', type: '商业综合体',
      year: 2015, floors: 28, area: '98,000', structure: '框架核心筒', risk: 'yellow',
      rate: -11.9, cumulative: -7.6, accel: 0.027, lon: 102.7048, lat: 25.0072,
      address: '西山区前兴路与日新路交叉口', construction: 40, geology: 68, structureScore: 42,
      coverage: 'Sentinel-1 + 天仪空间', online: true, alerts: 1, score: 55.4,
      owner: '昆明西山万达广场投资有限公司', use: '商业综合体'
    }
  ];

  // 口径统一：监测期内速率由约 0.56R 逐步增至当前速率 R，
  // 12 个月积分约为当前速率的 0.75 倍 → 保证「近12个月累计 ≈ 平均速率 × 1 年」
  w.BUILDINGS.forEach(b => { b.cumulative = +(b.rate * 0.75).toFixed(1); });

  w.RISK_META = {
    red: { label: '红色预警', short: '红', color: '#ff3b5c', dim: 'rgba(255,59,92,.14)' },
    orange: { label: '橙色预警', short: '橙', color: '#ff8a1f', dim: 'rgba(255,138,31,.14)' },
    yellow: { label: '黄色预警', short: '黄', color: '#ffc53d', dim: 'rgba(255,197,61,.14)' },
    green: { label: '正常', short: '绿', color: '#22d67d', dim: 'rgba(34,214,125,.14)' }
  };

  w.RATE_TREND = [-9.8, -11.2, -12.5, -14.8, -16.2, -17.6, -19.1, -20.4, -22.6, -24.0, -26.5, -28.3];
  w.CITY_MAX_RATE = w.RATE_TREND.slice();

  w.HEAT_CLUSTERS = [
    { lon: 102.7428, lat: 24.9972, sx: 0.0105, sy: 0.0082, w: 1.00 }, // 巫家坝
    { lon: 102.7238, lat: 25.0150, sx: 0.0115, sy: 0.0090, w: 0.94 }, // 火车站
    { lon: 102.7248, lat: 25.0402, sx: 0.0095, sy: 0.0072, w: 0.90 }, // 东风广场
    { lon: 102.7228, lat: 25.0618, sx: 0.0125, sy: 0.0092, w: 0.79 }, // 北站
    { lon: 102.7065, lat: 25.0465, sx: 0.0088, sy: 0.0068, w: 0.72 }, // 翠湖
    { lon: 102.6865, lat: 25.0095, sx: 0.0140, sy: 0.0110, w: 0.66 }, // 滇池路
    { lon: 102.7048, lat: 25.0072, sx: 0.0112, sy: 0.0095, w: 0.61 }, // 前卫
    { lon: 102.7995, lat: 24.8905, sx: 0.0180, sy: 0.0130, w: 0.63 }, // 呈贡核心
    { lon: 102.8380, lat: 24.8710, sx: 0.0150, sy: 0.0110, w: 0.48 }, // 大学城
    { lon: 102.7425, lat: 25.0825, sx: 0.0125, sy: 0.0098, w: 0.44 }, // 世博
    { lon: 102.7485, lat: 25.0195, sx: 0.0098, sy: 0.0080, w: 0.55 }, // 关上
    { lon: 102.7860, lat: 24.9520, sx: 0.0125, sy: 0.0100, w: 0.50 }, // 新螺蛳湾
    { lon: 102.7080, lat: 25.0720, sx: 0.0120, sy: 0.0100, w: 0.36 }, // 北部
    { lon: 102.7700, lat: 25.0350, sx: 0.0120, sy: 0.0100, w: 0.38 }, // 东郊
    { lon: 102.4855, lat: 24.9218, sx: 0.0180, sy: 0.0150, w: 0.30 }  // 安宁
  ];

  w.RISK_BOXES = [
    { buildingId: 'B001', color: '#ff3b5c', bounds: [[25.0378, 102.7218], [25.0426, 102.7282]] },
    { buildingId: 'B003', color: '#ff3b5c', bounds: [[24.9942, 102.7396], [25.0002, 102.7462]] },
    { buildingId: 'B002', color: '#ff8a1f', bounds: [[25.0492, 102.7208], [25.0552, 102.7270]] },
    { buildingId: 'B004', color: '#ff8a1f', bounds: [[24.8868, 102.7962], [24.8938, 102.8028]] },
    { buildingId: 'B005', color: '#ff8a1f', bounds: [[25.0062, 102.6832], [25.0128, 102.6900]] },
    { buildingId: 'B006', color: '#ffc53d', bounds: [[25.0436, 102.7034], [25.0494, 102.7096]] }
  ];

  w.ALERTS = [
    {
      id: 'YJ-2026-0803-001', buildingId: 'B001', type: '沉降超限', level: 'red', time: '2026-08-03 09:15',
      status: '待核查', handler: '李工 · 五华区住建局', progress: 1, source: 'InSAR 卫星监测',
      desc: '近 12 个月累计沉降 -21.2mm，当前沉降速率 -28.3mm/年，连续 3 期呈加速趋势，已触发红色预警阈值。',
      suggestion: '建议 24 小时内完成现场核查，布设静力水准仪与倾角计，重点检查东侧裙楼差异沉降。'
    },
    {
      id: 'YJ-2026-0803-002', buildingId: 'B002', type: '沉降超限', level: 'orange', time: '2026-08-03 08:42',
      status: '已派单', handler: '王工 · 盘龙区住建局', progress: 1, source: 'InSAR 卫星监测',
      desc: '沉降速率 -24.6mm/年，砖混结构建成 30 年，北侧单元近 12 个月累计沉降 -18.5mm。',
      suggestion: '已自动派发至盘龙区房屋安全管理责任人，建议同步核查周边地下管线。'
    },
    {
      id: 'YJ-2026-0802-003', buildingId: 'B003', type: '沉降加速', level: 'red', time: '2026-08-02 22:10',
      status: '核查中', handler: '赵工 · 官渡区住建局', progress: 2, source: 'InSAR 升降轨融合',
      desc: '巫家坝片区深基坑施工影响范围内，加速度达 0.112mm/月²，东西向水平位移同步增大。',
      suggestion: '建议复核基坑支护监测数据，对建筑东侧布设位移传感器并加密观测频次。'
    },
    {
      id: 'YJ-2026-0802-004', buildingId: 'B006', type: '倾斜异常', level: 'orange', time: '2026-08-02 16:35',
      status: '核查中', handler: '李工 · 五华区住建局', progress: 2, source: '地面 IoT 倾角计',
      desc: 'X 向倾角 0.12°，超出近 12 个月均值 42%，为 1985 年砖混历史建筑。',
      suggestion: '建议开展结构安全性鉴定，设置临时支撑并限制人员密集使用。'
    },
    {
      id: 'YJ-2026-0802-005', buildingId: 'B008', type: '裂缝发展', level: 'orange', time: '2026-08-02 15:20',
      status: '待核查', handler: '未指派', progress: 1, source: '地面 IoT 裂缝计',
      desc: '承重墙裂缝宽度由 0.42mm 发展至 0.62mm，周增速 0.06mm，接近 0.80mm 预警值。',
      suggestion: '建议现场复核裂缝形态，判断是否为结构性裂缝，必要时启动应急加固。'
    },
    {
      id: 'YJ-2026-0802-006', buildingId: 'B009', type: '沉降超限', level: 'orange', time: '2026-08-02 14:08',
      status: '已整改', handler: '周工 · 盘龙区住建局', progress: 3, source: 'InSAR + 静力水准',
      desc: '铁路小区 3 号楼近 12 个月累计沉降 -16.1mm，经核查为周边管网渗漏引发的地层流失。',
      suggestion: '已完成管网封堵与注浆加固，进入 30 天复测观察期。'
    },
    {
      id: 'YJ-2026-0802-007', buildingId: 'B004', type: '沉降超限', level: 'orange', time: '2026-08-02 11:42',
      status: '已派单', handler: '陈工 · 呈贡区住建局', progress: 1, source: 'Sentinel-1 卫星监测',
      desc: '春融街 188 号近 12 个月累计沉降 -14.0mm，速率 -18.7mm/年，位于软弱地层分布区。',
      suggestion: '已派单至呈贡区住建局，建议结合地质勘察资料复核地基持力层。'
    },
    {
      id: 'YJ-2026-0802-008', buildingId: 'B007', type: '裂缝发展', level: 'yellow', time: '2026-08-02 10:18',
      status: '待销号', handler: '赵工 · 官渡区住建局', progress: 4, source: '地面 IoT 裂缝计',
      desc: '裙楼填充墙裂缝宽度 0.49mm，经整改后连续 14 天无新增发展。',
      suggestion: '整改完成，等待区局复核确认后销号。'
    },
    {
      id: 'YJ-2026-0801-009', buildingId: 'B005', type: '倾斜异常', level: 'orange', time: '2026-08-01 17:26',
      status: '已销号', handler: '孙工 · 西山区住建局', progress: 5, source: '地面 IoT 倾角计',
      desc: '滇池路 1399 号 7 号楼倾角 0.09°，经复核为传感器安装基座松动导致的异常数据。',
      suggestion: '已重新安装校准，数据恢复正常，完成销号。'
    },
    {
      id: 'YJ-2026-0801-010', buildingId: 'B010', type: '沉降超限', level: 'yellow', time: '2026-08-01 15:03',
      status: '已整改', handler: '陈工 · 呈贡区住建局', progress: 3, source: 'Sentinel-1 卫星监测',
      desc: '兴呈路 566 号教学楼近 12 个月累计沉降 -9.3mm，处于黄色预警区间。',
      suggestion: '已完成散水修复与排水改造，沉降速率趋稳。'
    },
    {
      id: 'YJ-2026-0801-011', buildingId: 'B011', type: '数据异常', level: 'yellow', time: '2026-08-01 11:47',
      status: '已销号', handler: '周工 · 盘龙区住建局', progress: 5, source: '地面 IoT 网关',
      desc: '世博路 10 号 2 号裂缝计连续 6 小时数据跳变，判定为网关通信中断。',
      suggestion: '已完成网关重启与固件升级，数据链路恢复。'
    },
    {
      id: 'YJ-2026-0801-012', buildingId: 'B012', type: '沉降超限', level: 'yellow', time: '2026-08-01 09:32',
      status: '已派单', handler: '孙工 · 西山区住建局', progress: 1, source: 'Sentinel-1 + 天仪空间',
      desc: '西山万达广场西侧近 12 个月累计沉降 -8.9mm，沉降速率 -11.9mm/年。',
      suggestion: '已派单核查，建议关注地铁 5 号线保护区施工影响。'
    },
    {
      id: 'YJ-2026-0731-013', buildingId: 'B001', type: '裂缝发展', level: 'red', time: '2026-07-31 20:12',
      status: '已整改', handler: '李工 · 五华区住建局', progress: 3, source: '地面 IoT 裂缝计',
      desc: '东风东路 88 号裙楼裂缝宽度 1.12mm，超过 0.80mm 预警值。',
      suggestion: '已完成压力注浆封闭处理，当前宽度回落至 0.62mm。'
    },
    {
      id: 'YJ-2026-0731-014', buildingId: 'B003', type: '倾斜异常', level: 'orange', time: '2026-07-31 18:05',
      status: '待核查', handler: '未指派', progress: 1, source: 'InSAR 升降轨融合',
      desc: '巫家坝路 1 号东侧立面东西向位移 4.6mm/年，超出预警阈值。',
      suggestion: '建议联动基坑监测单位开展联合核查，必要时暂停周边土方开挖。'
    }
  ];

  w.LANDMARKS = [
    { name: '翠湖公园', lon: 102.7040, lat: 25.0485, kind: '公园' },
    { name: '东风广场', lon: 102.7235, lat: 25.0400, kind: '广场' },
    { name: '昆明火车站', lon: 102.7235, lat: 25.0148, kind: '交通' },
    { name: '巫家坝片区', lon: 102.7440, lat: 24.9960, kind: '片区' },
    { name: '金马碧鸡坊', lon: 102.7145, lat: 25.0347, kind: '地标' },
    { name: '昆明北站', lon: 102.7228, lat: 25.0608, kind: '交通' },
    { name: '滇池', lon: 102.6680, lat: 24.9420, kind: '水体' },
    { name: '昆明南站', lon: 102.8600, lat: 24.8790, kind: '交通' },
    { name: '长水国际机场', lon: 102.9290, lat: 25.1010, kind: '交通' }
  ];

  w.PROVINCE_CITIES = [
    { name: '昆明市', total: 12847, red: 15, orange: 48, yellow: 127, current: true },
    { name: '曲靖市', total: 6214, red: 6, orange: 19, yellow: 63 },
    { name: '红河州', total: 5430, red: 5, orange: 17, yellow: 58 },
    { name: '昭通市', total: 4860, red: 4, orange: 15, yellow: 51 },
    { name: '玉溪市', total: 4102, red: 3, orange: 13, yellow: 46 },
    { name: '大理州', total: 3865, red: 3, orange: 11, yellow: 42 },
    { name: '文山州', total: 3640, red: 2, orange: 10, yellow: 39 },
    { name: '楚雄州', total: 3120, red: 2, orange: 9, yellow: 34 },
    { name: '保山市', total: 2940, red: 2, orange: 8, yellow: 31 },
    { name: '普洱市', total: 2780, red: 1, orange: 7, yellow: 29 },
    { name: '临沧市', total: 2410, red: 1, orange: 6, yellow: 25 },
    { name: '丽江市', total: 1860, red: 1, orange: 5, yellow: 19 },
    { name: '德宏州', total: 1320, red: 1, orange: 3, yellow: 14 },
    { name: '西双版纳州', total: 1180, red: 0, orange: 3, yellow: 12 },
    { name: '迪庆州', total: 760, red: 0, orange: 2, yellow: 8 },
    { name: '怒江州', total: 610, red: 0, orange: 1, yellow: 6 }
  ];

  w.INSAR = {
    stats: {
      coverage: '2,186', ps: '1,284,563', pairs: '1,248', coherence: '0.86',
      precision: '±2.8', latency: '36h', density: '588', updated: '2026-08-03 07:30'
    },
    pipeline: [
      { name: '数据接入', desc: 'Sentinel-1A/B 升轨 + 降轨 · 12 天重访', time: '08-01 02:10', cost: '2.4h', state: 'done' },
      { name: '影像配准', desc: 'SRTM 辅助精配准 · 1,248 景', time: '08-01 05:42', cost: '3.5h', state: 'done' },
      { name: '干涉处理', desc: '差分干涉 + 相干性估计 · 624 对', time: '08-01 18:26', cost: '12.7h', state: 'done' },
      { name: '相位解缠', desc: 'SNAPHU 最小费用流 · 成功率 97.4%', time: '08-02 06:15', cost: '11.8h', state: 'done' },
      { name: '形变反演', desc: 'SBAS 时序反演 + 大气校正', time: '08-02 19:40', cost: '13.4h', state: 'done' },
      { name: '地理编码', desc: '建筑图斑关联 + 风险图斑提取', time: '08-03 07:30', cost: '11.8h', state: 'done' }
    ],
    quality: [
      { name: '平均相干性', value: '0.86', pct: 86 },
      { name: '解缠成功率', value: '97.4%', pct: 97.4 },
      { name: 'PS 点密度', value: '588 /km²', pct: 78 },
      { name: '大气校正残差', value: '1.2 mm', pct: 88 },
      { name: '粗差剔除率', value: '3.6%', pct: 64 }
    ],
    orbits: [
      {
        id: 'asc', name: '升轨 Ascending', sat: 'Sentinel-1A', track: '128', angle: '39.2°', heading: '346°',
        revisit: '12 天', baseline: '86 m', polarization: 'VV', resolution: '5 × 20 m',
        images: '624 景', period: '2024-08 ~ 2026-08'
      },
      {
        id: 'desc', name: '降轨 Descending', sat: 'Sentinel-1B', track: '135', angle: '33.8°', heading: '193°',
        revisit: '12 天', baseline: '42 m', polarization: 'VV', resolution: '5 × 20 m',
        images: '624 景', period: '2024-08 ~ 2026-08'
      }
    ],
    validation: [
      { name: '省建院', x: -18.2, y: -16.5, diff: 1.7 }, { name: '东风广场', x: -24.6, y: -22.9, diff: 1.7 },
      { name: '巫家坝', x: -26.1, y: -28.4, diff: -2.3 }, { name: '北站', x: -21.5, y: -20.1, diff: 1.4 },
      { name: '翠湖', x: -22.2, y: -24.0, diff: -1.8 }, { name: '滇池路', x: -16.8, y: -15.2, diff: 1.6 },
      { name: '关上', x: -14.2, y: -13.6, diff: 0.6 }, { name: '呈贡', x: -18.7, y: -20.3, diff: -1.6 },
      { name: '大学城', x: -12.4, y: -11.1, diff: 1.3 }, { name: '世博', x: -10.8, y: -9.4, diff: 1.4 },
      { name: '西山万达', x: -11.9, y: -13.2, diff: -1.3 }, { name: '新螺蛳湾', x: -9.6, y: -8.7, diff: 0.9 }
    ],
    histogram: {
      labels: ['≤-30', '-30~-25', '-25~-20', '-20~-15', '-15~-10', '-10~-5', '-5~0', '>0'],
      counts: [18420, 46210, 96840, 168320, 245600, 318450, 296820, 85903]
    },
    yearly: {
      years: ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'],
      mean: [-3.8, -4.4, -5.1, -5.9, -6.8, -7.6, -8.4, -9.2],
      p95: [-14.2, -15.8, -17.6, -19.8, -22.4, -24.6, -26.9, -28.3]
    }
  };

  w.INSAR_POINTS = null; // 运行时生成

  w.SENSOR_ROWS = [
    { id: 'TILT-01', type: '倾角传感器', pos: '18层屋面东南角', value: '0.12°', battery: 85, signal: 4, time: '2026-08-03 10:24', online: true, kind: 'tilt' },
    { id: 'TILT-02', type: '倾角传感器', pos: '18层屋面西北角', value: '0.08°', battery: 82, signal: 4, time: '2026-08-03 10:24', online: true, kind: 'tilt' },
    { id: 'TILT-03', type: '倾角传感器', pos: '9层东侧', value: '0.09°', battery: 78, signal: 3, time: '2026-08-03 10:23', online: true, kind: 'tilt' },
    { id: 'TILT-04', type: '倾角传感器', pos: '3层东侧', value: '0.11°', battery: 80, signal: 4, time: '2026-08-03 10:23', online: true, kind: 'tilt' },
    { id: 'CRACK-01', type: '裂缝传感器', pos: '1层东侧外墙', value: '0.36 mm', battery: 74, signal: 3, time: '2026-08-03 10:22', online: true, kind: 'crack' },
    { id: 'CRACK-02', type: '裂缝传感器', pos: '1层西侧承重墙', value: '0.49 mm', battery: 81, signal: 4, time: '2026-08-03 10:22', online: true, kind: 'crack' },
    { id: 'CRACK-03', type: '裂缝传感器', pos: '2层东侧梁', value: '0.42 mm', battery: 72, signal: 3, time: '2026-08-03 10:21', online: true, kind: 'crack' },
    { id: 'CRACK-04', type: '裂缝传感器', pos: '3层西侧柱', value: '0.55 mm', battery: 83, signal: 4, time: '2026-08-03 10:21', online: true, kind: 'crack' },
    { id: 'CRACK-05', type: '裂缝传感器', pos: '4层东侧墙', value: '0.62 mm', battery: 69, signal: 3, time: '2026-08-03 10:20', online: true, kind: 'crack' },
    { id: 'CRACK-06', type: '裂缝传感器', pos: '5层西侧墙', value: '0.47 mm', battery: 76, signal: 4, time: '2026-08-03 10:20', online: true, kind: 'crack' },
    { id: 'LEVEL-01', type: '静力水准仪', pos: '东侧基础', value: '-2.4 mm', battery: 88, signal: 4, time: '2026-08-03 10:24', online: true, kind: 'level' },
    { id: 'LEVEL-02', type: '静力水准仪', pos: '西侧基础', value: '-3.1 mm', battery: 90, signal: 4, time: '2026-08-03 10:24', online: true, kind: 'level' }
  ];

  w.CRACK_SERIES = {
    labels: ['裂缝1', '裂缝2', '裂缝3', '裂缝4', '裂缝5', '裂缝6'],
    current: [0.36, 0.49, 0.42, 0.55, 0.62, 0.47],
    previous: [0.31, 0.42, 0.38, 0.49, 0.56, 0.41],
    threshold: [1.2, 1.2, 1.2, 1.2, 0.8, 1.2]
  };

  w.BUILDING_ALARMS = [
    { type: '沉降报警', text: '累计沉降量突破黄色预警阈值 -15mm', time: '2026-08-03 09:15', state: '未处理', level: 'red' },
    { type: '裂缝报警', text: '5 层西侧墙裂缝宽度接近 0.80mm 预警值', time: '2026-08-02 18:42', state: '已处理', level: 'orange' },
    { type: '传感器离线', text: 'CRACK-06 通信中断 12 分钟，已自动恢复', time: '2026-08-01 03:26', state: '已处理', level: 'yellow' },
    { type: '倾斜预警', text: 'X 向倾角 0.12°，超出近 12 个月均值 42%', time: '2026-07-30 14:08', state: '已处理', level: 'orange' }
  ];

  /* ============================================================
     监管履职专题数据（深基坑 / 地铁沿线 / 危旧房）
     均为脱敏示例数据，对象数量与列表口径一致
     ============================================================ */

  // 地铁线路与保护区
  w.METRO = {
    line: [
      [24.879, 102.860], [24.890, 102.800], [24.916, 102.777], [24.945, 102.758],
      [24.965, 102.745], [24.997, 102.743], [25.015, 102.724], [25.024, 102.724],
      [25.039, 102.723], [25.048, 102.724], [25.061, 102.723], [25.070, 102.728],
      [25.082, 102.732], [25.095, 102.735]
    ],
    stations: [
      { name: '昆明南站', lat: 24.879, lon: 102.860 },
      { name: '春融街', lat: 24.890, lon: 102.800 },
      { name: '联大街', lat: 24.916, lon: 102.777 },
      { name: '斗南', lat: 24.945, lon: 102.758 },
      { name: '新螺蛳湾', lat: 24.965, lon: 102.745 },
      { name: '巫家坝', lat: 24.997, lon: 102.743 },
      { name: '昆明火车站', lat: 25.015, lon: 102.724 },
      { name: '环城南路', lat: 25.024, lon: 102.724 },
      { name: '东风广场', lat: 25.039, lon: 102.723 },
      { name: '交三桥', lat: 25.048, lon: 102.724 },
      { name: '火车北站', lat: 25.061, lon: 102.723 },
      { name: '北辰', lat: 25.082, lon: 102.732 }
    ],
    operator: '昆明地铁运营有限公司',
    segments: [
      {
        id: 'M01', type: 'metro', name: '巫家坝站 — 昆明火车站区间', district: '官渡区',
        lat: 25.004, lon: 102.736, risk: 'red', line: '地铁 1 号线', length: 4.2,
        protect: '结构外边线外侧 50m 重点保护区 / 100m 一般保护区',
        operator: '昆明地铁运营有限公司', affected: ['B003'], rate: -26.1,
        buildings: 38, alerts: 2, state: '保护区作业 3 处 · 协同核查中',
        desc: '区间上方及保护区内既有建筑施工密集，地面沉降与隧道结构监测需同步跟踪。'
      },
      {
        id: 'M02', type: 'metro', name: '东风广场 — 交三桥区间', district: '五华区',
        lat: 25.043, lon: 102.723, risk: 'orange', line: '地铁 1/2 号线', length: 1.8,
        protect: '结构外边线外侧 50m 重点保护区 / 100m 一般保护区',
        operator: '昆明地铁运营有限公司', affected: ['B001'], rate: -28.3,
        buildings: 26, alerts: 1, state: '保护区巡查正常 · 1 处沉降关注',
        desc: '核心商业区，周边深基坑与地铁保护区范围重叠，需建设与运营单位联合审批。'
      },
      {
        id: 'M03', type: 'metro', name: '火车北站 — 北辰区间', district: '盘龙区',
        lat: 25.071, lon: 102.728, risk: 'orange', line: '地铁 2 号线', length: 2.4,
        protect: '结构外边线外侧 50m 重点保护区 / 100m 一般保护区',
        operator: '昆明地铁运营有限公司', affected: ['B009', 'B002'], rate: -21.5,
        buildings: 31, alerts: 1, state: '既有住宅沉降走廊 · 加密观测'
      }
    ]
  };

  // 在建深基坑
  w.PITS = [
    {
      id: 'P01', type: 'pit', name: '巫家坝 · 中交 A3 地块基坑', district: '官渡区',
      lat: 24.9986, lon: 102.7443, risk: 'red', stage: '第三层土方开挖',
      depth: 12.6, support: '钻孔灌注桩 + 两道内支撑', radius: 252,
      builder: '中交云南建设有限公司', contractor: '中交二航局第三工程公司',
      supervisor: '云南恒丰建设监理有限公司', monitorUnit: '昆明勘测设计研究院',
      monitor: '自动化监测 86 点（测斜 / 轴力 / 水位）', threshold: '围护墙顶水平位移 30mm · 周边建筑沉降 20mm',
      affected: ['B003'], alerts: 3, progress: '施工第 96 天 / 计划 180 天'
    },
    {
      id: 'P02', type: 'pit', name: '东风广场 · 恒隆二期基坑', district: '五华区',
      lat: 25.0406, lon: 102.7242, risk: 'red', stage: '第二层土方开挖',
      depth: 16.8, support: '地下连续墙 + 四道内支撑', radius: 336,
      builder: '恒隆地产（昆明）有限公司', contractor: '上海建工集团股份有限公司',
      supervisor: '昆明建设监理有限公司', monitorUnit: '云南省地质工程勘察院',
      monitor: '自动化监测 124 点（墙顶位移 / 立柱沉降 / 水位）', threshold: '墙顶水平位移 25mm · 周边建筑沉降 15mm',
      affected: ['B001'], alerts: 4, progress: '施工第 142 天 / 计划 210 天'
    },
    {
      id: 'P03', type: 'pit', name: '火车北站 TOD · 基坑', district: '盘龙区',
      lat: 25.0592, lon: 102.7268, risk: 'orange', stage: '基坑支护施工',
      depth: 9.4, support: '土钉墙 + 预应力锚索', radius: 188,
      builder: '昆明轨道交通集团有限公司', contractor: '中铁八局集团有限公司',
      supervisor: '云南新迪建设监理有限公司', monitorUnit: '昆明轨道交通检测中心',
      monitor: '自动化监测 52 点', threshold: '边坡水平位移 35mm · 周边建筑沉降 20mm',
      affected: ['B009', 'B002'], alerts: 2, progress: '施工第 58 天 / 计划 150 天'
    },
    {
      id: 'P04', type: 'pit', name: '春融街地铁上盖 · 基坑', district: '呈贡区',
      lat: 24.8922, lon: 102.7988, risk: 'orange', stage: '第二层土方开挖',
      depth: 11.2, support: 'SMW 工法桩 + 一道支撑', radius: 224,
      builder: '昆明呈贡新区建设投资有限公司', contractor: '云南建投第五建设有限公司',
      supervisor: '昆明中厚建设监理有限公司', monitorUnit: '西南有色昆明勘测设计院',
      monitor: '自动化监测 68 点', threshold: '围护结构位移 30mm · 周边建筑沉降 20mm',
      affected: ['B004'], alerts: 2, progress: '施工第 74 天 / 计划 160 天'
    },
    {
      id: 'P05', type: 'pit', name: '滇池路综合管廊 · 基坑', district: '西山区',
      lat: 25.0088, lon: 102.6892, risk: 'yellow', stage: '第一层土方开挖',
      depth: 7.8, support: '钢板桩 + 横撑', radius: 156,
      builder: '昆明市城建投资开发有限责任公司', contractor: '云南建投安装股份有限公司',
      supervisor: '云南镕诚建设监理有限公司', monitorUnit: '昆明市勘察测绘研究院',
      monitor: '自动化监测 36 点', threshold: '支护结构位移 40mm · 周边建筑沉降 20mm',
      affected: ['B005'], alerts: 1, progress: '施工第 26 天 / 计划 120 天'
    },
    {
      id: 'P06', type: 'pit', name: '翠湖 · 省博改扩建基坑', district: '五华区',
      lat: 25.0462, lon: 102.7082, risk: 'yellow', stage: '基坑支护施工',
      depth: 8.2, support: '微型桩 + 锚杆', radius: 164,
      builder: '云南省博物馆', contractor: '云南建投第二建设有限公司',
      supervisor: '昆明建设咨询监理有限公司', monitorUnit: '云南省建筑科学研究院',
      monitor: '自动化监测 42 点', threshold: '支护结构位移 30mm · 周边建筑沉降 15mm',
      affected: ['B006'], alerts: 1, progress: '施工第 34 天 / 计划 140 天'
    }
  ];

  // 危旧房（C / D 级）
  w.DANGER_HOUSES = [
    { id: 'D01', type: 'danger', name: '文明街 32 号院', district: '五华区', level: 'C', risk: 'orange', year: 1972, structure: '砖木结构', households: 18, occupants: 42, area: '1,260', lat: 25.0342, lon: 102.7126, identified: '2025-11', rain: 78, use: '住宅 / 底层商铺', note: '木构件腐朽，雨季渗水明显' },
    { id: 'D02', type: 'danger', name: '龙翔街 47 号', district: '五华区', level: 'D', risk: 'red', year: 1968, structure: '砖木结构', households: 24, occupants: 56, area: '1,680', lat: 25.0508, lon: 102.7050, identified: '2026-03', rain: 92, use: '住宅', note: '承重墙开裂，整体倾斜 0.9%' },
    { id: 'D03', type: 'danger', name: '北站新村 12 栋', district: '盘龙区', level: 'C', risk: 'orange', year: 1981, structure: '砖混结构', households: 36, occupants: 89, area: '2,940', lat: 25.0585, lon: 102.7255, identified: '2026-01', rain: 71, use: '住宅', note: '圈梁构造柱缺失，抗震构造不足' },
    { id: 'D04', type: 'danger', name: '席子营东区 4 幢', district: '盘龙区', level: 'C', risk: 'orange', year: 1983, structure: '砖混结构', households: 42, occupants: 96, area: '3,180', lat: 25.0720, lon: 102.7312, identified: '2025-09', rain: 68, use: '住宅', note: '屋面渗漏，局部墙体空鼓' },
    { id: 'D05', type: 'danger', name: '和平村 38 号', district: '官渡区', level: 'D', risk: 'red', year: 1974, structure: '砖木结构', households: 26, occupants: 61, area: '1,460', lat: 25.0220, lon: 102.7305, identified: '2026-05', rain: 88, use: '住宅 / 小作坊', note: '纵墙贯通裂缝，最大宽度 12mm' },
    { id: 'D06', type: 'danger', name: '双龙桥 24 号', district: '官渡区', level: 'C', risk: 'orange', year: 1980, structure: '砖混结构', households: 22, occupants: 53, area: '1,520', lat: 25.0105, lon: 102.7360, identified: '2025-12', rain: 74, use: '住宅', note: '地基回填土较厚，沉降 8mm/年' },
    { id: 'D07', type: 'danger', name: '富春街 11 号', district: '五华区', level: 'D', risk: 'red', year: 1970, structure: '砖木结构', households: 16, occupants: 38, area: '980', lat: 25.0390, lon: 102.7010, identified: '2026-06', rain: 90, use: '住宅', note: '木屋架节点松动，屋面下垂' },
    { id: 'D08', type: 'danger', name: '长春路 58 号', district: '五华区', level: 'C', risk: 'orange', year: 1976, structure: '砖混结构', households: 28, occupants: 67, area: '1,860', lat: 25.0435, lon: 102.7180, identified: '2025-10', rain: 66, use: '住宅', note: '外墙饰面脱落，局部碳化' },
    { id: 'D09', type: 'danger', name: '金马寺小村 7 号', district: '官渡区', level: 'C', risk: 'orange', year: 1985, structure: '砖混结构', households: 34, occupants: 76, area: '2,240', lat: 25.0330, lon: 102.7440, identified: '2026-02', rain: 63, use: '住宅', note: '周边市政施工扰动，需观察' },
    { id: 'D10', type: 'danger', name: '马街新村里 3 幢', district: '西山区', level: 'C', risk: 'orange', year: 1982, structure: '砖混结构', households: 30, occupants: 71, area: '2,060', lat: 25.0250, lon: 102.6900, identified: '2026-04', rain: 61, use: '住宅', note: '排水不畅，雨季积水浸泡基础' }
  ];

  // 专题监管总量（与列表抽样口径区分展示）
  w.REG_STATS = {
    pit: { total: 86, red: 3, orange: 11, affected: 214, overdue: 2, points: 668 },
    metro: { lines: 2, segments: 14, buildings: 186, red: 2, overdue: 1 },
    danger: { total: 312, d: 47, c: 265, occupied: 68, rainy: 23 }
  };

  // 汛期叠加参数
  w.RAIN = {
    rainfall: 86, forecast: '未来 24 小时大雨到暴雨',
    warning: '暴雨橙色预警', issued: '2026-08-03 08:00', level: 'orange'
  };

  w.MATRIX_LABELS = {
    x: ['极低 (<0.01)', '低 (0.01~0.03)', '中 (0.03~0.06)', '高 (0.06~0.10)', '极高 (>0.10)'],
    y: ['极低 (<0.1)', '低 (0.1~0.5)', '中 (0.5~1.0)', '高 (1.0~2.0)', '极高 (>2.0)']
  };

  w.HEAT_COLORS = [
    [0.00, 'rgba(34,214,125,0)'],
    [0.12, 'rgba(46,204,113,0.38)'],
    [0.28, 'rgba(126,231,135,0.52)'],
    [0.46, 'rgba(255,197,61,0.62)'],
    [0.64, 'rgba(255,138,31,0.74)'],
    [0.82, 'rgba(255,59,92,0.86)'],
    [1.00, 'rgba(255,10,60,0.95)']
  ];

})(window);
