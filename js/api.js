/**
 * API通信模块 - api.js
 * 封装OpenAI格式的Fetch请求，支持流式输出和中断控制
 */

/**
 * 流式调用AI API
 * @param {Object} agent - AI配置对象
 * @param {Array} messages - 消息历史数组
 * @param {Function} onChunk - 接收到数据块时的回调 (chunk, fullContent)
 * @param {AbortSignal} signal - 用于中断请求的AbortSignal
 * @returns {Promise<string>} - 完整的AI回复内容
 */
async function callAIAPIStream(agent, messages, onChunk, signal) {
    // 验证必要的配置
    if (!agent.apiUrl || !agent.apiKey || !agent.model) {
        throw new Error(`AI "${agent.name}" 的配置不完整，请检查API地址、密钥和模型名称`);
    }

    // 构造请求体 - 使用用户设置的参数
    const requestBody = {
        model: agent.model,
        messages: messages,
        temperature: agent.temperature !== undefined ? parseFloat(agent.temperature) : 0.7,
        max_tokens: agent.maxTokens !== undefined ? parseInt(agent.maxTokens) : 4000,
        stream: true
    };

    try {
        const response = await fetch(agent.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${agent.apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || 
                                errorData.message || 
                                `HTTP错误: ${response.status}`;
            throw new Error(errorMessage);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 检查是否已取消
            if (signal.aborted) {
                throw new Error('请求已取消');
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            fullContent += content;
                            onChunk(content, fullContent);
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }

        return fullContent;

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('请求已取消');
        }
        
        // 网络错误处理
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error(`网络错误: 无法连接到API服务器。请检查API地址是否正确，或是否存在跨域限制。`);
        }
        
        throw error;
    }
}

/**
 * 构造消息数组（包含系统提示词）
 * @param {Object} agent - AI配置对象
 * @param {Array} history - 对话历史
 * @returns {Array} - 完整的消息数组
 */
function buildMessages(agent, history) {
    const messages = [
        {
            role: 'system',
            content: agent.systemPrompt || '你是一个乐于助人的AI助手。'
        }
    ];

    // 添加历史消息
    history.forEach(msg => {
        const messageObj = {
            role: msg.role,
            content: msg.content
        };
        
        // 如果是AI消息，添加name字段（OpenAI格式）
        if (msg.role === 'assistant' && msg.name) {
            messageObj.name = msg.name;
        }
        
        messages.push(messageObj);
    });

    return messages;
}

/**
 * 批量调用多个AI（用于同步模式）- 使用流式输出
 * @param {Array} agents - AI数组
 * @param {Array} history - 对话历史
 * @param {Function} onStart - AI开始回答时的回调 (agent, messageId)
 * @param {Function} onChunk - 接收到数据块时的回调 (agent, messageId, chunk, fullContent)
 * @param {Function} onComplete - AI回答完成时的回调 (agent, messageId, fullContent)
 * @param {Function} onError - 错误回调 (agent, error)
 * @param {AbortSignal} signal - 中断信号
 */
async function callMultipleAIs(agents, history, onStart, onChunk, onComplete, onError, signal) {
    const promises = agents.map(async (agent) => {
        const messages = buildMessages(agent, history);
        
        // 生成消息ID
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        
        try {
            // 通知开始
            onStart(agent, messageId);
            
            // 流式调用
            const fullContent = await callAIAPIStream(agent, messages, (chunk, full) => {
                onChunk(agent, messageId, chunk, full);
            }, signal);
            
            onComplete(agent, messageId, fullContent);
            return { agent, content: fullContent, success: true };
            
        } catch (error) {
            onError(agent, messageId, error);
            return { agent, error: error.message, success: false };
        }
    });

    return Promise.all(promises);
}

/**
 * 顺序调用多个AI（用于轮流模式）- 使用流式输出
 * @param {Array} agents - AI数组
 * @param {Array} history - 初始对话历史
 * @param {Function} onStart - AI开始回答时的回调
 * @param {Function} onChunk - 接收到数据块时的回调
 * @param {Function} onComplete - AI回答完成时的回调
 * @param {Function} onError - 错误回调
 * @param {AbortSignal} signal - 中断信号
 */
async function callAIsSequentially(agents, history, onStart, onChunk, onComplete, onError, signal) {
    const results = [];
    let currentHistory = [...history];

    for (const agent of agents) {
        // 检查是否已取消
        if (signal.aborted) {
            throw new Error('请求已取消');
        }

        const messages = buildMessages(agent, currentHistory);
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        
        try {
            onStart(agent, messageId);
            
            const fullContent = await callAIAPIStream(agent, messages, (chunk, full) => {
                onChunk(agent, messageId, chunk, full);
            }, signal);
            
            onComplete(agent, messageId, fullContent);
            
            // 将当前AI的回复加入历史，供下一个AI参考
            currentHistory.push({
                role: 'assistant',
                name: agent.name,
                content: fullContent
            });
            
            results.push({ agent, content: fullContent, success: true });
        } catch (error) {
            onError(agent, messageId, error);
            results.push({ agent, error: error.message, success: false });
            // 继续下一个AI，不因单个错误中断
        }
    }

    return results;
}

/**
 * 调用单个AI（用于@模式）- 使用流式输出
 * @param {Object} agent - AI配置对象
 * @param {Array} history - 对话历史
 * @param {Function} onStart - 开始回调
 * @param {Function} onChunk - 数据块回调
 * @param {Function} onComplete - 完成回调
 * @param {Function} onError - 错误回调
 * @param {AbortSignal} signal - 中断信号
 */
async function callSingleAI(agent, history, onStart, onChunk, onComplete, onError, signal) {
    const messages = buildMessages(agent, history);
    const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    
    try {
        onStart(agent, messageId);
        
        const fullContent = await callAIAPIStream(agent, messages, (chunk, full) => {
            onChunk(agent, messageId, chunk, full);
        }, signal);
        
        onComplete(agent, messageId, fullContent);
        return { agent, content: fullContent, success: true };
        
    } catch (error) {
        onError(agent, messageId, error);
        return { agent, error: error.message, success: false };
    }
}

// 导出模块
window.APIModule = {
    callAIAPIStream,
    buildMessages,
    callMultipleAIs,
    callAIsSequentially,
    callSingleAI
};
