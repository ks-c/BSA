/**
 * UI渲染模块 - ui.js
 * 负责DOM操作、消息渲染、配置面板交互等
 */

// 全局状态
let isGenerating = false;
let abortController = null;
// 存储正在流式输出的消息元素
const streamingMessages = new Map();

/**
 * 渲染AI配置面板
 * @param {Function} onConfigChange - 配置变更回调
 */
function renderAgentPanel(onConfigChange) {
    const container = document.getElementById('agentPanel');
    if (!container) return;

    const agents = window.ConfigModule.getAllAgents();
    
    let html = agents.map((agent, index) => `
        <div class="agent-config-item ${agent.isActive ? 'active' : 'inactive'}" data-agent-id="${agent.id}">
            <div class="agent-config-header">
                <div class="drag-handle" title="拖动排序">⋮⋮</div>
                <div class="agent-config-info" onclick="toggleAgentConfig('${agent.id}')">
                    <div class="agent-avatar-small" style="background-color: ${agent.avatarColor}">
                        ${agent.name.charAt(0)}
                    </div>
                    <span class="agent-config-name">${escapeHtml(agent.name)}</span>
                </div>
                <div class="agent-config-controls">
                    <button class="btn-move" onclick="event.stopPropagation(); handleMoveAgent('${agent.id}', 'up', ${onConfigChange ? 'true' : 'false'})" title="上移" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="btn-move" onclick="event.stopPropagation(); handleMoveAgent('${agent.id}', 'down', ${onConfigChange ? 'true' : 'false'})" title="下移" ${index === agents.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="btn-expand" onclick="event.stopPropagation(); toggleAgentConfig('${agent.id}')" title="展开/折叠">
                        <span class="expand-icon" id="expand-icon-${agent.id}">▼</span>
                    </button>
                    <label class="toggle-switch" onclick="event.stopPropagation()">
                        <input type="checkbox" ${agent.isActive ? 'checked' : ''} 
                               onchange="handleAgentToggle('${agent.id}', this.checked, ${onConfigChange ? 'true' : 'false'})">
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="btn-delete-agent" onclick="event.stopPropagation(); handleDeleteAgent('${agent.id}', ${onConfigChange ? 'true' : 'false'})" title="删除此AI">
                        ×
                    </button>
                </div>
            </div>
            <div class="agent-config-body" id="config-body-${agent.id}">
                <div class="config-form">
                    <div class="form-row compact">
                        <label>AI名称</label>
                        <input type="text" 
                               value="${escapeHtml(agent.name)}" 
                               placeholder="输入AI名称"
                               onchange="handleAgentConfigChange('${agent.id}', 'name', this.value, ${onConfigChange ? 'true' : 'false'})">
                    </div>
                    <div class="form-row compact">
                        <label>API地址</label>
                        <input type="url" 
                               value="${escapeHtml(agent.apiUrl)}" 
                               placeholder="https://api.example.com/v1/chat/completions"
                               onchange="handleAgentConfigChange('${agent.id}', 'apiUrl', this.value, ${onConfigChange ? 'true' : 'false'})">
                    </div>
                    <div class="form-row compact">
                        <label>API密钥</label>
                        <input type="password" 
                               value="${escapeHtml(agent.apiKey)}" 
                               placeholder="sk-..."
                               onchange="handleAgentConfigChange('${agent.id}', 'apiKey', this.value, ${onConfigChange ? 'true' : 'false'})">
                    </div>
                    <div class="form-row compact">
                        <label>模型名称</label>
                        <input type="text" 
                               value="${escapeHtml(agent.model)}" 
                               placeholder="gpt-4, deepseek-chat..."
                               onchange="handleAgentConfigChange('${agent.id}', 'model', this.value, ${onConfigChange ? 'true' : 'false'})">
                    </div>
                    <div class="form-row compact params-row">
                        <div class="param-field">
                            <label>温度</label>
                            <input type="number" min="0" max="2" step="0.1"
                                   value="${agent.temperature !== undefined ? agent.temperature : 0.7}" 
                                   onchange="handleAgentConfigChange('${agent.id}', 'temperature', this.value, ${onConfigChange ? 'true' : 'false'})">
                        </div>
                        <div class="param-field">
                            <label>Max Tokens</label>
                            <input type="number" min="100" max="16000" step="100"
                                   value="${agent.maxTokens !== undefined ? agent.maxTokens : 4000}" 
                                   onchange="handleAgentConfigChange('${agent.id}', 'maxTokens', this.value, ${onConfigChange ? 'true' : 'false'})">
                        </div>
                    </div>
                    <div class="form-row compact">
                        <label>系统提示词</label>
                        <textarea rows="3" 
                                  placeholder="定义AI的角色和任务..."
                                  onchange="handleAgentConfigChange('${agent.id}', 'systemPrompt', this.value, ${onConfigChange ? 'true' : 'false'})">${escapeHtml(agent.systemPrompt)}</textarea>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // 添加"添加AI"按钮
    html += `
        <button class="btn-add-agent" onclick="handleAddAgent(${onConfigChange ? 'true' : 'false'})">
            <span class="add-icon">+</span>
            <span>添加新AI角色</span>
        </button>
    `;
    
    container.innerHTML = html;
}

/**
 * 处理移动AI角色顺序
 */
function handleMoveAgent(agentId, direction, shouldCallback) {
    const success = window.ConfigModule.moveAgent(agentId, direction);
    if (success) {
        renderAgentPanel(window.onAgentConfigChange);
        if (shouldCallback && window.onAgentConfigChange) {
            window.onAgentConfigChange();
        }
    }
}

/**
 * 处理添加新AI角色
 */
function handleAddAgent(shouldCallback) {
    const name = prompt('请输入新AI角色的名称：');
    if (!name || name.trim() === '') return;
    
    const newAgent = window.ConfigModule.addAgent({
        name: name.trim(),
        systemPrompt: '你是一个乐于助人的AI助手。'
    });
    
    // 重新渲染面板
    renderAgentPanel(window.onAgentConfigChange);
    updateActiveAgentCount();
    
    // 自动展开新添加的AI配置
    setTimeout(() => {
        toggleAgentConfig(newAgent.id);
    }, 100);
    
    if (shouldCallback && window.onAgentConfigChange) {
        window.onAgentConfigChange();
    }
}

/**
 * 处理删除AI角色
 */
function handleDeleteAgent(agentId, shouldCallback) {
    const agent = window.ConfigModule.getAllAgents().find(a => a.id === agentId);
    if (!agent) return;
    
    if (!confirm(`确定要删除AI角色 "${agent.name}" 吗？`)) return;
    
    const success = window.ConfigModule.deleteAgent(agentId);
    if (success) {
        renderAgentPanel(window.onAgentConfigChange);
        updateActiveAgentCount();
        
        if (shouldCallback && window.onAgentConfigChange) {
            window.onAgentConfigChange();
        }
    }
}

/**
 * 切换AI配置面板的展开/折叠
 */
function toggleAgentConfig(agentId) {
    const body = document.getElementById(`config-body-${agentId}`);
    const icon = document.getElementById(`expand-icon-${agentId}`);
    
    if (!body || !icon) return;
    
    if (body.classList.contains('expanded')) {
        body.classList.remove('expanded');
        icon.style.transform = 'rotate(0deg)';
    } else {
        // 先关闭其他展开的
        document.querySelectorAll('.agent-config-body.expanded').forEach(el => {
            el.classList.remove('expanded');
        });
        document.querySelectorAll('.expand-icon').forEach(el => {
            el.style.transform = 'rotate(0deg)';
        });
        
        body.classList.add('expanded');
        icon.style.transform = 'rotate(180deg)';
    }
}

/**
 * 处理AI启用/禁用切换
 */
function handleAgentToggle(agentId, isActive, shouldCallback) {
    window.ConfigModule.toggleAgentActive(agentId);
    
    const item = document.querySelector(`[data-agent-id="${agentId}"]`);
    if (isActive) {
        item.classList.add('active');
        item.classList.remove('inactive');
    } else {
        item.classList.remove('active');
        item.classList.add('inactive');
    }
    
    updateActiveAgentCount();
    
    if (shouldCallback && window.onAgentConfigChange) {
        window.onAgentConfigChange();
    }
}

/**
 * 处理AI配置变更
 */
function handleAgentConfigChange(agentId, field, value, shouldCallback) {
    const updates = { [field]: value };
    window.ConfigModule.updateAgent(agentId, updates);
    
    if (shouldCallback && window.onAgentConfigChange) {
        window.onAgentConfigChange();
    }
}

/**
 * 更新活跃AI数量显示
 */
function updateActiveAgentCount() {
    const count = window.ConfigModule.getActiveAgents().length;
    const element = document.getElementById('activeAgentCount');
    if (element) {
        element.textContent = `活跃AI: ${count}`;
    }
}

/**
 * 渲染消息列表
 */
function renderMessageList() {
    const container = document.getElementById('messageList');
    if (!container) return;

    const messages = window.ConfigModule.getMessages();
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💡</div>
                <div class="empty-state-title">开始头脑风暴</div>
                <div class="empty-state-desc">在下方输入问题，让AI们为你提供多角度的思考</div>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => {
        if (msg.role === 'user') {
            return renderUserMessage(msg);
        } else if (msg.name === '系统') {
            return renderSystemMessage(msg);
        } else {
            return renderAssistantMessage(msg);
        }
    }).join('');

    scrollToBottom();
}

/**
 * 渲染用户消息
 */
function renderUserMessage(msg) {
    return `
        <div class="message message-user" id="msg-${msg.timestamp || Date.now()}">
            <div class="message-avatar" style="background-color: #4CAF50;">我</div>
            <div class="message-content">
                <div class="message-header">用户</div>
                <div class="message-bubble">${formatMessageContent(msg.content)}</div>
            </div>
        </div>
    `;
}

/**
 * 渲染AI消息
 */
function renderAssistantMessage(msg) {
    const agent = window.ConfigModule.getAgentByName(msg.name);
    const avatarColor = agent ? agent.avatarColor : '#999';
    const initial = msg.name ? msg.name.charAt(0) : '?';
    const msgId = msg.id || ('msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));

    return `
        <div class="message message-assistant" id="${msgId}" data-agent="${escapeHtml(msg.name || '')}">
            <div class="message-avatar" style="background-color: ${avatarColor}">${initial}</div>
            <div class="message-content">
                <div class="message-header">${escapeHtml(msg.name || 'AI')}</div>
                <div class="message-bubble">${formatMessageContent(msg.content)}</div>
            </div>
        </div>
    `;
}

/**
 * 渲染系统消息
 */
function renderSystemMessage(msg) {
    return `
        <div class="message message-system" id="msg-${msg.timestamp || Date.now()}">
            <div class="message-content">
                <div class="message-bubble system-bubble">${escapeHtml(msg.content)}</div>
            </div>
        </div>
    `;
}

/**
 * 添加消息到界面（不保存）
 */
function appendMessageToUI(message) {
    const container = document.getElementById('messageList');
    if (!container) return;

    // 移除空状态
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    let html = '';
    if (message.role === 'user') {
        html = renderUserMessage(message);
    } else if (message.name === '系统') {
        html = renderSystemMessage(message);
    } else {
        html = renderAssistantMessage(message);
    }

    container.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
    
    return html.match(/id="([^"]+)"/)?.[1];
}

/**
 * 创建流式输出消息元素
 */
function createStreamingMessage(agent, messageId) {
    const container = document.getElementById('messageList');
    if (!container) return null;

    const agentData = window.ConfigModule.getAgentByName(agent.name);
    const avatarColor = agentData ? agentData.avatarColor : '#999';
    const initial = agent.name.charAt(0);

    const html = `
        <div class="message message-assistant streaming" id="${messageId}" data-agent="${escapeHtml(agent.name)}">
            <div class="message-avatar" style="background-color: ${avatarColor}">${initial}</div>
            <div class="message-content">
                <div class="message-header">${escapeHtml(agent.name)} <span class="streaming-indicator">正在输入...</span></div>
                <div class="message-bubble"><span class="streaming-text"></span><span class="cursor">▊</span></div>
            </div>
        </div>
    `;

    // 移除空状态
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    container.insertAdjacentHTML('beforeend', html);
    scrollToBottom();

    return document.getElementById(messageId);
}

/**
 * 更新流式输出内容
 */
function updateStreamingMessage(messageId, chunk, fullContent) {
    const messageEl = document.getElementById(messageId);
    if (!messageEl) return;

    const textEl = messageEl.querySelector('.streaming-text');
    if (textEl) {
        textEl.innerHTML = formatMessageContent(fullContent);
    }
    
    scrollToBottom();
}

/**
 * 完成流式输出
 */
function finalizeStreamingMessage(messageId, fullContent, agentName) {
    const messageEl = document.getElementById(messageId);
    if (!messageEl) return;

    messageEl.classList.remove('streaming');
    
    const headerEl = messageEl.querySelector('.message-header');
    if (headerEl) {
        headerEl.textContent = agentName;
    }
    
    const bubbleEl = messageEl.querySelector('.message-bubble');
    if (bubbleEl) {
        bubbleEl.innerHTML = formatMessageContent(fullContent);
    }
    
    // 从streamingMessages中移除
    streamingMessages.delete(messageId);
}

/**
 * 显示加载动画（非流式时使用）
 */
function showLoading(agentName) {
    const container = document.getElementById('messageList');
    if (!container) return null;

    const agent = window.ConfigModule.getAgentByName(agentName);
    const avatarColor = agent ? agent.avatarColor : '#999';
    const initial = agentName.charAt(0);

    const loadingId = `loading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const html = `
        <div class="message message-assistant loading-message" id="${loadingId}">
            <div class="message-avatar" style="background-color: ${avatarColor}">${initial}</div>
            <div class="message-content">
                <div class="message-header">${escapeHtml(agentName)} 正在思考...</div>
                <div class="message-bubble loading-bubble">
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                </div>
            </div>
        </div>
    `;

    // 移除空状态
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    container.insertAdjacentHTML('beforeend', html);
    scrollToBottom();

    return loadingId;
}

/**
 * 移除加载动画
 */
function hideLoading(loadingId) {
    if (!loadingId) return;
    const element = document.getElementById(loadingId);
    if (element) {
        element.remove();
    }
}

/**
 * 添加系统消息
 */
function addSystemMessage(content) {
    const message = {
        role: 'assistant',
        name: '系统',
        content: content
    };
    window.ConfigModule.addMessage(message);
    appendMessageToUI(message);
}

/**
 * 格式化消息内容
 */
function formatMessageContent(content) {
    // 转义HTML
    let formatted = escapeHtml(content);
    // 高亮@提及
    formatted = formatted.replace(/@([^\s]+)/g, '<span class="mention">@$1</span>');
    // 转换换行
    formatted = formatted.replace(/\n/g, '<br>');
    // 转换代码块
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // 转换行内代码
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    return formatted;
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
    const container = document.querySelector('.chat-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * 更新UI状态（生成中/空闲）
 */
function updateUIState(generating) {
    isGenerating = generating;
    
    const sendBtn = document.getElementById('sendBtn');
    const stopBtn = document.getElementById('stopBtn');
    const input = document.getElementById('messageInput');

    if (sendBtn) sendBtn.disabled = generating;
    if (stopBtn) stopBtn.disabled = !generating;
    if (input) input.disabled = generating;

    if (!generating && input) {
        input.focus();
    }
}

/**
 * 获取输入框内容
 */
function getInputContent() {
    const input = document.getElementById('messageInput');
    return input ? input.value.trim() : '';
}

/**
 * 清空输入框
 */
function clearInput() {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value = '';
        hideMentionDropdown();
    }
}

/**
 * 创建新的AbortController
 */
function createAbortController() {
    abortController = new AbortController();
    return abortController;
}

/**
 * 获取当前的AbortController
 */
function getAbortController() {
    return abortController;
}

/**
 * 中断生成
 */
function abortGeneration() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    updateUIState(false);
    
    // 完成所有正在流式输出的消息
    streamingMessages.forEach((data, messageId) => {
        finalizeStreamingMessage(messageId, data.content, data.agentName);
    });
    streamingMessages.clear();
    
    // 移除所有加载动画
    document.querySelectorAll('.loading-message').forEach(el => el.remove());
}

/**
 * 清空所有消息
 */
function clearAllMessages() {
    if (!confirm('确定要清空所有对话记录吗？')) return;
    
    window.ConfigModule.clearMessages();
    renderMessageList();
}

/**
 * 提取@提及
 */
function extractMentions(text) {
    const mentions = [];
    const regex = /@([^\s]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        mentions.push(match[1]);
    }
    return mentions;
}

// ============ @提及提示功能 ============

/**
 * 初始化@提及提示
 */
function initMentionInput() {
    const input = document.getElementById('messageInput');
    if (!input) return;

    input.addEventListener('input', handleInputForMention);
    input.addEventListener('keydown', handleKeydownForMention);
    
    // 点击外部关闭下拉框
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mention-dropdown') && !e.target.closest('#messageInput')) {
            hideMentionDropdown();
        }
    });
}

