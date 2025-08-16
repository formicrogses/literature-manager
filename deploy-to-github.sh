#!/bin/bash

# 文献管理系统一键部署脚本
# 使用方法：./deploy-to-github.sh [GitHub用户名] [新仓库名]

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 输出函数
print_step() {
    echo -e "${BLUE}[步骤] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[成功] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[警告] $1${NC}"
}

print_error() {
    echo -e "${RED}[错误] $1${NC}"
}

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${BLUE}=== 文献管理系统一键部署脚本 ===${NC}"
    echo ""
    echo "使用方法："
    echo "  $0 [GitHub用户名] [新仓库名]"
    echo ""
    echo "示例："
    echo "  $0 myusername my-literature-manager"
    echo ""
    echo "注意："
    echo "  - 请确保已安装 git 和 gh CLI"
    echo "  - 请确保已登录 GitHub CLI (gh auth login)"
    echo "  - 新仓库名建议使用短横线分隔"
    exit 1
fi

GITHUB_USERNAME="$1"
REPO_NAME="$2"

# 如果只提供一个参数，使用默认仓库名
if [ $# -eq 1 ]; then
    REPO_NAME="literature-manager"
    echo -e "${YELLOW}使用默认仓库名: $REPO_NAME${NC}"
fi

echo -e "${BLUE}=== 文献管理系统一键部署开始 ===${NC}"
echo "目标GitHub用户: $GITHUB_USERNAME"
echo "新仓库名: $REPO_NAME"
echo ""

# 步骤1: 检查环境
print_step "检查部署环境..."
if ! command -v git &> /dev/null; then
    print_error "Git 未安装，请先安装 Git"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI 未安装，请先安装 gh CLI"
    echo "安装方法: https://cli.github.com/"
    exit 1
fi

# 检查是否已登录GitHub
if ! gh auth status &> /dev/null; then
    print_error "请先登录 GitHub CLI"
    echo "运行: gh auth login"
    exit 1
fi

print_success "环境检查通过"

# 步骤2: 创建临时目录
print_step "准备部署文件..."
TEMP_DIR=$(mktemp -d)
echo "临时目录: $TEMP_DIR"

# 复制当前项目文件
cp -r . "$TEMP_DIR/"
cd "$TEMP_DIR"

# 删除不需要的文件
rm -rf .git
rm -f deploy-to-github.sh
rm -f cleanup-*.js
rm -f cleanup-*.html
rm -f test-data-loading.html

print_success "文件准备完成"

# 步骤3: 创建GitHub仓库
print_step "创建GitHub仓库..."
if gh repo create "$GITHUB_USERNAME/$REPO_NAME" --public --description "智能文献管理系统 - 支持PDF上传、自动解析、GitHub同步" 2>/dev/null; then
    print_success "仓库创建成功: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
else
    print_warning "仓库可能已存在，继续部署流程..."
fi

# 步骤4: 初始化Git仓库
print_step "初始化Git仓库..."
git init
git add .
git commit -m "Initial commit: Literature Management System

- 智能PDF上传和解析系统
- 自动GitHub同步功能
- 响应式设计支持多设备
- 完整的论文管理功能

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 步骤5: 推送到GitHub
print_step "推送代码到GitHub..."
git branch -M main
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
git push -u origin main

print_success "代码推送成功"

# 步骤6: 启用GitHub Pages
print_step "启用GitHub Pages..."
gh api repos/"$GITHUB_USERNAME"/"$REPO_NAME"/pages \
  --method POST \
  --field source.branch=main \
  --field source.path=/ 2>/dev/null || print_warning "GitHub Pages可能已启用"

print_success "GitHub Pages配置完成"

# 步骤7: 创建数据仓库
print_step "创建数据存储仓库..."
DATA_REPO_NAME="$REPO_NAME-data"
if gh repo create "$GITHUB_USERNAME/$DATA_REPO_NAME" --public --description "文献管理系统数据存储仓库" 2>/dev/null; then
    print_success "数据仓库创建成功: https://github.com/$GITHUB_USERNAME/$DATA_REPO_NAME"
else
    print_warning "数据仓库可能已存在"
fi

# 步骤8: 初始化数据仓库
print_step "初始化数据仓库..."
DATA_TEMP_DIR=$(mktemp -d)
cd "$DATA_TEMP_DIR"
git init
echo "# $REPO_NAME Data Repository

这是文献管理系统的数据存储仓库，用于存储：
- PDF文件
- 论文缩略图
- 论文数据库

## 自动生成
此仓库由文献管理系统自动管理，请勿手动修改。
" > README.md

git add README.md
git commit -m "Initialize data repository"
git branch -M main
git remote add origin "https://github.com/$GITHUB_USERNAME/$DATA_REPO_NAME.git"
git push -u origin main

print_success "数据仓库初始化完成"

# 步骤9: 生成配置信息
print_step "生成配置信息..."

echo ""
echo -e "${GREEN}=== 部署成功！ ===${NC}"
echo ""
echo -e "${BLUE}📖 访问地址:${NC}"
echo "https://$GITHUB_USERNAME.github.io/$REPO_NAME/"
echo ""
echo -e "${BLUE}⚙️ GitHub配置信息:${NC}"
echo "GitHub用户名: $GITHUB_USERNAME"
echo "数据仓库名: $DATA_REPO_NAME"
echo "Token: [需要你手动获取]"
echo ""
echo -e "${BLUE}🔑 获取GitHub Token步骤:${NC}"
echo "1. 访问: https://github.com/settings/tokens"
echo "2. 点击 'Generate new token' -> 'Generate new token (classic)'"
echo "3. 选择权限: repo (完整仓库权限)"
echo "4. 复制生成的token"
echo ""
echo -e "${BLUE}🚀 使用步骤:${NC}"
echo "1. 访问系统地址"
echo "2. 点击 '⚙️ GitHub配置'"
echo "3. 输入上述GitHub配置信息"
echo "4. 开始上传论文！"
echo ""
echo -e "${BLUE}📁 仓库地址:${NC}"
echo "主仓库: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "数据仓库: https://github.com/$GITHUB_USERNAME/$DATA_REPO_NAME"
echo ""

# 清理临时目录
cd /
rm -rf "$TEMP_DIR" "$DATA_TEMP_DIR"

print_success "部署完成！请按照上述步骤配置并使用系统。"