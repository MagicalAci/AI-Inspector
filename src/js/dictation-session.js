/**
 * 听写会话管理类
 * 
 * 负责管理听写任务的完整生命周期：
 * - 词语朗读控制
 * - TTS语音合成
 * - 图片识别批改
 * - 结果统计
 */

class DictationSession {
  // 状态常量
  static STATUS = {
    IDLE: 'idle',                    // 初始状态
    WAITING_WORDS: 'waiting_words',  // 等待词表
    READY: 'ready',                  // 已准备好
    SPEAKING: 'speaking',            // 正在朗读
    WAITING: 'waiting',              // 等待学生书写
    WAITING_SUBMIT: 'waiting_submit', // 等待提交拍照
    ANALYZING: 'analyzing',          // 分析中
    RESULT: 'result',                // 显示结果
    FINISHED: 'finished'             // 完成
  };
  
  constructor(options = {}) {
    // 词表
    this.wordList = options.wordList || [];
    
    // 任务信息
    this.taskId = options.taskId || null;
    this.taskName = options.taskName || '听写任务';
    
    // 状态
    this.status = DictationSession.STATUS.IDLE;
    
    // 当前词语索引
    this.currentIndex = 0;
    
    // 每个词语等待时间（毫秒）
    this.waitTime = options.waitTime || 5000;
    
    // 计时器
    this.waitTimer = null;
    this.speakCount = 0; // 当前词语已朗读次数
    
    // 开始时间
    this.startTime = null;
    this.endTime = null;
    
    // 用户书写结果（图片识别后）
    this.userWrote = [];
    
    // 结果
    this.result = null;
    
    // 回调函数
    this.onStatusChange = options.onStatusChange || null;
    this.onWordSpeak = options.onWordSpeak || null;
    this.onProgress = options.onProgress || null;
    this.onResult = options.onResult || null;
    this.onError = options.onError || null;
    
    // 是否已通知CozeRealtime进入任务模式
    this._taskModeActivated = false;
    
    console.log('[DictationSession] 创建听写会话:', this.taskName);
  }
  
  /**
   * 设置词表
   */
  setWordList(words) {
    this.wordList = words || [];
    if (this.wordList.length > 0) {
      this.updateStatus(DictationSession.STATUS.READY);
    }
  }
  
  /**
   * 更新状态
   */
  updateStatus(newStatus) {
    const oldStatus = this.status;
    this.status = newStatus;
    
    console.log('[DictationSession] 状态变更:', oldStatus, '->', newStatus);
    
    if (this.onStatusChange) {
      this.onStatusChange(newStatus, oldStatus);
    }
  }
  
  /**
   * 开始听写
   * 
   * 流程：
   * 1. 检查词表
   * 2. 通知CozeRealtime进入任务模式（暂停监督）
   * 3. 发送开始指令到智能体
   * 4. 开始朗读第一个词
   */
  async start() {
    if (this.wordList.length === 0) {
      this.updateStatus(DictationSession.STATUS.WAITING_WORDS);
      if (this.onError) {
        this.onError('请先设置听写词表');
      }
      return false;
    }
    
    console.log('[DictationSession] 开始听写，共', this.wordList.length, '个词');
    
    this.currentIndex = 0;
    this.speakCount = 0;
    this.startTime = Date.now();
    this.userWrote = [];
    
    // 通知CozeRealtime进入任务模式
    if (!this._taskModeActivated) {
      try {
        if (typeof CozeRealtime !== 'undefined' && CozeRealtime.startTaskMode) {
          await CozeRealtime.startTaskMode('dictation', {
            wordList: this.wordList
          });
          this._taskModeActivated = true;
          console.log('[DictationSession] 已进入任务模式');
        }
      } catch (e) {
        console.warn('[DictationSession] 进入任务模式失败:', e);
      }
    }
    
    // 通知智能体开始
    try {
      const response = await this.sendToAgent({ type: 'start', word_list: this.wordList });
      if (response && response.message) {
        await this.speak(response.message);
      } else {
        await this.speak('听写开始啦，准备好纸和笔了吗？');
      }
    } catch (e) {
      console.error('[DictationSession] 通知智能体失败:', e);
      await this.speak('听写开始啦，准备好纸和笔了吗？');
    }
    
    // 等待开场白播放完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 开始第一个词
    await this.speakCurrentWord();
    
    return true;
  }
  
