/* =====================================================
   GitHub 数据看板 — 主逻辑 (app.js)
   ===================================================== */

// ---------- 全局状态 ----------
const state = {
  config: loadConfig(),      // { owner, repo, branch, token }
  files: [],                 // 仓库里的 .xlsx 文件列表
  currentFile: null,         // 当前选中的文件对象
  currentData: null,         // 当前解析后的数据（数组 of 对象）
  currentHeaders: null,      // 表头数组
  chartInstance: null,       // Chart.js 实例
};

// ---------- 配置存取 ----------
function loadConfig() {
  try { return JSON.parse(localStorage.getItem("gh-dashboard-config")) || null; }
  catch { return null; }
}
function saveConfig(cfg) {
  localStorage.setItem("gh-dashboard-config", JSON.stringify(cfg));
  state.config = cfg;
}

// ---------- Toast 通知 ----------
function toast(msg, type = "info") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2500);
}

// ---------- GitHub API 封装 ----------
const GH = {
  // 通用请求
  async req(path, opts = {}) {
    const url = `https://api.github.com${path}`;
    const headers = {
      "Authorization": `token ${state.config.token}`,
      "Accept": "application/vnd.github.v3+json",
      ...(opts.headers || {}),
    };
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API ${res.status}`);
    }
    return res.json();
  },

  // 列出 data/ 目录下的文件
  async listFiles() {
    const { owner, repo, branch } = state.config;
    const path = "data";
    const data = await this.req(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
    return data.filter(f => f.name.match(/\.(xlsx|xls)$/i));
  },

  // 获取文件内容（raw）的 URL
  rawUrl(file) {
    const { owner, repo, branch } = state.config;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
  },

  // 上传 / 更新文件（base64）
  async uploadFile(path, contentBase64, sha = null) {
    const { owner, repo, branch } = state.config;
    const body = {
      message: `upload: ${path.split("/").pop()}`,
      content: contentBase64,
      branch,
    };
    if (sha) body.sha = sha;
    return this.req(`/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  // 获取文件最新的 commit SHA（用于覆盖上传）
  async getFileSha(path) {
    const { owner, repo, branch } = state.config;
    const data = await this.req(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
    return data.sha || null;
  },
};

// ---------- 解析 Excel ----------
async function fetchAndParseExcel(file) {
  const url = GH.rawUrl(file);
  const workbook = XLSX.read(await (await fetch(url)).arrayBuffer(), { type: "arraybuffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const headers = json.length ? Object.keys(json[0]) : [];
  return { json, headers };
}

// ---------- 渲染文件列表 ----------
function renderFileList() {
  const container = document.getElementById("file-list");
  if (!state.config) {
    container.innerHTML = `<div class="empty-tip">请先配置仓库信息</div>`;
    return;
  }
  if (state.files.length === 0) {
    container.innerHTML = `<div class="empty-tip">暂无文件，请上传 .xlsx 文件</div>`;
    return;
  }
  container.innerHTML = state.files.map(f => `
    <div class="file-item ${state.currentFile && state.currentFile.name === f.name ? "active" : ""}" data-name="${f.name}">
      <span class="file-icon">📊</span>
      <div>
        <div>${f.name}</div>
        <div class="file-meta">${formatSize(f.size)}</div>
      </div>
    </div>
  `).join("");

  // 绑定点击
  container.querySelectorAll(".file-item").forEach(el => {
    el.addEventListener("click", () => {
      const file = state.files.find(f => f.name === el.dataset.name);
      if (file) selectFile(file);
    });
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ---------- 选中文件 → 解析 → 渲染 ----------
async function selectFile(file) {
  state.currentFile = file;
  renderFileList();
  showFileInfo(file);
  await loadFileData(file);
}

function showFileInfo(file) {
  document.getElementById("file-info").classList.remove("hidden");
  document.getElementById("current-file-name").textContent = "📄 " + file.name;
  document.getElementById("current-file-time").textContent =
    "更新于 " + new Date(file.updated_at || Date.now()).toLocaleString("zh-CN");
}

async function loadFileData(file) {
  try {
    toast("正在解析 Excel...", "info");
    const { json, headers } = await fetchAndParseExcel(file);
    state.currentData = json;
    state.currentHeaders = headers;

    renderTable(json, headers);
    populateChartSelectors(headers);
    toast(`已加载 ${json.length} 行数据`, "success");
  } catch (e) {
    console.error(e);
    toast("解析失败：" + e.message, "error");
  }
}

// ---------- 渲染表格 ----------
function renderTable(json, headers) {
  const wrap = document.getElementById("table-container");
  document.getElementById("row-count").textContent = `${json.length} 行`;

  if (!json.length) {
    wrap.innerHTML = `<div class="placeholder">文件为空或无有效数据</div>`;
    return;
  }

  // 只显示前 200 行，防止卡顿
  const show = json.slice(0, 200);
  let html = `<table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>`;
  html += show.map(row => `<tr>${headers.map(h => `<td>${esc(row[h])}</td>`).join("")}</tr>`).join("");
  html += `</tbody></table>`;
  if (json.length > 200) {
    html += `<div class="hint" style="padding:8px 12px;color:var(--text-secondary)">仅展示前 200 行，共 ${json.length} 行</div>`;
  }
  wrap.innerHTML = html;
}

function esc(v) {
  if (v == null) return "";
  return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ---------- 图表列选择器 ----------
function populateChartSelectors(headers) {
  const xSel = document.getElementById("chart-x-col");
  const ySel = document.getElementById("chart-y-col");
  xSel.innerHTML = headers.map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join("");
  ySel.innerHTML = headers.map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join("");
}

// ---------- 生成图表 ----------
function generateChart() {
  const type = document.getElementById("chart-type").value;
  const xCol = document.getElementById("chart-x-col").value;
  const ySelect = document.getElementById("chart-y-col");
  const yCols = [...ySelect.selectedOptions].map(o => o.value);

  if (!xCol || !yCols.length) {
    toast("请选择 X 轴和至少一个 Y 轴列", "error");
    return;
  }

  // 取前 50 行，防止标签过多
  const data = state.currentData.slice(0, 50);
  const labels = data.map(r => r[xCol]);

  // 销毁旧图表
  if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }
  document.getElementById("chart-placeholder").classList.add("hidden");
  document.getElementById("chart-canvas").classList.remove("hidden");

  const ctx = document.getElementById("chart-canvas").getContext("2d");
  const colors = ["#1a73e8","#34a853","#fbbc04","#ea4335","#842de2","#00bcd4","#ff6d00","#607d8b"];

  state.chartInstance = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: yCols.map((col, i) => ({
        label: col,
        data: data.map(r => Number(r[col]) || 0),
        backgroundColor: type === "bar" || type === "line" ? colors[i % colors.length] + "88" : colors,
        borderColor: colors[i % colors.length],
        borderWidth: 2,
        fill: type === "line",
        tension: 0.3,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: `${xCol} vs ${yCols.join(", ")}` },
      },
    },
  });
  toast("图表已生成", "success");
}

// ---------- 加载文件列表 ----------
async function refreshFileList() {
  if (!state.config) { toast("请先配置仓库信息", "error"); showConfigModal(); return; }
  try {
    toast("正在获取文件列表...", "info");
    state.files = await GH.listFiles();
    renderFileList();
    toast(`找到 ${state.files.length} 个 Excel 文件`, "success");
  } catch (e) {
    console.error(e);
    toast("获取文件列表失败：" + e.message, "error");
  }
}

// ---------- 弹窗控制 ----------
function showConfigModal() {
  document.getElementById("config-overlay").classList.remove("hidden");
  if (state.config) {
    document.getElementById("cfg-owner").value  = state.config.owner;
    document.getElementById("cfg-repo").value    = state.config.repo;
    document.getElementById("cfg-branch").value  = state.config.branch || "main";
    document.getElementById("cfg-token").value   = state.config.token;
  }
}
function hideConfigModal() {
  document.getElementById("config-overlay").classList.add("hidden");
}

function showUploadModal() {
  if (!state.config) { toast("请先配置仓库信息", "error"); showConfigModal(); return; }
  document.getElementById("upload-overlay").classList.remove("hidden");
  document.getElementById("upload-progress").classList.add("hidden");
  document.getElementById("btn-confirm-upload").disabled = true;
  document.getElementById("progress-fill").style.width = "0%";
  document.getElementById("progress-text").textContent = "";
}
function hideUploadModal() {
  document.getElementById("upload-overlay").classList.add("hidden");
  document.getElementById("file-input").value = "";
}

// ---------- 上传逻辑 ----------
let pendingFile = null;

function initUploadArea() {
  const area  = document.getElementById("upload-area");
  const input = document.getElementById("file-input");

  area.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    if (input.files.length) handleFileSelected(input.files[0]);
  });

  // 拖拽
  area.addEventListener("dragover", e => { e.preventDefault(); area.classList.add("drag-over"); });
  area.addEventListener("dragleave", () => area.classList.remove("drag-over"));
  area.addEventListener("drop", e => {
    e.preventDefault(); area.classList.remove("drag-over");
    if (e.dataTransfer.files.length) handleFileSelected(e.dataTransfer.files[0]);
  });
}

function handleFileSelected(file) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    toast("只支持 .xlsx / .xls 文件", "error");
    return;
  }
  pendingFile = file;
  document.querySelector("#upload-area .upload-icon").textContent = "✅";
  document.querySelector("#upload-area p").textContent = `已选择：${file.name}（${formatSize(file.size)}）`;
  document.getElementById("btn-confirm-upload").disabled = false;
}

async function confirmUpload() {
  if (!pendingFile) return;
  const file = pendingFile;
  const path = `data/${file.name}`;

  try {
    document.getElementById("upload-progress").classList.remove("hidden");
    setProgress(10, "正在读取文件...");

    const buf = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    setProgress(40, "正在上传到 GitHub...");

    // 检查是否已存在（获取 SHA 用于覆盖）
    let sha = null;
    try { sha = await GH.getFileSha(path); } catch (_) { /* 新文件 */ }

    setProgress(70, "提交中...");
    await GH.uploadFile(path, base64, sha);
    setProgress(100, "上传成功！");

    toast("文件已上传，正在刷新列表...", "success");
    hideUploadModal();
    pendingFile = null;

    // 重置上传区域
    document.querySelector("#upload-area .upload-icon").textContent = "📄";
    document.querySelector("#upload-area p").textContent = "点击选择或拖拽 .xlsx / .xls 文件到此区域";

    // 刷新文件列表，然后自动选中新上传的文件
    await refreshFileList();
    const newFile = state.files.find(f => f.name === file.name);
    if (newFile) await selectFile(newFile);

  } catch (e) {
    console.error(e);
    setProgress(0, "上传失败：" + e.message);
    toast("上传失败：" + e.message, "error");
  }
}

function setProgress(pct, text) {
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("progress-text").textContent = text || "";
}

// ---------- 初始化 ----------
function init() {
  // 配置弹窗
  document.getElementById("btn-save-config").addEventListener("click", () => {
    const owner  = document.getElementById("cfg-owner").value.trim();
    const repo    = document.getElementById("cfg-repo").value.trim();
    const branch  = document.getElementById("cfg-branch").value.trim() || "main";
    const token   = document.getElementById("cfg-token").value.trim();
    if (!owner || !repo || !token) { toast("请填写所有字段", "error"); return; }
    saveConfig({ owner, repo, branch, token });
    hideConfigModal();
    toast("配置已保存", "success");
    refreshFileList();
  });

  document.getElementById("btn-show-config").addEventListener("click", showConfigModal);
  document.getElementById("config-overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) hideConfigModal();
  });

  // 上传弹窗
  document.getElementById("btn-show-upload").addEventListener("click", showUploadModal);
  document.getElementById("btn-cancel-upload").addEventListener("click", hideUploadModal);
  document.getElementById("btn-confirm-upload").addEventListener("click", confirmUpload);
  document.getElementById("upload-overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) hideUploadModal();
  });
  initUploadArea();

  // 刷新
  document.getElementById("btn-refresh-files").addEventListener("click", refreshFileList);
  document.getElementById("btn-refresh-data").addEventListener("click", () => {
    if (state.currentFile) loadFileData(state.currentFile);
  });

  // 生成图表
  document.getElementById("btn-generate-chart").addEventListener("click", generateChart);

  // 如果已有配置，自动加载
  if (state.config) refreshFileList();
}

document.addEventListener("DOMContentLoaded", init);
