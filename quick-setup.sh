#!/bin/bash

# Quick setup script - Automatically update config.js file
# Usage: ./quick-setup.sh [GitHub username] [data repository name]

if [ $# -eq 0 ]; then
    echo "Quick GitHub configuration setup"
    echo "Usage: $0 [GitHub username] [data repository name]"
    echo "Example: $0 myusername my-literature-data"
    exit 1
fi

GITHUB_USERNAME="$1"
DATA_REPO="${2:-literature-manager-data}"

echo "Updating config.js..."

# Backup original file
cp config.js config.js.backup

# Update config.js
cat > config.js << EOF
// config.js - GitHub automatic sync configuration
window.GITHUB_CONFIG = {
    // Your GitHub username
    username: '$GITHUB_USERNAME',
    
    // Data repository name
    dataRepo: '$DATA_REPO',
    
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

// Function to set up GitHub configuration
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
        repo: \`\${window.GITHUB_CONFIG.username}/\${window.GITHUB_CONFIG.dataRepo}\`
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
EOF

echo "✅ Configuration updated!"
echo "GitHub username: $GITHUB_USERNAME"
echo "Data repository: $DATA_REPO"
echo ""
echo "🔄 Now please run:"
echo "git add config.js"
echo "git commit -m 'Update GitHub configuration'"
echo "git push"