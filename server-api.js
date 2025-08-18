// server-api.js - 云服务器API客户端
class ServerAPI {
    constructor() {
        this.baseUrl = window.location.origin; // 自动检测服务器地址
        this.isUploading = false;
    }

    // 检查服务器连接
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/api/papers`);
            if (response.ok) {
                return {
                    success: true,
                    message: '服务器连接正常'
                };
            } else {
                throw new Error('服务器响应异常');
            }
        } catch (error) {
            return {
                success: false,
                message: '服务器连接失败: ' + error.message
            };
        }
    }

    // 显示上传进度
    showProgress(message) {
        if (window.literatureManager) {
            window.literatureManager.showNotification(message, 'info');
        }
        console.log('ServerAPI:', message);
    }

    // 上传单个PDF文件
    async uploadPDF(file, paperData = {}) {
        const formData = new FormData();
        formData.append('pdf', file);
        
        // 添加论文元数据
        Object.keys(paperData).forEach(key => {
            if (paperData[key] !== undefined && paperData[key] !== null) {
                formData.append(key, paperData[key]);
            }
        });

        try {
            const response = await fetch(`${this.baseUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '上传失败');
            }

            const result = await response.json();
            return result.paper;
            
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    // 批量上传PDF文件
    async batchUploadPDFs(files, onProgress = null) {
        const formData = new FormData();
        
        files.forEach(file => {
            formData.append('pdfs', file);
        });

        try {
            const response = await fetch(`${this.baseUrl}/api/batch-upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '批量上传失败');
            }

            const result = await response.json();
            return result.results;
            
        } catch (error) {
            console.error('Batch upload error:', error);
            throw error;
        }
    }

    // 加载所有论文数据
    async loadPapers() {
        try {
            const response = await fetch(`${this.baseUrl}/api/papers`, {
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Papers loaded from server:', data);
                return data.papers || [];
            } else {
                console.log('Failed to load papers, response status:', response.status);
                return [];
            }
        } catch (error) {
            console.error('Failed to load papers from server:', error);
            return [];
        }
    }

    // 更新论文信息
    async updatePaper(paperId, updates) {
        try {
            const response = await fetch(`${this.baseUrl}/api/papers/${paperId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '更新失败');
            }

            const result = await response.json();
            return result.paper;
            
        } catch (error) {
            console.error('Update error:', error);
            throw error;
        }
    }

    // 删除论文
    async deletePaper(paperId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/papers/${paperId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '删除失败');
            }

            const result = await response.json();
            return result.paper;
            
        } catch (error) {
            console.error('Delete error:', error);
            throw error;
        }
    }

    // 搜索论文
    async searchPapers(query) {
        try {
            const params = new URLSearchParams();
            
            if (query.search) params.append('q', query.search);
            if (query.category && query.category !== 'all') params.append('category', query.category);
            if (query.year) params.append('year', query.year);
            if (query.author) params.append('author', query.author);

            const response = await fetch(`${this.baseUrl}/api/search?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.papers || [];
            } else {
                throw new Error('搜索失败');
            }
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    // 获取统计信息
    async getStats() {
        try {
            const response = await fetch(`${this.baseUrl}/api/stats`);
            
            if (response.ok) {
                const stats = await response.json();
                return stats;
            } else {
                throw new Error('获取统计信息失败');
            }
        } catch (error) {
            console.error('Stats error:', error);
            return null;
        }
    }

    // 同步单篇论文（兼容原有接口）
    async syncPaper(paper, pdfFile) {
        if (this.isUploading) {
            throw new Error('正在上传中，请稍候...');
        }

        this.isUploading = true;

        try {
            this.showProgress(`正在上传: ${paper.title}...`);
            
            // 准备论文数据
            const paperData = {
                title: paper.title || 'Untitled',
                authors: Array.isArray(paper.authors) ? paper.authors.join(',') : paper.authors || 'Unknown Author',
                year: paper.year || new Date().getFullYear(),
                journal: paper.journal || 'Unknown Journal',
                researchArea: paper.researchArea || 'General',
                methodology: paper.methodology || 'Experimental',
                studyType: paper.studyType || 'Empirical',
                keywords: Array.isArray(paper.keywords) ? paper.keywords.join(',') : paper.keywords || '',
                citations: paper.citations || 0,
                abstract: paper.abstract || '',
                doi: paper.doi || ''
            };

            const uploadedPaper = await this.uploadPDF(pdfFile, paperData);
            
            this.showProgress(`上传完成: ${uploadedPaper.title}`);
            return uploadedPaper;
            
        } catch (error) {
            console.error('同步论文失败:', error);
            throw error;
        } finally {
            this.isUploading = false;
        }
    }

    // 获取上传状态
    getUploadStatus() {
        return {
            uploading: this.isUploading,
            serverUrl: this.baseUrl
        };
    }

    // 兼容性方法
    isConfigured() {
        return true; // 服务器API始终可用
    }

    async loadSharedData() {
        return await this.loadPapers();
    }

    async syncAllData(papers) {
        // 服务器端自动同步，无需手动同步
        return true;
    }
}

// 全局实例
window.serverAPI = new ServerAPI();

// 页面加载完成后显示服务器状态
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        if (window.serverAPI) {
            const status = await window.serverAPI.testConnection();
            console.log('服务器连接状态:', status);
            
            if (status.success) {
                console.log('✅ 服务器连接正常，云端存储已启用');
            } else {
                console.log('⚠️ 服务器连接失败:', status.message);
            }
        }
    }, 1000);
});