/* ===================================================================
   config.js — 所有面板配置、指标定义、目标值、常数
   =================================================================== */

// ---------- 面板元数据 ----------
const PANELS = [
  { id: 'panel1', name: '整商面板', icon: '📊', files: [] },
  { id: 'panel2', name: 'B端KPI面板', icon: '🎯', files: [] },
];

// ---------- 静态目标值 ----------
const TARGETS = {
  // 新签目标（区县 -> 调整后目标）
  newSign: [
    { district: '清镇', target: 69 },
    { district: '龙里', target: 45 },
    { district: '福泉', target: 41 },
    { district: '黔西', target: 38 },
    { district: '思南', target: 30 },
    { district: '罗甸', target: 26 },
    { district: '赤水', target: 24 },
    { district: '施秉', target: 10 },
    { district: '镇远', target: 10 },
    { district: '岑巩', target: 10 },
  ],
  // 超抢手供给上翻目标（区县 -> 目标）
  superHand: [
    { district: '清镇', target: 55 },
    { district: '赤水', target: 23 },
    { district: '黔西', target: 39 },
    { district: '福泉', target: 14 },
    { district: '龙里', target: 19 },
    { district: '思南', target: 13 },
    { district: '罗甸', target: 18 },
    { district: '施秉', target: 6 },
    { district: '黄平', target: 3 },
    { district: '岑巩', target: 11 },
    { district: '镇远', target: 6 },
  ],
  // 爆单红包活动报名率6月目标（区县 -> 目标%）
  boomRate: [
    { district: '清镇', target: 81.19 },
    { district: '赤水', target: 86.21 },
    { district: '思南', target: 80.00 },
    { district: '黄平', target: 92.00 },
    { district: '施秉', target: 87.96 },
    { district: '镇远', target: 91.24 },
    { district: '岑巩', target: 90.53 },
    { district: '福泉', target: 83.35 },
    { district: '罗甸', target: 84.75 },
    { district: '龙里', target: 81.86 },
    { district: '黔西', target: 85.87 },
  ],
  // 阶梯暴涨活动报名率6月目标（区县 -> 目标%）
  surgeRate: [
    { district: '清镇', target: 70.00 },
    { district: '赤水', target: 65.64 },
    { district: '思南', target: 70.00 },
    { district: '黄平', target: 65.00 },
    { district: '施秉', target: 70.00 },
    { district: '镇远', target: 70.00 },
    { district: '岑巩', target: 67.00 },
    { district: '福泉', target: 71.82 },
    { district: '罗甸', target: 70.00 },
    { district: '龙里', target: 73.00 },
    { district: '黔西', target: 75.00 },
  ],
};

// 区县列表（用于区县选择器）
const DISTRICTS = [
  '清镇', '龙里', '福泉', '黔西', '思南', '罗甸', '赤水',
  '施秉', '镇远', '岑巩', '黄平',
];

// ---------- 整商面板 — 数据列名映射 ----------
const P1_COLS = {
  date: '日期',
  shopId: '商户id',
  shopName: '商户名称',
  bdId: 'bd_id',
  bdName: 'bd名称',
  district: '区县名称',
  bizLine: '业务线含tn',
  category15: '餐饮一点五级类目',
  isOpen: '当日是否营业',
  isReduce: '餐饮营销工具_当日是否减配覆盖',
  isBoom: '餐饮营销工具_当日是否爆单红包覆盖',
  isSurge: '餐饮营销工具_当日是否暴涨爆单红包',
  orders: '总订单',
  groupOrders: '拼团订单',
  nonGroupOrders: '非拼团订单',
  grossG: '毛g',
  groupGrossG: '拼团毛g',
  nonGroupGrossG: '非拼团毛g',
  netG: '净g',
  groupNetG: '拼团净g',
  nonGroupNetG: '非拼团净g',
  isActive: '当日是否动销',
  freeOrder: '餐饮营销工具_免配订单',
  superOrders: '超抢手订单数',
  orders30d: '近30天总订单',
  superEffNum: '超抢手有效品数',
  superSellNum: '超抢手可售品数',
};

