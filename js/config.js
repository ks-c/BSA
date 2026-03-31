/**
 * 配置管理模块 - config.js
 * 负责本地记忆存储、默认AI角色配置、配置读写操作
 */

const CONFIG_KEY = 'ai_brainstorm_config_v2';

// 预设的四个默认AI角色
const DEFAULT_AGENTS = [
    {
        id: 'agent-1',
        name: '项目总负责人',
        apiUrl: '',
        apiKey: '',
        model: '',
        systemPrompt: '你是本项目的总负责人。你的职责是统筹全局，协调实验设计、理论整理和文献搜索的工作。你需要理清项目目标，把控整体进度，汇总其他专家的意见并给出最终的执行方案或结论。如果需要其他专家的具体协助，请在你的回复中直接使用"@角色名称"来呼叫他们，例如回复"@文献搜索 请查找相关资料"或"@实验设计 请给出具体方案"。',
        isActive: true,
        avatarColor: '#4CAF50',
        order: 1
    },
    {
        id: 'agent-2',
        name: '实验设计',
        apiUrl: '',
        apiKey: '',
        model: '',
        systemPrompt: '你是负责实验设计的专家。你的职责是将理论和目标转化为具体、严谨、可操作的实验方案。你需要详细说明实验步骤、变量控制、数据采集方法以及可行性评估。注重逻辑性和科学严密性。如果需要理论支持或文献参考，请在回复中直接使用"@理论整理"或"@文献搜索"来请求协助。如果方案已完成，可以回复"@项目总负责人"进行汇报。',
        isActive: true,
        avatarColor: '#FF9800',
        order: 2
    },
    {
        id: 'agent-3',
        name: '理论整理',
        apiUrl: '',
        apiKey: '',
        model: '',
        systemPrompt: '你是负责理论整理的专家。你的职责是构建项目的核心理论框架，确保逻辑自洽。你需要解释现象背后的科学机制，将零散的想法和文献数据串联成系统的理论体系，并为实验设计提供理论依据。如果缺乏背景资料，请在回复中直接使用"@文献搜索"获取信息；如果理论需要验证，请回复"@实验设计"设计验证方案；完成后可回复"@项目总负责人"进行汇总。',
        isActive: true,
        avatarColor: '#2196F3',
        order: 3
    },
    {
        id: 'agent-4',
        name: '文献搜索',
        apiUrl: '',
        apiKey: '',
        model: '',
        systemPrompt: '你是负责文献搜索与前沿追踪的专家。你的职责是为团队提供可靠的背景资料、过往研究案例和最新学术动态。你需要根据项目需求，总结相关领域的现有成果和知识空白，确保团队的决策有据可依。如果获取的信息需要进一步提炼理论，请在回复中直接使用"@理论整理"；如果可以直接用于指导实验，请回复"@实验设计"；收集完毕后可回复"@项目总负责人"审阅。',
        isActive: true,
        avatarColor: '#F44336',
        order: 4
    }
];

// 全局配置对象
let appConfig = {
    agents: [],
    messages: [],
    currentMode: 'simultaneous'
};

/**
 * 从 localStorage 加载配置
 * 如果为空，则初始化默认AI角色
 */
function loadConfig() {
    try {
        const stored = localStorage.getItem(CONFIG_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // 合并存储的配置，确保所有必要字段存在
            appConfig = {
                agents: parsed.agents || [],
                messages: parsed.messages || [],
                currentMode: parsed.currentMode || 'simultaneous'
            };
            
            // 如果agents为空，初始化默认值
            if (appConfig.agents.length === 0) {
                appConfig.agents = JSON.parse(JSON.stringify(DEFAULT_AGENTS));
                saveConfig();
            }
        } else {
            // 首次使用，初始化默认配置
            appConfig.agents = JSON.parse(JSON.stringify(DEFAULT_AGENTS));
            saveConfig();
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        // 出错时使用默认配置
        appConfig.agents = JSON.parse(JSON.stringify(DEFAULT_AGENTS));
    }
    return appConfig;
}

/**
 * 保存配置到 localStorage
 */
function saveConfig() {
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(appConfig));
    } catch (error) {
        console.error('保存配置失败:', error);
    }
}

/**
 * 获取当前配置
 */
function getConfig() {
    return appConfig;
}

/**
 * 更新AI配置
 * @param {string} agentId - AI的ID
 * @param {Object} updates - 要更新的字段
 */
function updateAgent(agentId, updates) {
    const agent = appConfig.agents.find(a => a.id === agentId);
    if (agent) {
        Object.assign(agent, updates);
        saveConfig();
    }
}

/**
 * 切换AI的激活状态
 * @param {string} agentId - AI的ID
 */
function toggleAgentActive(agentId) {
    const agent = appConfig.agents.find(a => a.id === agentId);
    if (agent) {
        agent.isActive = !agent.isActive;
        saveConfig();
    }
}

/**
 * 获取所有激活的AI
 */
function getActiveAgents() {
    return appConfig.agents
        .filter(a => a.isActive)
        .sort((a, b) => a.order - b.order);
}

