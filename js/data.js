/* ===================================================================
   data.js — 数据处理引擎：加载、缓存、过滤、聚合、周同比
   =================================================================== */

const DataEngine = {
  // 原始数据缓存 { fileName: [{col: val, ...}, ...] }
  _cache: {},

  // 按面板绑定文件
  _panelFiles: { panel1: [], 'panel2-new-sign': [], 'panel2-boom': [], 'panel2-surge': [] },

  // ---------- 加载 + 解析 ----------
  async loadFile(fileObj) {
    const url = `https://raw.githubusercontent.com/${state.config.owner}/${state.config.repo}/${state.config.branch}/${fileObj.path}`;
    const resp = await fetch(url + '?t=' + Date.now());
    const buf = await resp.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'arraybuffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    this._cache[fileObj.name] = rows;
    return rows;
  },

  getCached(name) { return this._cache[name] || []; },

  // ---------- 关联文件到面板 ----------
  setPanelFiles(panelId, fileNames) {
    this._panelFiles[panelId] = fileNames;
  },

  getPanelFiles(panelId) { return this._panelFiles[panelId]; },

  // ---------- 整商面板：过滤 + 聚合 ----------
  getPanel1Data(filter = {}) {
    const files = this._panelFiles.panel1;
    let rows = [];
    files.forEach(f => { rows = rows.concat(this._cache[f] || []); });
    if (!rows.length) return null;

    // 获取所有日期
    const allDates = [...new Set(rows.map(r => formatDateVal(r['日期'])).filter(Boolean))].sort();
    const maxDate = allDates[allDates.length - 1] || '';

    // 过滤日期
    let dateKey = filter.date || maxDate;
    let filtered = rows.filter(r => formatDateVal(r['日期']) === dateKey);

    // 过滤区县
    if (filter.district) {
      filtered = filtered.filter(r => r['区县名称'] === filter.district);
    }
    // 过滤 BD
    if (filter.bdId) {
      filtered = filtered.filter(r => String(r['bd_id']) === String(filter.bdId));
    }

    // 计算指标
    const results = {};
    P1_INDICATORS.forEach(ind => {
      results[ind.id] = { value: ind.compute(filtered), label: ind.label, format: ind.format, woW: ind.woW };
    });

    // 业务线分布
    const biz = computeBizLineBreakdown(filtered);
    results.bizLine = biz;

    // 1.5级品类
    results.cat15 = computeCategory15(filtered);

    // 如果非 BD 粒度，返回区县列表
    const districts = filter.bdId ? [] : [...new Set(filtered.map(r => r['区县名称']).filter(Boolean))].sort();

    return {
      allDates, dateKey, maxDate,
      results, rowCount: filtered.length,
      districts,
      isWhole: !filter.district,
      rawRows: filtered,
    };
  },

  // ---------- 整商面板：区县下的BD列表 ----------
  getPanel1BDs(filter = {}) {
    const files = this._panelFiles.panel1;
    let rows = [];
    files.forEach(f => { rows = rows.concat(this._cache[f] || []); });
    let filtered = rows.filter(r => formatDateVal(r['日期']) === filter.date);
    if (filter.district) filtered = filtered.filter(r => r['区县名称'] === filter.district);

    const bdMap = {};
    filtered.forEach(r => {
      if (r['bd_id'] && !bdMap[r['bd_id']]) {
        bdMap[r['bd_id']] = { bdId: r['bd_id'], bdName: r['bd名称'] || r['bd_id'] };
      }
    });
    return Object.values(bdMap).sort((a, b) => (a.bdName || '').localeCompare(b.bdName || ''));
  },

  // ---------- 整商面板：区县级KPI明细 ----------
  getPanel1DistrictSummary(filter = {}) {
    const files = this._panelFiles.panel1;
    let rows = [];
    files.forEach(f => { rows = rows.concat(this._cache[f] || []); });
    if (!rows.length) return [];

    const dateKey = filter.date;
    let filtered = rows.filter(r => formatDateVal(r['日期']) === dateKey);

    const districts = DISTRICTS;
    return districts.map(d => {
      const dRows = filtered.filter(r => r['区县名称'] === d);
      const kpi = {};
      P1_INDICATORS.forEach(ind => { kpi[ind.id] = ind.compute(dRows); });
      const biz = computeBizLineBreakdown(dRows);
      const cat15 = computeCategory15(dRows);
      const rateIdList = ['p1_reduce_rate','p1_boom_rate','p1_surge_rate','p1_fml_cka_open_rate','p1_super_over100_rate','p1_super_over100_shops'];
      const total = (dRows.length > 0 || (kpi.p1_total_shops || 0) > 0)
        ? (kpi.p1_total_shops || 0) : 1;
      return {
        district: d,
        merchants: kpi.p1_total_shops || 0,
        bdCount: kpi.p1_bd_count || 0,
        orders: kpi.p1_total_orders || 0,
        groupOrders: kpi.p1_group_orders || 0,
        nonGroupOrders: kpi.p1_non_group_orders || 0,
        superOrders: kpi.p1_super_orders || 0,
        freeOrders: kpi.p1_free_orders || 0,
        grossG: kpi.p1_gross_g || 0,
        netG: kpi.p1_net_g || 0,
        activeShops: kpi.p1_active_shops || 0,
        cat15Count: cat15.count || 0,
        cat15Rate: cat15.rate || 0,
        reduceRate: kpi.p1_reduce_rate || 0,
        boomRate: kpi.p1_boom_rate || 0,
        surgeRate: kpi.p1_surge_rate || 0,
        fmlCkaOpenRate: kpi.p1_fml_cka_open_rate || 0,
        over100Shops: kpi.p1_over100_shops || 0,
        superOver100Shops: kpi.p1_super_over100_shops || 0,
        superOver100Rate: kpi.p1_super_over100_rate || 0,
        bizLines: biz.bizLineCounts || {},
        bizTotal: biz.total || 0,
        rowCount: dRows.length,
      };
    });
  },

  // ---------- 整商面板：区县下BD级KPI ----------
  getPanel1BDKpi(filter = {}) {
    const files = this._panelFiles.panel1;
    let rows = [];
    files.forEach(f => { rows = rows.concat(this._cache[f] || []); });
    const dateKey = filter.date;
    let filtered = rows.filter(r => formatDateVal(r['日期']) === dateKey && r['区县名称'] === filter.district);

    const bdMap = {};
    filtered.forEach(r => {
      const bid = r['bd_id'];
      if (!bid) return;
      if (!bdMap[bid]) bdMap[bid] = { bdId: bid, bdName: r['bd名称'] || bid, rows: [] };
      bdMap[bid].rows.push(r);
    });

    return Object.values(bdMap).map(bd => {
      const kpi = {};
      P1_INDICATORS.forEach(ind => { kpi[ind.id] = ind.compute(bd.rows); });
      const cat15 = computeCategory15(bd.rows);
      return {
        bdId: bd.bdId,
        bdName: bd.bdName,
        merchants: kpi.p1_total_shops || 0,
        orders: kpi.p1_total_orders || 0,
        groupOrders: kpi.p1_group_orders || 0,
        nonGroupOrders: kpi.p1_non_group_orders || 0,
        superOrders: kpi.p1_super_orders || 0,
        freeOrders: kpi.p1_free_orders || 0,
        grossG: kpi.p1_gross_g || 0,
        netG: kpi.p1_net_g || 0,
        activeShops: kpi.p1_active_shops || 0,
        cat15Count: cat15.count || 0,
        reduceRate: kpi.p1_reduce_rate || 0,
        boomRate: kpi.p1_boom_rate || 0,
        surgeRate: kpi.p1_surge_rate || 0,
        fmlCkaOpenRate: kpi.p1_fml_cka_open_rate || 0,
        over100Shops: kpi.p1_over100_shops || 0,
        superOver100Shops: kpi.p1_super_over100_shops || 0,
        rowCount: bd.rows.length,
      };
    }).sort((a, b) => (a.bdName || '').localeCompare(b.bdName || ''));
  },

  // ---------- 整商面板：周同比 ----------
  getPanel1WoW(filter = {}) {
    const files = this._panelFiles.panel1;
    let rows = [];
    files.forEach(f => { rows = rows.concat(this._cache[f] || []); });
    if (!rows.length) return null;

    const dateKey = filter.date;
    const wowDate = getWeekAgoDate(dateKey);
    let filtered = rows.filter(r => formatDateVal(r['日期']) === wowDate);
    if (filter.district) filtered = filtered.filter(r => r['区县名称'] === filter.district);
    if (filter.bdId) filtered = filtered.filter(r => String(r['bd_id']) === String(filter.bdId));

    const results = {};
    P1_INDICATORS.forEach(ind => {
      results[ind.id] = { value: ind.compute(filtered), label: ind.label, format: ind.format };
    });
    return { results, rowCount: filtered.length, dateKey: wowDate };
  },

  // ---------- B端KPI — 新签数据 ----------
  getNewSignData(filter = {}) {
    const files = this._panelFiles['panel2-new-sign'];
    let rows = [];
    files.forEach(f => { rows = rows.concat(this._cache[f] || []); });
    if (!rows.length) return null;

    let filtered = [...rows];
    if (filter.district) {
      // 新签文件中列名是"区县名称"
      filtered = filtered.filter(r => r['区县名称'] === filter.district);
    }
    if (filter.bdId) {
      filtered = filtered.filter(r => String(r['bd_id']) === String(filter.bdId));
    }

    // 整体数值
    const whole = computeNewSign(rows);
    const current = computeNewSign(filtered);

    // 新签目标
    let target;
    if (filter.district) {
      const t = TARGETS.newSign.find(t => t.district === filter.district);
      target = t ? t.target : 0;
    } else {
      target = TARGETS.newSign.reduce((a, t) => a + t.target, 0);
    }

    // 新签得分
    const scoreRes = computeNewSignScore(current.newSignDone, target);

    // 区县明细
    const districtDetails = [];
    const districts = [...new Set(rows.map(r => r['区县名称']).filter(Boolean))];
    districts.forEach(d => {
      const dRows = rows.filter(r => r['区县名称'] === d);
      const dRes = computeNewSign(dRows);
      const dTarget = TARGETS.newSign.find(t => t.district === d);
      const dTargetVal = dTarget ? dTarget.target : 0;
      const dScore = computeNewSignScore(dRes.newSignDone, dTargetVal);
      districtDetails.push({
        district: d,
        newSignDone: dRes.newSignDone,
        newShops: dRes.newShops,
        rookRate: dRes.rookRate,
        trafficRate: dRes.trafficRate,
        processCoef: dRes.processCoef,
        progress: dScore.progress,
        score: dScore.score * dRes.processCoef,
        target: dTargetVal,
      });
    });

    return {
      whole, current, target, score: scoreRes,
      rows: filtered,
      districtDetails,
      districts,
      bdDetails: filter.district ? this._getNewSignBDData(rows, filter.district) : [],
    };
  },

  _getNewSignBDData(rows, district) {
    let dRows = rows.filter(r => r['区县名称'] === district);
    const bdMap = {};
    dRows.forEach(r => {
      const bid = r['bd_id'];
      if (!bid) return;
      if (!bdMap[bid]) bdMap[bid] = { bdId: bid, bdName: r['bd'] || r['bd名称'] || bid, rows: [] };
      bdMap[bid].rows.push(r);
    });
    // 区县目标均分到BD，向上取整
    const dTarget = TARGETS.newSign.find(t => t.district === district);
    const dTargetVal = dTarget ? dTarget.target : 0;
    const bdCount = Object.keys(bdMap).length || 1;
    const perBDTarget = Math.ceil(dTargetVal / bdCount);

    return Object.values(bdMap).map(bd => {
      const bRes = computeNewSign(bd.rows);
      const bScore = computeNewSignScore(bRes.newSignDone, perBDTarget);
      return {
        bdId: bd.bdId,
        bdName: bd.bdName,
        newSignDone: bRes.newSignDone,
        target: perBDTarget,
        newShops: bRes.newShops,
        rookRate: bRes.rookRate,
        trafficRate: bRes.trafficRate,
        processCoef: bRes.processCoef,
        progress: bScore.progress,
        score: bScore.score * bRes.processCoef,
        rowCount: bd.rows.length,
      };
    }).sort((a, b) => (a.bdName || '').localeCompare(b.bdName || ''));
  },

  // ---------- B端KPI — 爆单数据 ----------
  getBoomData(filter = {}) {
    const files = this._panelFiles['panel2-boom'];
    let rows = [];
    files.forEach(f => { rows = rows.concat(this._cache[f] || []); });
    if (!rows.length) return null;

    const allDates = [...new Set(rows.map(r => formatDateVal(r['日期'])).filter(Boolean))].sort();
    const maxDate = allDates[allDates.length - 1] || '';
    const dateKey = filter.date || maxDate;

    let filtered = rows.filter(r => formatDateVal(r['日期']) === dateKey);
    if (filter.district) filtered = filtered.filter(r => r['区县名称'] === filter.district);
    if (filter.bdId) filtered = filtered.filter(r => String(r['BD']) === String(filter.bdId));

    // 日报名率
    const dayRes = computeBoomRate(filtered, dateKey);

    // 月累计报名率（全部数据）
    const monthRes = computeBoomRate(rows, '月累计');

    // 前一日报名率（日环比）
    let prevRes = { rate: 0 };
    if (allDates.length >= 2) {
      const idx = allDates.indexOf(dateKey);
      if (idx > 0) {
        let prevRows = rows.filter(r => formatDateVal(r['日期']) === allDates[idx - 1]);
        if (filter.district) prevRows = prevRows.filter(r => r['区县名称'] === filter.district);
        if (filter.bdId) prevRows = prevRows.filter(r => String(r['BD']) === String(filter.bdId));
        prevRes = computeBoomRate(prevRows, allDates[idx - 1]);
      }
    }

    // 区县明细
    const districts = [...new Set(rows.map(r => r['区县名称']).filter(Boolean))];
    const districtDayRates = districts.map(d => {
      let dRows = rows.filter(r => formatDateVal(r['日期']) === dateKey && r['区县名称'] === d);
      const dRes = computeBoomRate(dRows, dateKey);
      return { district: d, rate: dRes.rate, numerator: dRes.numerator, denominator: dRes.denominator };
    });

    return {
      allDates, maxDate, dateKey,
      dayRes, monthRes, prevRes,
      districts, districtDayRates,
      rows: filtered,
      bdRates: filter.district ? this._getBoomBDData(rows, dateKey, filter.district) : [],
    };
  },

  _getBoomBDData(rows, dateKey, district) {
    let dRows = rows.filter(r => formatDateVal(r['日期']) === dateKey && r['区县名称'] === district);
    const bdMap = {};
    dRows.forEach(r => {
      const bd = r['BD'];
      if (!bd) return;
      if (!bdMap[bd]) bdMap[bd] = { bdName: bd, rows: [] };
      bdMap[bd].rows.push(r);
    });
    return Object.values(bdMap).map(bd => {
      const res = computeBoomRate(bd.rows, dateKey);
      return { bdName: bd.bdName, rate: res.rate, numerator: res.numerator, denominator: res.denominator };
    }).sort((a, b) => b.rate - a.rate);
  },

  // ---------- B端KPI — 阶梯暴涨报名率 ----------
  getSurgeData(filter = {}) {
    const files = this._panelFiles['panel2-boom']; // 爆单文件同时用于阶梯暴涨
    let rows = [];
    files.forEach(f => { rows = rows.concat(this._cache[f] || []); });
    if (!rows.length) return null;

    const allDates = [...new Set(rows.map(r => formatDateVal(r['日期'])).filter(Boolean))].sort();
    const maxDate = allDates[allDates.length - 1] || '';
    const dateKey = filter.date || maxDate;

    let filtered = rows.filter(r => formatDateVal(r['日期']) === dateKey);
    if (filter.district) filtered = filtered.filter(r => r['区县名称'] === filter.district);
    if (filter.bdId) filtered = filtered.filter(r => String(r['BD']) === String(filter.bdId));

    const result = computeSurgeRate(filtered);

    // 前一日的环比
    let prevResult = { rate: 0 };
    if (allDates.length >= 2) {
      const idx = allDates.indexOf(dateKey);
      if (idx > 0) {
        let prevRows = rows.filter(r => formatDateVal(r['日期']) === allDates[idx - 1]);
        if (filter.district) prevRows = prevRows.filter(r => r['区县名称'] === filter.district);
        if (filter.bdId) prevRows = prevRows.filter(r => String(r['BD']) === String(filter.bdId));
        prevResult = computeSurgeRate(prevRows);
      }
    }

    // 区县明细
    const districts = [...new Set(rows.map(r => r['区县名称']).filter(Boolean))];
    const districtRates = districts.map(d => {
      let dRows = rows.filter(r => formatDateVal(r['日期']) === dateKey && r['区县名称'] === d);
      const dRes = computeSurgeRate(dRows);
      return { district: d, rate: dRes.rate, numerator: dRes.numerator, denominator: dRes.denominator };
    });

    return {
      allDates, maxDate, dateKey,
      result, prevResult,
      districts, districtRates,
      rows: filtered,
      bdRates: filter.district ? this._getSurgeBDData(rows, dateKey, filter.district) : [],
    };
  },

  _getSurgeBDData(rows, dateKey, district) {
    let dRows = rows.filter(r => formatDateVal(r['日期']) === dateKey && r['区县名称'] === district);
    const bdMap = {};
    dRows.forEach(r => {
      const bd = r['BD'];
      if (!bd) return;
      if (!bdMap[bd]) bdMap[bd] = { bdName: bd, rows: [] };
      bdMap[bd].rows.push(r);
    });
    return Object.values(bdMap).map(bd => {
      const res = computeSurgeRate(bd.rows);
      return { bdName: bd.bdName, rate: res.rate, numerator: res.numerator, denominator: res.denominator };
    }).sort((a, b) => b.rate - a.rate);
  },

  // ---------- 超抢手供给上翻 ----------
  getSuperHandSupply(filter = {}) {
    const files = this._panelFiles.panel2;
    let rows = [];
    files.forEach(f => {
      if (f.includes('超抢手') || f.includes('商机加权')) {
        rows = rows.concat(this._cache[f] || []);
      }
    });
    if (!rows.length) return null;

    let filtered = [...rows];
    if (filter.district) filtered = filtered.filter(r => r['区县名称'] === filter.district);

    const totalScore = sum(filtered, '商机加权得分');

    let target;
    if (filter.district) {
      const t = TARGETS.superHand.find(t => t.district === filter.district);
      target = t ? t.target : 0;
    } else {
      target = TARGETS.superHand.reduce((a, t) => a + t.target, 0);
    }

    const rate = target > 0 ? totalScore / target : 0;

    // 区县明细
    const districts = [...new Set(rows.map(r => r['区县名称']).filter(Boolean))];
    const districtRates = districts.map(d => {
      const dRows = rows.filter(r => r['区县名称'] === d);
      const dScore = sum(dRows, '商机加权得分');
      const dTarget = TARGETS.superHand.find(t => t.district === d);
      const dt = dTarget ? dTarget.target : 0;
      return { district: d, score: dScore, target: dt, rate: dt > 0 ? dScore / dt : 0 };
    });

    return { totalScore, target, rate, districts, districtRates };
  },
};

// 全局状态（UI层使用）
const state = {
  config: (() => { try { return JSON.parse(localStorage.getItem('gh-dashboard-config')); } catch { return null; } })(),
  currentPanel: 'panel1',
  // 整商面板
  p1: { date: '', district: '', bdId: '', bds: [], dates: [], districts: [], data: null, wow: null, mode: 'district' },
  // B端KPI面板
  p2: { date: '', district: '', bdId: '', activeKPI: 'new-sign', districts: [] },
};
