/**
 * 默写会话管理类
 * 
 * 负责管理默写任务的完整生命周期：
 * - 原文展示与隐藏
 * - 倒计时记忆
 * - 图片识别批改
 * - 逐字对比
 */

class CopywriteSession {
  // 状态常量
  static STATUS = {
    IDLE: 'idle',                    // 初始状态
    WAITING_TEXT: 'waiting_text',    // 等待原文
    MEMORIZING: 'memorizing',        // 记忆中（展示原文）
    WRITING: 'writing',              // 默写中（隐藏原文）
    WAITING_SUBMIT: 'waiting_submit', // 等待提交
    ANALYZING: 'analyzing',          // 分析中
    RESULT: 'result',                // 显示结果
    FINISHED: 'finished'             // 完成
  };
  
  constructor(options = {}) {
    // 原文内容
    this.originalText = options.originalText || '';
    
    // 任务信息
    this.taskId = options.taskId || null;
    this.taskName = options.taskName || '默写任务';
    
    // 状态
    this.status = CopywriteSession.STATUS.IDLE;
    
    // 记忆时间（秒）
    this.memorizeTime = options.memorizeTime || 60;
    this.remainingTime = this.memorizeTime;
    
    // 计时器
    this.memorizeTimer = null;
    
    // 开始时间
    this.startTime = null;
    this.endTime = null;
    
    // 用户书写结果（图片识别后）
    this.userWrote = '';
    
    // 结果
    this.result = null;
    
    // 回调函数
    this.onStatusChange = options.onStatusChange || null;
    this.onTimeUpdate = options.onTimeUpdate || null;
    this.onResult = options.onResult || null;
    this.onError = options.onError || null;
    
    // 是否已通知CozeRealtime进入任务模式
    this._taskModeActivated = false;
    
    console.log('[CopywriteSession] 创建默写会话:', this.taskName);
  }
  
  /**
   * 设置原文
   */
  setOriginalText(text) {
    this.originalText = text || '';
    if (this.originalText) {
      this.updateStatus(CopywriteSession.STATUS.MEMORIZING);
    }
  }
  
  /**
   * 更新状态
   */
  updateStatus(newStatus) {
    const oldStatus = this.status;
    this.status = newStatus;
    
    console.log('[CopywriteSession] 状态变更:', oldStatus, '->', newStatus);
    
    if (this.onStatusChange) {
      this.onStatusChange(newStatus, oldStatus);
    }
  }
  
  /**
   * 开始记忆（展示原文）
   * 
   * 流程：
   * 1. 检查原文
   * 2. 通知CozeRealtime进入任务模式（暂停监督）
   * 3. 发送开始指令到智能体
   * 4. 开始记忆倒计时
   */
  async startMemorize() {
    if (!this.originalText) {
      this.updateStatus(CopywriteSession.STATUS.WAITING_TEXT);
      if (this.onError) {
        this.onError('请先上传默写内容');
      }
      return false;
    }
    
    console.log('[CopywriteSession] 开始记忆');
    
    // 通知CozeRealtime进入任务模式
    if (!this._taskModeActivated) {
      try {
        if (typeof CozeRealtime !== 'undefined' && CozeRealtime.startTaskMode) {
          await CozeRealtime.startTaskMode('copywrite', {
            originalText: this.originalText
          });
          this._taskModeActivated = true;
          console.log('[CopywriteSession] 已进入任务模式');
        }
      } catch (e) {
        console.warn('[CopywriteSession] 进入任务模式失败:', e);
      }
    }
    
    this.remainingTime = this.memorizeTime;
    this.updateStatus(CopywriteSession.STATUS.MEMORIZING);
    
    // 通知智能体开始
    try {
      const response = await this.sendToAgent({ type: 'start', original_text: this.originalText });
      if (response && response.message) {
        await this.speak(response.message);
      } else {
        await this.speak('仔细看几遍，记住了就点开始默写~');
      }
    } catch (e) {
      console.error('[CopywriteSession] 通知智能体失败:', e);
      await this.speak('仔细看几遍，记住了就点开始默写~');
    }
    
    // 开始倒计时
    this.startMemorizeTimer();
    
    return true;
  }
  
