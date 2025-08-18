#!/bin/bash

# Literature Manager Server Deployment Script
# 云服务器快速部署脚本

set -e  # 出错时退出

echo "🚀 开始部署 Literature Manager 到云服务器..."

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js (版本 16+)"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 环境检查通过"

# 创建必要目录
echo "📁 创建目录结构..."
mkdir -p uploads/pdfs
mkdir -p uploads/thumbnails
mkdir -p data
mkdir -p public

# 将前端文件复制到 public 目录
echo "📂 复制前端文件..."
cp index.html public/
cp style.css public/
cp app.js public/
cp server-api.js public/
cp indexeddb-storage.js public/

# 安装依赖
echo "📦 安装服务器依赖..."
npm install

# 创建 PM2 配置文件（生产环境进程管理）
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'literature-manager',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# 创建日志目录
mkdir -p logs

# 创建 Nginx 配置模板
cat > nginx.conf.template << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名
    
    client_max_body_size 100M;  # 允许大文件上传
    
    # 前端静态文件
    location / {
        root /path/to/literature-manager/public;  # 替换为实际路径
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 文件上传和下载
    location /uploads/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 创建 SSL 版本的 Nginx 配置
cat > nginx-ssl.conf.template << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;  # 替换为你的域名
    
    ssl_certificate /path/to/your/certificate.crt;  # SSL证书路径
    ssl_certificate_key /path/to/your/private.key;  # SSL私钥路径
    
    client_max_body_size 100M;
    
    # 前端静态文件
    location / {
        root /path/to/literature-manager/public;  # 替换为实际路径
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 文件上传和下载
    location /uploads/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 创建启动脚本
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 启动 Literature Manager 服务器..."

# 安装 PM2 (如果未安装)
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

# 启动服务
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "✅ 服务启动成功!"
echo "📊 查看状态: pm2 status"
echo "📝 查看日志: pm2 logs literature-manager"
echo "🔄 重启服务: pm2 restart literature-manager"
echo "🛑 停止服务: pm2 stop literature-manager"
EOF

chmod +x start.sh

# 创建开发模式启动脚本
cat > dev.sh << 'EOF'
#!/bin/bash
echo "🔧 启动开发模式..."
npm run dev
EOF

chmod +x dev.sh

# 创建防火墙配置脚本
cat > setup-firewall.sh << 'EOF'
#!/bin/bash
echo "🔥 配置防火墙..."

# Ubuntu/Debian
if command -v ufw &> /dev/null; then
    sudo ufw allow 22    # SSH
    sudo ufw allow 80    # HTTP
    sudo ufw allow 443   # HTTPS
    sudo ufw allow 3000  # Node.js (开发用)
    sudo ufw --force enable
    echo "✅ UFW 防火墙配置完成"
fi

# CentOS/RHEL
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=22/tcp
    sudo firewall-cmd --permanent --add-port=80/tcp
    sudo firewall-cmd --permanent --add-port=443/tcp
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
    echo "✅ Firewalld 防火墙配置完成"
fi
EOF

chmod +x setup-firewall.sh

echo ""
echo "🎉 部署脚本准备完成!"
echo ""
echo "📋 接下来的步骤:"
echo "1. 🔧 开发模式测试: ./dev.sh"
echo "2. 🚀 生产模式启动: ./start.sh"
echo "3. 🔥 配置防火墙: ./setup-firewall.sh"
echo "4. 🌐 配置 Nginx (可选): 编辑 nginx.conf.template"
echo ""
echo "📡 默认访问地址:"
echo "   开发模式: http://localhost:3000"
echo "   生产模式: http://your-server-ip"
echo ""
echo "📁 重要目录:"
echo "   📄 前端文件: ./public/"
echo "   📎 PDF文件: ./uploads/pdfs/"
echo "   🖼️  缩略图: ./uploads/thumbnails/"
echo "   💾 数据文件: ./data/papers.json"
echo ""
echo "🔧 常用命令:"
echo "   查看日志: pm2 logs literature-manager"
echo "   重启服务: pm2 restart literature-manager"
echo "   停止服务: pm2 stop literature-manager"
echo ""

# 测试服务器启动
echo "🧪 测试启动服务器..."
if npm start &
then
    SERVER_PID=$!
    sleep 3
    
    if curl -s http://localhost:3000/api/papers >/dev/null; then
        echo "✅ 服务器测试成功!"
    else
        echo "⚠️  服务器响应异常，请检查配置"
    fi
    
    kill $SERVER_PID 2>/dev/null
else
    echo "❌ 服务器启动失败，请检查错误信息"
fi

echo ""
echo "🎯 部署完成! 现在你可以:"
echo "1. 运行 ./dev.sh 在开发模式下测试"
echo "2. 运行 ./start.sh 在生产模式下启动"
echo "3. 访问 http://your-server-ip 使用系统"