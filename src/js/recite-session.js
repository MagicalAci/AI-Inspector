/**
 * 背诵会话管理类 V2
 * 
 * 负责管理背诵任务的完整生命周期：
 * - 状态机管理
 * - 语音识别流处理
 * - 与智能体通信（通过CozeAgent/CozeRealtime）
 * - 与监督模式协调（暂停/恢复）
 * - 结果回调
 * 
 * 核心流程：
 * 1. 创建会话 → 检测是否有材料
 * 2. 上传材料 → 内容提取 → 设置原文
 * 3. 开始背诵 → 暂停监督 → 启动语音识别
 * 4. 识别过程中 → 检测提示关键词 → 智能体响应
 * 5. 完成背诵 → 发送评估请求 → 渲染结果
 * 6. 结束会话 → 恢复监督
 */

class ReciteSession {
  // 状态常量
  static STATUS = {
    IDLE: 'idle',                    // 初始状态
    WAITING_MATERIAL: 'waiting_material', // 等待上传素材
    READY: 'ready',                  // 已准备好，等待开始
    LISTENING: 'listening',          // 正在监听背诵
    PROMPTING: 'prompting',          // 正在给提示
    ANALYZING: 'analyzing',          // 正在分析结果
    RESULT: 'result',                // 显示结果
    FINISHED: 'finished'             // 完成
  };
  
  constructor(options = {}) {
    // 原文内容
    this.originalText = options.originalText || '';
    
    // 任务信息
    this.taskId = options.taskId || null;
    this.taskName = options.taskName || '背诵任务';
    
    // 状态
    this.status = ReciteSession.STATUS.IDLE;
    
    // 语音识别累积文本
    this.recognizedText = '';
    this.interimText = '';  // 临时识别结果
    
    // 语音识别器
    this.recognition = null;
    
    // 计时器
    this.silenceTimer = null;
    this.silenceTimeout = 10000; // 10秒静音自动完成
    
    this.startTime = null;
    this.endTime = null;
    
    // 结果
    this.result = null;
    
    // 回调函数
    this.onStatusChange = options.onStatusChange || null;
    this.onSpeechRecognized = options.onSpeechRecognized || null;
    this.onHint = options.onHint || null;
    this.onResult = options.onResult || null;
    this.onError = options.onError || null;
    
    // 提示关键词
    this.hintKeywords = ['怎么说', '忘了', '提示', '下一句', '不记得', '什么来着', '后面是什么'];
    
    // 完成关键词
    this.finishKeywords = ['背完了', '完成了', '结束', '好了'];
    
    // 重新开始关键词
    this.restartKeywords = ['从头来', '重新开始', '再来一遍', '重新背'];
    
    // 是否已通知CozeRealtime进入任务模式
    this._taskModeActivated = false;
    
    console.log('[ReciteSession] 创建背诵会话:', this.taskName);
  }
  
  /**
   * 设置原文
   */
  setOriginalText(text) {
    this.originalText = text;
    if (text) {
      this.updateStatus(ReciteSession.STATUS.READY);
    }
  }
  
  /**
   * 更新状态
   */
  updateStatus(newStatus) {
    const oldStatus = this.status;
    this.status = newStatus;
    
    console.log('[ReciteSession] 状态变更:', oldStatus, '->', newStatus);
    
    if (this.onStatusChange) {
      this.onStatusChange(newStatus, oldStatus);
    }
    
    // 状态关联的UI更新
    this.updateUIForStatus(newStatus);
  }
  
  /**
   * 根据状态更新UI
   */
  updateUIForStatus(status) {
    // 更新CozeRealtime的状态指示器
    if (typeof CozeRealtime !== 'undefined' && CozeRealtime.StatusIndicator) {
      const statusMap = {
        [ReciteSession.STATUS.LISTENING]: { state: 'speaking', text: '背诵中' },
        [ReciteSession.STATUS.PROMPTING]: { state: 'speaking', text: '提示中' },
        [ReciteSession.STATUS.ANALYZING]: { state: 'thinking', text: '分析中' }
      };
      
      const statusInfo = statusMap[status];
      if (statusInfo) {
        // StatusIndicator可能需要通过window访问
      }
    }
  }
  