/**
 * 处理输入以检测@提及
 */
function handleInputForMention(e) {
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = e.target.value.substring(0, cursorPosition);
    
    // 查找最近的@符号
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
        // 检查@后面是否有空格（如果有，则不是正在输入提及）
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(' ')) {
            // 显示提及下拉框
            showMentionDropdown(textAfterAt, lastAtIndex, cursorPosition);
            return;
        }
    }
    
    hideMentionDropdown();
}

/**
 * 显示提及下拉框
 */
function showMentionDropdown(searchText, atIndex, cursorPosition) {
    const input = document.getElementById('messageInput');
    let dropdown = document.getElementById('mention-dropdown');
    
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'mention-dropdown';
        dropdown.className = 'mention-dropdown';
        document.body.appendChild(dropdown);
    }
    
    // 获取所有AI角色
    const agents = window.ConfigModule.getAllAgents();
    const filteredAgents = agents.filter(agent => 
        agent.name.toLowerCase().includes(searchText.toLowerCase())
    );
    
    if (filteredAgents.length === 0) {
        hideMentionDropdown();
        return;
    }
    
    // 渲染下拉框内容
    dropdown.innerHTML = filteredAgents.map((agent, index) => `
        <div class="mention-item ${index === 0 ? 'active' : ''}" data-name="${escapeHtml(agent.name)}" data-index="${index}">
            <div class="mention-avatar" style="background-color: ${agent.avatarColor}">${agent.name.charAt(0)}</div>
            <span class="mention-name">${escapeHtml(agent.name)}</span>
        </div>
    `).join('');
    
    // 添加点击事件
    dropdown.querySelectorAll('.mention-item').forEach(item => {
        item.addEventListener('click', () => {
            insertMention(item.dataset.name, atIndex, cursorPosition);
        });
    });
    
    // 定位下拉框
    const inputRect = input.getBoundingClientRect();
    dropdown.style.left = inputRect.left + 'px';
    dropdown.style.top = (inputRect.bottom + 5) + 'px';
    dropdown.style.width = inputRect.width + 'px';
    dropdown.style.display = 'block';
    
    // 存储当前提及状态
    dropdown.dataset.atIndex = atIndex;
    dropdown.dataset.cursorPosition = cursorPosition;
}