// ---------- 整商面板 — 指标定义 ----------
// 每个指标: { id, label, compute(rows, filteredRows), format, woW }
const P1_INDICATORS = [
  {
    id: 'p1_total_shops', label: '整商总商户数', format: 'int', woW: true,
    compute: (rows) => uniq(rows, '商户id').length,
  },
  {
    id: 'p1_bd_count', label: '总BD人数', format: 'int', woW: true,
    compute: (rows) => uniq(rows, 'bd_id').length,
  },
  {
    id: 'p1_total_orders', label: '总订单数', format: 'int', woW: true,
    compute: (rows) => sum(rows, '总订单'),
  },
  {
    id: 'p1_group_orders', label: '拼团订单数', format: 'int', woW: true,
    compute: (rows) => sum(rows, '拼团订单'),
  },
  {
    id: 'p1_non_group_orders', label: '非拼团订单数', format: 'int', woW: true,
    compute: (rows) => sum(rows, '非拼团订单'),
  },
  {
    id: 'p1_super_orders', label: '超抢手订单数', format: 'int', woW: true,
    compute: (rows) => sum(rows, '超抢手订单数'),
  },
  {
    id: 'p1_free_orders', label: '免配订单数', format: 'int', woW: true,
    compute: (rows) => sum(rows, '餐饮营销工具_免配订单'),
  },
  {
    id: 'p1_gross_g', label: '毛G', format: 'money', woW: true,
    compute: (rows) => sum(rows, '毛g'),
  },
  {
    id: 'p1_non_group_gross_g', label: '非拼团毛G', format: 'money', woW: true,
    compute: (rows) => sum(rows, '非拼团毛g'),
  },
  {
    id: 'p1_group_gross_g', label: '拼团毛G', format: 'money', woW: true,
    compute: (rows) => sum(rows, '拼团毛g'),
  },
  {
    id: 'p1_net_g', label: '净G', format: 'money', woW: true,
    compute: (rows) => sum(rows, '净g'),
  },
  {
    id: 'p1_non_group_net_g', label: '非拼团净G', format: 'money', woW: true,
    compute: (rows) => sum(rows, '非拼团净g'),
  },
  {
    id: 'p1_group_net_g', label: '拼团净G', format: 'money', woW: true,
    compute: (rows) => sum(rows, '拼团净g'),
  },
  {
    id: 'p1_active_shops', label: '动销商户数', format: 'int', woW: true,
    compute: (rows) => rows.filter(r => r['当日是否动销'] == 1 || r['当日是否动销'] === '1').length,
  },
  {
    id: 'p1_reduce_rate', label: '减配商户覆盖率', format: 'pct', woW: true,
    compute: (rows) => {
      const total = uniq(rows, '商户id').length;
      const covered = uniq(rows.filter(r => r['餐饮营销工具_当日是否减配覆盖'] == 1 || r['餐饮营销工具_当日是否减配覆盖'] === '1'), '商户id').length;
      return total > 0 ? covered / total : 0;
    },
  },
  {
    id: 'p1_boom_rate', label: '爆单红包覆盖率', format: 'pct', woW: true,
    compute: (rows) => {
      const total = uniq(rows, '商户id').length;
      const covered = uniq(rows.filter(r => r['餐饮营销工具_当日是否爆单红包覆盖'] == 1 || r['餐饮营销工具_当日是否爆单红包覆盖'] === '1'), '商户id').length;
      return total > 0 ? covered / total : 0;
    },
  },
  {
    id: 'p1_surge_rate', label: '暴涨红包覆盖率', format: 'pct', woW: true,
    compute: (rows) => {
      const total = uniq(rows, '商户id').length;
      const covered = uniq(rows.filter(r => r['餐饮营销工具_当日是否暴涨爆单红包'] == 1 || r['餐饮营销工具_当日是否暴涨爆单红包'] === '1'), '商户id').length;
      return total > 0 ? covered / total : 0;
    },
  },
  {
    id: 'p1_fml_cka_open_rate', label: 'FML+CKA商户营业率', format: 'pct', woW: true,
    compute: (rows) => {
      const eligible = rows.filter(r => {
        const bl = (r['业务线含tn'] || '');
        const isTarget = bl.includes('FML') || bl.includes('CKA');
        const noCanteen = !(r['商户名称'] || '').includes('食堂');
        return isTarget && noCanteen;
      });
      const totalUniq = uniq(eligible, '商户id').length;
      const openUniq = uniq(eligible.filter(r => r['当日是否营业'] == 1 || r['当日是否营业'] === '1'), '商户id').length;
      return totalUniq > 0 ? openUniq / totalUniq : 0;
    },
  },
  {
    id: 'p1_over100_shops', label: '百单商户数', format: 'int', woW: true,
    compute: (rows) => uniq(rows.filter(r => Number(r['近30天总订单']) >= 100), '商户id').length,
  },
  {
    id: 'p1_super_over100_shops', label: '超抢手百单商户', format: 'int', woW: true,
    compute: (rows) => {
      const qualify = rows.filter(r => Number(r['近30天总订单']) >= 100 && Number(r['超抢手有效品数']) > 0);
      return uniq(qualify, '商户id').length;
    },
  },
  {
    id: 'p1_super_over100_rate', label: '超抢手百单商户有效覆盖率', format: 'pct', woW: true,
    compute: (rows) => {
      const qualify = rows.filter(r => Number(r['近30天总订单']) >= 100 && Number(r['超抢手有效品数']) > 0);
      const total = uniq(qualify, '商户id').length;
      const covered = uniq(qualify.filter(r => Number(r['超抢手可售品数']) >= 4), '商户id').length;
      return total > 0 ? covered / total : 0;
    },
  },
];