  /**
   * 开始背诵
   * 
   * 流程：
   * 1. 检查是否有原文
   * 2. 通知CozeRealtime进入任务模式（暂停监督）
   * 3. 发送开始指令到智能体
   * 4. 播放开场白
   * 5. 启动语音识别
   */
  async start() {
    if (!this.originalText) {
      this.updateStatus(ReciteSession.STATUS.WAITING_MATERIAL);
      if (this.onError) {
        this.onError('请先上传背诵内容');
      }
      return false;
    }
    
    console.log('[ReciteSession] 开始背诵');
    console.log('[ReciteSession] 原文:', this.originalText.substring(0, 100) + (this.originalText.length > 100 ? '...' : ''));
    
    this.recognizedText = '';
    this.interimText = '';
    this.startTime = Date.now();
    
    // 通知CozeRealtime进入任务模式（会暂停监督的定期提醒）
    if (!this._taskModeActivated) {
      try {
        if (typeof CozeRealtime !== 'undefined' && CozeRealtime.startTaskMode) {
          await CozeRealtime.startTaskMode('recite', {
            originalText: this.originalText,
            autoStartRecognition: false // 由本类控制语音识别
          });
          this._taskModeActivated = true;
          console.log('[ReciteSession] 已进入任务模式');
        }
      } catch (e) {
        console.warn('[ReciteSession] 进入任务模式失败:', e);
        // 继续执行，不阻塞
      }
    }
    
    // 通知智能体开始
    try {
      const response = await this.sendToAgent({ type: 'start' });
      if (response && response.message) {
        await this.speak(response.message);
      } else {
        // 使用默认开场白
        await this.speak('准备好了吗？深呼吸，我们开始背诵吧~');
      }
    } catch (e) {
      console.error('[ReciteSession] 通知智能体失败:', e);
      // 使用默认开场白
      await this.speak('准备好了吗？开始背诵吧~');
    }
    
    // 等待开场白播放完毕后再启动语音识别（避免识别到AI的声音）
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 启动语音识别
    this.startSpeechRecognition();
    
    this.updateStatus(ReciteSession.STATUS.LISTENING);
    return true;
  }
  
  /**
   * 暂停背诵
   */
  pause() {
    this.stopSpeechRecognition();
    this.clearSilenceTimer();
  }
  
  /**
   * 恢复背诵
   */
  resume() {
    if (this.status === ReciteSession.STATUS.LISTENING) {
      this.startSpeechRecognition();
      this.resetSilenceTimer();
    }
  }
  
  /**
   * 重新开始
   */
  async restart() {
    console.log('[ReciteSession] 重新开始背诵');
    
    this.recognizedText = '';
    this.interimText = '';
    this.result = null;
    
    // 通知智能体重启
    try {
      const response = await this.sendToAgent({ type: 'restart' });
      if (response && response.message) {
        await this.speak(response.message);
      }
    } catch (e) {
      console.error('[ReciteSession] 重启通知失败:', e);
    }
    
    this.updateStatus(ReciteSession.STATUS.READY);
  }
  
