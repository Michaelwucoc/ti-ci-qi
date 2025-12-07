// WebSocket服务器
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 处理 API 请求
    if (req.url.startsWith('/api/samples')) {
        handleSamplesAPI(req, res);
        return;
    }

    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './control.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm',
        '.txt': 'text/plain'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - 文件未找到</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`服务器错误: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// 处理 sample 文件 API
function handleSamplesAPI(req, res) {
    const sampleDir = path.join(__dirname, 'sample');
    
    // 设置 CORS 头
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET') {
        const urlParts = req.url.split('/');
        
        // GET /api/samples - 列出所有 txt 文件
        if (urlParts.length === 3 || (urlParts.length === 4 && urlParts[3] === '')) {
            fs.readdir(sampleDir, (err, files) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        // sample 文件夹不存在，返回空数组
                        res.writeHead(200);
                        res.end(JSON.stringify({ files: [] }), 'utf-8');
                    } else {
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: err.message }), 'utf-8');
                    }
                    return;
                }
                
                // 过滤出 .txt 文件
                const txtFiles = files.filter(file => file.toLowerCase().endsWith('.txt'));
                res.writeHead(200);
                res.end(JSON.stringify({ files: txtFiles }), 'utf-8');
            });
        }
        // GET /api/samples/:filename - 读取指定文件内容
        else if (urlParts.length === 4 && urlParts[3]) {
            const filename = decodeURIComponent(urlParts[3]);
            // 安全检查：确保文件名只包含安全字符，防止路径遍历攻击
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '无效的文件名' }), 'utf-8');
                return;
            }
            
            const filePath = path.join(sampleDir, filename);
            fs.readFile(filePath, 'utf-8', (err, content) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: '文件未找到' }), 'utf-8');
                    } else {
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: err.message }), 'utf-8');
                    }
                    return;
                }
                
                res.writeHead(200);
                res.end(JSON.stringify({ content: content, filename: filename }), 'utf-8');
            });
        } else {
            res.writeHead(400);
            res.end(JSON.stringify({ error: '无效的请求' }), 'utf-8');
        }
    } else {
        res.writeHead(405);
        res.end(JSON.stringify({ error: '方法不允许' }), 'utf-8');
    }
}

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 存储连接的客户端
const clients = {
    display: null,
    control: null
};

// 存储当前状态
let state = {
    content: '',
    fontSize: 48,
    lineHeight: 1.5,
    scrollSpeed: 30,
    autoScroll: false,
    wordWrap: true
};

wss.on('connection', (ws) => {
    console.log('新的WebSocket连接');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'register') {
                // 注册客户端
                if (data.role === 'display') {
                    clients.display = ws;
                    console.log('显示页面已连接');
                    // 发送当前状态
                    sendToDisplay({ type: 'content', content: state.content });
                    sendToDisplay({ type: 'fontSize', size: state.fontSize });
                    sendToDisplay({ type: 'lineHeight', height: state.lineHeight });
                    sendToDisplay({ type: 'scrollSpeed', speed: state.scrollSpeed });
                    sendToDisplay({ type: 'wordWrap', enabled: state.wordWrap });
                    if (state.autoScroll) {
                        sendToDisplay({ type: 'autoScroll', enabled: true });
                    }
                } else if (data.role === 'control') {
                    clients.control = ws;
                    console.log('控制页面已连接');
                }
            } else if (data.type === 'scrollPosition' && clients.display === ws) {
                // 来自显示页面的滚动位置消息，直接转发到控制页面
                console.log('转发滚动位置到控制页面:', data);
                handleDisplayMessage(data);
            } else if (data.role === 'control' || clients.control === ws) {
                // 来自控制页面的消息，转发到显示页面
                handleControlMessage(data);
            } else if (data.role === 'display' || clients.display === ws) {
                // 来自显示页面的消息，转发到控制页面
                handleDisplayMessage(data);
            }
        } catch (error) {
            console.error('处理消息错误:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket连接已关闭');
        if (clients.display === ws) {
            clients.display = null;
        }
        if (clients.control === ws) {
            clients.control = null;
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
    });
});

function handleControlMessage(data) {
    // 更新状态
    switch (data.type) {
        case 'content':
            state.content = data.content;
            break;
        case 'fontSize':
            state.fontSize = data.size;
            break;
        case 'lineHeight':
            state.lineHeight = data.height;
            break;
        case 'scrollSpeed':
            state.scrollSpeed = data.speed;
            break;
        case 'autoScroll':
            state.autoScroll = data.enabled;
            break;
        case 'wordWrap':
            state.wordWrap = data.enabled;
            break;
    }
    
    // 转发到显示页面
    sendToDisplay(data);
}

function handleDisplayMessage(data) {
    // 转发到控制页面
    sendToControl(data);
}

function sendToDisplay(message) {
    if (clients.display && clients.display.readyState === WebSocket.OPEN) {
        clients.display.send(JSON.stringify(message));
    }
}

function sendToControl(message) {
    if (clients.control && clients.control.readyState === WebSocket.OPEN) {
        clients.control.send(JSON.stringify(message));
    }
}

server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`管理控制台: http://localhost:${PORT}/control.html`);
    console.log(`显示页面: http://localhost:${PORT}/display.html`);
});

