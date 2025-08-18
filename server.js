const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const sharp = require('sharp');
const pdf2pic = require('pdf2pic');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// 静态文件服务
app.use('/uploads', express.static('uploads'));
app.use('/thumbnails', express.static('thumbnails'));
app.use(express.static('public')); // 前端文件

// 确保目录存在
const initDirectories = async () => {
    const dirs = ['uploads/pdfs', 'uploads/thumbnails', 'data'];
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
};

// 文件上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/pdfs/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB限制
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('只支持PDF文件'));
        }
    }
});

// 数据存储类
class DataManager {
    constructor() {
        this.dataPath = 'data/papers.json';
    }

    async loadPapers() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { papers: [], lastUpdate: new Date().toISOString(), totalCount: 0 };
        }
    }

    async savePapers(papersData) {
        await fs.writeFile(this.dataPath, JSON.stringify(papersData, null, 2));
    }

    async addPaper(paperData) {
        const data = await this.loadPapers();
        const newId = data.papers.length > 0 ? Math.max(...data.papers.map(p => p.id)) + 1 : 1;
        
        paperData.id = newId;
        paperData.uploadTime = new Date().toISOString();
        
        data.papers.push(paperData);
        data.totalCount = data.papers.length;
        data.lastUpdate = new Date().toISOString();
        
        await this.savePapers(data);
        return paperData;
    }

    async updatePaper(id, updates) {
        const data = await this.loadPapers();
        const index = data.papers.findIndex(p => p.id === parseInt(id));
        
        if (index === -1) {
            throw new Error('Paper not found');
        }
        
        data.papers[index] = { ...data.papers[index], ...updates };
        data.lastUpdate = new Date().toISOString();
        
        await this.savePapers(data);
        return data.papers[index];
    }

    async deletePaper(id) {
        const data = await this.loadPapers();
        const index = data.papers.findIndex(p => p.id === parseInt(id));
        
        if (index === -1) {
            throw new Error('Paper not found');
        }
        
        const paper = data.papers[index];
        data.papers.splice(index, 1);
        data.totalCount = data.papers.length;
        data.lastUpdate = new Date().toISOString();
        
        await this.savePapers(data);
        
        // 删除文件
        try {
            if (paper.pdfPath) await fs.unlink(paper.pdfPath);
            if (paper.thumbnailPath) await fs.unlink(paper.thumbnailPath);
        } catch (error) {
            console.log('File deletion error:', error.message);
        }
        
        return paper;
    }
}

const dataManager = new DataManager();

// 生成PDF缩略图
const generateThumbnail = async (pdfPath, outputPath) => {
    try {
        const convert = pdf2pic.fromPath(pdfPath, {
            density: 100,
            saveFilename: "thumb",
            savePath: path.dirname(outputPath),
            format: "jpg",
            width: 400,
            height: 300
        });
        
        const result = await convert(1); // 第一页
        const thumbnailPath = result[0].path;
        
        // 优化图片
        await sharp(thumbnailPath)
            .resize(400, 300, { fit: 'inside' })
            .jpeg({ quality: 85 })
            .toFile(outputPath);
            
        // 删除临时文件
        await fs.unlink(thumbnailPath);
        
        return outputPath;
    } catch (error) {
        console.error('Thumbnail generation failed:', error);
        return null;
    }
};

// API路由

