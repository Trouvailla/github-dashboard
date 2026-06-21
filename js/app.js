/* ===================================================================
   app.js — 主入口：导航、GitHub API、文件管理
   =================================================================== */

// ---------- GitHub API ----------
const GH = {
  async req(path, opts = {}) {
    const hasBody = !!opts.body;
    const headers = new Headers({
      'Authorization': `token ${state.config.token}`,
      'Accept': 'application/vnd.github.v3+json',
    });
    if (hasBody) headers.set('Content-Type', 'application/json');
    // 合并自定义头
    if (opts.headers) {
      Object.entries(opts.headers).forEach(([k, v]) => headers.set(k, v));
    }
    const fetchOpts = { ...opts, headers };
    const res = await fetch(`https://api.github.com${path}`, fetchOpts);
    if (!res.ok) {
      let errMsg = `GitHub API ${res.status}`;
      try {
        const err = await res.json();
        errMsg = err.message || errMsg;
        if (res.status === 401) errMsg = 'Token 无效或已过期，请重新配置';
        else if (res.status === 404) errMsg = '仓库或文件不存在，请检查仓库配置';
        else if (res.status === 422) errMsg = (err.errors && err.errors[0] && err.errors[0].message) || err.message || '请求数据无效';
      } catch (_) {}
      throw new Error(errMsg);
    }
    if (res.status === 204) return {};
    return res.json();
  },

  async listFiles() {
    const { owner, repo, branch } = state.config;
    const data = await this.req(`/repos/${owner}/${repo}/contents/data?ref=${branch}`);
    return Array.isArray(data) ? data.filter(f => /\.(xlsx|xls)$/i.test(f.name)) : [];
  },

  rawUrl(fileObj) {
    const { owner, repo, branch } = state.config;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileObj.path}`;
  },

  async uploadFile(path, contentBase64, sha) {
    const { owner, repo, branch } = state.config;
    const body = { message: `upload: ${path.split('/').pop()}`, content: contentBase64, branch };
    if (sha) body.sha = sha;
    return this.req(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT', body: JSON.stringify(body),
    });
  },

  async getFileSha(path) {
    const { owner, repo, branch } = state.config;
    const d = await this.req(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
    return d.sha;
  },
};

// ---------- 文件管理 ----------
let fileList = [];

async function refreshFileList() {
  if (!state.config) return;
  try {
    fileList = await GH.listFiles();
    renderFileSidebar();
  } catch (e) {
    console.error('获取文件列表失败', e);
  }
}

function renderFileSidebar() {
  const c = document.getElementById('file-list');
  if (!fileList.length) {
    c.innerHTML = '<div class="empty-tip">暂无文件，请上传 Excel</div>';
    return;
  }
  c.innerHTML = fileList.map(f => `
    <div class="file-item">
      <span>📄</span>
      <div>
        <div class="fn">${f.name}</div>
        <div class="fs">${fmtSize(f.size)}</div>
      </div>
      <div class="file-badges">
        <select class="file-panel-sel" data-file="${f.name}">
          <option value="">未关联</option>
          <option value="panel1">面板1-整商</option>
          <option value="panel2">面板2-B端KPI</option>
        </select>
      </div>
    </div>
  `).join('');

  // 恢复已关联状态
  document.querySelectorAll('.file-panel-sel').forEach(sel => {
    const fname = sel.dataset.file;
    if (DataEngine._panelFiles.panel1.includes(fname)) sel.value = 'panel1';
    else if (DataEngine._panelFiles.panel2.includes(fname)) sel.value = 'panel2';
    sel.onchange = function () {
      DataEngine._panelFiles.panel1 = DataEngine._panelFiles.panel1.filter(f => f !== fname);
      DataEngine._panelFiles.panel2 = DataEngine._panelFiles.panel2.filter(f => f !== fname);
      if (this.value === 'panel1') DataEngine._panelFiles.panel1.push(fname);
      else if (this.value === 'panel2') DataEngine._panelFiles.panel2.push(fname);
    };
  });
}

async function ensureFilesLoaded(panelId) {
  const files = DataEngine._panelFiles[panelId];
  let allLoaded = true;
  for (const f of files) {
    if (!DataEngine._cache[f]) allLoaded = false;
  }
  if (!allLoaded) {
    toast('正在加载数据...', 'info');
    for (const f of files) {
      if (!DataEngine._cache[f]) {
        const fObj = fileList.find(fl => fl.name === f);
        if (fObj) await DataEngine.loadFile(fObj);
      }
    }
  }
}

// ---------- 导航 ----------
const PANEL_NAMES = { panel1: '整商面板', panel2: 'B端KPI面板' };

function switchPanel(panelId) {
  state.currentPanel = panelId;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.panel === panelId);
  });
  document.getElementById('panel-title').textContent = PANEL_NAMES[panelId] || '';

  if (panelId === 'panel1') {
    refreshPanel1();
  } else if (panelId === 'panel2') {
    ensureFilesLoaded('panel2').then(() => Render.renderPanel2());
  }
}

// ---------- Toast ----------
function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
}

function fmtSize(b) {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

// ---------- 上传 ----------
let pendingFile = null;

function showUploadModal() {
  if (!state.config) { toast('请先配置仓库信息', 'error'); showConfigModal(); return; }
  document.getElementById('upload-overlay').classList.remove('hidden');
  document.getElementById('upload-progress').classList.add('hidden');
  document.getElementById('btn-confirm-upload').disabled = true;
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-text').textContent = '';
  document.querySelector('#upload-area .upload-icon').textContent = '📄';
  document.querySelector('#upload-area p').textContent = '点击选择或拖拽 .xlsx 文件到此区域';
}
function hideUploadModal() {
  document.getElementById('upload-overlay').classList.add('hidden');
  document.getElementById('file-input').value = '';
  pendingFile = null;
}

function initUpload() {
  const area = document.getElementById('upload-area');
  const input = document.getElementById('file-input');
  area.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files.length) handleFileSelected(input.files[0]); });
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFileSelected(e.dataTransfer.files[0]);
  });
}

function handleFileSelected(file) {
  if (!/\.(xlsx|xls)$/i.test(file.name)) { toast('只支持 .xlsx / .xls', 'error'); return; }
  pendingFile = file;
  document.querySelector('#upload-area .upload-icon').textContent = '✅';
  document.querySelector('#upload-area p').textContent = `已选择：${file.name}（${fmtSize(file.size)}）`;
  document.getElementById('btn-confirm-upload').disabled = false;
}

async function confirmUpload() {
  if (!pendingFile) return;
  const file = pendingFile;
  const path = `data/${file.name}`;
  try {
    setProgress(10, '读取中...');
    const buf = await file.arrayBuffer();
    let base64 = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) base64 += String.fromCharCode(bytes[i]);
    base64 = btoa(base64);
    setProgress(40, '上传中...');
    let sha; try { sha = await GH.getFileSha(path); } catch (_) {}
    setProgress(70, '提交中...');
    await GH.uploadFile(path, base64, sha);
    setProgress(100, '完成！');
    toast('上传成功', 'success');
    hideUploadModal();
    await refreshFileList();
  } catch (e) {
    setProgress(0, '失败: ' + e.message);
    toast('上传失败: ' + e.message, 'error');
  }
}
function setProgress(pct, txt) {
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = txt;
}

// ---------- 配置弹窗 ----------
function showConfigModal() {
  document.getElementById('config-overlay').classList.remove('hidden');
  if (state.config) {
    document.getElementById('cfg-owner').value = state.config.owner;
    document.getElementById('cfg-repo').value = state.config.repo;
    document.getElementById('cfg-branch').value = state.config.branch || 'main';
    document.getElementById('cfg-token').value = state.config.token;
  }
}
function hideConfigModal() { document.getElementById('config-overlay').classList.add('hidden'); }

// ---------- 初始化 ----------
function init() {
  // 导航
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => switchPanel(el.dataset.panel));
  });

  // 配置
  document.getElementById('btn-save-config').addEventListener('click', () => {
    const cfg = {
      owner: document.getElementById('cfg-owner').value.trim(),
      repo: document.getElementById('cfg-repo').value.trim(),
      branch: document.getElementById('cfg-branch').value.trim() || 'main',
      token: document.getElementById('cfg-token').value.trim(),
    };
    if (!cfg.owner || !cfg.repo || !cfg.token) { toast('请填写所有字段', 'error'); return; }
    localStorage.setItem('gh-dashboard-config', JSON.stringify(cfg));
    state.config = cfg;
    hideConfigModal();
    toast('配置已保存', 'success');
    refreshFileList();
  });
  document.getElementById('btn-show-config').addEventListener('click', showConfigModal);
  document.getElementById('config-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) hideConfigModal(); });

  // 上传
  document.getElementById('btn-show-upload').addEventListener('click', showUploadModal);
  document.getElementById('btn-cancel-upload').addEventListener('click', hideUploadModal);
  document.getElementById('btn-confirm-upload').addEventListener('click', confirmUpload);
  document.getElementById('upload-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) hideUploadModal(); });
  initUpload();

  // 刷新
  document.getElementById('btn-refresh-files').addEventListener('click', refreshFileList);

  // 有配置就自动加载
  if (state.config) refreshFileList();

  // 默认面板
  switchPanel('panel1');
}

document.addEventListener('DOMContentLoaded', init);