  /**
   * 朗读当前词语
   */
  async speakCurrentWord() {
    if (this.currentIndex >= this.wordList.length) {
      // 全部读完
      this.onAllWordsSpoken();
      return;
    }
    
    const word = this.wordList[this.currentIndex];
    this.speakCount++;
    
    console.log('[DictationSession] 朗读词语:', word, `(${this.currentIndex + 1}/${this.wordList.length})`);
    
    this.updateStatus(DictationSession.STATUS.SPEAKING);
    
    // 通知回调
    if (this.onWordSpeak) {
      this.onWordSpeak(word, this.currentIndex, this.wordList.length);
    }
    
    // 更新进度
    if (this.onProgress) {
      this.onProgress(this.currentIndex + 1, this.wordList.length);
    }
    
    // 生成题号提示语
    const ordinalNumber = this.getOrdinalNumber(this.currentIndex + 1);
    const isFirst = this.currentIndex === 0;
    const prefix = isFirst ? `第一题，` : `${ordinalNumber}，`;
    
    // 通过TTS朗读 - 先说题号，再读词语两遍
    await this.speak(prefix);
    await new Promise(r => setTimeout(r, 300));
    await this.speakWord(word);
    await new Promise(r => setTimeout(r, 800));
    await this.speakWord(word);
    
    // 进入等待状态
    this.updateStatus(DictationSession.STATUS.WAITING);
    
    // 开始等待计时器
    this.startWaitTimer();
  }
  
  /**
   * 获取序数词
   */
  getOrdinalNumber(num) {
    const ordinals = ['第一题', '第二题', '第三题', '第四题', '第五题', 
                      '第六题', '第七题', '第八题', '第九题', '第十题',
                      '第十一题', '第十二题', '第十三题', '第十四题', '第十五题',
                      '第十六题', '第十七题', '第十八题', '第十九题', '第二十题'];
    return ordinals[num - 1] || `第${num}题`;
  }
  
  /**
   * 朗读单个词
   */
  async speakWord(word) {
    // 使用CozeRealtime的speak功能
    if (typeof CozeRealtime !== 'undefined' && CozeRealtime.speak) {
      await CozeRealtime.speak(word, 'high');
    } else {
      // 后备：使用浏览器TTS
      if ('speechSynthesis' in window) {
        return new Promise((resolve) => {
          const utterance = new SpeechSynthesisUtterance(word);
          utterance.lang = 'zh-CN';
          utterance.rate = 0.8;
          utterance.onend = resolve;
          utterance.onerror = resolve;
          speechSynthesis.speak(utterance);
        });
      }
    }
  }
  
  /**
   * 通用语音播报
   */
  async speak(text) {
    if (typeof CozeRealtime !== 'undefined' && CozeRealtime.speak) {
      await CozeRealtime.speak(text);
    }
  }
  
  /**
   * 开始等待计时器
   */
  startWaitTimer() {
    this.clearWaitTimer();
    
    this.waitTimer = setTimeout(() => {
      this.nextWord();
    }, this.waitTime);
  }
  
  /**
   * 清除等待计时器
   */
  clearWaitTimer() {
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
  }
  
  /**
   * 重复当前词语
   */
  async repeat() {
    console.log('[DictationSession] 重复当前词语');
    
    this.clearWaitTimer();
    this.speakCount = 0;
    
    // 通知智能体
    const word = this.wordList[this.currentIndex];
    try {
      const response = await this.sendToAgent({ type: 'repeat', current_word: word });
      if (response && response.message) {
        await this.speak(response.message);
      }
    } catch (e) {
      console.error('[DictationSession] 重复通知失败:', e);
    }
    
    await this.speakCurrentWord();
  }
  
  /**
   * 下一个词
   */
  async nextWord() {
    this.clearWaitTimer();
    this.speakCount = 0;
    this.currentIndex++;
    
    if (this.currentIndex >= this.wordList.length) {
      this.onAllWordsSpoken();
    } else {
      await this.speakCurrentWord();
    }
  }
  
  /**
   * 全部词语朗读完成
   */
  async onAllWordsSpoken() {
    console.log('[DictationSession] 全部词语朗读完成');
    
    this.updateStatus(DictationSession.STATUS.WAITING_SUBMIT);
    
    // 通知智能体
    try {
      const response = await this.sendToAgent({ type: 'next', current_index: this.wordList.length - 1 });
      if (response && response.message) {
        await this.speak(response.message);
      }
    } catch (e) {
      console.error('[DictationSession] 完成通知失败:', e);
    }
  }
  
  /**
   * 提交拍照结果
   * @param {string} imageData - 拍照的base64图片数据
   */
  async submitPhoto(imageData) {
    console.log('[DictationSession] 提交拍照结果');
    
    this.updateStatus(DictationSession.STATUS.ANALYZING);
    this.endTime = Date.now();
    
    try {
      // 1. 识别图片中的文字
      await this.speak('正在批改中，请稍等~');
      const recognizedWords = await this.recognizeWords(imageData);
      this.userWrote = recognizedWords;
      
      console.log('[DictationSession] 识别到的词语:', recognizedWords);
      
      // 2. 使用result_checker进行审核
      let result;
      if (typeof window.CozeAgent !== 'undefined' && window.CozeAgent.checkResult) {
        result = await window.CozeAgent.checkResult('dictation', {
          wordList: this.wordList,
          userWrote: this.userWrote
        });
      } else {
        // 降级到本地评估
        result = this.localEvaluate();
      }
      
      this.result = {
        ...result,
        duration: this.endTime - this.startTime,
        wordList: this.wordList,
        userWrote: this.userWrote
      };
      
      this.updateStatus(DictationSession.STATUS.RESULT);
      
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
          console.warn('[DictationSession] 退出任务模式失败:', e);
        }
        this._taskModeActivated = false;
      }
      
