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

    // 上传文件到GitHub（增强版SHA冲突处理）
    async uploadFile(path, content, message, isBase64 = false, forceSHA = null, retryCount = 0) {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置，请先配置GitHub信息');
        }

        const maxRetries = 3;
        const baseDelay = 1000; // 1秒基础延迟

        try {
            // 如果这是重试，添加延迟以避免竞争条件
            if (retryCount > 0) {
                const delay = baseDelay * Math.pow(2, retryCount - 1); // 指数退避
                console.log(`Retry ${retryCount}/${maxRetries} for ${path}, waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

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
                
                // 如果是SHA不匹配错误，重新获取SHA并重试
                if (error.message && error.message.includes('does not match') && retryCount < maxRetries) {
                    console.log(`SHA不匹配错误，准备重试 ${retryCount + 1}/${maxRetries}: ${path}`);
                    return await this.uploadFile(path, content, message, isBase64, null, retryCount + 1);
                }
                
                throw new Error(`GitHub API错误: ${error.message}`);
            }

            if (retryCount > 0) {
                console.log(`✅ 重试成功: ${path} (重试 ${retryCount} 次)`);
            }

            return await response.json();
        } catch (error) {
            if (retryCount < maxRetries && (error.message.includes('does not match') || error.message.includes('conflict'))) {
                console.log(`上传失败，准备重试 ${retryCount + 1}/${maxRetries}: ${path}`, error.message);
                return await this.uploadFile(path, content, message, isBase64, null, retryCount + 1);
            }
            
            console.error('上传文件最终失败:', path, error);
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
            // 使用更精确的时间戳和随机数确保文件名唯一性
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substr(2, 5);
            const filename = `paper-${paper.id}-${timestamp}-${randomSuffix}`;
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
    
    // 删除GitHub文件
    async deleteFile(path) {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置，请先配置GitHub信息');
        }

        try {
            // 首先获取文件的SHA
            const sha = await this.getFileSHA(path);
            if (!sha) {
                console.log(`File ${path} not found, nothing to delete`);
                return;
            }

            const response = await fetch(`${this.baseUrl}/contents/${path}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Delete file: ${path}`,
                    sha: sha
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`删除文件失败: ${errorData.message}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Failed to delete file ${path}:`, error);
            throw error;
        }
    }
    
    // 同步公共数据快照到主仓库（用于访客访问）
    async syncPublicSnapshot(publicPapers) {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置，请先配置GitHub信息');
        }

        try {
            console.log('Syncing public data snapshot...');
            
            // Create a public-accessible JSON file with clean data
            const publicData = {
                papers: publicPapers,
                lastUpdate: new Date().toISOString(),
                totalCount: publicPapers.length,
                version: "1.0",
                description: "Public research papers database - automatically updated"
            };

            // Upload to a separate public file to avoid conflicts with main papers.json
            const result = await this.uploadFile(
                'public-papers.json', // Use different filename to avoid SHA conflicts
                JSON.stringify(publicData, null, 2),
                `Update public papers snapshot: ${publicPapers.length} papers`
            );
            
            console.log('Public data snapshot synced successfully');
            return result;
            
        } catch (error) {
            console.error('Failed to sync public data snapshot:', error);
            throw error;
        }
    }
    
    // 强制清理整个仓库的方法
    async forceCleanRepository() {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置，请先配置GitHub信息');
        }

        try {
            console.log('开始强制清理GitHub仓库...');
            
            // 获取仓库根目录内容
            const response = await fetch(`${this.baseUrl}/contents`, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('无法获取仓库内容');
            }

            const contents = await response.json();
            
            // 要删除的文件和文件夹
            const itemsToDelete = ['pdfs', 'thumbnails', 'papers.json', 'public-papers.json', 'debug-test.json'];
            
            for (const itemName of itemsToDelete) {
                const item = contents.find(c => c.name === itemName);
                if (!item) {
                    console.log(`跳过 ${itemName} (不存在)`);
                    continue;
                }

                if (item.type === 'dir') {
                    await this.deleteDirectory(itemName);
                } else if (item.type === 'file') {
                    await this.deleteFile(itemName);
                }
                
                // 添加延迟避免API限制
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log('强制清理完成');
            return true;
            
        } catch (error) {
            console.error('强制清理失败:', error);
            throw error;
        }
    }
    
    // 递归删除目录及其所有内容
    async deleteDirectory(dirPath) {
        try {
            console.log(`开始删除目录: ${dirPath}`);
            
            // 获取目录内容
            const response = await fetch(`${this.baseUrl}/contents/${dirPath}`, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                console.log(`目录 ${dirPath} 不存在或已删除`);
                return;
            }

            const contents = await response.json();
            
            // 先删除所有文件
            for (const item of contents) {
                if (item.type === 'file') {
                    try {
                        await this.deleteFile(item.path);
                        console.log(`已删除文件: ${item.path}`);
                        // 添加延迟避免API限制
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (error) {
                        console.warn(`删除文件失败: ${item.path}`, error.message);
                    }
                } else if (item.type === 'dir') {
                    // 递归删除子目录
                    await this.deleteDirectory(item.path);
                }
            }
            
            console.log(`目录 ${dirPath} 已清空`);
            
        } catch (error) {
            console.error(`删除目录失败: ${dirPath}`, error);
            throw error;
        }
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