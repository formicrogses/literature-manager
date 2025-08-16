#!/bin/bash

# 快速配置脚本 - 自动更新config.js文件
# 使用方法：./quick-setup.sh [GitHub用户名] [数据仓库名]

if [ $# -eq 0 ]; then
    echo "快速配置GitHub设置"
    echo "使用方法: $0 [GitHub用户名] [数据仓库名]"
    echo "示例: $0 myusername my-literature-data"
    exit 1
fi

GITHUB_USERNAME="$1"
DATA_REPO="${2:-literature-manager-data}"

echo "正在更新config.js..."

# 备份原文件
cp config.js config.js.backup

# 更新config.js
cat > config.js << EOF
// config.js - GitHub自动同步配置
window.GITHUB_CONFIG = {
    // 你的GitHub用户名
    username: '$GITHUB_USERNAME',
    
    // 数据仓库名
    dataRepo: '$DATA_REPO',
    
    // GitHub Personal Access Token (请通过配置界面设置)
    token: '',
    
    // API基础URL
    apiBase: 'https://api.github.com',
    
    // 文件路径配置
    paths: {
        papers: 'papers.json',
        pdfs: 'pdfs/',
        thumbnails: 'thumbnails/'
    }
};

// 设置GitHub配置的函数
window.setupGitHub = function(username, token) {
    window.GITHUB_CONFIG.username = username;
    window.GITHUB_CONFIG.token = token;
    localStorage.setItem('github_username', username);
    localStorage.setItem('github_token', token);
    console.log('GitHub configuration saved');
};

// 获取配置状态
window.getGitHubStatus = function() {
    return {
        configured: window.GITHUB_CONFIG.username !== 'YOUR_USERNAME' && 
                   window.GITHUB_CONFIG.token !== 'YOUR_GITHUB_TOKEN' &&
                   window.GITHUB_CONFIG.token !== '',
        username: window.GITHUB_CONFIG.username,
        repo: \`\${window.GITHUB_CONFIG.username}/\${window.GITHUB_CONFIG.dataRepo}\`
    };
};

// 页面加载时自动加载保存的配置
document.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('github_username');
    const savedToken = localStorage.getItem('github_token');
    
    if (savedUsername && savedToken) {
        window.GITHUB_CONFIG.username = savedUsername;
        window.GITHUB_CONFIG.token = savedToken;
        console.log('Loaded saved GitHub configuration for:', savedUsername);
    }
});
EOF

echo "✅ 配置已更新！"
echo "GitHub用户名: $GITHUB_USERNAME"
echo "数据仓库: $DATA_REPO"
echo ""
echo "🔄 现在请运行："
echo "git add config.js"
echo "git commit -m 'Update GitHub configuration'"
echo "git push"