  /**
   * 完成背诵，请求评估
   * 
   * 流程：
   * 1. 停止语音识别
   * 2. 发送评估请求到智能体
   * 3. 渲染结果
   * 4. 播放鼓励语
   * （注意：不在这里恢复监督，由completeTask()调用）
   */
  async finish() {
    if (this.status === ReciteSession.STATUS.ANALYZING || 
        this.status === ReciteSession.STATUS.RESULT) {
      return this.result;
    }
    
    console.log('[ReciteSession] 完成背诵，请求评估');
    console.log('[ReciteSession] 原文长度:', this.originalText.length);
    console.log('[ReciteSession] 背诵长度:', this.recognizedText.length);
    
    if (!this.recognizedText.trim()) {
      console.warn('[ReciteSession] 未检测到任何语音输入');
    }
    
    this.endTime = Date.now();
    this.stopSpeechRecognition();
    this.clearSilenceTimer();
    
    this.updateStatus(ReciteSession.STATUS.ANALYZING);
    
    // 使用result_checker进行评估
    try {
      await this.speak('正在评估中，请稍等~');
      
      let response;
      if (typeof window.CozeAgent !== 'undefined' && window.CozeAgent.checkResult) {
        response = await window.CozeAgent.checkResult('recite', {
          originalText: this.originalText,
          userText: this.recognizedText || ''
        });
      } else {
        // 降级到recite智能体评估
        response = await this.sendToAgent({
          type: 'evaluate',
          original_text: this.originalText,
          user_input: this.recognizedText || '（未检测到语音）'
        });
      }
      
      this.result = response || this.generateFallbackResult();
      
      // 添加耗时信息
      if (this.result) {
        this.result.duration = this.endTime - this.startTime;
        this.result.originalText = this.originalText;
        this.result.recognizedText = this.recognizedText;
      }
      
      this.updateStatus(ReciteSession.STATUS.RESULT);
      
      // 更新完成按钮状态（有结果后可完成）
      if (typeof window.updateCompleteButtonState === 'function') {
        window.updateCompleteButtonState();
      }
      
      // 播放鼓励语
      if (this.result && this.result.encouragement) {
        await this.speak(this.result.encouragement);
      }
      
      // 调用结果回调
      if (this.onResult) {
        this.onResult(this.result);
      }
      
      return this.result;
    } catch (e) {
      console.error('[ReciteSession] 评估失败:', e);
      
      // 生成降级结果
      this.result = this.generateFallbackResult();
      this.updateStatus(ReciteSession.STATUS.RESULT);
      
      // 更新完成按钮状态
      if (typeof window.updateCompleteButtonState === 'function') {
        window.updateCompleteButtonState();
      }
      
      if (this.onResult) {
        this.onResult(this.result);
      }
      
      if (this.onError) {
        this.onError('评估失败，使用本地评估');
      }
      
      return this.result;
    }
  }
  
  /**
   * 生成降级评估结果（当智能体不可用时）
   */
  generateFallbackResult() {
    const original = this.originalText.trim();
    const recited = this.recognizedText.trim();
    
    // 简单的相似度计算
    let accuracy = 0;
    if (original && recited) {
      let matches = 0;
      const minLen = Math.min(original.length, recited.length);
      for (let i = 0; i < minLen; i++) {
        if (original[i] === recited[i]) matches++;
      }
      accuracy = Math.round((matches / original.length) * 100);
    }
    
    let status = 'need_retry';
    let encouragement = '继续加油！多练习几遍~';
    
    if (accuracy >= 90) {
      status = 'excellent';
      encouragement = '太棒了！背得非常好！🎉';
    } else if (accuracy >= 70) {
      status = 'good';
      encouragement = '背得不错，再努力一点就完美了！';
    } else if (accuracy >= 50) {
      status = 'need_practice';
      encouragement = '有进步，继续练习！💪';
    }
    
    return {
      action: 'result',
      accuracy,
      status,
      comparison: {
        total_sentences: 1,
        correct_sentences: accuracy >= 80 ? 1 : 0,
        details: [{
          index: 1,
          original: original.substring(0, 50) + (original.length > 50 ? '...' : ''),
          recited: recited.substring(0, 50) + (recited.length > 50 ? '...' : ''),
          match: accuracy >= 90
        }]
      },
      missing: [],
      encouragement,
      memory_tip: '试着把内容分成小段，一段一段记忆'
    };
  }
  
