/**
 * 同步思考模式 - mode-simultaneous.js
 * 所有AI同时接收问题并独立回答（流式输出）
 */

document.addEventListener('DOMContentLoaded', () => {
    // 初始化UI
    window.UIModule.renderAgentPanel();
    window.UIModule.renderMessageList();
    window.UIModule.updateActiveAgentCount();
    window.UIModule.initMentionInput();

    // 绑定回车发送
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // 检查是否在下拉框选择中
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

    // 添加用户消息
    const userMessage = {
        role: 'user',
        content: content
    };
    window.ConfigModule.addMessage(userMessage);
    window.UIModule.appendMessageToUI(userMessage);
    window.UIModule.clearInput();

    // 获取激活的AI
    const activeAgents = window.ConfigModule.getActiveAgents();
    if (activeAgents.length === 0) {
        window.UIModule.addSystemMessage('没有可用的AI参与对话，请先在左侧激活至少一个AI。');
        return;
    }

    // 开始生成
    window.UIModule.updateUIState(true);
    const controller = window.UIModule.createAbortController();

    // 获取当前消息历史
    const history = window.ConfigModule.getMessages();

    try {
        // 并行调用所有AI（流式输出）
        await window.APIModule.callMultipleAIs(
            activeAgents,
            history,
            // onStart - AI开始回答
            (agent, messageId) => {
                window.UIModule.createStreamingMessage(agent, messageId);
            },
            // onChunk - 接收到数据块
            (agent, messageId, chunk, fullContent) => {
                window.UIModule.updateStreamingMessage(messageId, chunk, fullContent);
            },
            // onComplete - AI回答完成
            (agent, messageId, fullContent) => {
                window.UIModule.finalizeStreamingMessage(messageId, fullContent, agent.name);
                
                // 保存到消息历史
                const message = {
                    role: 'assistant',
                    name: agent.name,
                    content: fullContent
                };
                window.ConfigModule.addMessage(message);
            },
            // onError - 错误处理
            (agent, messageId, error) => {
                window.UIModule.hideLoading(messageId);
                window.UIModule.addSystemMessage(`${agent.name} 调用失败: ${error.message}`);
            },
            controller.signal
        );
    } catch (error) {
        console.error('同步模式调用失败:', error);
        window.UIModule.addSystemMessage('调用过程中发生错误: ' + error.message);
    } finally {
        window.UIModule.updateUIState(false);
    }
}
