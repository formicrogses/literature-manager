// 快速创建数据仓库文件的脚本
const fs = require('fs').promises;
const https = require('https');

// GitHub配置
const GITHUB_TOKEN = 'YOUR_TOKEN_HERE'; // 需要替换
const REPO_OWNER = 'formicrogses';
const REPO_NAME = 'literature-manager-data';

// 创建文件到GitHub的函数
async function createFileOnGitHub(path, content, message) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    
    const data = JSON.stringify({
        message: message,
        content: Buffer.from(content).toString('base64')
    });

    const options = {
        hostname: 'api.github.com',
        path: `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'literature-manager',
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode === 201) {
                    console.log(`✅ Created: ${path}`);
                    resolve(responseData);
                } else {
                    console.error(`❌ Failed to create ${path}: ${res.statusCode}`);
                    reject(new Error(responseData));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// 文件内容
const files = {
    'README.md': `# Literature Manager Data Repository

This repository serves as the central data storage for the Literature Management System.

## 📁 Repository Structure

\`\`\`
literature-manager-data/
├── README.md                 # This documentation
├── CHANGELOG.md             # Version history
├── papers.json              # Papers metadata database
├── public-papers.json       # Public access snapshot
├── pdfs/                    # PDF files storage
│   └── README.md           # PDF directory info
└── thumbnails/              # Generated thumbnails
    └── README.md           # Thumbnails directory info
\`\`\`

## 🎯 Purpose

- **Store PDF Files**: Academic papers and research documents
- **Manage Metadata**: Complete bibliographic information
- **Provide Thumbnails**: Generated preview images
- **Enable Collaboration**: Share research collections
- **Ensure Backup**: Cloud-based storage with version control

🤖 **Automated Repository**: Managed by Literature Management System.`,

    'CHANGELOG.md': `# Changelog

## [1.0.0] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial repository structure setup
- Created pdfs/ directory for PDF storage
- Created thumbnails/ directory for thumbnails
- Added comprehensive documentation
- Established automatic synchronization

🤖 Auto-maintained by Literature Management System.`,

    'pdfs/README.md': `# PDF Files Directory

This directory contains all uploaded PDF files.

## Features
- Automatic compression for files > 2MB
- Maximum file size: 100MB
- Naming: \`paper-{id}-{timestamp}-{random}.pdf\`

⚠️ **AUTO-MANAGED**: Do not edit manually.`,

    'thumbnails/README.md': `# Thumbnails Directory

Auto-generated thumbnail images for PDF files.

## Features
- Generated from PDF first page
- Format: JPEG, 85% quality
- Max dimensions: 400x300px
- Naming: \`paper-{id}-{timestamp}-{random}.jpg\`

⚠️ **AUTO-MANAGED**: Do not edit manually.`
};

// 执行创建
async function main() {
    console.log('🚀 Creating data repository files...');
    
    for (const [path, content] of Object.entries(files)) {
        try {
            await createFileOnGitHub(path, content, `Add ${path}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟避免API限制
        } catch (error) {
            console.error(`Failed to create ${path}:`, error.message);
        }
    }
    
    console.log('✅ Data repository setup completed!');
}

main().catch(console.error);