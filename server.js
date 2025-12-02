// WebSocket服务器
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// 创建HTTP服务器
const server = http.createServer((req, res) => {
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
        '.wasm': 'application/wasm'
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
    autoScroll: false
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