  /**
   * 开始记忆倒计时
   */
  startMemorizeTimer() {
    this.stopMemorizeTimer();
    
    this.memorizeTimer = setInterval(() => {
      this.remainingTime--;
      
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.remainingTime, this.memorizeTime);
      }
      
      if (this.remainingTime <= 0) {
        this.stopMemorizeTimer();
        // 自动进入默写状态
        this.startWriting();
      }
    }, 1000);
  }
  
  /**
   * 停止记忆倒计时
   */
  stopMemorizeTimer() {
    if (this.memorizeTimer) {
      clearInterval(this.memorizeTimer);
      this.memorizeTimer = null;
    }
  }
  
  /**
   * 开始默写（隐藏原文）
   */
  async startWriting() {
    console.log('[CopywriteSession] 开始默写');
    
    this.stopMemorizeTimer();
    this.startTime = Date.now();
    
    this.updateStatus(CopywriteSession.STATUS.WRITING);
    
    // 通知智能体
    try {
      const response = await this.sendToAgent({ type: 'begin_write' });
      if (response && response.message) {
        await this.speak(response.message);
      }
    } catch (e) {
      console.error('[CopywriteSession] 通知智能体失败:', e);
    }
  }
  
  /**
   * 完成默写，等待提交
   */
  async finishWriting() {
    console.log('[CopywriteSession] 完成书写，等待提交');
    
    this.updateStatus(CopywriteSession.STATUS.WAITING_SUBMIT);
    
    await this.speak('写完了吗？拍照提交给我看看~');
  }
  
  /**
   * 提交拍照结果
   * @param {string} imageData - 拍照的base64图片数据
   */
  async submitPhoto(imageData) {
    console.log('[CopywriteSession] 提交拍照结果');
    
    this.updateStatus(CopywriteSession.STATUS.ANALYZING);
    this.endTime = Date.now();
    
    try {
      // 1. 识别图片中的文字
      await this.speak('正在批改中，请稍等~');
      const recognizedText = await this.recognizeText(imageData);
      this.userWrote = recognizedText;
      
      console.log('[CopywriteSession] 识别到的内容:', recognizedText.substring(0, 50));
      
      // 2. 使用result_checker进行审核
      let result;
      if (typeof window.CozeAgent !== 'undefined' && window.CozeAgent.checkResult) {
        result = await window.CozeAgent.checkResult('copywrite', {
          originalText: this.originalText,
          userText: this.userWrote
        });
      } else {
        // 降级到copywrite智能体评估
        result = await this.sendToAgent({
          type: 'evaluate',
          original_text: this.originalText,
          user_wrote: this.userWrote
        });
      }
      
      this.result = {
        ...result,
        duration: this.endTime - this.startTime,
        originalText: this.originalText,
        userWrote: this.userWrote
      };
      
      this.updateStatus(CopywriteSession.STATUS.RESULT);
      
      // 更新完成按钮状态（有结果后可完成）
      if (typeof window.updateCompleteButtonState === 'function') {
        window.updateCompleteButtonState();
      }
      
      // 播放鼓励语
      if (result && result.encouragement) {
        await this.speak(result.encouragement);
      }
      
      // 调用结果回调
      if (this.onResult) {
        this.onResult(this.result);
      }
      
      // 退出任务模式
      if (this._taskModeActivated) {
        try {
          if (typeof CozeRealtime !== 'undefined' && CozeRealtime.stopTaskMode) {
            await CozeRealtime.stopTaskMode(true);
          }
        } catch (e) {
          console.warn('[CopywriteSession] 退出任务模式失败:', e);
        }
        this._taskModeActivated = false;
      }
      
      return this.result;
    } catch (e) {
      console.error('[CopywriteSession] 评估失败:', e);
      if (this.onError) {
        this.onError('批改失败，请重试');
      }
      return null;
    }
  }
  
  /**
   * 识别图片中的文字
   * 使用Coze内容提取智能体
   */
  async recognizeText(imageData) {
    // 使用CozeAgent的内容提取功能
    if (typeof window.CozeAgent !== 'undefined' && window.CozeAgent.extractContentFromImage) {
      try {
        console.log('[CopywriteSession] 调用智能体识别图片...');
        const result = await window.CozeAgent.extractContentFromImage(imageData);
        
        if (result.success && result.content) {
          console.log('[CopywriteSession] 识别到内容:', result.content.substring(0, 100));
          return result.content;
        }
      } catch (error) {
        console.error('[CopywriteSession] 智能体识别失败:', error);
      }
    }
    
    // 降级方案：返回空字符串，让智能体提示用户
    console.warn('[CopywriteSession] 使用降级方案，返回空内容');
    return '';
  }
  
  /**
   * 发送消息到智能体
   */
  async sendToAgent(payload) {
    if (typeof window.CozeAgent !== 'undefined' && window.CozeAgent.sendToTaskAgent) {
      return await window.CozeAgent.sendToTaskAgent('copywrite', payload);
    }
    
    console.warn('[CopywriteSession] 没有可用的智能体API');
    return null;
  }
  
  /**
   * 语音播报
   */
  async speak(text) {
    if (typeof CozeRealtime !== 'undefined' && CozeRealtime.speak) {
      await CozeRealtime.speak(text);
    }
  }
  
  /**
   * 获取当前状态
   */
  getState() {
    return {
      status: this.status,
      originalText: this.originalText,
      remainingTime: this.remainingTime,
      memorizeTime: this.memorizeTime,
      userWrote: this.userWrote,
      result: this.result,
      duration: this.startTime ? (this.endTime || Date.now()) - this.startTime : 0
    };
  }
  
  /**
   * 销毁会话
   */
  async destroy() {
    console.log('[CopywriteSession] 销毁会话');
    
    this.stopMemorizeTimer();
    
    // 退出任务模式，恢复监督
    if (this._taskModeActivated) {
      try {
        if (typeof CozeRealtime !== 'undefined' && CozeRealtime.stopTaskMode) {
          await CozeRealtime.stopTaskMode(true);
          console.log('[CopywriteSession] 已退出任务模式');
        }
      } catch (e) {
        console.warn('[CopywriteSession] 退出任务模式失败:', e);
      }
      this._taskModeActivated = false;
    }
    
    this.status = CopywriteSession.STATUS.FINISHED;
    this.originalText = '';
    this.userWrote = '';
    this.result = null;
    
    this.onStatusChange = null;
    this.onTimeUpdate = null;
    this.onResult = null;
    this.onError = null;
  }
  
  /**
   * 完成任务
   */
  async completeTask() {
    console.log('[CopywriteSession] 完成任务');
    await this.destroy();
  }
}

// 全局导出
window.CopywriteSession = CopywriteSession;

console.log('[CopywriteSession] 默写会话管理类已加载');

