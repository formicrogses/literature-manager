// github-sync.js - GitHub自动同步功能
class GitHubSync {
    constructor() {
        this.config = window.GITHUB_CONFIG;
        this.baseUrl = `${this.config.apiBase}/repos/${this.config.username}/${this.config.dataRepo}`;
        this.isUploading = false;
    }

    // 检查GitHub配置是否完整
    isConfigured() {
        return this.config.username && 
               this.config.username !== 'YOUR_USERNAME' && 
               this.config.token && 
               this.config.token !== 'YOUR_GITHUB_TOKEN';
    }

    // 显示上传进度
    showProgress(message) {
        if (window.literatureManager) {
            window.literatureManager.showNotification(message, 'info');
        }
        console.log('GitHubSync:', message);
    }

    // 获取文件的SHA（用于更新文件）
    async getFileSHA(path) {
        try {
            const response = await fetch(`${this.baseUrl}/contents/${path}`, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.sha;
            }
            return null;
        } catch (error) {
            console.log('File not found, will create new file');
            return null;
        }
    }

    // 上传文件到GitHub
    async uploadFile(path, content, message, isBase64 = false, forceSHA = null) {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置，请先配置GitHub信息');
        }

        try {
            // 如果提供了forceSHA，使用它；否则重新获取最新的SHA
            const sha = forceSHA || await this.getFileSHA(path);
            
            const body = {
                message: message,
                content: isBase64 ? content : btoa(unescape(encodeURIComponent(content)))
            };

            if (sha) {
                body.sha = sha; // 更新现有文件
            }

            const response = await fetch(`${this.baseUrl}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                
                // 如果是SHA不匹配错误，重新获取SHA并重试一次
                if (error.message && error.message.includes('does not match') && !forceSHA) {
                    console.log('SHA不匹配，重新获取最新SHA并重试...');
                    const latestSHA = await this.getFileSHA(path);
                    return await this.uploadFile(path, content, message, isBase64, latestSHA);
                }
                
                throw new Error(`GitHub API错误: ${error.message}`);
            }

            return await response.json();
        } catch (error) {
            console.error('上传文件失败:', path, error);
            throw error;
        }
    }

    // 上传PDF文件
    async uploadPDF(file, filename) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64Content = reader.result.split(',')[1];
                    const path = `${this.config.paths.pdfs}${filename}`;
                    
                    this.showProgress(`正在上传PDF: ${filename}...`);
                    const result = await this.uploadFile(
                        path, 
                        base64Content, 
                        `Add PDF: ${filename}`,
                        true
                    );
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 上传缩略图
    async uploadThumbnail(thumbnailDataUrl, filename) {
        if (!thumbnailDataUrl) return null;
        
        try {
            const base64Content = thumbnailDataUrl.split(',')[1];
            const path = `${this.config.paths.thumbnails}${filename}`;
            
            this.showProgress(`正在上传缩略图: ${filename}...`);
            return await this.uploadFile(
                path,
                base64Content,
                `Add thumbnail: ${filename}`,
                true
            );
        } catch (error) {
            console.warn('缩略图上传失败，继续处理:', error);
            return null;
        }
    }

    // 更新论文数据
    async updatePapersData(papers) {
        const papersData = {
            papers: papers,
            lastUpdate: new Date().toISOString(),
            totalCount: papers.length,
            version: "1.0"
        };

        this.showProgress('正在更新论文数据库...');
        return await this.uploadFile(
            this.config.paths.papers,
            JSON.stringify(papersData, null, 2),
            `Update papers data: ${papers.length} papers`
        );
    }

    // 加载共享数据
    async loadSharedData() {
        try {
            const url = `https://raw.githubusercontent.com/${this.config.username}/${this.config.dataRepo}/main/${this.config.paths.papers}`;
            console.log('Loading shared data from:', url);
            
            const response = await fetch(url, { 
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Shared data loaded:', data);
                return data.papers || [];
            } else {
                console.log('No shared data found, response status:', response.status);
                return [];
            }
        } catch (error) {
            console.error('Failed to load shared data:', error);
            return [];
        }
    }

    // 自动同步单篇论文
    async syncPaper(paper, pdfFile) {
        if (!this.isConfigured()) {
            throw new Error('请先配置GitHub信息');
        }

        if (this.isUploading) {
            throw new Error('正在上传中，请稍候...');
        }

        this.isUploading = true;

        try {
            const timestamp = Date.now();
            const filename = `paper-${paper.id}-${timestamp}`;
            const pdfFilename = `${filename}.pdf`;
            const thumbFilename = `${filename}.jpg`;

            // 1. 上传PDF文件
            if (pdfFile) {
                console.log('开始上传PDF文件...');
                await this.uploadPDF(pdfFile, pdfFilename);
                paper.pdfUrl = `https://raw.githubusercontent.com/${this.config.username}/${this.config.dataRepo}/main/${this.config.paths.pdfs}${pdfFilename}`;
                console.log('PDF上传成功，URL:', paper.pdfUrl);
            }

            // 2. 上传缩略图
            if (paper.thumbnail) {
                console.log('开始上传缩略图...');
                await this.uploadThumbnail(paper.thumbnail, thumbFilename);
                paper.thumbnail = `https://raw.githubusercontent.com/${this.config.username}/${this.config.dataRepo}/main/${this.config.paths.thumbnails}${thumbFilename}`;
                console.log('缩略图上传成功，URL:', paper.thumbnail);
            }

            // 标记为已同步
            paper.isCloudSynced = true;
            paper.syncTime = new Date().toISOString();

            return paper;
        } catch (error) {
            console.error('同步论文失败:', error);
            throw error;
        } finally {
            this.isUploading = false;
        }
    }

    // 全量同步所有论文数据
    async syncAllData(papers) {
        if (!this.isConfigured()) {
            throw new Error('请先配置GitHub信息');
        }

        try {
            console.log('开始同步所有论文数据...');
            await this.updatePapersData(papers);
            console.log('所有数据同步成功!');
            return true;
        } catch (error) {
            console.error('同步所有数据失败:', error);
            throw error;
        }
    }

    // 测试GitHub连接
    async testConnection() {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置');
        }

        try {
            const response = await fetch(`https://api.github.com/user`, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                return {
                    success: true,
                    user: userData.login,
                    message: `连接成功！Hello ${userData.login}`
                };
            } else {
                throw new Error('Token验证失败');
            }
        } catch (error) {
            return {
                success: false,
                message: '连接失败: ' + error.message
            };
        }
    }

    // 获取同步状态
    getSyncStatus() {
        return {
            configured: this.isConfigured(),
            uploading: this.isUploading,
            username: this.config.username,
            repo: `${this.config.username}/${this.config.dataRepo}`,
            dataUrl: `https://raw.githubusercontent.com/${this.config.username}/${this.config.dataRepo}/main/${this.config.paths.papers}`
        };
    }
}

// 全局实例
window.githubSync = new GitHubSync();

// 页面加载完成后显示同步状态
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.githubSync) {
            const status = window.githubSync.getSyncStatus();
            console.log('GitHub同步状态:', status);
            
            if (status.configured) {
                console.log('✅ GitHub已配置，将启用自动同步功能');
            } else {
                console.log('⚠️ GitHub未配置，请配置后启用云端同步');
            }
        }
    }, 1000);
});