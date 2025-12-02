// 控制页面脚本
class TeleprompterControl {
    constructor() {
        this.ws = null;
        this.voiceRecognition = null;
        this.isVoiceEnabled = false;
        this.autoScroll = false;
        this.scrollSpeed = 30;
        this.fontSize = 24;
        this.lineHeight = 1.5;
        this.content = '';

        this.init();
    }

    init() {
        this.setupElements();
        this.setupWebSocket();
        this.setupEventListeners();
        this.loadContent();
    }

    setupElements() {
        // 输入元素
        this.contentInput = document.getElementById('content-input');
        this.updateContentBtn = document.getElementById('update-content');
        this.clearContentBtn = document.getElementById('clear-content');
        
        // 滚动控制
        this.scrollSpeedSlider = document.getElementById('scroll-speed');
        this.speedDisplay = document.getElementById('speed-display');
        this.autoScrollCheckbox = document.getElementById('auto-scroll');
        this.scrollUpBtn = document.getElementById('scroll-up');
        this.scrollDownBtn = document.getElementById('scroll-down');
        this.scrollPauseBtn = document.getElementById('scroll-pause');
        this.scrollResetBtn = document.getElementById('scroll-reset');
        
        // 字体控制
        this.fontSizeSlider = document.getElementById('font-size');
        this.fontSizeDisplay = document.getElementById('font-size-display');
        this.lineHeightSlider = document.getElementById('line-height');
        this.lineHeightDisplay = document.getElementById('line-height-display');
        
        // 语音控制
        this.voiceRecognitionCheckbox = document.getElementById('voice-recognition');
        this.voiceStatus = document.getElementById('voice-status');
        this.startVoiceBtn = document.getElementById('start-voice');
        this.stopVoiceBtn = document.getElementById('stop-voice');
        
        // 预览
        this.previewContent = document.getElementById('preview-content');
        
        // 连接状态
        this.connectionStatus = document.getElementById('control-connection-status');
        this.statusText = document.getElementById('control-status-text');
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
                console.log('控制台WebSocket连接已建立');
                this.updateConnectionStatus(true);
                this.ws.send(JSON.stringify({ type: 'register', role: 'control' }));
                // 发送当前设置
                this.syncSettings();
            };

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            };

            this.ws.onclose = () => {
                console.log('控制台WebSocket连接已关闭');
                this.updateConnectionStatus(false);
                setTimeout(() => this.connectWebSocket(url), 2000);
            };

            this.ws.onerror = (error) => {
                console.error('控制台WebSocket错误:', error);
                this.updateConnectionStatus(false);
            };
        } catch (error) {
            console.error('WebSocket连接失败:', error);
            this.updateConnectionStatus(false);
        }
    }

    handleMessage(message) {
        // 处理来自服务器的消息
        if (message.type === 'content') {
            this.updatePreview(message.content);
        }
    }

    setupEventListeners() {
        // 内容编辑
        this.updateContentBtn.addEventListener('click', () => this.updateContent());
        this.clearContentBtn.addEventListener('click', () => this.clearContent());
        
        // 滚动控制
        this.scrollSpeedSlider.addEventListener('input', (e) => {
            this.scrollSpeed = parseInt(e.target.value);
            this.speedDisplay.textContent = this.scrollSpeed;
            this.sendMessage({ type: 'scrollSpeed', speed: this.scrollSpeed });
        });
        
        this.autoScrollCheckbox.addEventListener('change', (e) => {
            this.autoScroll = e.target.checked;
            this.sendMessage({ type: 'autoScroll', enabled: this.autoScroll });
        });
        
        this.scrollUpBtn.addEventListener('click', () => {
            this.sendMessage({ type: 'scroll', action: 'up' });
        });
        
        this.scrollDownBtn.addEventListener('click', () => {
            this.sendMessage({ type: 'scroll', action: 'down' });
        });
        
        this.scrollPauseBtn.addEventListener('click', () => {
            this.sendMessage({ type: 'scroll', action: 'pause' });
        });
        
        this.scrollResetBtn.addEventListener('click', () => {
            this.sendMessage({ type: 'scroll', action: 'reset' });
        });
        
        // 字体控制
        this.fontSizeSlider.addEventListener('input', (e) => {
            this.fontSize = parseInt(e.target.value);
            this.fontSizeDisplay.textContent = `${this.fontSize}px`;
            this.sendMessage({ type: 'fontSize', size: this.fontSize });
            this.updatePreview();
        });
        
        this.lineHeightSlider.addEventListener('input', (e) => {
            this.lineHeight = parseFloat(e.target.value);
            this.lineHeightDisplay.textContent = this.lineHeight;
            this.sendMessage({ type: 'lineHeight', height: this.lineHeight });
            this.updatePreview();
        });
        
        // 语音识别
        this.voiceRecognitionCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.initVoiceRecognition();
            } else {
                this.stopVoiceRecognition();
            }
        });
        
        this.startVoiceBtn.addEventListener('click', () => {
            this.startVoiceRecognition();
        });
        
        this.stopVoiceBtn.addEventListener('click', () => {
            this.stopVoiceRecognition();
        });
        
        // 内容输入变化时更新预览
        this.contentInput.addEventListener('input', () => {
            this.updatePreview();
        });
    }

    updateContent() {
        this.content = this.contentInput.value;
        this.sendMessage({ type: 'content', content: this.content });
        this.updatePreview();
        this.saveContent();
    }

    clearContent() {
        this.contentInput.value = '';
        this.content = '';
        this.sendMessage({ type: 'content', content: '' });
        this.updatePreview();
        this.saveContent();
    }

    updatePreview() {
        const content = this.contentInput.value || this.content;
        const paragraphs = content.split('\n').filter(p => p.trim());
        this.previewContent.innerHTML = paragraphs.map(p => `<p>${this.escapeHtml(p)}</p>`).join('');
        this.previewContent.style.fontSize = `${this.fontSize}px`;
        this.previewContent.style.lineHeight = this.lineHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    initVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('您的浏览器不支持语音识别功能');
            this.voiceRecognitionCheckbox.checked = false;
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.voiceRecognition = new SpeechRecognition();
        this.voiceRecognition.lang = 'zh-CN';
        this.voiceRecognition.continuous = true;
        this.voiceRecognition.interimResults = false;

        this.voiceRecognition.onstart = () => {
            this.isVoiceEnabled = true;
            this.voiceStatus.textContent = '正在识别...';
            this.voiceStatus.style.color = '#4CAF50';
        };

        this.voiceRecognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            // 检测关键词触发滚动
            const keywords = ['下', '向下', '下一页', '继续', 'next', 'down'];
            if (keywords.some(keyword => transcript.includes(keyword))) {
                this.sendMessage({ type: 'scroll', action: 'down' });
            }
        };

        this.voiceRecognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            this.voiceStatus.textContent = `错误: ${event.error}`;
            this.voiceStatus.style.color = '#f44336';
        };

        this.voiceRecognition.onend = () => {
            if (this.isVoiceEnabled) {
                // 自动重新开始
                this.voiceRecognition.start();
            } else {
                this.voiceStatus.textContent = '已停止';
                this.voiceStatus.style.color = '#666';
            }
        };
    }

    startVoiceRecognition() {
        if (this.voiceRecognition && !this.isVoiceEnabled) {
            this.voiceRecognition.start();
            this.voiceRecognitionCheckbox.checked = true;
        }
    }

    stopVoiceRecognition() {
        this.isVoiceEnabled = false;
        if (this.voiceRecognition) {
            this.voiceRecognition.stop();
        }
        this.voiceRecognitionCheckbox.checked = false;
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket未连接，无法发送消息');
        }
    }

    syncSettings() {
        // 同步所有设置到显示页面
        this.sendMessage({ type: 'fontSize', size: this.fontSize });
        this.sendMessage({ type: 'lineHeight', height: this.lineHeight });
        this.sendMessage({ type: 'scrollSpeed', speed: this.scrollSpeed });
        if (this.content) {
            this.sendMessage({ type: 'content', content: this.content });
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

    saveContent() {
        localStorage.setItem('teleprompter-content', this.content);
    }

    loadContent() {
        const saved = localStorage.getItem('teleprompter-content');
        if (saved) {
            this.content = saved;
            this.contentInput.value = saved;
            this.updatePreview();
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new TeleprompterControl();
});

