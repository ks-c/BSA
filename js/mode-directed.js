/**
 * 指定@回答模式 - mode-directed.js
 * 使用 @AI名称 指定特定AI回答，支持连锁反应（流式输出）
 */

// 用于防止重复触发的集合
const processedMentions = new Set();

document.addEventListener('DOMContentLoaded', () => {
    // 初始化UI
    window.UIModule.renderAgentPanel();
    window.UIModule.renderMessageList();
    window.UIModule.updateActiveAgentCount();
    window.UIModule.initMentionInput();

    // 绑定回车发送
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const dropdown = document.getElementById('mention-dropdown');
            if (dropdown && dropdown.style.display === 'block') {
                return;
            }
            e.preventDefault();
            handleSend();
        }
    });
});

/**
 * 处理发送消息
 */
async function handleSend() {
    const content = window.UIModule.getInputContent();
    if (!content || window.UIModule.isGenerating()) return;

    // 清空已处理的提及记录
    processedMentions.clear();

    // 添加用户消息
    const userMessage = {
        role: 'user',
        content: content
    };
    window.ConfigModule.addMessage(userMessage);
    window.UIModule.appendMessageToUI(userMessage);
    window.UIModule.clearInput();

    // 提取@提及
    const mentions = window.UIModule.extractMentions(content);
    
    let targetAgents = [];
    
    if (mentions.length > 0) {
        // 使用@指定的AI
        targetAgents = mentions
            .map(name => window.ConfigModule.getAgentByName(name))
            .filter(agent => agent !== undefined);
        
        if (targetAgents.length === 0) {
            window.UIModule.addSystemMessage('未找到被@的AI，请检查AI名称是否正确。');
            return;
        }
    } else {
        // 没有@时，使用所有激活的AI
        targetAgents = window.ConfigModule.getActiveAgents();
        if (targetAgents.length === 0) {
            window.UIModule.addSystemMessage('没有可用的AI参与对话，请先在左侧激活至少一个AI，或使用 @AI名称 指定特定AI。');
            return;
        }
    }

    // 开始生成
    window.UIModule.updateUIState(true);
    
    // 触发目标AI
    await triggerAgents(targetAgents);
}

/**
 * 触发指定的AI列表
 * @param {Array} agents - 要触发的AI数组
 */
async function triggerAgents(agents) {
    const controller = window.UIModule.createAbortController();
    const signal = controller.signal;

    try {
        // 为每个AI创建独立的调用
        const promises = agents.map(agent => callAgentWithMentionCheck(agent, signal));
        await Promise.all(promises);
    } catch (error) {
        if (error.message !== '请求已取消') {
            console.error('触发AI失败:', error);
        }
    } finally {
        // 检查是否还有正在进行的请求
        if (!signal.aborted) {
            window.UIModule.updateUIState(false);
        }
    }
}

/**
 * 调用单个AI并检查回复中的@提及
 * @param {Object} agent - AI对象
 * @param {AbortSignal} signal - 中断信号
 */
async function callAgentWithMentionCheck(agent, signal) {
    // 检查是否已取消
    if (signal.aborted) return;

    // 获取当前消息历史
    const history = window.ConfigModule.getMessages();
    const messages = window.APIModule.buildMessages(agent, history);

    try {
        // 流式调用API
        let fullContent = '';
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        
        await window.APIModule.callSingleAI(
            agent,
            history,
            // onStart
            (a, id) => {
                window.UIModule.createStreamingMessage(a, id);
            },
            // onChunk
            (a, id, chunk, full) => {
                fullContent = full;
                window.UIModule.updateStreamingMessage(id, chunk, full);
            },
            // onComplete
            (a, id, content) => {
                window.UIModule.finalizeStreamingMessage(id, content, a.name);
                
                // 保存到消息历史
                const message = {
                    role: 'assistant',
                    name: a.name,
                    content: content
                };
                window.ConfigModule.addMessage(message);
            },
            // onError
            (a, id, error) => {
                window.UIModule.hideLoading(id);
                window.UIModule.addSystemMessage(`${a.name} 调用失败: ${error.message}`);
            },
            signal
        );

        // 检查回复中的@提及（连锁反应）
        await handleMentionsInResponse(fullContent, agent.name);

    } catch (error) {
        if (error.message === '请求已取消') {
            throw error;
        }
        window.UIModule.addSystemMessage(`${agent.name} 调用失败: ${error.message}`);
    }
}

/**
 * 处理回复中的@提及（连锁反应）
 * @param {string} content - AI回复内容
 * @param {string} fromAgent - 发送回复的AI名称
 */
async function handleMentionsInResponse(content, fromAgent) {
    const mentions = window.UIModule.extractMentions(content);
    if (mentions.length === 0) return;

    // 找到被@的AI（排除自己）
    const mentionedAgents = mentions
        .map(name => window.ConfigModule.getAgentByName(name))
        .filter(agent => agent !== undefined && agent.name !== fromAgent);

    if (mentionedAgents.length === 0) return;

    // 延迟一下再触发，让用户体验更自然
    await new Promise(resolve => setTimeout(resolve, 500));

    // 检查是否已经被停止
    if (!window.UIModule.isGenerating()) return;

    // 触发被@的AI
    await triggerAgents(mentionedAgents);
}
