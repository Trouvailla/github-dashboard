# GitHub 数据看板 📊

一个纯前端数据看板，**以 GitHub 仓库作为数据存储**，支持网页端直接上传 `.xlsx` 文件，上传后看板自动更新。

无需服务器、无需数据库，免费托管在 **GitHub Pages**。

---

## ✨ 功能特性

- 📤 **网页端上传 Excel** — 无需 Git 知识，点几下就能更新数据
- 📋 **数据表格预览** — 自动解析 .xlsx，展示前 200 行
- 📈 **交互式图表** — 支持柱状图 / 折线图 / 饼图 / 环形图，自由选 X/Y 轴
- 📁 **多文件切换** — 一个看板管理多个数据源
- 🔄 **自动更新** — 上传后刷新，数据实时生效
- 🔒 **Token 本地存储** — 配置信息只存在浏览器，不上传

---

## 🚀 快速部署（5 分钟）

### 第一步：创建 GitHub 仓库

1. 登录 GitHub，点击右上角 **+** → **New repository**
2. 仓库名随意，例如 `my-dashboard`
3. ✅ 勾选 **Add a README file**
4. 点击 **Create repository**

### 第二步：上传项目文件

将以下文件上传到仓库根目录（可以网页端直接上传，也可以用 Git）：

```
your-repo/
├── index.html          ← 主页面
├── css/
│   └── style.css
├── js/
│   └── app.js
└── data/              ← Excel 文件存放目录
    └── .gitkeep       ← 保持目录（此文件存在即可）
```

> 💡 **网页端上传方式**：进入仓库 → **Add file** → **Upload files**

### 第三步：启用 GitHub Pages

1. 进入仓库 → **Settings** → **Pages**（左侧边栏）
2. **Build and deployment** → **Branch** 选择 `main` → 保存
3. 等待约 30 秒，访问 `https://<你的用户名>.github.io/<仓库名>/`

### 第四步：创建 `data/` 目录

在仓库根目录创建 `data/` 文件夹，放一个 `.gitkeep` 空文件，确保目录存在：

```bash
mkdir data
touch data/.gitkeep
git add . && git commit -m "init data dir" && git push
```

或在网页端：进入仓库 → **Add file** → **Create new file** → 路径填 `data/.gitkeep`，提交。

---

## 🔑 配置 GitHub Token

看板需要 Token 才能通过 API 上传文件：

1. 打开 [github.com/settings/tokens](https://github.com/settings/tokens)
2. 点击 **Generate new token (classic)** → **Generate new token**
3. 勾选 `repo` 权限（完整仓库访问）
4. 生成后**立即复制**（只显示一次！）
5. 打开看板页面 → 点击右上角 **⚙️ 设置**
6. 填写：
   - **仓库所属**：你的 GitHub 用户名
   - **仓库名称**：刚才创建的仓库名
   - **分支**：`main`
   - **Token**：粘贴刚才复制的 Token
7. 点击 **保存配置**

配置会保存在浏览器本地，刷页不丢失。

---

## 📤 使用方式

### 上传 Excel 文件

1. 点击顶部 **+ 上传 Excel**
2. 选择或拖拽 `.xlsx` / `.xls` 文件
3. 点击 **确认上传**
4. 上传完成后，文件自动出现在左侧列表，点击即可查看

### 查看数据

- 点击左侧文件名 → 右侧自动展示数据表格
- 滚动查看数据，点击 **🔄 刷新数据** 重新拉取

### 生成图表

1. 先加载一个数据文件
2. 在图表卡片中：
   - 选择 **图表类型**
   - 选择 **X 轴** 列（通常是分类/时间）
   - 按住 Ctrl 多选 **Y 轴** 列（数值列）
3. 点击 **生成图表**

---

## 📁 文件结构

```
github-dashboard/
├── index.html          # 主页面（入口）
├── css/
│   └── style.css       # 样式
├── js/
│   └── app.js          # 全部逻辑（解析、渲染、上传）
├── data/               # Excel 文件存放目录（GitHub 仓库内）
└── README.md           # 本文档
```

---

## 🛠️ 技术栈

| 功能 | 工具 |
|------|------|
| Excel 解析 | [SheetJS](https://sheetjs.com/)（纯前端） |
| 图表渲染 | [Chart.js](https://www.chartjs.org/) |
| 数据存储 | GitHub Repository + GitHub API |
| 页面托管 | GitHub Pages |
| 浏览器存储 | localStorage（Token 和配置） |

---

## ⚠️ 注意事项

- **Token 权限**：只需 `repo` 权限，请勿分享给他人
- **文件大小**：建议单个 Excel 不超过 5MB，行数不超过 1 万行
- **公开仓库**：GitHub Pages 是公开的，数据也会被公开访问
- **私有仓库**：可以设置为私有，但 GitHub Pages 需要 Pro 才能对私有仓库启用

---

## 📌 TODO（可选扩展）

- [ ] 支持多个 Sheet 切换
- [ ] 数据筛选 / 搜索
- [ ] 图表保存为图片
- [ ] 支持 CSV 文件
- [ ] 数据透视表

---

Made with ❤️ · 纯前端 · 零服务器
