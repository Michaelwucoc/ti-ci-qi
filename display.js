// 显示页面脚本
class TeleprompterDisplay {
    constructor() {
        this.content = '';
        this.fontSize = 24;
        this.scrollSpeed = 30;
        this.isScrolling = false;
        this.scrollInterval = null;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        this.init();
    }

    init() {
        this.setupElements();
        this.setupWebSocket();
        this.setupKeyboardControls();
        this.setupFontControls();
        this.loadSettings();
    }

    setupElements() {
        this.contentElement = document.getElementById('teleprompter-content');
        this.fontSizeDisplay = document.getElementById('font-size-display');
        this.connectionStatus = document.getElementById('connection-status');
        this.statusText = document.getElementById('status-text');
        this.fontIncreaseBtn = document.getElementById('font-increase');
        this.fontDecreaseBtn = document.getElementById('font-decrease');
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:8080`;
        
        this.connectWebSocket(wsUrl);
    }

    connectWebSocket(url) {
        try {
            this.ws = new WebSocket(url);
            
            this.ws.onopen = () => {
                console.log('WebSocket连接已建立');
                this.updateConnectionStatus(true);
                this.reconnectAttempts = 0;
                this.ws.send(JSON.stringify({ type: 'register', role: 'display' }));
            };

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            };

            this.ws.onclose = () => {
                console.log('WebSocket连接已关闭');
                this.updateConnectionStatus(false);
                this.attemptReconnect(url);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket错误:', error);
                this.updateConnectionStatus(false);
            };
        } catch (error) {
            console.error('WebSocket连接失败:', error);
            this.updateConnectionStatus(false);
        }
    }

    attemptReconnect(url) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                this.connectWebSocket(url);
            }, 2000);
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'content':
                this.updateContent(message.content);
                break;
            case 'scroll':
                this.handleScrollCommand(message);
                break;
            case 'fontSize':
                this.setFontSize(message.size);
                break;
            case 'lineHeight':
                this.setLineHeight(message.height);
                break;
            case 'scrollSpeed':
                this.setScrollSpeed(message.speed);
                break;
            case 'autoScroll':
                if (message.enabled) {
                    this.startAutoScroll();
                } else {
                    this.stopAutoScroll();
                }
                break;
        }
    }

    updateContent(content) {
        this.content = content;
        const paragraphs = content.split('\n').filter(p => p.trim());
        this.contentElement.innerHTML = paragraphs.map(p => `<p>${this.escapeHtml(p)}</p>`).join('');
        this.saveSettings();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleScrollCommand(message) {
        switch (message.action) {
            case 'up':
                this.scrollUp();
                break;
            case 'down':
                this.scrollDown();
                break;
            case 'pause':
                this.toggleScroll();
                break;
            case 'reset':
                this.resetScroll();
                break;
        }
    }

    scrollUp() {
        window.scrollBy({ top: -100, behavior: 'smooth' });
    }

    scrollDown() {
        window.scrollBy({ top: 100, behavior: 'smooth' });
    }

    toggleScroll() {
        if (this.isScrolling) {
            this.stopAutoScroll();
        } else {
            this.startAutoScroll();
        }
    }

    startAutoScroll() {
        if (this.isScrolling) return;
        this.isScrolling = true;
        this.scrollInterval = setInterval(() => {
            window.scrollBy({ top: this.scrollSpeed / 10, behavior: 'auto' });
        }, 50);
    }

    stopAutoScroll() {
        this.isScrolling = false;
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }
    }

    resetScroll() {
        this.stopAutoScroll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setFontSize(size) {
        this.fontSize = size;
        this.contentElement.style.fontSize = `${size}px`;
        this.fontSizeDisplay.textContent = `${size}px`;
        this.saveSettings();
    }

    setLineHeight(height) {
        this.contentElement.style.lineHeight = height;
    }

    setScrollSpeed(speed) {
        this.scrollSpeed = speed;
        if (this.isScrolling) {
            this.stopAutoScroll();
            this.startAutoScroll();
        }
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.scrollUp();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.scrollDown();
                    break;
                case ' ':
                    e.preventDefault();
                    this.toggleScroll();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.increaseFontSize();
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    this.decreaseFontSize();
                    break;
            }
        });
    }

    setupFontControls() {
        this.fontIncreaseBtn.addEventListener('click', () => this.increaseFontSize());
        this.fontDecreaseBtn.addEventListener('click', () => this.decreaseFontSize());
    }

    increaseFontSize() {
        const newSize = Math.min(this.fontSize + 2, 72);
        this.setFontSize(newSize);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'fontSize', size: newSize }));
        }
    }

    decreaseFontSize() {
        const newSize = Math.max(this.fontSize - 2, 12);
        this.setFontSize(newSize);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'fontSize', size: newSize }));
        }
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.connectionStatus.classList.remove('disconnected');
            this.connectionStatus.classList.add('connected');
            this.statusText.textContent = '已连接';
        } else {
            this.connectionStatus.classList.remove('connected');
            this.connectionStatus.classList.add('disconnected');
            this.statusText.textContent = '未连接';
        }
    }

    saveSettings() {
        const settings = {
            fontSize: this.fontSize,
            content: this.content
        };
        localStorage.setItem('teleprompter-settings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('teleprompter-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.setFontSize(settings.fontSize || 24);
            if (settings.content) {
                this.updateContent(settings.content);
            }
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new TeleprompterDisplay();
});