/**
 * 隐藏提及下拉框
 */
function hideMentionDropdown() {
    const dropdown = document.getElementById('mention-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

/**
 * 插入提及
 */
function insertMention(agentName, atIndex, cursorPosition) {
    const input = document.getElementById('messageInput');
    const value = input.value;
    
    // 替换@及后面的文本为@角色名 + 空格
    const newValue = value.substring(0, atIndex) + '@' + agentName + ' ' + value.substring(cursorPosition);
    input.value = newValue;
    
    // 设置光标位置
    const newCursorPosition = atIndex + agentName.length + 2; // +2 for @ and space
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    input.focus();
    
    hideMentionDropdown();
}

/**
 * 处理键盘事件用于提及选择
 */
function handleKeydownForMention(e) {
    const dropdown = document.getElementById('mention-dropdown');
    if (!dropdown || dropdown.style.display === 'none') return;
    
    const items = dropdown.querySelectorAll('.mention-item');
    let activeIndex = Array.from(items).findIndex(item => item.classList.contains('active'));
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (activeIndex < items.length - 1) {
                items[activeIndex]?.classList.remove('active');
                items[activeIndex + 1].classList.add('active');
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (activeIndex > 0) {
                items[activeIndex]?.classList.remove('active');
                items[activeIndex - 1].classList.add('active');
            }
            break;
        case 'Enter':
        case 'Tab':
            e.preventDefault();
            const activeItem = items[activeIndex] || items[0];
            if (activeItem) {
                insertMention(
                    activeItem.dataset.name,
                    parseInt(dropdown.dataset.atIndex),
                    parseInt(dropdown.dataset.cursorPosition)
                );
            }
            break;
        case 'Escape':
            hideMentionDropdown();
            break;
    }
}

// 页面加载时初始化
setTimeout(initMentionInput, 100);

// 导出模块
window.UIModule = {
    renderAgentPanel,
    toggleAgentConfig,
    handleAgentToggle,
    handleAgentConfigChange,
    handleAddAgent,
    handleDeleteAgent,
    handleMoveAgent,
    updateActiveAgentCount,
    renderMessageList,
    appendMessageToUI,
    createStreamingMessage,
    updateStreamingMessage,
    finalizeStreamingMessage,
    showLoading,
    hideLoading,
    addSystemMessage,
    formatMessageContent,
    escapeHtml,
    scrollToBottom,
    updateUIState,
    getInputContent,
    clearInput,
    createAbortController,
    getAbortController,
    abortGeneration,
    clearAllMessages,
    extractMentions,
    initMentionInput,
    isGenerating: () => isGenerating
};
