// config.js - GitHub Auto-sync Configuration
window.GITHUB_CONFIG = {
    // Your GitHub username
    username: 'formicrogses',
    
    // Data repository name
    dataRepo: 'literature-manager-data',
    
    // GitHub Personal Access Token (please set through configuration interface)
    token: '',
    
    // API base URL
    apiBase: 'https://api.github.com',
    
    // File path configuration
    paths: {
        papers: 'papers.json',
        pdfs: 'pdfs/',
        thumbnails: 'thumbnails/'
    }
};

// Function to set GitHub configuration
window.setupGitHub = function(username, token) {
    window.GITHUB_CONFIG.username = username;
    window.GITHUB_CONFIG.token = token;
    localStorage.setItem('github_username', username);
    localStorage.setItem('github_token', token);
    console.log('GitHub configuration saved');
};

// Get configuration status
window.getGitHubStatus = function() {
    return {
        configured: window.GITHUB_CONFIG.username !== 'YOUR_USERNAME' && 
                   window.GITHUB_CONFIG.token !== 'YOUR_GITHUB_TOKEN' &&
                   window.GITHUB_CONFIG.token !== '',
        username: window.GITHUB_CONFIG.username,
        repo: `${window.GITHUB_CONFIG.username}/${window.GITHUB_CONFIG.dataRepo}`
    };
};

// Automatically load saved configuration when page loads
document.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('github_username');
    const savedToken = localStorage.getItem('github_token');
    
    if (savedUsername && savedToken) {
        window.GITHUB_CONFIG.username = savedUsername;
        window.GITHUB_CONFIG.token = savedToken;
        console.log('Loaded saved GitHub configuration for:', savedUsername);
    }
});