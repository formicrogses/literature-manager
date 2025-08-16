// config.js - GitHub自动同步配置
window.GITHUB_CONFIG = {
    // 你的GitHub用户名
    username: 'wazgtam1',
    
    // 数据仓库名
    dataRepo: 'literature-data',
    
    // GitHub Personal Access Token (将通过配置界面设置)
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

// 配置管理函数
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
        repo: `${window.GITHUB_CONFIG.username}/${window.GITHUB_CONFIG.dataRepo}`
    };
};

// 页面加载时自动加载保存的配置
document.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('github_username');
    const savedToken = localStorage.getItem('github_token');
    
    if (savedUsername && savedToken) {
        window.GITHUB_CONFIG.username = savedUsername;
        window.GITHUB_CONFIG.token = savedToken;
        console.log('GitHub configuration loaded from localStorage');
    }
    
    console.log('GitHub Config Status:', window.getGitHubStatus());
});