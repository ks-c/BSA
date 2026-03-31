# BSA - Brainstorm AI System

多AI协作头脑风暴系统 - 让多个AI专家协同工作，提供多角度的思考和建议。

## 项目简介

BSA 是一个纯前端的多AI协作系统，支持三种不同的AI协作模式。无需后端服务器，直接在浏览器中运行，通过 Fetch API 调用兼容 OpenAI 格式的接口。

## 功能特性

### 三种协作模式

1. **同步思考模式** ⚡
   - 所有AI同时接收问题并独立回答
   - 先返回先显示，互不干扰
   - 适合快速收集多方观点

2. **轮流接力模式** 🔄
   - AI按顺序依次响应
   - 后一个AI可以看到之前所有AI的回复
   - 适合深度接力思考

3. **指定@回答模式** @
   - 使用 `@AI名称` 指定特定AI回答
   - AI回复中可@其他AI触发连锁反应
   - 适合精准控制和引导讨论方向

### 核心功能

- ✅ **流式输出** - AI回答实时显示，带有"正在输入..."提示
- ✅ **@提及提示** - 输入@自动显示AI角色下拉列表
- ✅ **本地记忆** - 配置和对话历史自动保存到 localStorage
- ✅ **自定义参数** - 支持设置 temperature 和 max_tokens
- ✅ **角色管理** - 可添加、删除、排序AI角色
- ✅ **参数配置** - 每个AI独立配置API地址、密钥、模型等

## 预设AI角色

系统预设4个默认AI角色：

| 角色 | 职责 |
|------|------|
| **项目总负责人** | 统筹全局，协调各方工作，汇总意见给出最终方案 |
| **实验设计** | 将理论转化为具体、严谨的实验方案 |
| **理论整理** | 构建理论框架，确保逻辑自洽 |
| **文献搜索** | 提供背景资料、研究案例和学术动态 |

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/ks-c/BSA.git
cd BSA
```

### 2. 打开项目

直接用浏览器打开 `index.html` 文件即可使用。

```bash
# 或者使用简单的HTTP服务器
python -m http.server 8000
# 然后访问 http://localhost:8000
```

### 3. 配置AI

1. 选择一种协作模式
2. 在左侧配置面板中设置AI的API地址、密钥和模型
3. 点击启用开关激活AI
4. 开始对话！

## 使用说明

### 基本操作

- **发送消息**：在输入框输入内容，按 Enter 发送
- **换行**：Shift + Enter
- **@提及**：输入 `@` 后显示AI角色列表，选择或继续输入名称
- **停止生成**：点击"停止生成"按钮中断AI回复

### AI配置

点击AI配置项的展开按钮(▼)可以：
- 修改AI名称
- 设置API地址、密钥、模型
- 调整温度(Temperature)和Max Tokens
- 编辑系统提示词(System Prompt)
- 使用上移/下移按钮调整顺序

### 添加/删除AI

- **添加**：点击面板底部的"添加新AI角色"按钮
- **删除**：点击AI配置项右上角的 × 按钮

## API配置示例

### OpenAI
```
API地址: https://api.openai.com/v1/chat/completions
API密钥: sk-...
模型: gpt-4 或 gpt-3.5-turbo
```

### DeepSeek
```
API地址: https://api.deepseek.com/v1/chat/completions
API密钥: sk-...
模型: deepseek-chat
```

### 其他兼容OpenAI格式的API
```
API地址: https://your-api-endpoint/v1/chat/completions
API密钥: your-api-key
模型: your-model-name
```

## 项目结构

```
BSA/
├── index.html              # 导航主页
├── simultaneous.html       # 同步思考模式
├── sequential.html         # 轮流接力模式
├── directed.html           # 指定@回答模式
├── css/
│   └── style.css           # 全局样式
├── js/
│   ├── config.js           # 配置管理 + 本地存储
│   ├── api.js              # API通信（流式输出）
│   ├── ui.js               # UI渲染 + 交互
│   ├── mode-simultaneous.js # 同步模式逻辑
│   ├── mode-sequential.js   # 轮流模式逻辑
│   └── mode-directed.js     # @模式逻辑
├── README.md               # 项目说明
└── LICENSE                 # 许可证
```

## 技术栈

- **前端**: 原生 HTML5 + CSS3 + JavaScript (ES6+)
- **存储**: 浏览器 localStorage
- **API**: Fetch API + OpenAI 兼容格式
- **样式**: CSS Variables + Flexbox

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 13.1+

## 注意事项

1. **跨域问题**: 纯前端直接调用某些API可能遇到CORS限制，建议使用支持跨域的代理或浏览器插件
2. **数据安全**: API密钥存储在浏览器本地，请勿在公共设备上使用
3. **Token限制**: 根据API提供商的限制调整 max_tokens 参数

## 开发计划

- [ ] 支持更多API格式（Claude、Gemini等）
- [ ] 对话历史导出/导入
- [ ] 多语言支持
- [ ] 深色模式
- [ ] 移动端优化

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 贡献

欢迎提交 Issue 和 Pull Request！

## 作者

ks-c

---

如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！