// ---------- 整商面板 — 业务线分布指标（动态生成）----------
function computeBizLineBreakdown(rows) {
  const districts = uniq(rows, '区县名称');
  const bizLines = ['FML', 'CKA', 'KA', 'SMB', '其他'];
  const shopMap = {}; // shopId -> bizLine
  
  rows.forEach(r => {
    const sid = r['商户id'];
    const bl = r['业务线含tn'] || '';
    if (!shopMap[sid] || bl.includes('FML')) shopMap[sid] = bl; // 优先FML
    else if (!shopMap[sid]) shopMap[sid] = bl;
  });

  const total = Object.keys(shopMap).length;
  const counts = {};
  Object.values(shopMap).forEach(bl => {
    // 归类
    let cat = '其他';
    if (bl.includes('FML')) cat = 'FML';
    else if (bl.includes('CKA')) cat = 'CKA';
    else if (bl.includes('KA')) cat = 'KA';
    else if (bl.includes('SMB')) cat = 'SMB';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return { total, bizLineCounts: counts, districts };
}

// ---------- 整商面板 — 1.5级品类 ----------
function computeCategory15(rows) {
  const total = uniq(rows, '商户id').length;
  const cat15 = uniq(rows.filter(r => {
    const v = r['餐饮一点五级类目'];
    return v != null && v !== '' && v !== '0';
  }), '商户id').length;
  return { count: cat15, rate: total > 0 ? cat15 / total : 0, total };
}

// ---------- B端KPI面板 — 列名 ----------
const P2_COLS = {
  // 新签
  ns_date: '日期', ns_shopId: '商户id', ns_shopName: '商户名称',
  ns_district: '区县名称', ns_bd: 'bd', ns_bdId: 'bd_id',
  ns_bizLine: '业务线', ns_isKao: '考核_是否考核商户',
  ns_weight: '考核_加权系数', ns_lastWeight: '考核餐饮_上月加权系数',
  ns_isRookie: '是否当月初出茅庐商户', ns_isRookieDenom: '是否当月初出茅庐任务分母',
  ns_isTraffic: '是否当月开启流量卡商户', ns_isTrafficDenom: '是否当月开启流量卡任务分母',
  // 爆单
  bd_date: '日期', bd_district: '区县名称', bd_shopId: '商户ID',
  bd_isActive: '是否动销', bd_isSelfDelivery: '是否仅自配送商户',
  bd_isCollege: '是否高校校内商户', bd_bizLine: '业务线_含tn',
  bd_bd: 'BD', bd_onlineHours: '阶梯爆涨爆单红包活动在线且营业时长',
  bd_isBoomQualify: '是否考核口径爆单活动报名达标商户',
};

// ---------- B端KPI — 新签计算 ----------
function computeNewSign(nsRows) {
  // 1. 新签达成 = SUM(业务线=FML 且 考核商户=1 的加权系数)
  const eligible = nsRows.filter(r => {
    const bl = r['业务线'] || '';
    const isKao = r['考核_是否考核商户'];
    return bl.includes('FML') && (isKao == 1 || isKao === '1');
  });
  const newSignDone = sum(eligible, '考核_加权系数');

  // 2. 本月新签店铺数 = COUNT(业务线=FML 且 上月加权系数=0)
  const newShops = nsRows.filter(r => {
    const bl = r['业务线'] || '';
    return bl.includes('FML') && (Number(r['考核餐饮_上月加权系数']) === 0);
  }).length;

  // 3. 过程项系数
  const rookNum = sum(nsRows, '是否当月初出茅庐商户');
  const rookDen = sum(nsRows, '是否当月初出茅庐任务分母');
  const trafficNum = sum(nsRows, '是否当月开启流量卡商户');
  const trafficDen = sum(nsRows, '是否当月开启流量卡任务分母');

  const rookRate = rookDen > 0 ? rookNum / rookDen : 0;
  const trafficRate = trafficDen > 0 ? trafficNum / trafficDen : 0;

  let processCoef;
  const both = (rookRate >= 0.55) && (trafficRate >= 0.55);
  const one = ((rookRate >= 0.55) && (trafficRate < 0.55)) || ((rookRate < 0.55) && (trafficRate >= 0.55));
  if (both) processCoef = 1.0;
  else if (one) processCoef = 0.9;
  else processCoef = 0.8;

  return {
    newSignDone, newShops,
    rookRate, trafficRate, processCoef,
    raw: { rookNum, rookDen, trafficNum, trafficDen },
  };
}

function computeNewSignScore(newSignDone, target) {
  // 4. 新签得分
  const progress = target > 0 ? newSignDone / target : 0;
  let achieveCoef;
  if (progress < 0.5) achieveCoef = 0;
  else if (progress < 0.8) achieveCoef = 0.7;
  else achieveCoef = 1.0;

  const score = progress * achieveCoef; // 还没乘过程项系数，外部乘
  return {
    progress, achieveCoef,
    score, // = progress * achieveCoef, then final = score * processCoef
  };
}

// ---------- B端KPI — 爆单报名率计算 ----------
function computeBoomRate(rows, dayLabel) {
  // 日 = 当天数据, 月累计 = 全部数据
  const dayRows = dayLabel !== '月累计' ? rows.filter(r => formatDateVal(r['日期']) === dayLabel) : rows;

  const filterDay = (r) => {
    const active = r['是否动销'] == 1 || r['是否动销'] === '1';
    const notSelf = r['是否仅自配送商户'] == 0 || r['是否仅自配送商户'] === '0';
    const isFML = (r['业务线_含tn'] || '').includes('FML');
    return active && notSelf && isFML;
  };

  const base = dayRows.filter(filterDay);
  const denominator = base.length;
  const qualified = base.filter(r => r['是否考核口径爆单活动报名达标商户'] == 1 || r['是否考核口径爆单活动报名达标商户'] === '1');
  const numerator = qualified.length;

  return {
    numerator, denominator,
    rate: denominator > 0 ? numerator / denominator : 0,
  };
}

// ---------- B端KPI — 阶梯暴涨报名率 ----------
function computeSurgeRate(rows) {
  // 分母: FML类动销非自配送非高校 总数 + CKA+KA动销商户总数
  const fmlBase = rows.filter(r => {
    const active = r['是否动销'] == 1 || r['是否动销'] === '1';
    const notSelf = r['是否仅自配送商户'] == 0 || r['是否仅自配送商户'] === '0';
    const notCollege = r['是否高校校内商户'] == 0 || r['是否高校校内商户'] === '0';
    const isFML = (r['业务线_含tn'] || '').includes('FML');
    return active && notSelf && notCollege && isFML;
  });
  const ckaKaBase = rows.filter(r => {
    const active = r['是否动销'] == 1 || r['是否动销'] === '1';
    const bl = r['业务线_含tn'] || '';
    const isCkaKa = bl.includes('CKA') || bl.includes('KA') || bl.includes('KA');
    return active && isCkaKa && !(bl.includes('FML'));
  });

  const denominator = uniq(fmlBase, '商户ID').length + uniq(ckaKaBase, '商户ID').length;

  // 分子: 其中阶梯暴涨报名时间 >= 3 的商户
  const fmlQualified = uniq(fmlBase.filter(r => Number(r['阶梯爆涨爆单红包活动在线且营业时长']) >= 3), '商户ID').length;
  const ckaKaQualified = uniq(ckaKaBase.filter(r => Number(r['阶梯爆涨爆单红包活动在线且营业时长']) >= 3), '商户ID').length;

  const numerator = fmlQualified + ckaKaQualified;

  return {
    numerator, denominator,
    rate: denominator > 0 ? numerator / denominator : 0,
  };
}

// ---------- 工具函数 ----------
function sum(rows, col) {
  return rows.reduce((a, r) => a + (Number(r[col]) || 0), 0);
}
function uniq(rows, col) {
  const set = new Set();
  rows.forEach(r => { if (r[col] != null) set.add(r[col]); });
  return [...set];
}
function formatDateVal(v) {
  if (!v) return '';
  const s = String(v);
  // 处理 Excel 日期序列号
  const num = Number(v);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // 处理字符串日期
  const m = s.match(/(\d{4})[^\d]*(\d{1,2})[^\d]*(\d{1,2})/);
  if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
  return s;
}
function pad(n) { return String(n).padStart(2, '0'); }

// 获取上周对应日期
function getWeekAgoDate(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 7);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// 获取文件中的最大日期（T-1）
function getMaxDate(rows) {
  let max = '';
  rows.forEach(r => {
    const d = formatDateVal(r['日期']);
    if (d > max) max = d;
  });
  return max;
}

// 获取今天日期
function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