      return this.result;
    } catch (e) {
      console.error('[DictationSession] 评估失败:', e);
      if (this.onError) {
        this.onError('批改失败，请重试');
      }
      return null;
    }
  }
  
  /**
   * 本地评估（降级方案）
   */
  localEvaluate() {
    let correct = 0;
    const details = this.wordList.map((word, i) => {
      const userWord = this.userWrote[i] || '';
      const isCorrect = word === userWord;
      if (isCorrect) correct++;
      return {
        word,
        user: userWord,
        correct: isCorrect
      };
    });
    
    const accuracy = this.wordList.length > 0 ? Math.round((correct / this.wordList.length) * 100) : 0;
    
    return {
      success: true,
      action: 'dictation_result',
      total: this.wordList.length,
      correct,
      wrong: this.wordList.length - correct,
      accuracy,
      score: accuracy >= 90 ? '优秀' : accuracy >= 80 ? '良好' : accuracy >= 70 ? '及格' : '需加油',
      details,
      wrong_words: details.filter(d => !d.correct).map(d => d.word),
      encouragement: accuracy >= 90 ? '太棒了！' : '继续努力！'
    };
  }
  
  /**
   * 识别图片中的文字
   * 使用Coze内容提取智能体
   */
  async recognizeWords(imageData) {
    // 使用CozeAgent的内容提取功能
    if (typeof window.CozeAgent !== 'undefined' && window.CozeAgent.extractContentFromImage) {
      try {
        console.log('[DictationSession] 调用智能体识别图片...');
        const result = await window.CozeAgent.extractContentFromImage(imageData);
        
        if (result.success && result.content) {
          // 尝试从返回的内容中提取词语列表
          let recognizedWords = [];
          
          if (result.words && Array.isArray(result.words)) {
            recognizedWords = result.words;
          } else if (result.lines && Array.isArray(result.lines)) {
            // 从行中提取词语
            recognizedWords = result.lines.flatMap(line => 
              line.split(/[,，、\s]+/).filter(w => w.trim())
            );
          } else if (result.content) {
            // 从内容中分割词语
            recognizedWords = result.content.split(/[,，、\s\n]+/).filter(w => w.trim());
          }
          
          console.log('[DictationSession] 识别到词语:', recognizedWords);
          return recognizedWords;
        }
      } catch (error) {
        console.error('[DictationSession] 智能体识别失败:', error);
      }
    }
    
    // 降级方案：返回原词表（假设全部正确）
    console.warn('[DictationSession] 使用降级方案，返回原词表');
    return this.wordList;
  }
  
  /**
   * 发送消息到智能体
   */
  async sendToAgent(payload) {
    // 优先使用CozeAgent
    if (typeof window.CozeAgent !== 'undefined' && window.CozeAgent.sendToTaskAgent) {
      return await window.CozeAgent.sendToTaskAgent('dictation', payload);
    }
    
    console.warn('[DictationSession] 没有可用的智能体API');
    return null;
  }
  
  /**
   * 获取当前进度
   */
  getProgress() {
    return {
      current: this.currentIndex + 1,
      total: this.wordList.length,
      percent: Math.round(((this.currentIndex + 1) / this.wordList.length) * 100)
    };
  }
  
  /**
   * 获取当前状态
   */
  getState() {
    return {
      status: this.status,
      currentIndex: this.currentIndex,
      currentWord: this.wordList[this.currentIndex],
      totalWords: this.wordList.length,
      result: this.result,
      duration: this.startTime ? (this.endTime || Date.now()) - this.startTime : 0
    };
  }
  
  /**
   * 销毁会话
   */
  async destroy() {
    console.log('[DictationSession] 销毁会话');
    
    this.clearWaitTimer();
    
    // 退出任务模式，恢复监督
    if (this._taskModeActivated) {
      try {
        if (typeof CozeRealtime !== 'undefined' && CozeRealtime.stopTaskMode) {
          await CozeRealtime.stopTaskMode(true);
          console.log('[DictationSession] 已退出任务模式');
        }
      } catch (e) {
        console.warn('[DictationSession] 退出任务模式失败:', e);
      }
      this._taskModeActivated = false;
    }
    
    this.status = DictationSession.STATUS.FINISHED;
    this.wordList = [];
    this.currentIndex = 0;
    this.userWrote = [];
    this.result = null;
    
    this.onStatusChange = null;
    this.onWordSpeak = null;
    this.onProgress = null;
    this.onResult = null;
    this.onError = null;
  }
  
  /**
   * 完成任务
   */
  async completeTask() {
    console.log('[DictationSession] 完成任务');
    await this.destroy();
  }
}

// 全局导出
window.DictationSession = DictationSession;

console.log('[DictationSession] 听写会话管理类已加载');