  /**
   * 请求提示
   */
  async requestHint() {
    if (this.status !== ReciteSession.STATUS.LISTENING) return;
    
    console.log('[ReciteSession] 请求提示');
    
    this.updateStatus(ReciteSession.STATUS.PROMPTING);
    
    try {
      const response = await this.sendToAgent({
        type: 'hint_request',
        original_text: this.originalText,
        recited_so_far: this.recognizedText
      });
      
      if (response && response.message) {
        await this.speak(response.message);
      }
      
      if (this.onHint && response) {
        this.onHint(response);
      }
      
    } catch (e) {
      console.error('[ReciteSession] 请求提示失败:', e);
    }
    
    this.updateStatus(ReciteSession.STATUS.LISTENING);
    this.resetSilenceTimer();
  }
  
  /**
   * 发送消息到智能体
   */
  async sendToAgent(payload) {
    // 优先使用CozeAgent
    if (typeof window.CozeAgent !== 'undefined' && window.CozeAgent.sendToTaskAgent) {
      return await window.CozeAgent.sendToTaskAgent('recite', payload);
    }
    
    // 后备：使用CozeRealtime
    if (typeof CozeRealtime !== 'undefined' && CozeRealtime.sendTaskMessage) {
      return await CozeRealtime.sendTaskMessage(JSON.stringify(payload), true);
    }
    
    console.warn('[ReciteSession] 没有可用的智能体API');
    return null;
  }
  
  /**
   * 语音播报
   */
  async speak(text) {
    if (typeof CozeRealtime !== 'undefined' && CozeRealtime.speak) {
      await CozeRealtime.speak(text, 'high');
    }
  }
  
  // ==========================================
  // 语音识别
  // ==========================================
  
  /**
   * 启动语音识别
   */
  startSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('[ReciteSession] 浏览器不支持语音识别');
      if (this.onError) {
        this.onError('您的浏览器不支持语音识别，请使用Chrome浏览器');
      }
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-CN';
    this.recognition.maxAlternatives = 1;
    
    this.recognition.onstart = () => {
      console.log('[ReciteSession] 语音识别已启动');
      this.resetSilenceTimer();
    };
    
    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // 更新临时文本
      this.interimText = interimTranscript;
      
      // 处理最终识别结果
      if (finalTranscript) {
        this.handleRecognizedText(finalTranscript);
      }
      
      // 调用识别回调（包含临时结果）
      if (this.onSpeechRecognized) {
        this.onSpeechRecognized(
          this.recognizedText + this.interimText,
          finalTranscript,
          this.interimText
        );
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('[ReciteSession] 语音识别错误:', event.error);
      
      if (event.error === 'no-speech') {
        // 没有检测到语音，可能是静音
        return;
      }
      
      if (event.error === 'not-allowed') {
        if (this.onError) {
          this.onError('请允许使用麦克风');
        }
        return;
      }
      
      // 其他错误，尝试重启
      if (this.status === ReciteSession.STATUS.LISTENING) {
        setTimeout(() => {
          if (this.status === ReciteSession.STATUS.LISTENING) {
            this.recognition?.start();
          }
        }, 1000);
      }
    };
    
    this.recognition.onend = () => {
      console.log('[ReciteSession] 语音识别结束');
      
      // 如果还在监听状态，自动重启
      if (this.status === ReciteSession.STATUS.LISTENING) {
        setTimeout(() => {
          if (this.status === ReciteSession.STATUS.LISTENING) {
            try {
              this.recognition?.start();
            } catch (e) {
              console.error('[ReciteSession] 重启识别失败:', e);
            }
          }
        }, 100);
      }
    };
    
