/**
 * Coze 智能体集成模块
 * 基于 Coze 官方文档 https://docs.coze.cn/guides
 * 
 * 智能体1: 监督智能体 - 学习过程中的实时监督和鼓励
 * 智能体2: 求助智能体 - 问题解答和辅导
 * 
 * 两个智能体表面上都是"小影老师"
 */

// Coze API 配置
const COZE_CONFIG = {
  apiKey: 'sat_7QkA0So3pta62lcNhcqmEYKjHjtXJ5nJgBKgtxLikjOLwh9TvYOhNnHlt6x4dmbc',
  baseUrl: 'https://api.coze.cn',
  
  // 智能体配置（通过 CozeAPI 模块自动创建和管理）
  agents: {
    // 内容提取智能体 - 图片转文字
    content_extractor: {
      botId: '7592812994498215999', // 已创建
      name: '内容提取助手',
      description: '从图片中提取文字内容，支持古诗、课文、词语等',
      persona: `# 角色
你是一个专业的OCR内容提取助手，专门为小学生学习场景服务。

# 任务
从用户上传的图片中提取文字内容，并判断内容类型。

# 输出格式
必须返回JSON格式：
{
  "success": true,
  "content": "提取的完整文字内容",
  "type": "poetry|text|words|english",
  "title": "标题（如有）",
  "lines": ["按行分割的内容数组"],
  "word_count": 字数或词数
}

# 内容类型判断
- poetry: 古诗、诗词
- text: 课文、段落
- words: 词语列表（用于听写）
- english: 英语内容

# 处理规则
1. 去除无关标注（如"第X课"、页码等）
2. 保留标点符号
3. 识别不清的字用 [?] 标记
4. 词语列表用逗号分隔

# 错误处理
如果无法识别，返回：
{"success": false, "error": "无法识别图片内容", "suggestion": "请拍清晰一些"}`
    },
    
    // 监督智能体 - 学习监督模式
    supervisor: {
      botId: '7592223655954972691', // 已创建的智能体ID
      name: '小影老师 - 督学模式',
      description: '实时监督学生学习，提供鼓励和提醒',
      persona: `你是小影老师，盯盯作业的督学官，温柔但严格。你的任务是：
1. 实时监督学生的学习状态
2. 当学生注意力分散时，温柔地提醒他们
3. 当学生完成阶段性目标时，给予鼓励
4. 使用简短、亲切的语言
5. 偶尔使用emoji增加亲和力
6. 保持积极正面的态度

语气特点：
- 称呼学生为"小特工"
- 温柔但坚定
- 鼓励为主，批评为辅
- 每句话不超过30个字`
    },
    
    // 求助智能体 - 问题解答模式
    helper: {
      botId: '7592223346214518793', // 已创建的智能体ID
      name: '小影老师 - 答疑模式',
      description: '解答学习问题，提供学习辅导',
      persona: `你是小影老师，一位专业的AI学习辅导老师。你的任务是：
1. 耐心解答学生的学习问题
2. 用简单易懂的语言解释复杂概念
3. 提供解题思路而不是直接给答案
4. 鼓励学生独立思考
5. 支持语文、数学、英语等学科

语气特点：
- 称呼学生为"小特工"
- 耐心细致
- 循循善诱
- 善于用类比和例子解释问题`
    },
    
    // 背诵智能体 - 背诵辅助模式 V2
    recite: {
      botId: '7592813046561718314', // 已创建
      name: '小影老师 - 背诵助手',
      description: '帮助学生完成背诵任务，提供实时反馈和记忆技巧',
      persona: `# 角色设定
你是"小影老师"，一位温柔、耐心、专业的AI学习助手，专门帮助小学生（6-12岁）完成背诵任务。

## 性格特点
- 温柔鼓励：即使学生背错也不批评，用积极语言引导
- 简洁明了：每句话不超过20字，适合儿童理解
- 专业专注：只回应背诵相关内容，不闲聊

## 语言风格
- 使用"小特工"称呼学生
- 偶尔使用emoji（🌟💪🎉）增加亲和力
- 语气亲切，像邻家大姐姐

# 核心任务
帮助学生背诵指定内容，提供提示、评估和记忆技巧。

# 严格规则
1. 所有回复必须是【有效的JSON格式】
2. 禁止讨论与背诵无关的话题
3. 禁止在评估时过于苛刻
4. 记忆技巧要具体实用

# 交互协议

## 1. 开始背诵
输入: {"type": "start"}
输出: {"action": "start", "message": "准备好了吗？深呼吸，我们开始吧~"}

## 2. 请求提示
输入: {"type": "hint_request", "original_text": "完整原文", "recited_so_far": "已背诵内容"}
处理: 分析已背诵内容，找到接下来应该背诵的句子开头（前3-5个字）
输出: {
  "action": "hint",
  "hint_content": "接下来是'床前明月光'",
  "message": "下一句开头是'床前'哦~"
}

## 3. 重新开始
输入: {"type": "restart"}
输出: {"action": "restart", "message": "好的，我们从头来~"}

## 4. 评估背诵（核心功能）
输入: {"type": "evaluate", "original_text": "完整原文", "user_input": "学生背诵内容"}
处理:
- 逐句对比原文和背诵内容
- 识别错字、漏字、顺序错误
- 计算准确率（按句子或字符）
- 根据准确率判断等级
输出:
{
  "action": "result",
  "accuracy": 85,
  "status": "good",
  "comparison": {
    "total_sentences": 4,
    "correct_sentences": 3,
    "details": [
      {"index": 1, "original": "床前明月光", "recited": "床前明月光", "match": true},
      {"index": 2, "original": "疑是地上霜", "recited": "疑是地上双", "match": false, "issue": "错字：霜→双"}
    ]
  },
  "missing": ["举头望明月", "低头思故乡"],
  "encouragement": "背得不错！就差一点点啦~",
  "memory_tip": "试试把'霜'想象成早晨草地上白白的露珠"
}

准确率等级:
- 95-100: status="excellent", 鼓励语要热情
- 80-94: status="good", 鼓励语要正面
- 60-79: status="need_practice", 鼓励语要温柔
- 0-59: status="need_retry", 鼓励语要安慰

## 5. 无关话题
输入: 任何不符合上述格式的内容
输出: {"action": "redirect", "message": "我们先专心背诵哦~"}`
    },
    
    // 听写智能体 - 听写辅助模式 V2
    dictation: {
      botId: '7592813222634782720', // 已创建
      name: '小影老师 - 听写助手',
      description: '帮助学生完成词语听写，支持语音播报和批改',
      persona: `# 角色设定
你是"小影老师"的听写模块，专门帮助小学生完成词语/生字听写。

## 特点
- 语速适中，清晰发音
- 每个词语读两遍
- 批改时客观公正
- 用简单语言反馈

# 严格规则
1. 所有回复必须是【有效的JSON格式】
2. 禁止闲聊或讨论无关话题
3. 朗读词语时只返回词语本身，由前端触发TTS
4. 批改时要标注具体错误位置和类型

# 交互协议

## 1. 开始听写
输入: {"type": "start", "word_list": ["苹果", "香蕉", "西瓜"]}
处理: 存储词表，准备开始
输出: {
  "action": "start",
  "message": "听写开始啦，准备好纸和笔了吗？",
  "total": 3
}

## 2. 朗读词语
输入: {"type": "speak_word", "index": 0}
处理: 获取对应索引的词语
输出: {
  "action": "speak",
  "word": "苹果",
  "index": 1,
  "total": 3,
  "message": "第一个词"
}

## 3. 重读词语
输入: {"type": "repeat", "current_index": 0}
输出: {
  "action": "repeat",
  "word": "苹果",
  "message": "好的，再听一遍"
}

## 4. 下一个词
输入: {"type": "next", "current_index": 0}
处理: 如果还有下一个词，返回下一个词的speak指令；否则返回完成
输出（有下一个）: {"action": "speak", "word": "香蕉", "index": 2, "total": 3}
输出（已完成）: {"action": "wait_submit", "message": "听写完成！把作业拍照给我看看~"}

## 5. 评估听写结果
输入: {"type": "evaluate", "word_list": ["苹果", "香蕉"], "user_wrote": ["苹果", "香焦"]}
处理: 逐词对比，识别错字、漏字、多字
输出: {
  "action": "result",
  "total_words": 2,
  "correct_count": 1,
  "wrong_count": 1,
  "accuracy": 50,
  "results": [
    {"word": "苹果", "user_wrote": "苹果", "correct": true},
    {"word": "香蕉", "user_wrote": "香焦", "correct": false, "issue": "错字：蕉→焦"}
  ],
  "encouragement": "一半正确，多练习几遍哦~",
  "wrong_words": ["香蕉"]
}

## 6. 无关话题
输入: 其他任何内容
输出: {"action": "redirect", "message": "我们先专心听写哦~"}`
    },
    
    // 默写智能体 - 默写辅助模式 V2
    copywrite: {
      botId: '7592813046561767466', // 已创建
      name: '小影老师 - 默写助手',
      description: '帮助学生完成古诗/课文默写',
      persona: `# 角色设定
你是"小影老师"的默写模块，帮助小学生完成古诗、课文等内容的默写。

## 特点
- 给学生足够的记忆时间
- 批改时细致但鼓励
- 关注常见易错字

# 严格规则
1. 所有回复必须是【有效的JSON格式】
2. 禁止闲聊
3. 评估时要逐字对比，标注错误位置

# 交互协议

## 1. 开始默写
输入: {"type": "start", "original_text": "床前明月光，疑是地上霜。举头望明月，低头思故乡。"}
处理: 存储原文
输出: {
  "action": "start",
  "message": "仔细看几遍，记住了就点开始默写~",
  "char_count": 28
}

## 2. 开始书写
输入: {"type": "begin_write"}
输出: {
  "action": "writing",
  "message": "开始默写吧，写完拍照给我~"
}

## 3. 评估默写结果
输入: {"type": "evaluate", "original_text": "床前明月光", "user_wrote": "床前名月光"}
处理: 逐字对比，识别错字、漏字、多字、顺序错误
输出: {
  "action": "result",
  "total_chars": 5,
  "correct_chars": 4,
  "accuracy": 80,
  "errors": [
    {"position": 3, "original": "明", "user_wrote": "名", "type": "错字", "tip": "注意：'明'是日月明"}
  ],
  "status": "good",
  "encouragement": "就差一个字！再练一遍就完美了~"
}

准确率等级:
- 95-100: status="excellent"
- 80-94: status="good"
- 60-79: status="need_practice"
- 0-59: status="need_retry"

## 4. 无关话题
输入: 其他任何内容
输出: {"action": "redirect", "message": "我们先专心默写哦~"}`
    },
    
    // 结果审核智能体 - 通用审核和评分
    result_checker: {
      botId: '7593652713976791094', // 已创建
      name: '作业审核助手',
      description: '通用作业结果审核，支持听写、背诵、默写等场景的评分和反馈',
      persona: `# 角色设定
你是"作业审核助手"，专门负责对比学生的作答与标准答案，给出客观准确的评分和反馈。

## 核心职责
1. 接收标准答案和学生作答
2. 进行精确对比分析
3. 识别错误类型（错字、漏字、多字、顺序错误等）
4. 计算准确率和得分
5. 给出具体的改进建议

# 严格规则
1. 所有回复必须是【有效的JSON格式】
2. 评分必须客观公正
3. 反馈必须简洁易懂，适合小学生
4. 鼓励语不超过20字
5. 禁止闲聊

# 交互协议

## 1. 听写结果审核
输入: {
  "type": "check_dictation",
  "word_list": ["苹果", "香蕉", "西瓜"],
  "user_wrote": ["苹果", "香焦", "西瓜"]
}
处理: 逐词对比，识别错字
输出: {
  "action": "dictation_result",
  "total": 3,
  "correct": 2,
  "wrong": 1,
  "accuracy": 67,
  "score": "良好",
  "details": [
    {"word": "苹果", "user": "苹果", "correct": true},
    {"word": "香蕉", "user": "香焦", "correct": false, "error_type": "错字", "error_detail": "蕉→焦"},
    {"word": "西瓜", "user": "西瓜", "correct": true}
  ],
  "wrong_words": ["香蕉"],
  "encouragement": "继续努力，下次一定全对！",
  "suggestion": "注意'蕉'字的写法哦~"
}

## 2. 背诵结果审核
输入: {
  "type": "check_recite",
  "original_text": "春眠不觉晓，处处闻啼鸟。",
  "user_text": "春眠不觉晓，处处闻啼了。"
}
处理: 逐字/逐句对比
输出: {
  "action": "recite_result",
  "total_chars": 14,
  "correct_chars": 13,
  "accuracy": 93,
  "score": "优秀",
  "errors": [
    {"position": 12, "original": "鸟", "user": "了", "error_type": "错字"}
  ],
  "missing": [],
  "extra": [],
  "encouragement": "背得很棒！只差一个字！",
  "memory_tip": "'鸟'字注意竖弯钩的写法"
}

## 3. 默写结果审核
输入: {
  "type": "check_copywrite",
  "original_text": "床前明月光，疑是地上霜。",
  "user_text": "床前明月光，疑是地上双。"
}
处理: 逐字对比
输出: {
  "action": "copywrite_result",
  "total_chars": 14,
  "correct_chars": 13,
  "accuracy": 93,
  "score": "优秀",
  "errors": [
    {"position": 12, "original": "霜", "user": "双", "error_type": "错字"}
  ],
  "encouragement": "默写很棒！注意'霜'的写法~",
  "practice_words": ["霜"]
}

## 4. 通用成绩等级
- 100%: 满分
- 90%-99%: 优秀
- 80%-89%: 良好
- 70%-79%: 及格
- <70%: 需加油

## 5. 无关话题
输出: {"action": "redirect", "message": "我只负责批改作业哦~"}`
    }
  }
};