/**
 * 获取所有AI（按顺序）
 */
function getAllAgents() {
    return [...appConfig.agents].sort((a, b) => a.order - b.order);
}

/**
 * 通过名称查找AI
 * @param {string} name - AI名称
 */
function getAgentByName(name) {
    return appConfig.agents.find(a => a.name === name);
}

/**
 * 添加消息到历史记录
 * @param {Object} message - 消息对象 {role, name, content}
 */
function addMessage(message) {
    appConfig.messages.push({
        ...message,
        timestamp: Date.now()
    });
    saveConfig();
}

/**
 * 清空消息历史
 */
function clearMessages() {
    appConfig.messages = [];
    saveConfig();
}

/**
 * 获取消息历史
 */
function getMessages() {
    return appConfig.messages;
}

/**
 * 重置为默认配置
 */
function resetToDefault() {
    if (confirm('确定要重置所有配置为默认值吗？这将清除您设置的所有API密钥和自定义提示词。')) {
        appConfig.agents = JSON.parse(JSON.stringify(DEFAULT_AGENTS));
        appConfig.messages = [];
        saveConfig();
        return true;
    }
    return false;
}

/**
 * 导出配置（用于备份）
 */
function exportConfig() {
    return JSON.stringify(appConfig, null, 2);
}

/**
 * 导入配置
 * @param {string} jsonStr - JSON格式的配置字符串
 */
function importConfig(jsonStr) {
    try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.agents && Array.isArray(parsed.agents)) {
            appConfig = parsed;
            saveConfig();
            return true;
        }
        return false;
    } catch (error) {
        console.error('导入配置失败:', error);
        return false;
    }
}

/**
 * 生成唯一ID
 */
function generateId() {
    return 'agent-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * 生成随机颜色
 */
function generateRandomColor() {
    const colors = ['#4CAF50', '#FF9800', '#2196F3', '#F44336', '#9C27B0', '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 添加新的AI角色
 * @param {Object} agentData - AI角色数据
 * @returns {Object} - 新创建的AI对象
 */
function addAgent(agentData) {
    const maxOrder = Math.max(...appConfig.agents.map(a => a.order), 0);
    const newAgent = {
        id: generateId(),
        name: agentData.name || '新AI角色',
        apiUrl: agentData.apiUrl || '',
        apiKey: agentData.apiKey || '',
        model: agentData.model || '',
        systemPrompt: agentData.systemPrompt || '你是一个乐于助人的AI助手。',
        isActive: agentData.isActive !== undefined ? agentData.isActive : true,
        avatarColor: agentData.avatarColor || generateRandomColor(),
        order: maxOrder + 1,
        temperature: agentData.temperature !== undefined ? agentData.temperature : 0.7,
        maxTokens: agentData.maxTokens !== undefined ? agentData.maxTokens : 4000
    };
    
    appConfig.agents.push(newAgent);
    saveConfig();
    return newAgent;
}

/**
 * 移动AI角色顺序
 * @param {string} agentId - AI的ID
 * @param {string} direction - 移动方向 'up' 或 'down'
 * @returns {boolean} - 是否移动成功
 */
function moveAgent(agentId, direction) {
    const agents = appConfig.agents;
    const index = agents.findIndex(a => a.id === agentId);
    if (index === -1) return false;
    
    if (direction === 'up' && index > 0) {
        // 交换order
        const temp = agents[index].order;
        agents[index].order = agents[index - 1].order;
        agents[index - 1].order = temp;
        // 交换位置
        [agents[index], agents[index - 1]] = [agents[index - 1], agents[index]];
    } else if (direction === 'down' && index < agents.length - 1) {
        const temp = agents[index].order;
        agents[index].order = agents[index + 1].order;
        agents[index + 1].order = temp;
        [agents[index], agents[index + 1]] = [agents[index + 1], agents[index]];
    } else {
        return false;
    }
    
    saveConfig();
    return true;
}

/**
 * 删除AI角色
 * @param {string} agentId - AI的ID
 * @returns {boolean} - 是否删除成功
 */
function deleteAgent(agentId) {
    const index = appConfig.agents.findIndex(a => a.id === agentId);
    if (index === -1) return false;
    
    // 不允许删除最后一个AI
    if (appConfig.agents.length <= 1) {
        alert('至少保留一个AI角色');
        return false;
    }
    
    appConfig.agents.splice(index, 1);
    
    // 重新排序
    appConfig.agents.forEach((agent, idx) => {
        agent.order = idx + 1;
    });
    
    saveConfig();
    return true;
}

// 页面加载时自动初始化配置
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
});

// 导出模块（供其他脚本使用）
window.ConfigModule = {
    loadConfig,
    saveConfig,
    getConfig,
    updateAgent,
    toggleAgentActive,
    getActiveAgents,
    getAllAgents,
    getAgentByName,
    addMessage,
    clearMessages,
    getMessages,
    resetToDefault,
    exportConfig,
    importConfig,
    addAgent,
    deleteAgent,
    moveAgent,
    DEFAULT_AGENTS
};
