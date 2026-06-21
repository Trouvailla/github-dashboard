/* ===================================================================
   render.js — 渲染引擎
   =================================================================== */

const Render = {
  // ---------- 格式化数值 ----------
  fmt(v, format) {
    if (v == null || isNaN(v)) return '—';
    switch (format) {
      case 'int': return Math.round(v).toLocaleString();
      case 'money': return (Number(v) / 10000).toFixed(2);
      case 'pct': return (Number(v) * 100).toFixed(1) + '%';
      default: return Number(v).toLocaleString();
    }
  },

  // ---------- 同比箭头 ----------
  woWArrow(current, prev, format) {
    if (prev == null || prev === 0) return '';
    const diff = current - prev;
    const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 0;
    const up = diff > 0;
    const flat = diff === 0;
    const color = up ? '#34a853' : '#ea4335';
    const arrow = up ? '▲' : flat ? '—' : '▼';
    if (format === 'pct') {
      const pp = (current - prev) * 100;
      const ppStr = pp >= 0 ? '+' + pp.toFixed(1) + 'pp' : pp.toFixed(1) + 'pp';
      return `<span style="color:${color};font-size:12px">${arrow} ${ppStr}</span>`;
    }
    const pctStr = flat ? '0%' : (pct >= 0 ? '+' + pct.toFixed(1) + '%' : pct.toFixed(1) + '%');
    return `<span style="color:${color};font-size:12px">${arrow} ${pctStr}</span>`;
  },

  // ---------- 面板1：整商面板 ----------
  renderPanel1() {
    const p1 = state.p1;
    if (!p1.data) {
      document.getElementById('panel-content').innerHTML =
        '<div class="placeholder-block">暂无数据，请先在左侧配置文件中关联 Excel 文件，然后点右上角 🔄 刷新</div>';
      return;
    }

    const d = p1.data;
    const wow = p1.wow;
    const r = d.results;

    // 筛选栏
    let filterBar = `
      <div class="filter-bar">
        <div class="filter-left">
          <label>日期</label>
          <select id="p1-date-sel">${d.allDates.map(dd => `<option value="${dd}" ${dd === d.dateKey ? 'selected' : ''}>${dd}</option>`).join('')}</select>
          <label>区县</label>
          <select id="p1-district-sel">
            <option value="">整商</option>
            ${DISTRICTS.map(dd => `<option value="${dd}" ${state.p1.district === dd ? 'selected' : ''}>${dd}</option>`).join('')}
          </select>
          ${p1.bdId ? `<label>BD</label><select id="p1-bd-sel">
            <option value="">全部BD</option>
            ${p1.bds.map(b => `<option value="${b.bdId}" ${state.p1.bdId == b.bdId ? 'selected' : ''}>${b.bdName}</option>`).join('')}
          </select>` : ''}
          <span class="filter-summary">数据行数：<b>${d.rowCount.toLocaleString()}</b></span>
        </div>
        <div>
          <button class="btn btn-sm btn-primary" id="btn-p1-refresh">🔄 刷新</button>
          <button class="btn btn-sm btn-ghost" id="btn-p1-export">📥 导出</button>
        </div>
      </div>`;

    // 如果是BD粒度，展示BD数据表
    if (p1.bdId) {
      filterBar += this.renderBDTable(d.rawRows);
    } else if (state.p1.district) {
      // 区县级：展示该区县下各BD汇总
      filterBar += this.renderDistrictBDSummary(p1.bds, d.rawRows);
    }

    // 指标卡片
    let cards = '<div class="kpi-cards">';

    // 核心指标（第一排）
    const coreIds = ['p1_total_shops', 'p1_bd_count', 'p1_total_orders', 'p1_gross_g', 'p1_net_g', 'p1_active_shops'];
    coreIds.forEach(id => {
      const ind = r[id];
      if (!ind) return;
      let wowHtml = '';
      if (wow && wow.results[id]) {
        wowHtml = this.woWArrow(ind.value, wow.results[id].value, ind.format);
      }
      cards += `<div class="kpi-card">
        <div class="kpi-label">${ind.label}</div>
        <div class="kpi-value">${this.fmt(ind.value, ind.format)} <span class="kpi-unit">${ind.format === 'money' ? '万' : ''}</span></div>
        ${wowHtml ? '<div class="kpi-wow">' + wowHtml + '</div>' : ''}
      </div>`;
    });
    cards += '</div>';

    // 业务线分布卡片
    cards += '<div class="kpi-cards">';
    const biz = r.bizLine;
    const bizLabelMap = { FML: 'FML', CKA: 'CKA', KA: 'KA', SMB: 'SMB', 其他: '其他' };
    Object.entries(biz.bizLineCounts).forEach(([k, v]) => {
      const pct = biz.total > 0 ? (v / biz.total * 100).toFixed(1) : '0.0';
      cards += `<div class="kpi-card biz-card">
        <div class="kpi-label">${bizLabelMap[k] || k} 商户数</div>
        <div class="kpi-value">${v.toLocaleString()}</div>
        <div class="kpi-sub">占比 ${pct}%</div>
      </div>`;
    });
    cards += '</div>';

    // 1.5级品类
    cards += '<div class="kpi-cards">';
    const cat = r.cat15;
    cards += `<div class="kpi-card"><div class="kpi-label">1.5级品类商户数</div><div class="kpi-value">${cat.count.toLocaleString()}</div><div class="kpi-sub">占比 ${(cat.rate * 100).toFixed(1)}%</div></div>`;
    cards += '</div>';

    // 订单指标
    cards += '<div class="kpi-cards">';
    const orderIds = ['p1_total_orders', 'p1_group_orders', 'p1_non_group_orders', 'p1_super_orders', 'p1_free_orders'];
    orderIds.forEach(id => {
      const ind = r[id];
      if (!ind) return;
      let wowHtml = '';
      if (wow && wow.results[id]) wowHtml = this.woWArrow(ind.value, wow.results[id].value, ind.format);
      cards += `<div class="kpi-card"><div class="kpi-label">${ind.label}</div><div class="kpi-value">${this.fmt(ind.value, ind.format)}</div>${wowHtml ? '<div class="kpi-wow">' + wowHtml + '</div>' : ''}</div>`;
    });
    cards += '</div>';

    // 毛G/净G指标
    cards += '<div class="kpi-cards">';
    const gIds = ['p1_gross_g', 'p1_group_gross_g', 'p1_non_group_gross_g', 'p1_net_g', 'p1_group_net_g', 'p1_non_group_net_g'];
    gIds.forEach(id => {
      const ind = r[id];
      if (!ind) return;
      let wowHtml = '';
      if (wow && wow.results[id]) wowHtml = this.woWArrow(ind.value, wow.results[id].value, ind.format);
      cards += `<div class="kpi-card"><div class="kpi-label">${ind.label}</div><div class="kpi-value">${this.fmt(ind.value, ind.format)} <span class="kpi-unit">万</span></div>${wowHtml ? '<div class="kpi-wow">' + wowHtml + '</div>' : ''}</div>`;
    });
    cards += '</div>';

    // 覆盖率指标
    cards += '<div class="kpi-cards">';
    const rateIds = ['p1_reduce_rate', 'p1_boom_rate', 'p1_surge_rate', 'p1_fml_cka_open_rate', 'p1_super_over100_rate'];
    rateIds.forEach(id => {
      const ind = r[id];
      if (!ind) return;
      let wowHtml = '';
      if (wow && wow.results[id]) wowHtml = this.woWArrow(ind.value, wow.results[id].value, ind.format);
      cards += `<div class="kpi-card"><div class="kpi-label">${ind.label}</div><div class="kpi-value">${this.fmt(ind.value, ind.format)}</div>${wowHtml ? '<div class="kpi-wow">' + wowHtml + '</div>' : ''}</div>`;
    });
    cards += '</div>';

    // 百单指标
    cards += '<div class="kpi-cards">';
    const shopIds = ['p1_over100_shops', 'p1_super_over100_shops'];
    shopIds.forEach(id => {
      const ind = r[id];
      if (!ind) return;
      let wowHtml = '';
      if (wow && wow.results[id]) wowHtml = this.woWArrow(ind.value, wow.results[id].value, ind.format);
      cards += `<div class="kpi-card"><div class="kpi-label">${ind.label}</div><div class="kpi-value">${this.fmt(ind.value, ind.format)}</div>${wowHtml ? '<div class="kpi-wow">' + wowHtml + '</div>' : ''}</div>`;
    });
    cards += '</div>';

    document.getElementById('panel-content').innerHTML = filterBar + cards;
    this.bindPanel1Events();
  },

  // BD详情表
  renderBDTable(rows) {
    if (!rows || !rows.length) return '<div class="notice">无BD粒度数据</div>';
    const bdMap = {};
    rows.forEach(r => {
      const bd = r['bd_id'];
      if (!bd) return;
      if (!bdMap[bd]) bdMap[bd] = { bdId: bd, bdName: r['bd名称'] || bd, shops: new Set(), orders: 0, grossG: 0, netG: 0 };
      bdMap[bd].shops.add(r['商户id']);
      bdMap[bd].orders += Number(r['总订单']) || 0;
      bdMap[bd].grossG += Number(r['毛g']) || 0;
      bdMap[bd].netG += Number(r['净g']) || 0;
    });
    const bds = Object.values(bdMap);

    return `<div class="data-table" style="margin-top:12px">
      <table><thead><tr><th>BD</th><th>商户数</th><th>订单数</th><th>毛G(万)</th><th>净G(万)</th></tr></thead><tbody>
      ${bds.map(b => `<tr><td>${b.bdName}</td><td>${b.shops.size}</td><td>${b.orders.toLocaleString()}</td><td>${(b.grossG/10000).toFixed(2)}</td><td>${(b.netG/10000).toFixed(2)}</td></tr>`).join('')}
      </tbody></table></div>`;
  },

  // 区县BD汇总表
  renderDistrictBDSummary(bds, rows) {
    return `<div class="data-table" style="margin-top:12px">
      <table><thead><tr><th>BD</th><th>商户数</th><th>订单数</th><th>毛G(万)</th><th>净G(万)</th></tr></thead><tbody>
      ${bds.map(bd => {
        const bdRows = rows.filter(r => String(r['bd_id']) === String(bd.bdId));
        const shops = uniq(bdRows, '商户id').length;
        const orders = sum(bdRows, '总订单');
        const grossG = sum(bdRows, '毛g');
        const netG = sum(bdRows, '净g');
        return `<tr class="clickable" data-bd-id="${bd.bdId}"><td>${bd.bdName}</td><td>${shops}</td><td>${orders.toLocaleString()}</td><td>${(grossG/10000).toFixed(2)}</td><td>${(netG/10000).toFixed(2)}</td></tr>`;
      }).join('')}
      </tbody></table></div>`;
  },

  // ---------- 面板2：B端KPI面板 ----------
  renderPanel2() {
    const p2 = state.p2;
    let html = `<div class="kpi-tabs">
      <button class="kpi-tab ${p2.activeKPI === 'new-sign' ? 'active' : ''}" data-kpi="new-sign">📋 新签看板</button>
      <button class="kpi-tab ${p2.activeKPI === 'boom' ? 'active' : ''}" data-kpi="boom">💥 爆单报名率</button>
      <button class="kpi-tab ${p2.activeKPI === 'surge' ? 'active' : ''}" data-kpi="surge">📈 阶梯暴涨报名率</button>
    </div>`;

    if (p2.activeKPI === 'new-sign') html += this.renderNewSign();
    else if (p2.activeKPI === 'boom') html += this.renderBoom();
    else if (p2.activeKPI === 'surge') html += this.renderSurge();

    document.getElementById('panel-content').innerHTML = html;
    this.bindPanel2Events();
  },

  // --- 新签看板 ---
  renderNewSign() {
    const nsData = DataEngine.getNewSignData({ district: state.p2.district, bdId: state.p2.bdId });
    if (!nsData) return '<div class="placeholder-block">请上传「新签商户考核」Excel 文件</div>';

    const { current, target, score } = nsData;
    const finalScore = score.score * current.processCoef;

    let html = `<div class="filter-bar">
      <label>区县</label>
      <select id="p2-ns-district">
        <option value="">整商</option>
        ${DISTRICTS.map(d => `<option value="${d}" ${state.p2.district === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
      ${state.p2.bdId ? `<span>BD: ${state.p2.bdId}</span>` : ''}
    </div>`;

    // 核心KPI卡片
    html += `<div class="kpi-cards">
      <div class="kpi-card highlight">
        <div class="kpi-label">新签达成</div>
        <div class="kpi-value">${this.fmt(current.newSignDone, 'int')}</div>
        <div class="kpi-sub">目标 ${target}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">新签达成进度</div>
        <div class="kpi-value">${this.fmt(score.progress, 'pct')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">新签达成系数</div>
        <div class="kpi-value">${score.achieveCoef.toFixed(2)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">过程项系数</div>
        <div class="kpi-value">${current.processCoef.toFixed(2)}</div>
        <div class="kpi-sub">初出茅庐 ${(current.rookRate*100).toFixed(1)}% | 流量卡 ${(current.trafficRate*100).toFixed(1)}%</div>
      </div>
      <div class="kpi-card highlight">
        <div class="kpi-label">新签得分</div>
        <div class="kpi-value">${finalScore.toFixed(4)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">本月新签店铺数</div>
        <div class="kpi-value">${current.newShops.toLocaleString()}</div>
      </div>
    </div>`;

    // 区县明细表
    html += `<div class="data-table"><h3>区县明细</h3>
    <table><thead><tr>
      <th>区县</th><th>新签达成</th><th>目标</th><th>进度</th><th>新签得分</th><th>新签店铺数</th><th>初出茅庐率</th><th>流量卡率</th><th>过程项系数</th>
    </tr></thead><tbody>
    ${nsData.districtDetails.map(d => `
      <tr>
        <td><b>${d.district}</b></td>
        <td>${d.newSignDone}</td>
        <td>${d.target}</td>
        <td>${(d.progress*100).toFixed(1)}%</td>
        <td>${d.score.toFixed(4)}</td>
        <td>${d.newShops}</td>
        <td>${(d.rookRate*100).toFixed(1)}%</td>
        <td>${(d.trafficRate*100).toFixed(1)}%</td>
        <td>${d.processCoef.toFixed(2)}</td>
      </tr>
    `).join('')}
    </tbody></table></div>`;

    return html;
  },

  // --- 爆单报名率 ---
  renderBoom() {
    const bd = DataEngine.getBoomData({ date: state.p2.date, district: state.p2.district, bdId: state.p2.bdId });
    if (!bd) return '<div class="placeholder-block">请上传「爆单综合看板」Excel 文件</div>';

    let html = `<div class="filter-bar">
      <label>日期</label>
      <select id="p2-boom-date">${bd.allDates.map(d => `<option value="${d}" ${d === bd.dateKey ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <label>区县</label>
      <select id="p2-boom-district">
        <option value="">整商</option>
        ${DISTRICTS.map(d => `<option value="${d}" ${state.p2.district === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>`;

    // 日报名率 vs 月累计
    const dayRate = bd.dayRes.rate;
    const monthRate = bd.monthRes.rate;
    const dayRatePrev = bd.prevRes.rate;
    const momChange = dayRate - dayRatePrev;

    html += `<div class="kpi-cards">
      <div class="kpi-card highlight">
        <div class="kpi-label">日爆单报名率</div>
        <div class="kpi-value">${(dayRate*100).toFixed(2)}%</div>
        <div class="kpi-sub">${bd.dayRes.numerator}/${bd.dayRes.denominator}</div>
        ${dayRatePrev !== undefined ? `<div class="kpi-wow"><span style="color:${momChange>=0?'#34a853':'#ea4335'}">${momChange>=0?'▲':'▼'} ${(momChange*100).toFixed(2)}pp 日环比</span></div>` : ''}
      </div>
      <div class="kpi-card">
        <div class="kpi-label">月累计爆单报名率</div>
        <div class="kpi-value">${(monthRate*100).toFixed(2)}%</div>
        <div class="kpi-sub">${bd.monthRes.numerator}/${bd.monthRes.denominator}</div>
      </div>
    </div>`;

    // 区县日报名率表
    html += `<div class="data-table"><h3>区县明细（${bd.dateKey}）</h3>
    <table><thead><tr><th>区县</th><th>爆单报名率</th><th>报名商户</th><th>基数</th></tr></thead><tbody>
    ${bd.districtDayRates.map(d => `<tr>
      <td><b>${d.district}</b></td>
      <td>${(d.rate*100).toFixed(2)}%</td>
      <td>${d.numerator}</td>
      <td>${d.denominator}</td>
    </tr>`).join('')}
    </tbody></table></div>`;

    return html;
  },

  // --- 阶梯暴涨报名率 ---
  renderSurge() {
    const sg = DataEngine.getSurgeData({ date: state.p2.date, district: state.p2.district, bdId: state.p2.bdId });
    if (!sg) return '<div class="placeholder-block">请上传「爆单综合看板」Excel 文件</div>';

    let html = `<div class="filter-bar">
      <label>日期</label>
      <select id="p2-surge-date">${sg.allDates.map(d => `<option value="${d}" ${d === sg.dateKey ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <label>区县</label>
      <select id="p2-surge-district">
        <option value="">整商</option>
        ${DISTRICTS.map(d => `<option value="${d}" ${state.p2.district === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>`;

    const rate = sg.result.rate;
    const prevRate = sg.prevResult.rate;
    const momChange = rate - prevRate;

    html += `<div class="kpi-cards">
      <div class="kpi-card highlight">
        <div class="kpi-label">阶梯暴涨报名率</div>
        <div class="kpi-value">${(rate*100).toFixed(2)}%</div>
        <div class="kpi-sub">${sg.result.numerator}/${sg.result.denominator}</div>
        <div class="kpi-wow"><span style="color:${momChange>=0?'#34a853':'#ea4335'}">${momChange>=0?'▲':'▼'} ${(momChange*100).toFixed(2)}pp 日环比</span></div>
      </div>
    </div>`;

    // 区县明细
    html += `<div class="data-table"><h3>区县明细（${sg.dateKey}）</h3>
    <table><thead><tr><th>区县</th><th>阶梯暴涨报名率</th><th>报名商户</th><th>基数</th></tr></thead><tbody>
    ${sg.districtRates.map(d => `<tr>
      <td><b>${d.district}</b></td>
      <td>${(d.rate*100).toFixed(2)}%</td>
      <td>${d.numerator}</td>
      <td>${d.denominator}</td>
    </tr>`).join('')}
    </tbody></table></div>`;

    return html;
  },

  // ---------- 事件绑定 ----------
  bindPanel1Events() {
    const self = this;
    const sel = (id) => document.getElementById(id);
    if (!sel('p1-date-sel')) return;

    sel('p1-date-sel').onchange = async function () {
      state.p1.date = this.value;
      await refreshPanel1();
    };
    sel('p1-district-sel').onchange = async function () {
      state.p1.district = this.value;
      state.p1.bdId = '';
      await refreshPanel1();
    };
    if (sel('p1-bd-sel')) {
      sel('p1-bd-sel').onchange = async function () {
        state.p1.bdId = this.value;
        await refreshPanel1();
      };
    }
    if (sel('btn-p1-refresh')) sel('btn-p1-refresh').onclick = refreshPanel1;

    // BD表格行点击
    document.querySelectorAll('.clickable[data-bd-id]').forEach(el => {
      el.onclick = async function () {
        state.p1.bdId = this.dataset.bdId;
        await refreshPanel1();
      };
    });
  },

  bindPanel2Events() {
    // Tab 切换
    document.querySelectorAll('.kpi-tab').forEach(tab => {
      tab.onclick = async function () {
        state.p2.activeKPI = this.dataset.kpi;
        Render.renderPanel2();
      };
    });
    // 新签区县
    const nsDist = document.getElementById('p2-ns-district');
    if (nsDist) nsDist.onchange = function () { state.p2.district = this.value; Render.renderNewSignWidget(); };
    // 爆单日期/区县
    const bdDate = document.getElementById('p2-boom-date');
    const bdDist = document.getElementById('p2-boom-district');
    if (bdDate) bdDate.onchange = function () { state.p2.date = this.value; Render.renderBoomWidget(); };
    if (bdDist) bdDist.onchange = function () { state.p2.district = this.value; Render.renderBoomWidget(); };
    // 阶梯暴涨日期/区县
    const sgDate = document.getElementById('p2-surge-date');
    const sgDist = document.getElementById('p2-surge-district');
    if (sgDate) sgDate.onchange = function () { state.p2.date = this.value; Render.renderSurgeWidget(); };
    if (sgDist) sgDist.onchange = function () { state.p2.district = this.value; Render.renderSurgeWidget(); };
  },

  renderNewSignWidget() { document.getElementById('panel-content').innerHTML = this.renderNewSign(); this.bindPanel2Events(); },
  renderBoomWidget() { document.getElementById('panel-content').innerHTML = this.renderBoom(); this.bindPanel2Events(); },
  renderSurgeWidget() { document.getElementById('panel-content').innerHTML = this.renderSurge(); this.bindPanel2Events(); },
};

// ---------- 刷新面板1 ----------
async function refreshPanel1() {
  await ensureFilesLoaded('panel1');
  state.p1.data = DataEngine.getPanel1Data({ date: state.p1.date, district: state.p1.district, bdId: state.p1.bdId });
  state.p1.wow = DataEngine.getPanel1WoW({ date: state.p1.date || state.p1.data?.dateKey, district: state.p1.district, bdId: state.p1.bdId });
  if (state.p1.district && !state.p1.bdId) {
    state.p1.bds = DataEngine.getPanel1BDs({ date: state.p1.date || state.p1.data?.dateKey, district: state.p1.district });
  }
  Render.renderPanel1();
}