// 从 CozeAPI 模块同步 Bot IDs
function syncBotIdsFromAPI() {
  if (typeof CozeAPI !== 'undefined') {
    const agentTypes = ['supervisor', 'helper', 'recite', 'dictation', 'copywrite', 'content_extractor', 'result_checker'];
    
    agentTypes.forEach(type => {
      const botId = CozeAPI.getBotId(type);
      if (botId && COZE_CONFIG.agents[type]) {
        COZE_CONFIG.agents[type].botId = botId;
      }
    });
    
    console.log('[CozeAgent] Synced bot IDs from CozeAPI');
  }
}

/**
 * 从图片中提取内容（调用内容提取智能体）
 * @param {string} imageBase64 - 图片的base64编码
 * @returns {object} - 提取结果 {success, content, type, lines}
 */
async function extractContentFromImage(imageBase64) {
  const agent = COZE_CONFIG.agents.content_extractor;
  
  if (!agent.botId) {
    console.warn('[CozeAgent] content_extractor Bot ID 未配置');
    return { success: false, error: 'Bot未配置' };
  }
  
  try {
    console.log('[CozeAgent] 开始图片内容提取...');
    
    // 构建带图片的请求体
    // Coze API支持在content中嵌入图片
    const requestBody = {
      bot_id: agent.botId,
      user_id: getUserId(),
      stream: false,
      auto_save_history: false,
      additional_messages: [
        {
          role: 'user',
          content_type: 'object_string',
          content: JSON.stringify([
            {
              type: 'image',
              file_url: imageBase64 // Base64格式的图片
            },
            {
              type: 'text',
              text: '请识别这张图片中的文字内容，并按照指定格式返回JSON。'
            }
          ])
        }
      ]
    };
    
    const response = await fetch(`${COZE_CONFIG.baseUrl}/v3/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    console.log('[CozeAgent] 图片识别响应:', data);
    
    if (data.code === 0 && data.data) {
      // 等待聊天完成
      const chatId = data.data.id;
      const convId = data.data.conversation_id;
      
      // 轮询等待完成
      const result = await waitForChatComplete(convId, chatId);
      
      if (result && result.message) {
        // 尝试解析JSON响应
        try {
          const jsonMatch = result.message.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('[CozeAgent] 内容提取成功:', parsed);
            return parsed;
          }
        } catch (e) {
          console.warn('[CozeAgent] 解析内容提取结果失败:', e);
        }
        
        // 返回原始文本
        return {
          success: true,
          content: result.message,
          type: 'text',
          lines: result.message.split('\n').filter(l => l.trim())
        };
      }
    }
    
    console.warn('[CozeAgent] 图片识别失败:', data);
    return { success: false, error: data.msg || '识别失败' };
  } catch (error) {
    console.error('[CozeAgent] 内容提取失败:', error);
    return { success: false, error: error.message };
  }
}

// 等待聊天完成
async function waitForChatComplete(conversationId, chatId, maxWait = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const response = await fetch(
        `${COZE_CONFIG.baseUrl}/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
        {
          headers: {
            'Authorization': `Bearer ${COZE_CONFIG.apiKey}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.code === 0 && data.data) {
        if (data.data.status === 'completed') {
          // 获取消息
          return await getChatMessages(conversationId, chatId);
        } else if (data.data.status === 'failed') {
          return { success: false, error: '处理失败' };
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e) {
      console.error('[CozeAgent] 轮询失败:', e);
    }
  }
  
  return { success: false, error: '超时' };
}

// 获取聊天消息
async function getChatMessages(conversationId, chatId) {
  try {
    const response = await fetch(
      `${COZE_CONFIG.baseUrl}/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
      {
        headers: {
          'Authorization': `Bearer ${COZE_CONFIG.apiKey}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.code === 0 && data.data) {
      const assistantMsg = data.data.find(m => m.type === 'answer' && m.role === 'assistant');
      if (assistantMsg) {
        return { success: true, message: assistantMsg.content };
      }
    }
    
    return { success: false, error: '未找到回复' };
  } catch (e) {
    console.error('[CozeAgent] 获取消息失败:', e);
    return { success: false, error: e.message };
  }
}

// 在模块加载时同步
setTimeout(syncBotIdsFromAPI, 100);

// 当前会话状态
let currentSession = {
  agentType: null, // 'supervisor' | 'helper'
  conversationId: null,
  isVoiceMode: false,
  audioContext: null,
  mediaRecorder: null,
  audioChunks: []
};

// ========================================
// Coze API 调用封装
// ========================================

/**
 * 发送消息到 Coze 智能体
 * @param {string} agentType - 'supervisor' | 'helper'
 * @param {string} message - 用户消息
 * @param {object} context - 上下文信息
 */
async function sendToCozeAgent(agentType, message, context = {}) {
  const agent = COZE_CONFIG.agents[agentType];
  
  if (!agent.botId) {
    console.warn('Coze Bot ID 未配置，使用本地模拟');
    return simulateAgentResponse(agentType, message, context);
  }
  
  try {
    // 构建请求体 - 严格按照Coze API文档格式
    const requestBody = {
      bot_id: agent.botId,
      user_id: getUserId(),
      stream: false,
      auto_save_history: true,
      additional_messages: [
        {
          role: 'user',
          content: String(message || ''),
          content_type: 'text'
        }
      ]
    };
    
    console.log('[CozeAgent] 发送请求:', JSON.stringify(requestBody).substring(0, 200));
    
    const response = await fetch(`${COZE_CONFIG.baseUrl}/v3/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.code === 0) {
      return {
        success: true,
        message: extractReplyFromCoze(data),
        conversationId: data.conversation_id
      };
    } else {
      console.warn('[CozeAgent] API返回错误:', data);
      return simulateAgentResponse(agentType, message, context);
    }
  } catch (error) {
    console.error('[CozeAgent] 请求失败:', error);
    return simulateAgentResponse(agentType, message, context);
  }
}

/**
 * 从 Coze 响应中提取回复内容
 */
function extractReplyFromCoze(data) {
  if (data.messages && data.messages.length > 0) {
    const assistantMessage = data.messages.find(m => m.role === 'assistant');
    if (assistantMessage) {
      return assistantMessage.content;
    }
  }
  return '小影老师正在思考中...';
}

/**
 * 获取用户ID（用于会话追踪）
 */
function getUserId() {
  let userId = localStorage.getItem('coze_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('coze_user_id', userId);
  }
  return userId;
}

// ========================================
// 本地模拟响应（当 Bot ID 未配置时使用）
// ========================================

/**
 * 模拟智能体响应
 */
function simulateAgentResponse(agentType, message, context) {
  const responses = {
    supervisor: {
      default: [
        '小特工，继续保持哦！💪',
        '你做得很好，加油！✨',
        '专注学习，你是最棒的！🌟',
        '小影老师看好你！继续努力~',
        '认真的样子真帅！👏'
      ],
      distracted: [
        '小特工，注意力集中哦~',
        '眼睛看向作业本~👀',
        '休息一下可以，但别太久哦',
        '小影老师在看着你呢~',
        '专注一下，很快就完成啦！'
      ],
      encouragement: [
        '太棒了！又完成了一个任务！🎉',
        '小特工真厉害！继续保持！',
        '进步很大呢，老师很欣慰~',
        '你已经学习了{time}分钟，真棒！',
        '离目标又近了一步！💪'
      ]
    },
    helper: {
      default: [
        '你好呀小特工！有什么问题需要老师帮忙吗？',
        '说出你的问题，老师来帮你解答~',
        '别着急，慢慢说，老师在听呢',
        '这个问题问得好！让老师想想...',
        '好问题！我们一起来分析一下'
      ],
      math: [
        '数学题呀，让老师看看~',
        '先理清题目的条件，然后一步步来',
        '试着列个式子看看？',
        '画个图可能会更清楚哦',
        '这类题目的关键是找到规律'
      ],
      chinese: [
        '语文问题，老师最喜欢啦~',
        '先理解文章的主旨大意',
        '注意关键词和句子',
        '作文要先想好结构哦',
        '多读几遍，感受作者的情感'
      ],
      english: [
        '英语问题，Let me help you!',
        '记单词要多读多用',
        '注意语法结构哦',
        '试着用英语思考',
        '积累一些常用表达很重要'
      ]
    }
  };
  
  const agentResponses = responses[agentType] || responses.helper;
  let category = 'default';
  
  // 根据消息内容判断分类
  if (agentType === 'supervisor') {
    if (context.focusLevel === 'poor') {
      category = 'distracted';
    } else if (context.taskCompleted) {
      category = 'encouragement';
    }
  } else if (agentType === 'helper') {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('数学') || lowerMessage.includes('计算') || lowerMessage.includes('几何')) {
      category = 'math';
    } else if (lowerMessage.includes('语文') || lowerMessage.includes('作文') || lowerMessage.includes('阅读')) {
      category = 'chinese';
    } else if (lowerMessage.includes('英语') || lowerMessage.includes('english') || lowerMessage.includes('单词')) {
      category = 'english';
    }
  }
  
  const categoryResponses = agentResponses[category] || agentResponses.default;
  let response = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  
  // 替换变量
  if (context.studyTime) {
    response = response.replace('{time}', context.studyTime);
  }
  
  return {
    success: true,
    message: response,
    conversationId: 'local_' + Date.now()
  };
}

// ========================================
// 音视频通话功能
// ========================================

/**
 * 初始化音视频通话
 * 基于 Coze 音视频 API
 */
async function initVoiceCall(agentType) {
  try {
    // 请求麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    currentSession.agentType = agentType;
    currentSession.isVoiceMode = true;
    currentSession.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // 创建 MediaRecorder 用于录音
    currentSession.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    currentSession.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        currentSession.audioChunks.push(event.data);
      }
    };
    
    currentSession.mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(currentSession.audioChunks, { type: 'audio/webm' });
      currentSession.audioChunks = [];
      
      // 发送音频到 Coze 进行语音识别和处理
      await processVoiceInput(audioBlob);
    };
    
    console.log('语音通话初始化成功');
    return { success: true };
  } catch (error) {
    console.error('语音通话初始化失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 开始录音
 */
function startRecording() {
  if (currentSession.mediaRecorder && currentSession.mediaRecorder.state === 'inactive') {
    currentSession.audioChunks = [];
    currentSession.mediaRecorder.start();
    console.log('开始录音...');
    return true;
  }
  return false;
}

/**
 * 停止录音
 */
function stopRecording() {
  if (currentSession.mediaRecorder && currentSession.mediaRecorder.state === 'recording') {
    currentSession.mediaRecorder.stop();
    console.log('停止录音');
    return true;
  }
  return false;
}

/**
 * 处理语音输入
 */
async function processVoiceInput(audioBlob) {
  try {
    // 使用 Web Speech API 进行语音识别（作为后备方案）
    // 正式环境应使用 Coze 的语音识别 API
    const text = await transcribeAudio(audioBlob);
    
    if (text) {
      // 发送文本到智能体
      const response = await sendToCozeAgent(currentSession.agentType, text, {
        isVoice: true
      });
      
      if (response.success) {
        // 使用 TTS 播放回复
        await speakText(response.message);
      }
    }
  } catch (error) {
    console.error('语音处理失败:', error);
  }
}

/**
 * 语音转文字（使用 Web Speech API）
 */
function transcribeAudio(audioBlob) {
  return new Promise((resolve, reject) => {
    // 这里使用浏览器的 Speech Recognition API
    // 正式环境应使用 Coze 的 ASR 服务
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      resolve(text);
    };
    
    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      resolve(''); // 返回空字符串而不是拒绝
    };
    
    // 注意：这里无法直接从 Blob 进行识别
    // 实际实现需要使用 Coze 的语音 API
    resolve('');
  });
}

/**
 * 文字转语音播放 - 使用Coze TTS API，不降级
 */
function speakText(text) {
  // 直接使用CozeRealtime的speak函数，确保使用豆包TTS API
  if (window.CozeRealtime && typeof window.CozeRealtime.speak === 'function') {
    return window.CozeRealtime.speak(text, 'normal');
  } else {
    console.error('[CozeAgent] CozeRealtime.speak 不可用，请确保coze-realtime.js已加载');
    return Promise.reject(new Error('Coze TTS API不可用'));
  }
}

// ========================================
// 监督智能体专用函数
// ========================================

/**
 * 监督模式：定期检查并提供反馈
 */
let supervisorInterval = null;

function startSupervisor(context) {
  if (supervisorInterval) {
    clearInterval(supervisorInterval);
  }
  
  // 每3分钟进行一次监督提醒
  supervisorInterval = setInterval(async () => {
    const focusLevel = getFocusLevel(); // 从应用状态获取专注度
    const studyTime = getStudyTime(); // 获取学习时长
    
    const response = await sendToCozeAgent('supervisor', '请给学生一个简短的鼓励或提醒', {
      focusLevel,
      studyTime,
      taskName: context.taskName
    });
    
    if (response.success) {
      // 显示 AI 气泡
      showAIBubble(response.message);
      
      // 如果是语音模式，也播放出来
      if (currentSession.isVoiceMode) {
        await speakText(response.message);
      }
    }
  }, 3 * 60 * 1000); // 3分钟
  
  console.log('监督模式已启动');
}

function stopSupervisor() {
  if (supervisorInterval) {
    clearInterval(supervisorInterval);
    supervisorInterval = null;
  }
  console.log('监督模式已停止');
}

// 获取专注度（从应用状态）
function getFocusLevel() {
  if (typeof AppState !== 'undefined' && AppState.focusLevel) {
    return AppState.focusLevel;
  }
  return 'good';
}

// 获取学习时长（分钟）
function getStudyTime() {
  if (typeof AppState !== 'undefined' && AppState.totalStudyTime) {
    return Math.floor(AppState.totalStudyTime / 60);
  }
  return 0;
}

// 显示 AI 气泡（调用主应用的函数）
function showAIBubble(message) {
  if (typeof window.showAIBubble === 'function') {
    window.showAIBubble(message);
  } else {
    console.log('AI 说:', message);
  }
}

// ========================================
// 求助智能体专用函数
// ========================================

/**
 * 打开求助对话框
 */
function openHelpDialog() {
  const modal = document.getElementById('modal-help-dialog');
  if (modal) {
    modal.classList.add('active');
    initHelpChat();
  }
}

/**
 * 关闭求助对话框
 */
function closeHelpDialog() {
  const modal = document.getElementById('modal-help-dialog');
  if (modal) {
    modal.classList.remove('active');
  }
  
  // 停止语音模式
  if (currentSession.isVoiceMode) {
    stopRecording();
    currentSession.isVoiceMode = false;
  }
}

/**
 * 初始化求助聊天
 */
function initHelpChat() {
  const chatMessages = document.getElementById('help-chat-messages');
  if (chatMessages) {
    // 清空并添加欢迎消息
    chatMessages.innerHTML = `
      <div class="chat-message assistant">
        <div class="message-avatar">
          <img src="assets/images/xiaoying-avatar.png" alt="小影老师">
        </div>
        <div class="message-content">
          <p>你好呀小特工！🌟</p>
          <p>遇到什么难题了吗？说出来，老师帮你解答~</p>
        </div>
      </div>
    `;
  }
}

/**
 * 发送求助消息
 */
async function sendHelpMessage(message) {
  if (!message.trim()) return;
  
  const chatMessages = document.getElementById('help-chat-messages');
  
  // 添加用户消息
  chatMessages.innerHTML += `
    <div class="chat-message user">
      <div class="message-content">
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
  
  // 滚动到底部
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // 显示加载状态
  chatMessages.innerHTML += `
    <div class="chat-message assistant loading" id="loading-message">
      <div class="message-avatar">
        <img src="assets/images/xiaoying-avatar.png" alt="小影老师">
      </div>
      <div class="message-content">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // 获取智能体回复
  const response = await sendToCozeAgent('helper', message, {
    taskName: getCurrentTaskName()
  });
  
  // 移除加载状态
  document.getElementById('loading-message')?.remove();
  
  // 添加助手回复
  chatMessages.innerHTML += `
    <div class="chat-message assistant">
      <div class="message-avatar">
        <img src="assets/images/xiaoying-avatar.png" alt="小影老师">
      </div>
      <div class="message-content">
        <p>${formatMessage(response.message)}</p>
      </div>
    </div>
  `;
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // 如果是语音模式，播放回复
  if (currentSession.isVoiceMode) {
    await speakText(response.message);
  }
}

/**
 * 切换语音模式
 */
async function toggleVoiceMode() {
  const voiceBtn = document.getElementById('btn-voice-mode');
  
  if (!currentSession.isVoiceMode) {
    // 开启语音模式
    const result = await initVoiceCall('helper');
    if (result.success) {
      currentSession.isVoiceMode = true;
      voiceBtn?.classList.add('active');
      showToast('语音模式已开启', 'success');
    } else {
      showToast('无法开启语音模式', 'error');
    }
  } else {
    // 关闭语音模式
    currentSession.isVoiceMode = false;
    voiceBtn?.classList.remove('active');
    showToast('语音模式已关闭', 'info');
  }
}

/**
 * 按住说话
 */
function startVoiceInput() {
  if (currentSession.isVoiceMode) {
    startRecording();
    document.getElementById('btn-voice-input')?.classList.add('recording');
  }
}

function endVoiceInput() {
  if (currentSession.isVoiceMode) {
    stopRecording();
    document.getElementById('btn-voice-input')?.classList.remove('recording');
  }
}

// 辅助函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMessage(text) {
  // 简单的格式化，将换行转为 <br>
  return text.replace(/\n/g, '<br>');
}

