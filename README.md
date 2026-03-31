# BAS - Brainstorm AI System

多AI协作头脑风暴系统 - 让多个AI专家协同工作，为你的项目提供多角度的思考和建议。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg)
![Tech](https://img.shields.io/badge/tech-Vanilla%20JS-green.svg)

## ✨ 功能特性

### 🎯 三种协作模式

1. **⚡ 同步思考模式**
   - 所有AI同时接收问题并独立回答
   - 适合快速收集多方观点
   - 各AI之间互不干扰

2. **🔄 轮流接力模式**
   - AI按顺序依次回答
   - 后一个AI可以看到前面所有AI的回复
   - 实现深度接力思考

3. **@ 指定回答模式**
   - 使用 `@AI名称` 指定特定AI回答
   - AI回复中可@其他AI触发连锁反应
   - 适合精准控制和引导讨论方向

### 🚀 核心功能

- **流式输出**: AI回答实时显示，带有"正在输入..."动画
- **@提及提示**: 输入@自动显示AI角色下拉列表
- **本地记忆**: 所有配置自动保存到浏览器 localStorage
- **自定义参数**: 支持设置 temperature 和 max_tokens
- **可扩展角色**: 自由添加、删除、排序AI角色
- **响应式设计**: 适配桌面和移动设备

## 📁 项目结构

```
BAS/
├── index.html                 # 导航主页
├── simultaneous.html          # 同步思考模式
├── sequential.html            # 轮流接力模式
├── directed.html              # 指定@回答模式
├── css/
│   └── style.css              # 全局样式
├── js/
│   ├── config.js              # 配置管理 + 本地存储
│   ├── api.js                 # OpenAI API封装
│   ├── ui.js                  # UI渲染引擎
│   ├── mode-simultaneous.js   # 同步模式逻辑
│   ├── mode-sequential.js     # 轮流模式逻辑
│   └── mode-directed.js       # 指定@模式逻辑
├── .gitignore                 # Git忽略文件
├── LICENSE                    # MIT许可证
└── README.md                  # 项目说明
```

## 🚀 快速开始

### 方式一：直接打开（最简单）

1. 克隆或下载本项目
2. 直接用浏览器打开 `index.html`
3. 选择一种协作模式开始使用

### 方式二：本地服务器（推荐）

```bash
# 进入项目目录
cd BAS

# 使用 Python 启动本地服务器
python -m http.server 8080

# 或使用 Node.js
npx serve

# 然后访问 http://localhost:8080
```

## ⚙️ 配置说明

### 首次使用

1. 打开任意模式页面
2. 点击左侧AI配置面板的展开按钮（▼）
3. 填写以下信息：
   - **API地址**: 你的OpenAI兼容API地址
   - **API密钥**: 你的API Key
   - **模型名称**: 如 `gpt-4`, `deepseek-chat` 等
   - **温度**: 控制回答的创造性（0-2，默认0.7）
   - **Max Tokens**: 最大输出长度（100-16000，默认4000）

### 预设AI角色

系统预设了4个协作角色：

| 角色 | 职责 |
|------|------|
| **项目总负责人** | 统筹全局，协调各方，给出最终方案 |
| **实验设计** | 设计具体、严谨的实验方案 |
| **理论整理** | 构建理论框架，确保逻辑自洽 |
| **文献搜索** | 提供背景资料和学术动态 |

### 添加自定义AI角色

1. 点击左侧面板底部的"添加新AI角色"
2. 输入角色名称
3. 配置API参数和系统提示词
4. 点击展开按钮编辑详细信息

## 💡 使用技巧

### @提及功能

在输入框中输入 `@` 会显示所有可用AI角色：
- 继续输入可筛选角色
- 使用 ↑↓ 键选择
- 按 Enter 或 Tab 确认
- 按 Esc 关闭

### 连锁反应（@模式）

在AI的系统提示词中说明：
```
如果需要其他专家协助，请在回复中使用 @角色名称 来呼叫他们。
例如："@文献搜索 请查找相关资料"
```

### 防死循环

- 点击"停止生成"按钮可随时中断
- 支持 AbortController 中断网络请求

## 🔧 API兼容性

本项目使用标准的 OpenAI API 格式：

```
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "model": "gpt-4",
  "messages": [...],
  "temperature": 0.7,
  "max_tokens": 4000,
  "stream": true
}
```

支持的API提供商：
- OpenAI
- DeepSeek
- 其他OpenAI兼容API

## ⚠️ 注意事项

1. **跨域问题**: 纯前端直接调用某些API可能遇到CORS限制，建议：
   - 使用支持CORS的API代理
   - 或使用浏览器插件临时解除跨域限制
   - 本地开发时可用本地服务器

2. **数据安全**: API密钥存储在浏览器 localStorage 中，请注意：
   - 不要在公共电脑上保存敏感密钥
   - 定期清理浏览器数据

3. **Token消耗**: 多AI同时调用会消耗更多Token，请注意API额度

## 🛠️ 技术栈

- **前端**: 原生 HTML5 + CSS3 + JavaScript (ES6+)
- **存储**: Browser localStorage
- **API**: OpenAI Compatible REST API
- **样式**: CSS Variables + Flexbox

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证开源。

## 🙏 致谢

感谢所有为这个项目提供建议和反馈的用户。

---

**Enjoy Brainstorming with AI! 🚀**
