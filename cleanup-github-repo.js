// GitHub 仓库清理脚本
// 使用说明：在浏览器控制台中运行此脚本来清理GitHub仓库

class GitHubCleaner {
    constructor(token, username, repo) {
        this.token = token;
        this.username = username;
        this.repo = repo;
        this.baseUrl = `https://api.github.com/repos/${username}/${repo}`;
    }

    async getFileSHA(path) {
        try {
            const response = await fetch(`${this.baseUrl}/contents/${path}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.sha;
            }
            return null;
        } catch (error) {
            console.log(`File ${path} not found`);
            return null;
        }
    }

    async deleteFile(path) {
        try {
            const sha = await this.getFileSHA(path);
            if (!sha) {
                console.log(`❌ File not found: ${path}`);
                return false;
            }

            const response = await fetch(`${this.baseUrl}/contents/${path}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Delete ${path}`,
                    sha: sha
                })
            });

            if (response.ok) {
                console.log(`✅ Deleted: ${path}`);
                return true;
            } else {
                const error = await response.json();
                console.log(`❌ Failed to delete ${path}:`, error.message);
                return false;
            }
        } catch (error) {
            console.log(`❌ Error deleting ${path}:`, error.message);
            return false;
        }
    }

    async getFolderContents(path = '') {
        try {
            const url = path ? `${this.baseUrl}/contents/${path}` : `${this.baseUrl}/contents`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.log(`Error getting folder contents for ${path}:`, error);
            return [];
        }
    }

    async deleteFolder(folderPath) {
        console.log(`📁 Processing folder: ${folderPath}`);
        const contents = await this.getFolderContents(folderPath);
        
        for (const item of contents) {
            if (item.type === 'file') {
                await this.deleteFile(item.path);
                // 添加延迟避免API限制
                await new Promise(resolve => setTimeout(resolve, 500));
            } else if (item.type === 'dir') {
                await this.deleteFolder(item.path);
            }
        }
    }

    async cleanupRepository() {
        console.log('🧹 开始清理GitHub仓库...');
        
        // 要删除的文件和文件夹列表
        const itemsToDelete = [
            'papers.json',
            'public-papers.json',
            'debug-test.json',
            'pdfs',
            'thumbnails'
        ];

        for (const item of itemsToDelete) {
            console.log(`\n🔄 处理: ${item}`);
            
            // 检查是文件还是文件夹
            const contents = await this.getFolderContents();
            const foundItem = contents.find(c => c.name === item);
            
            if (!foundItem) {
                console.log(`⏭️ 跳过 ${item} (不存在)`);
                continue;
            }

            if (foundItem.type === 'file') {
                await this.deleteFile(item);
            } else if (foundItem.type === 'dir') {
                await this.deleteFolder(item);
            }
            
            // 添加延迟避免API限制
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n✅ 仓库清理完成！');
        console.log('现在可以重新上传论文了。');
    }
}

// 使用方法：
console.log('GitHub仓库清理脚本已加载');
console.log('使用方法：');
console.log('1. 打开GitHub settings页面获取你的token');
console.log('2. 运行以下命令：');
console.log('');
console.log('const cleaner = new GitHubCleaner("你的GitHub_TOKEN", "wazgtam1", "literature-data");');
console.log('cleaner.cleanupRepository();');
console.log('');
console.log('⚠️ 确保替换为你的实际GitHub token！');