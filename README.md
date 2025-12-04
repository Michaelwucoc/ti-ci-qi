# 提词器应用

一个功能完整的提词器应用，支持远程控制、语音识别自动翻页、字号调节等功能。

## 功能特性

- ✅ **远程控制**：通过WebSocket实现管理页面和显示页面的实时同步
- ✅ **字号调节**：支持24px-120px字号调节
- ✅ **滚动控制**：支持手动和自动滚动，可调节滚动速度
- ✅ **语音识别**：支持语音识别自动翻页（说"下"、"向下"、"继续"等关键词触发）
- ✅ **快捷键支持**：显示页面支持键盘快捷键控制
- ✅ **内容预览**：管理页面实时预览显示效果
- ✅ **本地存储**：自动保存内容和设置
- ✅ **缓存管理**：支持保存/加载预设配置（包括设置、文稿和自定义名称），方便快速切换不同稿子
- ✅ **智能UI**：显示页面右下角控制面板自动隐藏，鼠标移入时显示
- ✅ **优化显示**：显示区域宽度优化，充分利用屏幕空间

## 安装和运行

### 前置要求：安装 Node.js

在运行本项目之前，您需要先安装 Node.js。以下是详细的安装步骤：

#### Windows 系统

1. **访问 Node.js 官网**
   - 打开浏览器，访问 [https://nodejs.org/](https://nodejs.org/)
   - 网站会自动检测您的操作系统并推荐合适的版本

2. **下载安装包**
   - 推荐下载 **LTS（长期支持版本）**，这是最稳定的版本
   - 点击绿色的 "LTS" 按钮下载 Windows 安装程序（.msi 文件）

3. **运行安装程序**
   - 双击下载的 `.msi` 文件
   - 按照安装向导的提示进行操作
   - **重要**：确保勾选 "Add to PATH" 选项（通常默认已勾选）
   - 点击 "Install" 开始安装

4. **验证安装**
   - 打开命令提示符（CMD）或 PowerShell
   - 输入以下命令验证安装：
   ```bash
   node --version
   npm --version
   ```
   - 如果显示版本号（如 `v18.17.0` 和 `9.6.7`），说明安装成功

#### macOS 系统

**方法一：使用官方安装包（推荐）**

1. **访问 Node.js 官网**
   - 打开浏览器，访问 [https://nodejs.org/](https://nodejs.org/)
   - 点击 "macOS Installer" 下载 `.pkg` 文件

2. **运行安装程序**
   - 双击下载的 `.pkg` 文件
   - 按照安装向导完成安装

3. **验证安装**
   - 打开终端（Terminal）
   - 输入以下命令：
   ```bash
   node --version
   npm --version
   ```
   - 如果显示版本号，说明安装成功

**方法二：使用 Homebrew（适合有经验的用户）**

如果您已经安装了 Homebrew，可以使用以下命令：

```bash
brew install node
```

#### Linux 系统

**Ubuntu/Debian 系统：**

```bash
# 更新软件包列表
sudo apt update

# 安装 Node.js（包含 npm）
sudo apt install nodejs npm

# 验证安装
node --version
npm --version
```

**CentOS/RHEL 系统：**

```bash
# 安装 Node.js（包含 npm）
sudo yum install nodejs npm

# 验证安装
node --version
npm --version
```

**使用 NodeSource 安装最新版本（推荐）：**

```bash
# 对于 Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 对于 CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install -y nodejs
```

#### 验证安装

无论使用哪种系统，安装完成后都应该验证：

```bash
# 检查 Node.js 版本（应该显示 v14.0.0 或更高版本）
node --version

# 检查 npm 版本（Node.js 安装包自带 npm）
npm --version
```

如果两个命令都显示版本号，说明安装成功！

#### 常见问题

- **问题**：命令提示符显示 "node: command not found" 或 "npm: command not found"
  - **解决**：重新启动终端/命令提示符，或检查安装时是否勾选了 "Add to PATH" 选项

- **问题**：版本过旧
  - **解决**：访问 [nodejs.org](https://nodejs.org/) 下载最新版本，或使用包管理器更新

### 1. 安装项目依赖

安装完 Node.js 后，进入项目目录并安装依赖：

```bash
# 进入项目目录
cd ti-ci-qi

# 安装依赖
npm install
```

### 2. 启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

**注意**：如果您的系统没有安装 `nodemon`，开发模式可能无法使用。可以手动安装：
```bash
npm install -g nodemon
```

### 3. 访问应用

启动服务器后，在浏览器中访问：

- **管理控制台**：http://localhost:8080/control.html
- **显示页面**：http://localhost:8080/display.html

**提示**：确保防火墙允许 8080 端口的访问。

## 使用说明

### 管理控制台

1. **内容编辑**：在文本框中输入或粘贴提词器内容，每段用换行分隔
2. **滚动控制**：
   - 调节滚动速度滑块（1-100）
   - 勾选"自动滚动"启用自动滚动
   - 使用按钮手动控制：向上、向下、暂停、重置
3. **字体设置**：
   - 调节字号（12px-72px）
   - 调节行高（1.0-3.0）
4. **语音识别**：
   - 勾选"启用语音识别"
   - 点击"开始识别"按钮
   - 说出关键词（"下"、"向下"、"继续"、"next"、"down"）触发向下滚动
5. **缓存管理**：
   - 输入缓存名称，点击"保存缓存"保存当前设置和文稿
   - 从下拉列表选择缓存，点击"加载缓存"快速切换
   - 支持重命名和删除缓存，方便管理多个预设

### 显示页面快捷键

- `↑` 向上滚动
- `↓` 向下滚动
- `空格键` 暂停/继续自动滚动
- `+` 增大字号
- `-` 减小字号

### 显示页面UI说明

- **自动隐藏控制面板**：右下角的控制面板默认隐藏，鼠标移动到右下角区域或悬停在控制面板上时会自动显示
- **优化显示区域**：显示区域已优化，充分利用屏幕宽度，减少右侧空白

## 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **后端**：Node.js
- **通信**：WebSocket (ws库)
- **语音识别**：Web Speech API

## 浏览器兼容性

- Chrome/Edge（推荐，支持语音识别）
- Firefox
- Safari（语音识别支持有限）

## 注意事项

1. 语音识别功能需要HTTPS环境或localhost才能正常工作
2. 首次使用语音识别需要浏览器权限授权
3. 建议使用Chrome浏览器以获得最佳体验
4. 显示页面建议全屏显示以获得最佳效果

## 开发

项目结构：

```
ti-ci-qi/
├── display.html      # 显示页面
├── control.html      # 管理控制台
├── display.js        # 显示页面脚本
├── control.js        # 控制页面脚本
├── styles.css        # 样式文件
├── server.js         # WebSocket服务器
├── package.json      # 项目配置
└── README.md         # 说明文档
```

## 许可证

MIT

