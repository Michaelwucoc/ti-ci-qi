// 控制页面脚本
class TeleprompterControl {
    constructor() {
        this.ws = null;
        this.voiceRecognition = null;
        this.isVoiceEnabled = false;
        this.autoScroll = false;
        this.scrollSpeed = 30;
        this.fontSize = 48;
        this.lineHeight = 1.5;
        this.content = '';
        this.currentScrollInfo = null;
        this.previewScale = 0.3; // 预览缩放比例（30%）
        this.wordWrap = true; // 默认启用自动换行
        this.caches = {}; // 缓存数据

        this.init();
    }

    init() {
        this.setupElements();
        this.setupWebSocket();
        this.setupEventListeners();
        this.loadCaches();
        this.updateCacheList();
        this.loadContent();
        this.loadSampleFiles();
    }

    setupElements() {
        // 输入元素
        this.contentInput = document.getElementById('content-input');
        this.updateContentBtn = document.getElementById('update-content');
        this.clearContentBtn = document.getElementById('clear-content');
        
        // 内置文章选择
        this.sampleFilesSelect = document.getElementById('sample-files');
        this.loadSampleBtn = document.getElementById('load-sample');
        
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
        this.wordWrapCheckbox = document.getElementById('word-wrap');
        
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
        
        // 缓存控制
        this.cacheNameInput = document.getElementById('cache-name');
        this.saveCacheBtn = document.getElementById('save-cache');
        this.loadCacheBtn = document.getElementById('load-cache');
        this.cacheList = document.getElementById('cache-list');
        this.deleteCacheBtn = document.getElementById('delete-cache');
        this.renameCacheBtn = document.getElementById('rename-cache');
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
        } else if (message.type === 'scrollPosition') {
            this.updateScrollIndicator(message);
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
        
        this.wordWrapCheckbox.addEventListener('change', (e) => {
            this.wordWrap = e.target.checked;
            this.sendMessage({ type: 'wordWrap', enabled: this.wordWrap });
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
        
        // 内置文章加载
        this.loadSampleBtn.addEventListener('click', () => this.loadSampleFile());
        this.sampleFilesSelect.addEventListener('change', () => {
            // 选择文件后自动加载
            if (this.sampleFilesSelect.value) {
                this.loadSampleFile();
            }
        });
        
        // 缓存控制
        this.saveCacheBtn.addEventListener('click', () => this.saveCache());
        this.loadCacheBtn.addEventListener('click', () => this.loadCache());
        this.deleteCacheBtn.addEventListener('click', () => this.deleteCache());
        this.renameCacheBtn.addEventListener('click', () => this.renameCache());
        this.cacheList.addEventListener('change', () => {
            const selectedName = this.cacheList.value;
            if (selectedName) {
                this.cacheNameInput.value = selectedName;
            }
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
        if (paragraphs.length === 0) {
            this.previewContent.innerHTML = '<p>预览内容将显示在这里</p>';
        } else {
            this.previewContent.innerHTML = paragraphs.map(p => `<p>${this.escapeHtml(p)}</p>`).join('');
        }
        
        // 应用缩放比例，使预览显示为缩略图（通过字号缩放）
        const scaledFontSize = this.fontSize * this.previewScale;
        this.previewContent.style.fontSize = `${scaledFontSize}px`;
        this.previewContent.style.lineHeight = this.lineHeight;
        this.previewContent.style.textAlign = 'left';
        this.previewContent.style.transform = 'none'; // 不使用transform，只用字号缩放
        
        // 应用自动换行设置
        if (this.wordWrap) {
            this.previewContent.style.wordWrap = 'break-word';
            this.previewContent.style.wordBreak = 'break-word';
            this.previewContent.style.whiteSpace = 'normal';
            this.previewContent.style.overflowWrap = 'break-word';
        } else {
            this.previewContent.style.whiteSpace = 'nowrap';
            this.previewContent.style.wordWrap = 'normal';
            this.previewContent.style.wordBreak = 'normal';
            this.previewContent.style.overflowWrap = 'normal';
        }
        
        // 等待DOM更新后更新滚动指示器
        setTimeout(() => {
            if (this.currentScrollInfo) {
                this.updateScrollIndicatorVisual();
            }
        }, 50);
    }

    updateScrollIndicator(scrollInfo) {
        console.log('收到滚动位置信息:', scrollInfo);
        this.currentScrollInfo = scrollInfo;
        this.updateScrollIndicatorVisual();
    }

    updateScrollIndicatorVisual() {
        if (!this.currentScrollInfo || !this.previewContent) return;
        
        const { scrollTop, scrollHeight, clientHeight } = this.currentScrollInfo;
        
        // 获取预览内容的实际尺寸（缩放前）
        const previewScrollHeight = this.previewContent.scrollHeight;
        
        if (previewScrollHeight === 0 || scrollHeight === 0) {
            console.log('预览高度为0，跳过更新', { previewScrollHeight, scrollHeight });
            return;
        }
        
        // 计算显示页面和预览页面的比例关系
        // 显示页面的scrollHeight对应预览页面的scrollHeight（已缩放）
        // 所以位置需要按比例映射
        const scaleRatio = previewScrollHeight / scrollHeight;
        
        // 计算高亮区域在预览中的位置（基于显示页面的实际位置）
        // 高亮区域对应显示页面的视口位置
        const highlightTop = scrollTop * scaleRatio;
        const highlightHeight = clientHeight * scaleRatio;
        
        // 移除旧的高亮指示器
        const existingIndicator = this.previewContent.querySelector('.scroll-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // 确保预览容器是相对定位
        if (getComputedStyle(this.previewContent).position === 'static') {
            this.previewContent.style.position = 'relative';
        }
        
        // 创建高亮指示器（在缩放后的坐标系中）
        const indicator = document.createElement('div');
        indicator.className = 'scroll-indicator';
        indicator.style.position = 'absolute';
        indicator.style.left = '0';
        indicator.style.right = '0';
        indicator.style.top = `${highlightTop}px`;
        indicator.style.height = `${highlightHeight}px`;
        indicator.style.border = '2px solid #4CAF50';
        indicator.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
        indicator.style.pointerEvents = 'none';
        indicator.style.boxSizing = 'border-box';
        indicator.style.zIndex = '10';
        indicator.style.transition = 'top 0.1s ease, height 0.1s ease';
        
        this.previewContent.appendChild(indicator);
        
        // 获取预览容器的可见区域
        const previewVisibleHeight = this.previewContent.clientHeight;
        const previewScrollTop = this.previewContent.scrollTop;
        
        // 自动滚动预览，使高亮区域始终跟随显示页面的滚动
        // 计算高亮区域的中心位置
        const indicatorCenter = highlightTop + highlightHeight / 2;
        // 计算预览可见区域的中心位置
        const previewVisibleCenter = previewScrollTop + previewVisibleHeight / 2;
        
        // 计算目标滚动位置，使高亮区域中心对齐到预览可见区域中心
        const targetScrollTop = indicatorCenter - previewVisibleHeight / 2;
        
        // 只有当目标位置与当前位置差距较大时才滚动（避免频繁滚动）
        if (Math.abs(previewScrollTop - targetScrollTop) > 10) {
            // 使用平滑滚动，让高亮区域跟随显示页面
            this.previewContent.scrollTo({
                top: Math.max(0, Math.min(
                    previewScrollHeight - previewVisibleHeight,
                    targetScrollTop
                )),
                behavior: 'smooth'
            });
        }
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
        this.sendMessage({ type: 'wordWrap', enabled: this.wordWrap });
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

    // 缓存管理功能
    loadCaches() {
        const saved = localStorage.getItem('teleprompter-caches');
        if (saved) {
            try {
                this.caches = JSON.parse(saved);
            } catch (e) {
                console.error('加载缓存失败:', e);
                this.caches = {};
            }
        } else {
            this.caches = {};
        }
    }

    saveCaches() {
        localStorage.setItem('teleprompter-caches', JSON.stringify(this.caches));
    }

    updateCacheList() {
        this.cacheList.innerHTML = '<option value="">-- 选择缓存 --</option>';
        const cacheNames = Object.keys(this.caches).sort();
        cacheNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.cacheList.appendChild(option);
        });
    }

    saveCache() {
        const cacheName = this.cacheNameInput.value.trim();
        if (!cacheName) {
            alert('请输入缓存名称');
            return;
        }

        // 保存当前所有设置和内容
        const cacheData = {
            name: cacheName,
            content: this.contentInput.value,
            fontSize: this.fontSize,
            lineHeight: this.lineHeight,
            scrollSpeed: this.scrollSpeed,
            autoScroll: this.autoScroll,
            wordWrap: this.wordWrap,
            savedAt: new Date().toISOString()
        };

        this.caches[cacheName] = cacheData;
        this.saveCaches();
        this.updateCacheList();
        
        // 选中刚保存的缓存
        this.cacheList.value = cacheName;
        
        alert(`缓存 "${cacheName}" 已保存！`);
    }

    loadCache() {
        const cacheName = this.cacheList.value || this.cacheNameInput.value.trim();
        if (!cacheName) {
            alert('请选择或输入缓存名称');
            return;
        }

        const cacheData = this.caches[cacheName];
        if (!cacheData) {
            alert(`缓存 "${cacheName}" 不存在`);
            return;
        }

        // 确认是否覆盖当前内容
        if (this.contentInput.value && !confirm('加载缓存将覆盖当前内容，是否继续？')) {
            return;
        }

        // 恢复内容
        this.content = cacheData.content || '';
        this.contentInput.value = this.content;
        
        // 恢复设置
        this.fontSize = cacheData.fontSize || 48;
        this.lineHeight = cacheData.lineHeight || 1.5;
        this.scrollSpeed = cacheData.scrollSpeed || 30;
        this.autoScroll = cacheData.autoScroll || false;
        this.wordWrap = cacheData.wordWrap !== undefined ? cacheData.wordWrap : true;

        // 更新UI
        this.fontSizeSlider.value = this.fontSize;
        this.fontSizeDisplay.textContent = `${this.fontSize}px`;
        this.lineHeightSlider.value = this.lineHeight;
        this.lineHeightDisplay.textContent = this.lineHeight;
        this.scrollSpeedSlider.value = this.scrollSpeed;
        this.speedDisplay.textContent = this.scrollSpeed;
        this.autoScrollCheckbox.checked = this.autoScroll;
        this.wordWrapCheckbox.checked = this.wordWrap;
        this.cacheNameInput.value = cacheName;

        // 同步到显示页面
        this.updateContent();
        this.syncSettings();

        alert(`缓存 "${cacheName}" 已加载！`);
    }

    deleteCache() {
        const cacheName = this.cacheList.value || this.cacheNameInput.value.trim();
        if (!cacheName) {
            alert('请选择或输入要删除的缓存名称');
            return;
        }

        if (!this.caches[cacheName]) {
            alert(`缓存 "${cacheName}" 不存在`);
            return;
        }

        if (!confirm(`确定要删除缓存 "${cacheName}" 吗？此操作不可恢复。`)) {
            return;
        }

        delete this.caches[cacheName];
        this.saveCaches();
        this.updateCacheList();
        this.cacheNameInput.value = '';
        this.cacheList.value = '';
        
        alert(`缓存 "${cacheName}" 已删除`);
    }

    renameCache() {
        const oldName = this.cacheList.value || this.cacheNameInput.value.trim();
        if (!oldName) {
            alert('请选择或输入要重命名的缓存名称');
            return;
        }

        if (!this.caches[oldName]) {
            alert(`缓存 "${oldName}" 不存在`);
            return;
        }

        const newName = prompt(`请输入新的缓存名称（当前名称：${oldName}）:`, oldName);
        if (!newName || newName.trim() === '') {
            return;
        }

        const trimmedNewName = newName.trim();
        if (trimmedNewName === oldName) {
            return;
        }

        if (this.caches[trimmedNewName]) {
            alert(`缓存名称 "${trimmedNewName}" 已存在，请使用其他名称`);
            return;
        }

        // 重命名缓存
        this.caches[trimmedNewName] = this.caches[oldName];
        this.caches[trimmedNewName].name = trimmedNewName;
        delete this.caches[oldName];
        this.saveCaches();
        this.updateCacheList();
        this.cacheNameInput.value = trimmedNewName;
        this.cacheList.value = trimmedNewName;
        
        alert(`缓存已从 "${oldName}" 重命名为 "${trimmedNewName}"`);
    }

    // 加载 sample 文件列表
    async loadSampleFiles() {
        try {
            const response = await fetch('/api/samples');
            const data = await response.json();
            
            if (data.files && data.files.length > 0) {
                // 清空现有选项（保留第一个默认选项）
                this.sampleFilesSelect.innerHTML = '<option value="">-- 选择内置文章 --</option>';
                
                // 添加文件选项
                data.files.forEach(filename => {
                    const option = document.createElement('option');
                    option.value = filename;
                    option.textContent = filename.replace('.txt', '');
                    this.sampleFilesSelect.appendChild(option);
                });
            } else {
                // 如果没有文件，显示提示
                this.sampleFilesSelect.innerHTML = '<option value="">-- 暂无内置文章 --</option>';
            }
        } catch (error) {
            console.error('加载内置文章列表失败:', error);
            this.sampleFilesSelect.innerHTML = '<option value="">-- 加载失败 --</option>';
        }
    }

    // 加载选中的 sample 文件内容
    async loadSampleFile() {
        const filename = this.sampleFilesSelect.value;
        if (!filename) {
            alert('请先选择要加载的内置文章');
            return;
        }

        try {
            const response = await fetch(`/api/samples/${encodeURIComponent(filename)}`);
            const data = await response.json();
            
            if (data.error) {
                alert(`加载失败: ${data.error}`);
                return;
            }

            // 确认是否覆盖当前内容
            if (this.contentInput.value && !confirm('加载内置文章将覆盖当前内容，是否继续？')) {
                return;
            }

            // 加载内容
            this.content = data.content || '';
            this.contentInput.value = this.content;
            this.updatePreview();
            this.updateContent();
            
            alert(`已加载内置文章: ${data.filename}`);
        } catch (error) {
            console.error('加载内置文章失败:', error);
            alert(`加载失败: ${error.message}`);
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new TeleprompterControl();
});

