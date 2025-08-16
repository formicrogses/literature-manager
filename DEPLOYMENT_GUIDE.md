# 📚 文献管理系统一键部署指南

## 🚀 方法一：自动部署脚本（推荐）

### 前置要求
1. 安装 [Git](https://git-scm.com/)
2. 安装 [GitHub CLI](https://cli.github.com/)
3. 登录GitHub CLI：`gh auth login`

### 一键部署
```bash
# 给脚本执行权限
chmod +x deploy-to-github.sh

# 运行部署脚本
./deploy-to-github.sh [你的GitHub用户名] [新仓库名]

# 示例
./deploy-to-github.sh myusername my-literature-system
```

### 脚本会自动完成：
- ✅ 创建主仓库（存放网站代码）
- ✅ 创建数据仓库（存放PDF和数据）
- ✅ 启用GitHub Pages
- ✅ 推送所有代码
- ✅ 生成配置信息

---

## 🛠️ 方法二：手动部署

### 步骤1：创建GitHub仓库
1. 登录GitHub
2. 创建新仓库（public）
3. 仓库名建议：`literature-manager`

### 步骤2：创建数据仓库
1. 再创建一个仓库（public）
2. 仓库名建议：`literature-manager-data`

### 步骤3：上传代码
```bash
# 克隆这个项目
git clone https://github.com/wazgtam1/literature-manager.git
cd literature-manager

# 更新远程仓库地址
git remote set-url origin https://github.com/[你的用户名]/[你的仓库名].git

# 推送代码
git push -u origin main
```

### 步骤4：启用GitHub Pages
1. 进入仓库设置 → Pages
2. Source选择"Deploy from a branch"
3. Branch选择"main"
4. 保存设置

### 步骤5：配置GitHub信息
```bash
# 使用快速配置脚本
chmod +x quick-setup.sh
./quick-setup.sh [你的GitHub用户名] [数据仓库名]

# 提交更改
git add config.js
git commit -m "Update GitHub configuration"
git push
```

---

## ⚙️ 系统配置

### 获取GitHub Token
1. 访问：https://github.com/settings/tokens
2. 点击"Generate new token (classic)"
3. 选择权限：`repo`（完整仓库权限）
4. 复制生成的token

### 配置系统
1. 访问你的系统地址：`https://[用户名].github.io/[仓库名]/`
2. 点击"⚙️ GitHub配置"
3. 输入：
   - GitHub用户名
   - GitHub Token
4. 测试连接成功后保存

---

## 📖 使用说明

### 上传论文
1. 点击"Upload Paper"
2. 选择PDF文件（支持批量）
3. 选择研究领域分类
4. 等待处理和同步完成

### 分享给他人
- 直接分享你的系统地址
- 其他人可以无需配置直接查看论文
- 支持搜索、筛选、分类浏览

### 数据管理
- 论文数据自动同步到GitHub
- 支持单个删除、批量删除、清空所有
- 本地和云端数据双重备份

---

## 🔧 常见问题

### Q: 部署后访问显示404？
A: 等待5-10分钟，GitHub Pages需要时间生效

### Q: 上传论文后其他人看不到？
A: 检查GitHub配置是否正确，确保token有repo权限

### Q: 想更换数据仓库？
A: 运行 `./quick-setup.sh [用户名] [新仓库名]` 重新配置

### Q: 如何备份数据？
A: 数据自动存储在GitHub仓库中，直接下载仓库即可备份

---

## 📁 仓库结构

```
主仓库（网站代码）/
├── index.html          # 主页面
├── app.js              # 核心逻辑
├── style.css           # 样式文件
├── config.js           # GitHub配置
├── github-sync.js      # 同步功能
└── ...

数据仓库（论文存储）/
├── papers.json         # 论文数据库
├── public-papers.json  # 公共访问数据
├── pdfs/              # PDF文件夹
└── thumbnails/        # 缩略图文件夹
```

---

## 🎉 部署成功后

恭喜！你现在拥有了一个完整的在线文献管理系统：

- 🌐 **在线访问**：随时随地管理论文
- 📱 **响应式设计**：支持手机、平板、电脑
- ☁️ **云端同步**：数据安全存储在GitHub
- 🔍 **智能搜索**：标题、作者、摘要全文搜索
- 📊 **数据可视化**：论文统计和分类展示
- 🤝 **便捷分享**：一键分享给同事朋友

开始上传你的第一篇论文吧！📚✨