// 获取所有论文
app.get('/api/papers', async (req, res) => {
    try {
        const data = await dataManager.loadPapers();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 上传PDF
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const pdfPath = req.file.path;
        const thumbnailPath = `uploads/thumbnails/thumb-${req.file.filename.replace('.pdf', '.jpg')}`;
        
        // 生成缩略图
        await generateThumbnail(pdfPath, thumbnailPath);
        
        // 提取PDF元数据（简化版）
        const paperData = {
            title: req.body.title || req.file.originalname.replace('.pdf', ''),
            authors: req.body.authors ? req.body.authors.split(',').map(a => a.trim()) : ['Unknown Author'],
            year: parseInt(req.body.year) || new Date().getFullYear(),
            journal: req.body.journal || 'Unknown Journal',
            researchArea: req.body.researchArea || 'General',
            methodology: req.body.methodology || 'Experimental',
            studyType: req.body.studyType || 'Empirical',
            keywords: req.body.keywords ? req.body.keywords.split(',').map(k => k.trim()) : [],
            citations: parseInt(req.body.citations) || 0,
            downloads: 0,
            abstract: req.body.abstract || '',
            doi: req.body.doi || '',
            pdfUrl: `/uploads/pdfs/${req.file.filename}`,
            thumbnailUrl: `/uploads/thumbnails/${path.basename(thumbnailPath)}`,
            pdfPath: pdfPath,
            thumbnailPath: thumbnailPath,
            fileSize: req.file.size
        };

        const savedPaper = await dataManager.addPaper(paperData);
        res.json({ success: true, paper: savedPaper });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 批量上传
app.post('/api/batch-upload', upload.array('pdfs', 100), async (req, res) => {
    try {
        const results = [];
        
        for (const file of req.files) {
            try {
                const pdfPath = file.path;
                const thumbnailPath = `uploads/thumbnails/thumb-${file.filename.replace('.pdf', '.jpg')}`;
                
                await generateThumbnail(pdfPath, thumbnailPath);
                
                const paperData = {
                    title: file.originalname.replace('.pdf', ''),
                    authors: ['Unknown Author'],
                    year: new Date().getFullYear(),
                    journal: 'Unknown Journal',
                    researchArea: 'General',
                    methodology: 'Experimental',
                    studyType: 'Empirical',
                    keywords: [],
                    citations: 0,
                    downloads: 0,
                    abstract: '',
                    doi: '',
                    pdfUrl: `/uploads/pdfs/${file.filename}`,
                    thumbnailUrl: `/uploads/thumbnails/${path.basename(thumbnailPath)}`,
                    pdfPath: pdfPath,
                    thumbnailPath: thumbnailPath,
                    fileSize: file.size
                };

                const savedPaper = await dataManager.addPaper(paperData);
                results.push({ success: true, paper: savedPaper });
                
            } catch (error) {
                results.push({ success: false, filename: file.originalname, error: error.message });
            }
        }
        
        res.json({ results });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新论文信息
app.put('/api/papers/:id', async (req, res) => {
    try {
        const updatedPaper = await dataManager.updatePaper(req.params.id, req.body);
        res.json({ success: true, paper: updatedPaper });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除论文
app.delete('/api/papers/:id', async (req, res) => {
    try {
        const deletedPaper = await dataManager.deletePaper(req.params.id);
        res.json({ success: true, paper: deletedPaper });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 搜索论文
app.get('/api/search', async (req, res) => {
    try {
        const { q, category, year, author } = req.query;
        const data = await dataManager.loadPapers();
        
        let results = data.papers;
        
        if (q) {
            const query = q.toLowerCase();
            results = results.filter(paper => 
                paper.title.toLowerCase().includes(query) ||
                paper.authors.some(author => author.toLowerCase().includes(query)) ||
                paper.abstract.toLowerCase().includes(query) ||
                paper.keywords.some(keyword => keyword.toLowerCase().includes(query))
            );
        }
        
        if (category && category !== 'all') {
            results = results.filter(paper => paper.researchArea === category);
        }
        
        if (year) {
            results = results.filter(paper => paper.year === parseInt(year));
        }
        
        if (author) {
            results = results.filter(paper => 
                paper.authors.some(a => a.toLowerCase().includes(author.toLowerCase()))
            );
        }
        
        res.json({ papers: results, totalCount: results.length });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取统计信息
app.get('/api/stats', async (req, res) => {
    try {
        const data = await dataManager.loadPapers();
        const papers = data.papers;
        
        const stats = {
            totalPapers: papers.length,
            totalDownloads: papers.reduce((sum, paper) => sum + paper.downloads, 0),
            totalCitations: papers.reduce((sum, paper) => sum + paper.citations, 0),
            yearDistribution: {},
            categoryDistribution: {},
            recentUploads: papers.slice(-10).reverse()
        };
        
        // 年份分布
        papers.forEach(paper => {
            stats.yearDistribution[paper.year] = (stats.yearDistribution[paper.year] || 0) + 1;
        });
        
        // 分类分布
        papers.forEach(paper => {
            stats.categoryDistribution[paper.researchArea] = (stats.categoryDistribution[paper.researchArea] || 0) + 1;
        });
        
        res.json(stats);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 错误处理
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    res.status(500).json({ error: error.message });
});

// 启动服务器
const startServer = async () => {
    await initDirectories();
    app.listen(PORT, () => {
        console.log(`🚀 Literature Manager Server running on port ${PORT}`);
        console.log(`📂 Upload endpoint: http://localhost:${PORT}/api/upload`);
        console.log(`📊 API docs: http://localhost:${PORT}/api/papers`);
    });
};

startServer().catch(console.error);