    try {
      this.recognition.start();
    } catch (e) {
      console.error('[ReciteSession] 启动语音识别失败:', e);
    }
  }
  
  /**
   * 停止语音识别
   */
  stopSpeechRecognition() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // 忽略
      }
      this.recognition = null;
    }
  }
  
  /**
   * 处理识别到的文本
   */
  handleRecognizedText(text) {
    console.log('[ReciteSession] 识别到:', text);
    
    // 检测是否是完成指令
    if (this.isFinishCommand(text)) {
      console.log('[ReciteSession] 检测到完成指令');
      this.finish();
      return;
    }
    
    // 检测是否是重新开始指令
    if (this.isRestartCommand(text)) {
      console.log('[ReciteSession] 检测到重新开始指令');
      this.restart().then(() => this.start());
      return;
    }
    
    // 累积文本（排除指令性内容）
    const cleanText = this.removeCommandWords(text);
    if (cleanText) {
      this.recognizedText += cleanText;
    }
    
    // 重置静音计时器
    this.resetSilenceTimer();
    
    // 检测是否需要提示
    if (this.needsHint(text)) {
      this.requestHint();
    }
  }
  
  /**
   * 检测是否需要提示
   */
  needsHint(text) {
    return this.hintKeywords.some(kw => text.includes(kw));
  }
  
  /**
   * 检测是否是完成指令
   */
  isFinishCommand(text) {
    return this.finishKeywords.some(kw => text.includes(kw));
  }
  
  /**
   * 检测是否是重新开始指令
   */
  isRestartCommand(text) {
    return this.restartKeywords.some(kw => text.includes(kw));
  }
  
  /**
   * 从文本中移除指令性关键词
   */
  removeCommandWords(text) {
    let result = text;
    const allKeywords = [...this.hintKeywords, ...this.finishKeywords, ...this.restartKeywords];
    allKeywords.forEach(kw => {
      result = result.replace(kw, '');
    });
    return result.trim();
  }
  
  // ==========================================
  // 静音检测
  // ==========================================
  
  /**
   * 重置静音计时器
   */
  resetSilenceTimer() {
    this.clearSilenceTimer();
    
    this.silenceTimer = setTimeout(() => {
      if (this.status === ReciteSession.STATUS.LISTENING) {
        console.log('[ReciteSession] 检测到静音，自动完成');
        this.finish();
      }
    }, this.silenceTimeout);
  }
  
  /**
   * 清除静音计时器
   */
  clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
  
  // ==========================================
  // 销毁
  // ==========================================
  
  /**
   * 销毁会话
   * 
   * 流程：
   * 1. 停止语音识别
   * 2. 通知CozeRealtime退出任务模式（恢复监督）
   * 3. 清理所有状态和回调
   */
  async destroy() {
    console.log('[ReciteSession] 销毁会话');
    
    this.stopSpeechRecognition();
    this.clearSilenceTimer();
    
    // 退出任务模式，恢复监督
    if (this._taskModeActivated) {
      try {
        if (typeof CozeRealtime !== 'undefined' && CozeRealtime.stopTaskMode) {
          await CozeRealtime.stopTaskMode(true); // true = 恢复监督
          console.log('[ReciteSession] 已退出任务模式');
        }
      } catch (e) {
        console.warn('[ReciteSession] 退出任务模式失败:', e);
      }
      this._taskModeActivated = false;
    }
    
    this.status = ReciteSession.STATUS.FINISHED;
    this.recognizedText = '';
    this.interimText = '';
    this.originalText = '';
    this.result = null;
    
    this.onStatusChange = null;
    this.onSpeechRecognized = null;
    this.onHint = null;
    this.onResult = null;
    this.onError = null;
  }
  
  /**
   * 完成任务（用户点击"完成任务"按钮时调用）
   * 会销毁会话并恢复监督
   */
  async completeTask() {
    console.log('[ReciteSession] 完成任务');
    await this.destroy();
  }
  
  /**
   * 获取当前状态
   */
  getState() {
    return {
      status: this.status,
      originalText: this.originalText,
      recognizedText: this.recognizedText,
      interimText: this.interimText,
      result: this.result,
      duration: this.startTime ? (this.endTime || Date.now()) - this.startTime : 0
    };
  }
}

// 全局导出
window.ReciteSession = ReciteSession;

console.log('[ReciteSession] 背诵会话管理类已加载');

