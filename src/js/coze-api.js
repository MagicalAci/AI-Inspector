/**
 * Coze API 集成模块
 * 
 * 基于 Coze 开发者文档实现智能体创建和管理
 * 文档参考:
 * - https://docs.coze.cn/developer_guides/create_bot
 * - https://docs.coze.cn/developer_guides/publish_bot
 * - https://docs.coze.cn/developer_guides/create_room
 * - https://docs.coze.cn/developer_guides/bot_object
 */

const CozeAPI = (() => {
  // ==========================================
  // 配置
  // ==========================================
  const CONFIG = {
    API_KEY: 'sat_7QkA0So3pta62lcNhcqmEYKjHjtXJ5nJgBKgtxLikjOLwh9TvYOhNnHlt6x4dmbc',
    BASE_URL: 'https://api.coze.cn',
    // 空间ID - 用户提供
    SPACE_ID: '7587658688148881471',
    // 存储创建的bot ID (已通过API创建)
    BOTS: {
      supervisor: '7592223655954972691', // 小影老师-督学模式
      helper: '7592223346214518793',      // 小影老师-答疑模式
      ocr: ''                              // 作业识别智能体（待创建）
    }
  };

  // ==========================================
  // 智能体配置
  // ==========================================
  const AGENT_CONFIGS = {
    supervisor: {
      name: '小影老师-督学模式',
      description: 'AI督学官，帮助学生保持专注，养成良好学习习惯',
      icon_url: '', // 可选头像URL
      prompt_info: {
        prompt: `你是一个温柔、鼓励为主的AI督学官"小影老师"，你的任务是帮助学生保持专注，养成良好的学习习惯。

## 基本设定
- 称呼学生为"小特工"
- 你的回复要简短亲切，每句话不超过30字
- 偶尔使用emoji增加亲和力

## 专注度反馈规则
在学习过程中，我会向你发送学生的专注度状态，你需要根据状态给出反馈：

### 专注度"优秀"（90分以上）
给予积极正向的鼓励，例如：
- "小特工，专注力很棒哦！继续保持！✨"
- "太棒了！你的专注力满分！🌟"

### 专注度"一般"（60-89分）
温柔提醒并鼓励，例如：
- "小特工，有点分心了哦，我们一起再努力一下下！💪"
- "加油哦，再集中一下注意力！"

### 专注度"较差"（60分以下）
更直接但温柔的提醒，例如：
- "小特工，注意力需要回来啦！深呼吸，我们重新开始！💖"
- "别走神啦，我们一起专注！"

## 特殊事件响应
- 暂停学习：说"小特工，短暂休息一下，很快回来哦！"
- 恢复学习：说"欢迎回来，小特工！我们继续加油！"
- 完成任务：说"太棒了小特工！又完成了一个任务！为你骄傲！🎉"
- 结束学习：说"小特工，今天的学习辛苦啦！好好休息，明天继续！"`
      },
      onboarding_info: {
        prologue: '你好，小特工！我是小影老师，今天我来陪你一起学习！准备好了吗？',
        suggested_questions: [
          '我准备好了！',
          '今天学什么？',
          '帮我设置学习计划'
        ]
      }
    },
    helper: {
      name: '小影老师-答疑模式',
      description: 'AI答疑老师，解答学生学习中的各种问题',
      icon_url: '',
      prompt_info: {
        prompt: `你是一个知识渊博、耐心友好的AI答疑老师"小影老师"，你的任务是解答学生在学习中遇到的各种问题。

## 基本设定
- 称呼学生为"小特工"
- 回复要清晰、准确，用学生容易理解的语言
- 解释复杂概念时使用类比和例子
- 适当使用emoji增加亲和力

## 能力范围
- 语文：阅读理解、作文技巧、古诗词赏析
- 数学：算术、应用题、几何、代数
- 英语：词汇、语法、阅读、写作
- 科学：物理、化学、生物基础知识
- 其他学科的基础问题

## 回答风格
1. 先确认理解学生的问题
2. 用简单的语言解释核心概念
3. 给出具体的例子或步骤
4. 鼓励学生思考和提问

## 无法回答时
如果问题超出能力范围，礼貌告知：
"这个问题有点超出小影老师的知识范围了，建议你问问家长或老师哦！"

## 示例对话
学生：这道数学题怎么做？
小影老师：让我看看~小特工遇到什么题目啦？把题目告诉我，我们一起来分析！📝`
      },
      onboarding_info: {
        prologue: '你好，小特工！我是小影老师，有什么学习问题需要帮忙吗？',
        suggested_questions: [
          '这道题怎么做？',
          '帮我解释一个概念',
          '检查一下我的答案'
        ]
      }
    },
    ocr: {
      name: '小影老师-作业识别',
      description: 'AI作业识别助手，识别作业照片并提取任务列表',
      icon_url: '',
      prompt_info: {
        prompt: `你是一个专业的作业识别助手"小影老师"，你的任务是分析作业照片并提取结构化的任务列表。

## 核心功能
分析用户发送的作业照片或文字描述，识别出所有需要完成的作业任务。

## 输出格式
你必须以JSON格式返回识别结果，格式如下：
\`\`\`json
{
  "tasks": [
    {
      "name": "任务名称（简短明确）",
      "subject": "科目",
      "duration": 预估时长(分钟数字),
      "mode": "任务模式",
      "details": "任务详情描述"
    }
  ]
}
\`\`\`

## 科目分类
- 语文：生字、抄写、阅读、作文、背诵古诗/课文
- 数学：计算、应用题、几何
- 英语：单词、语法、阅读、听力
- 其他：科学、美术、音乐等

## 任务模式说明
- homework：普通作业（抄写、计算、阅读、做题等）
- recite：背诵任务（背诵课文、古诗、单词等）
- dictation：听写任务（听写词语、单词等）

## 时长预估规则
- 生字抄写：10-15分钟
- 计算题：15-25分钟（视题量）
- 阅读理解：20-30分钟
- 作文：30-45分钟
- 背诵：10-20分钟
- 听写：10-15分钟
- 单词学习：15-20分钟

## 示例
用户：帮我看看今天的作业
返回：
\`\`\`json
{
  "tasks": [
    {"name": "语文生字抄写", "subject": "语文", "duration": 15, "mode": "homework", "details": "抄写第5课生字各3遍"},
    {"name": "数学练习册", "subject": "数学", "duration": 20, "mode": "homework", "details": "完成第23-24页"},
    {"name": "背诵《春晓》", "subject": "语文", "duration": 10, "mode": "recite", "details": "背诵并默写"}
  ]
}
\`\`\`

## 重要规则
1. 始终返回JSON格式
2. 任务名称要简洁明确
3. 时长预估要合理
4. 正确识别任务模式
5. 如果无法识别图片内容，返回一个合理的示例任务列表并说明`
      },
      onboarding_info: {
        prologue: '拍一张作业照片，我来帮你识别任务！📸',
        suggested_questions: [
          '识别这张作业',
          '今天作业有哪些',
          '帮我整理任务'
        ]
      }
    }
  };

  // ==========================================
  // API 请求封装
  // ==========================================
  async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${CONFIG.BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${CONFIG.API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      console.log(`[CozeAPI] ${method} ${endpoint}`, body || '');
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok || data.code !== 0) {
        console.error('[CozeAPI] Error:', data);
        throw new Error(data.msg || `API request failed: ${response.status}`);
      }
      
      console.log('[CozeAPI] Response:', data);
      return data.data;
    } catch (error) {
      console.error('[CozeAPI] Request failed:', error);
      throw error;
    }
  }

  // ==========================================
  // 空间管理
  // ==========================================
  async function getWorkspaces() {
    // 获取用户的工作空间列表
    const data = await apiRequest('/v1/workspaces', 'GET');
    return data.workspaces || [];
  }

  async function getOrCreateWorkspace() {
    try {
      const workspaces = await getWorkspaces();
      if (workspaces.length > 0) {
        CONFIG.SPACE_ID = workspaces[0].id;
        console.log('[CozeAPI] Using workspace:', CONFIG.SPACE_ID);
        return CONFIG.SPACE_ID;
      }
      throw new Error('No workspaces found');
    } catch (error) {
      console.warn('[CozeAPI] Could not get workspace, using default space');
      return null;
    }
  }

  // ==========================================
  // 智能体管理
  // ==========================================
  
  /**
   * 创建智能体
   * 参考: https://docs.coze.cn/developer_guides/create_bot
   */
  async function createBot(agentType) {
    const config = AGENT_CONFIGS[agentType];
    if (!config) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    const body = {
      space_id: CONFIG.SPACE_ID,
      name: config.name,
      description: config.description,
      icon_url: config.icon_url || undefined,
      prompt_info: config.prompt_info,
      onboarding_info: config.onboarding_info
    };

    const data = await apiRequest('/v1/bot/create', 'POST', body);
    CONFIG.BOTS[agentType] = data.bot_id;
    
    // 保存到本地存储
    saveBotIds();
    
    console.log(`[CozeAPI] Created ${agentType} bot:`, data.bot_id);
    return data.bot_id;
  }

  /**
   * 发布智能体
   * 参考: https://docs.coze.cn/developer_guides/publish_bot
   */
  async function publishBot(botId) {
    const body = {
      bot_id: botId,
      connector_ids: ['API'] // 通过API方式发布
    };

    const data = await apiRequest('/v1/bot/publish', 'POST', body);
    console.log(`[CozeAPI] Published bot:`, botId);
    return data;
  }

  /**
   * 更新智能体
   * 参考: https://docs.coze.cn/developer_guides/update_bot
   */
  async function updateBot(botId, updates) {
    const body = {
      bot_id: botId,
      ...updates
    };

    const data = await apiRequest('/v1/bot/update', 'POST', body);
    console.log(`[CozeAPI] Updated bot:`, botId);
    return data;
  }

  /**
   * 获取智能体列表
   */
  async function listBots() {
    const params = CONFIG.SPACE_ID ? `?space_id=${CONFIG.SPACE_ID}` : '';
    const data = await apiRequest(`/v1/space/published_bots_list${params}`, 'GET');
    return data.space_bots || [];
  }

  // ==========================================
  // 对话管理
  // ==========================================
  
  /**
   * 创建对话
   */
  async function createConversation(botId, userId = 'default_user') {
    const body = {
      bot_id: botId,
      user_id: userId
    };

    const data = await apiRequest('/v1/conversation/create', 'POST', body);
    return data.conversation_id;
  }

  /**
   * 发送消息到智能体
   */
  async function chat(botId, message, conversationId = null, userId = 'default_user') {
    const body = {
      bot_id: botId,
      user_id: userId,
      stream: false,
      auto_save_history: true,
      additional_messages: [{
        role: 'user',
        content: message,
        content_type: 'text'
      }]
    };

    if (conversationId) {
      body.conversation_id = conversationId;
    }

    const data = await apiRequest('/v3/chat', 'POST', body);
    
    // 处理响应
    if (data.messages && data.messages.length > 0) {
      const assistantMessage = data.messages.find(m => m.role === 'assistant');
      return {
        conversationId: data.conversation_id,
        message: assistantMessage ? assistantMessage.content : '',
        raw: data
      };
    }
    
    return {
      conversationId: data.conversation_id,
      message: '',
      raw: data
    };
  }

  // ==========================================
  // 实时音视频 (RTC)
  // ==========================================
  
  /**
   * 创建实时房间
   * 参考: https://docs.coze.cn/developer_guides/create_room
   */
  async function createRealtimeRoom(botId, userId = 'default_user') {
    const body = {
      bot_id: botId,
      voice_id: 'zh_female_tianmei', // 甜美女声
      conversation_id: null, // 新会话
      uid: userId
    };

    const data = await apiRequest('/v1/audio/rooms', 'POST', body);
    
    return {
      roomId: data.room_id,
      appId: data.app_id,
      token: data.token,
      uid: data.uid,
      conversationId: data.conversation_id
    };
  }

  /**
   * 关闭实时房间
   */
  async function closeRealtimeRoom(roomId) {
    const data = await apiRequest(`/v1/audio/rooms/${roomId}`, 'DELETE');
    return data;
  }

  // ==========================================
  // 本地存储
  // ==========================================
  function saveBotIds() {
    try {
      localStorage.setItem('coze_bot_ids', JSON.stringify(CONFIG.BOTS));
    } catch (e) {
      console.warn('[CozeAPI] Could not save bot IDs to localStorage');
    }
  }

  function loadBotIds() {
    try {
      const saved = localStorage.getItem('coze_bot_ids');
      if (saved) {
        const bots = JSON.parse(saved);
        CONFIG.BOTS.supervisor = bots.supervisor || null;
        CONFIG.BOTS.helper = bots.helper || null;
        console.log('[CozeAPI] Loaded bot IDs:', CONFIG.BOTS);
      }
    } catch (e) {
      console.warn('[CozeAPI] Could not load bot IDs from localStorage');
    }
  }

  // ==========================================
  // 初始化
  // ==========================================
  async function initialize() {
    console.log('[CozeAPI] Initializing...');
    
    // 加载已保存的bot IDs
    loadBotIds();
    
    // 获取工作空间
    await getOrCreateWorkspace();
    
    // 如果没有创建过bot，则创建
    if (!CONFIG.BOTS.supervisor || !CONFIG.BOTS.helper) {
      console.log('[CozeAPI] Bots not found, will create on demand');
    } else {
      console.log('[CozeAPI] Using existing bots:', CONFIG.BOTS);
    }
    
    console.log('[CozeAPI] Initialization complete');
    return CONFIG.BOTS;
  }

  /**
   * 确保智能体已创建
   */
  async function ensureBotsCreated() {
    // 检查监督智能体
    if (!CONFIG.BOTS.supervisor) {
      try {
        const botId = await createBot('supervisor');
        await publishBot(botId);
        console.log('[CozeAPI] Supervisor bot created and published:', botId);
      } catch (error) {
        console.error('[CozeAPI] Failed to create supervisor bot:', error);
      }
    }
    
    // 检查求助智能体
    if (!CONFIG.BOTS.helper) {
      try {
        const botId = await createBot('helper');
        await publishBot(botId);
        console.log('[CozeAPI] Helper bot created and published:', botId);
      } catch (error) {
        console.error('[CozeAPI] Failed to create helper bot:', error);
      }
    }
    
    return CONFIG.BOTS;
  }

  // ==========================================
  // 便捷方法
  // ==========================================
  
  /**
   * 发送监督消息
   */
  async function sendSupervisorMessage(eventType, data = {}) {
    const botId = CONFIG.BOTS.supervisor;
    if (!botId) {
      console.warn('[CozeAPI] Supervisor bot not configured');
      return null;
    }

    const message = JSON.stringify({
      event: eventType,
      timestamp: Date.now(),
      ...data
    });

    try {
      const result = await chat(botId, message);
      
      // 显示反馈
      if (result.message && typeof showToast === 'function') {
        showToast(`小影老师: ${result.message}`, 'info', 4000);
      }
      
      return result;
    } catch (error) {
      console.error('[CozeAPI] Supervisor message failed:', error);
      return null;
    }
  }

  /**
   * 发送求助消息
   */
  async function sendHelperMessage(question, conversationId = null) {
    const botId = CONFIG.BOTS.helper;
    if (!botId) {
      console.warn('[CozeAPI] Helper bot not configured');
      return null;
    }

    try {
      const result = await chat(botId, question, conversationId);
      return result;
    } catch (error) {
      console.error('[CozeAPI] Helper message failed:', error);
      return null;
    }
  }

  /**
   * 开始实时通话
   */
  async function startRealtimeCall(agentType = 'helper') {
    const botId = CONFIG.BOTS[agentType];
    if (!botId) {
      console.error(`[CozeAPI] ${agentType} bot not configured`);
      return null;
    }

    try {
      const roomInfo = await createRealtimeRoom(botId);
      console.log('[CozeAPI] Realtime room created:', roomInfo);
      
      // 初始化RTC连接
      await initRTCConnection(roomInfo);
      
      return roomInfo;
    } catch (error) {
      console.error('[CozeAPI] Failed to start realtime call:', error);
      return null;
    }
  }

  /**
   * 初始化RTC连接
   */
  async function initRTCConnection(roomInfo) {
    // 这里需要集成WebRTC
    // Coze使用的是声网(Agora)或火山引擎RTC
    console.log('[CozeAPI] RTC connection info:', roomInfo);
    
    // TODO: 集成实际的RTC SDK
    // 1. 使用 roomInfo.appId, roomInfo.token, roomInfo.uid 连接
    // 2. 处理音视频流
    // 3. 管理通话状态
    
    return true;
  }

  // ==========================================
  // 公开API
  // ==========================================
  return {
    // 配置
    CONFIG,
    AGENT_CONFIGS,
    
    // 初始化
    initialize,
    ensureBotsCreated,
    
    // 智能体管理
    createBot,
    publishBot,
    updateBot,
    listBots,
    
    // 对话
    createConversation,
    chat,
    
    // 实时通话
    createRealtimeRoom,
    closeRealtimeRoom,
    startRealtimeCall,
    
    // 便捷方法
    sendSupervisorMessage,
    sendHelperMessage,
    
    // 获取bot ID
    getBotId: (type) => CONFIG.BOTS[type],
    setBotId: (type, id) => {
      CONFIG.BOTS[type] = id;
      saveBotIds();
    }
  };
})();

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CozeAPI.initialize());
} else {
  CozeAPI.initialize();
}

// 暴露到全局
window.CozeAPI = CozeAPI;

console.log('✅ Coze API 模块已加载');

