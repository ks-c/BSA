/**
 * 轮流接力模式 - mode-sequential.js
 * AI按顺序依次回答，后一个AI可以看到前面所有AI的回复（流式输出）
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

    // 获取激活的AI（按顺序）
    const activeAgents = window.ConfigModule.getActiveAgents();
    if (activeAgents.length === 0) {
        window.UIModule.addSystemMessage('没有可用的AI参与对话，请先在左侧激活至少一个AI。');
        return;
    }

    // 开始生成
    window.UIModule.updateUIState(true);
    const controller = window.UIModule.createAbortController();

    // 获取当前消息历史作为起点
    const history = window.ConfigModule.getMessages();

    try {
        // 顺序调用AI（流式输出）
        await window.APIModule.callAIsSequentially(
            activeAgents,
            history,
            // onStart
            (agent, messageId) => {
                window.UIModule.createStreamingMessage(agent, messageId);
            },
            // onChunk
            (agent, messageId, chunk, fullContent) => {
                window.UIModule.updateStreamingMessage(messageId, chunk, fullContent);
            },
            // onComplete
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
            // onError
            (agent, messageId, error) => {
                window.UIModule.hideLoading(messageId);
                window.UIModule.addSystemMessage(`${agent.name} 调用失败: ${error.message}`);
            },
            controller.signal
        );
    } catch (error) {
        if (error.message === '请求已取消') {
            window.UIModule.addSystemMessage('生成已停止');
        } else {
            console.error('轮流模式调用失败:', error);
            window.UIModule.addSystemMessage('调用过程中发生错误: ' + error.message);
        }
    } finally {
        window.UIModule.updateUIState(false);
    }
}
