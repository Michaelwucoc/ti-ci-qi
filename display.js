// 显示页面脚本
class TeleprompterDisplay {
    constructor() {
        this.content = '';
        this.fontSize = 120;
        this.lineHeight = 2.5;
        this.scrollSpeed = 30;
        this.isScrolling = false;
        this.scrollInterval = null;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.wordWrap = true; // 默认启用自动换行

        this.init();
    }

    init() {
        this.setupElements();
        this.setupWebSocket();
        this.setupKeyboardControls();
        this.setupFontControls();
        this.setupScrollTracking();
        this.setupControlsAutoHide();
        this.loadSettings();
        // 初始化时应用默认的自动换行设置
        this.setWordWrap(this.wordWrap);
    }

    setupElements() {
        this.contentElement = document.getElementById('teleprompter-content');
        this.fontSizeDisplay = document.getElementById('font-size-display');
        this.connectionStatus = document.getElementById('connection-status');
        this.statusText = document.getElementById('status-text');
        this.fontIncreaseBtn = document.getElementById('font-increase');
        this.fontDecreaseBtn = document.getElementById('font-decrease');
        this.displayControls = document.querySelector('.display-controls');
        this.hideControlsTimer = null;
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
                // 连接建立后立即发送一次滚动位置
                setTimeout(() => {
                    this.sendScrollPosition();
                }, 500);
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
            case 'wordWrap':
                this.setWordWrap(message.enabled);
                break;
        }
    }

    updateContent(content) {
        this.content = content;
        const paragraphs = content.split('\n').filter(p => p.trim());
        this.contentElement.innerHTML = paragraphs.map(p => `<p>${this.escapeHtml(p)}</p>`).join('');
        this.saveSettings();
        
        // 内容更新后发送滚动位置
        setTimeout(() => {
            if (this.sendScrollPosition) {
                this.sendScrollPosition();
            }
        }, 300);
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
            case 'downLine':
                this.scrollDownLine();
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

    scrollDownLine() {
        // 计算一行的高度：字号 * 行高
        const lineHeight = this.fontSize * this.lineHeight;
        window.scrollBy({ top: lineHeight, behavior: 'smooth' });
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
        this.lineHeight = height;
        this.contentElement.style.lineHeight = height;
    }

    setWordWrap(enabled) {
        this.wordWrap = enabled;
        if (enabled) {
            this.contentElement.style.wordWrap = 'break-word';
            this.contentElement.style.wordBreak = 'break-word';
            this.contentElement.style.whiteSpace = 'normal';
            this.contentElement.style.overflowWrap = 'break-word';
        } else {
            this.contentElement.style.whiteSpace = 'nowrap';
            this.contentElement.style.wordWrap = 'normal';
            this.contentElement.style.wordBreak = 'normal';
            this.contentElement.style.overflowWrap = 'normal';
        }
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
        const newSize = Math.min(this.fontSize + 4, 240);
        this.setFontSize(newSize);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'fontSize', size: newSize }));
        }
    }

    decreaseFontSize() {
        const newSize = Math.max(this.fontSize - 4, 80);
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
            this.setFontSize(settings.fontSize || 120);
            if (settings.content) {
                this.updateContent(settings.content);
            }
        } else {
            // 设置默认字号
            this.setFontSize(120);
        }
    }

    setupScrollTracking() {
        // 定期发送滚动位置到服务器
        let lastScrollTop = -1;
        
        // 将sendScrollPosition方法绑定到this，以便在onopen中调用
        this.sendScrollPosition = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = window.innerHeight;
            
            // 只有当滚动位置变化超过5px时才发送，减少通信频率
            if (Math.abs(scrollTop - lastScrollTop) > 5 || scrollTop === 0) {
                lastScrollTop = scrollTop;
                
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    const message = {
                        type: 'scrollPosition',
                        scrollTop: scrollTop,
                        scrollHeight: scrollHeight,
                        clientHeight: clientHeight
                    };
                    this.ws.send(JSON.stringify(message));
                    console.log('发送滚动位置:', message);
                } else {
                    console.warn('WebSocket未连接，无法发送滚动位置');
                }
            }
        };

        // 使用节流，每100ms检查一次
        let scrollTimer = null;
        window.addEventListener('scroll', () => {
            if (scrollTimer) return;
            scrollTimer = setTimeout(() => {
                this.sendScrollPosition();
                scrollTimer = null;
            }, 100);
        }, { passive: true });

        // 页面加载完成后也发送一次
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (this.sendScrollPosition) {
                    this.sendScrollPosition();
                }
            }, 500);
        });
    }

    setupControlsAutoHide() {
        if (!this.displayControls) return;

        // 鼠标移动到右下角区域时显示控制
        const showControls = () => {
            if (this.hideControlsTimer) {
                clearTimeout(this.hideControlsTimer);
                this.hideControlsTimer = null;
            }
            this.displayControls.classList.add('visible');
        };

        // 鼠标移开时延迟隐藏
        const hideControls = () => {
            if (this.hideControlsTimer) {
                clearTimeout(this.hideControlsTimer);
            }
            this.hideControlsTimer = setTimeout(() => {
                this.displayControls.classList.remove('visible');
            }, 2000); // 2秒后隐藏
        };

        // 监听鼠标移动到右下角区域（右下角200x200像素区域）
        document.addEventListener('mousemove', (e) => {
            const rightEdge = window.innerWidth - 200;
            const bottomEdge = window.innerHeight - 200;
            
            if (e.clientX >= rightEdge && e.clientY >= bottomEdge) {
                showControls();
            } else {
                // 如果鼠标在控制面板上，保持显示
                if (this.displayControls && this.displayControls.matches(':hover')) {
                    showControls();
                } else {
                    hideControls();
                }
            }
        });

        // 鼠标悬停在控制面板上时保持显示
        this.displayControls.addEventListener('mouseenter', showControls);
        this.displayControls.addEventListener('mouseleave', hideControls);

        // 初始状态：隐藏控制面板
        this.displayControls.classList.remove('visible');
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new TeleprompterDisplay();
});