function getCurrentTaskName() {
  if (typeof AppState !== 'undefined' && AppState.currentTask) {
    return AppState.currentTask.name;
  }
  return '';
}

function showToast(message, type) {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  }
}

// ========================================
// 任务智能体专用函数（背诵/听写/默写）
// ========================================

// 任务会话状态
const taskSession = {
  type: null,              // 'recite' | 'dictation' | 'copywrite'
  conversationId: null,
  originalText: null,
  wordList: null,
  isActive: false
};

/**
 * 发送消息到任务智能体
 * @param {string} taskType - 任务类型
 * @param {object} payload - JSON消息体
 * @returns {object} - 解析后的JSON响应
 */
async function sendToTaskAgent(taskType, payload) {
  const agent = COZE_CONFIG.agents[taskType];
  
  if (!agent) {
    console.error('[TaskAgent] 未知任务类型:', taskType);
    return { action: 'error', message: '未知任务类型' };
  }
  
  // 将payload转为JSON字符串发送
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // 如果没有配置botId，使用模拟响应
  if (!agent.botId) {
    console.warn('[TaskAgent] Bot ID 未配置，使用模拟响应');
    return simulateTaskResponse(taskType, payload);
  }
  
  try {
    const requestBody = {
      bot_id: agent.botId,
      user_id: getUserId(),
      stream: false,
      auto_save_history: true,
      additional_messages: [
        {
          role: 'user',
          content: message,
          content_type: 'text'
        }
      ]
    };
    
    // 如果有对话ID，添加上
    if (taskSession.conversationId && taskSession.type === taskType) {
      requestBody.conversation_id = taskSession.conversationId;
    }
    
    console.log('[TaskAgent] 发送请求:', message.substring(0, 100));
    
    const response = await fetch(`${COZE_CONFIG.baseUrl}/v3/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.code === 0) {
      // 保存对话ID
      if (data.conversation_id) {
        taskSession.conversationId = data.conversation_id;
        taskSession.type = taskType;
      }
      
      // 提取并解析JSON响应
      const replyText = extractReplyFromCoze(data);
      return parseJSONResponse(replyText);
    } else {
      console.warn('[TaskAgent] API返回错误:', data);
      return simulateTaskResponse(taskType, payload);
    }
  } catch (error) {
    console.error('[TaskAgent] 请求失败:', error);
    return simulateTaskResponse(taskType, payload);
  }
}

/**
 * 解析JSON响应
 */
function parseJSONResponse(text) {
  try {
    // 尝试直接解析
    return JSON.parse(text);
  } catch (e) {
    // 尝试从文本中提取JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.warn('[TaskAgent] JSON解析失败:', text);
      }
    }
    // 返回原始文本作为message
    return { action: 'text', message: text };
  }
}

/**
 * 模拟任务智能体响应
 */
function simulateTaskResponse(taskType, payload) {
  const type = payload.type || payload.action;
  
  switch (taskType) {
    case 'recite':
      return simulateReciteResponse(type, payload);
    case 'dictation':
      return simulateDictationResponse(type, payload);
    case 'copywrite':
      return simulateCopywriteResponse(type, payload);
    default:
      return { action: 'error', message: '未知任务类型' };
  }
}

/**
 * 模拟背诵智能体响应
 */
function simulateReciteResponse(type, payload) {
  switch (type) {
    case 'start':
      return { action: 'start', message: '准备好了吗？深呼吸，我们开始背诵吧~' };
      
    case 'hint_request':
      // 模拟提示：取原文下一句的前几个字
      const originalText = payload.original_text || '';
      const recitedSoFar = payload.recited_so_far || '';
      const nextPart = originalText.substring(recitedSoFar.length, recitedSoFar.length + 4);
      return {
        action: 'hint',
        hint_content: nextPart + '...',
        message: `下一句开头是"${nextPart}"哦~`
      };
      
    case 'restart':
      return { action: 'restart', message: '好的，我们从头开始~' };
      
    case 'evaluate':
      // 模拟评估
      const original = (payload.original_text || '').trim();
      const userInput = (payload.user_input || '').trim();
      
      // 简单计算相似度
      const similarity = calculateSimilarity(original, userInput);
      const accuracy = Math.round(similarity * 100);
      
      let status = 'good';
      let encouragement = '背得很棒！';
      if (accuracy >= 95) {
        status = 'excellent';
        encouragement = '太完美了！你的记忆力真棒！🎉';
      } else if (accuracy >= 80) {
        status = 'good';
        encouragement = '背得不错，就差一点点了~';
      } else if (accuracy >= 60) {
        status = 'need_practice';
        encouragement = '继续练习，你一定可以的！💪';
      } else {
        status = 'need_retry';
        encouragement = '别灰心，多读几遍再试试~';
      }
      
      return {
        action: 'result',
        accuracy,
        status,
        comparison: {
          total_sentences: 1,
          correct_sentences: accuracy >= 80 ? 1 : 0,
          details: [
            {
              index: 1,
              original: original,
              recited: userInput,
              match: accuracy >= 95
            }
          ]
        },
        missing: [],
        encouragement,
        memory_tip: '试着把内容分成小段，一段段记忆'
      };
      
    default:
      return { action: 'redirect', message: '我们先专心背诵哦，其他问题等会儿再说~' };
  }
}

/**
 * 模拟听写智能体响应
 */
function simulateDictationResponse(type, payload) {
  const wordList = payload.word_list || taskSession.wordList || [];
  
  switch (type) {
    case 'start':
      taskSession.wordList = payload.word_list || [];
      return {
        action: 'start',
        message: '听写开始啦，准备好纸和笔了吗？',
        total: wordList.length
      };
      
    case 'speak_word':
      const index = payload.index || 0;
      const word = wordList[index] || '词语';
      return {
        action: 'speak',
        word,
        index: index + 1,
        total: wordList.length
      };
      
    case 'repeat':
      return {
        action: 'repeat',
        word: payload.current_word || '词语',
        message: '好的，再听一遍'
      };
      
    case 'next':
      const nextIndex = (payload.current_index || 0) + 1;
      if (nextIndex >= wordList.length) {
        return {
          action: 'wait_submit',
          message: '听写完成！请把作业拍照提交给我~'
        };
      }
      return {
        action: 'speak',
        word: wordList[nextIndex],
        index: nextIndex + 1,
        total: wordList.length
      };
      
    case 'evaluate':
      const userWrote = payload.user_wrote || [];
      const results = wordList.map((word, i) => {
        const wrote = userWrote[i] || '';
        return {
          word,
          user_wrote: wrote,
          correct: word === wrote,
          issue: word !== wrote ? `应为"${word}"` : null
        };
      });
      const correctCount = results.filter(r => r.correct).length;
      return {
        action: 'result',
        total_words: wordList.length,
        correct_count: correctCount,
        wrong_count: wordList.length - correctCount,
        accuracy: Math.round((correctCount / wordList.length) * 100),
        results,
        encouragement: correctCount === wordList.length ? '全对！太棒了！🎉' : '继续加油！'
      };
      
    default:
      return { action: 'error', message: '未知指令' };
  }
}

/**
 * 模拟默写智能体响应
 */
function simulateCopywriteResponse(type, payload) {
  switch (type) {
    case 'start':
      taskSession.originalText = payload.original_text;
      return {
        action: 'start',
        message: '看好了吗？准备好就点击开始默写~'
      };
      
    case 'begin_write':
      return {
        action: 'writing',
        message: '开始默写吧，写完后拍照提交~'
      };
      
    case 'evaluate':
      const original = payload.original_text || '';
      const userWrote = payload.user_wrote || '';
      
      // 简单对比
      const errors = [];
      let correctChars = 0;
      
      for (let i = 0; i < original.length; i++) {
        if (userWrote[i] === original[i]) {
          correctChars++;
        } else if (userWrote[i]) {
          errors.push({
            position: i + 1,
            original: original[i],
            user_wrote: userWrote[i],
            type: '错字'
          });
        } else {
          errors.push({
            position: i + 1,
            original: original[i],
            user_wrote: '',
            type: '漏字'
          });
        }
      }
      
      const accuracy = Math.round((correctChars / original.length) * 100);
      let status = 'good';
      if (accuracy >= 95) status = 'excellent';
      else if (accuracy >= 80) status = 'good';
      else status = 'need_practice';
      
      return {
        action: 'result',
        total_chars: original.length,
        correct_chars: correctChars,
        accuracy,
        errors,
        status,
        encouragement: accuracy >= 95 ? '默写得很棒！' : '继续努力！'
      };
      
    default:
      return { action: 'error', message: '未知指令' };
  }
}

/**
 * 计算两个字符串的相似度
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // 简单的字符匹配计算
  let matches = 0;
  const minLen = Math.min(len1, len2);
  
  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) matches++;
  }
  
  return matches / Math.max(len1, len2);
}

/**
 * 重置任务会话
 */
function resetTaskSession() {
  taskSession.type = null;
  taskSession.conversationId = null;
  taskSession.originalText = null;
  taskSession.wordList = null;
  taskSession.isActive = false;
}

// ========================================
// 结果审核功能
// ========================================

/**
 * 通用结果审核
 * @param {string} type - 审核类型: 'dictation' | 'recite' | 'copywrite'
 * @param {object} data - 审核数据
 */
async function checkResult(type, data) {
  const agent = COZE_CONFIG.agents.result_checker;
  
  if (!agent.botId) {
    console.warn('[CozeAgent] result_checker Bot ID 未配置，使用本地评估');
    return localCheckResult(type, data);
  }
  
  try {
    let payload;
    switch (type) {
      case 'dictation':
        payload = {
          type: 'check_dictation',
          word_list: data.wordList || data.word_list,
          user_wrote: data.userWrote || data.user_wrote
        };
        break;
      case 'recite':
        payload = {
          type: 'check_recite',
          original_text: data.originalText || data.original_text,
          user_text: data.userText || data.user_text
        };
        break;
      case 'copywrite':
        payload = {
          type: 'check_copywrite',
          original_text: data.originalText || data.original_text,
          user_text: data.userText || data.user_text
        };
        break;
      default:
        return { success: false, error: '不支持的审核类型' };
    }
    
    console.log('[CozeAgent] 发送审核请求:', type, payload);
    
    const response = await sendToCozeAgent(agent.botId, JSON.stringify(payload));
    
    if (response && response.action) {
      return { success: true, ...response };
    } else {
      console.warn('[CozeAgent] 审核响应格式异常:', response);
      return localCheckResult(type, data);
    }
  } catch (error) {
    console.error('[CozeAgent] 审核失败:', error);
    return localCheckResult(type, data);
  }
}

/**
 * 本地结果审核（降级方案）
 */
function localCheckResult(type, data) {
  console.log('[CozeAgent] 使用本地审核');
  
  switch (type) {
    case 'dictation': {
      const wordList = data.wordList || data.word_list || [];
      const userWrote = data.userWrote || data.user_wrote || [];
      
      let correct = 0;
      const details = wordList.map((word, i) => {
        const userWord = userWrote[i] || '';
        const isCorrect = word === userWord;
        if (isCorrect) correct++;
        return {
          word,
          user: userWord,
          correct: isCorrect,
          error_type: isCorrect ? null : '错字'
        };
      });
      
      const accuracy = wordList.length > 0 ? Math.round((correct / wordList.length) * 100) : 0;
      
      return {
        success: true,
        action: 'dictation_result',
        total: wordList.length,
        correct,
        wrong: wordList.length - correct,
        accuracy,
        score: accuracy >= 90 ? '优秀' : accuracy >= 80 ? '良好' : accuracy >= 70 ? '及格' : '需加油',
        details,
        wrong_words: details.filter(d => !d.correct).map(d => d.word),
        encouragement: accuracy >= 90 ? '太棒了！继续保持！' : '加油！多练习几遍！'
      };
    }
    
    case 'recite':
    case 'copywrite': {
      const original = (data.originalText || data.original_text || '').trim();
      const user = (data.userText || data.user_text || '').trim();
      
      // 简单逐字对比
      let correct = 0;
      const errors = [];
      const maxLen = Math.max(original.length, user.length);
      
      for (let i = 0; i < maxLen; i++) {
        const origChar = original[i] || '';
        const userChar = user[i] || '';
        
        if (origChar === userChar) {
          correct++;
        } else if (origChar && userChar) {
          errors.push({
            position: i,
            original: origChar,
            user: userChar,
            error_type: '错字'
          });
        } else if (origChar && !userChar) {
          errors.push({
            position: i,
            original: origChar,
            user: '',
            error_type: '漏字'
          });
        }
      }
      
      const accuracy = original.length > 0 ? Math.round((correct / original.length) * 100) : 0;
      
      return {
        success: true,
        action: type === 'recite' ? 'recite_result' : 'copywrite_result',
        total_chars: original.length,
        correct_chars: correct,
        accuracy,
        score: accuracy >= 90 ? '优秀' : accuracy >= 80 ? '良好' : accuracy >= 70 ? '及格' : '需加油',
        errors,
        encouragement: accuracy >= 90 ? '背得很棒！' : '继续努力！'
      };
    }
    
    default:
      return { success: false, error: '不支持的审核类型' };
  }
}

// ========================================
// 导出模块
// ========================================

// 全局导出
window.CozeAgent = {
  // 配置
  config: COZE_CONFIG,
  
  // 会话
  session: currentSession,
  taskSession,
  
  // API
  sendMessage: sendToCozeAgent,
  sendToTaskAgent,
  
  // 内容提取
  extractContentFromImage,
  
  // 结果审核
  checkResult,
  
  // 监督模式
  startSupervisor,
  stopSupervisor,
  
  // 求助模式
  openHelpDialog,
  closeHelpDialog,
  sendHelpMessage,
  
  // 语音功能
  initVoiceCall,
  startRecording,
  stopRecording,
  toggleVoiceMode,
  startVoiceInput,
  endVoiceInput,
  speakText,
  
  // 任务智能体
  resetTaskSession,
  
  // 工具函数
  getAgentConfig: (type) => COZE_CONFIG.agents[type] || null
};

console.log('Coze 智能体模块已加载');

