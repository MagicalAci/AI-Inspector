/**
 * 盯盯作业 - 任务卡片设计系统 v1.0
 * Task Card Design System
 * 
 * 功能：
 * 1. 任务卡片组件生成
 * 2. 状态管理与切换
 * 3. 动画效果控制
 * 4. 展示页面渲染
 */

// ==========================================
// 一、任务卡片配置
// ==========================================

const TaskCardConfig = {
  // 任务模式定义
  modes: {
    homework: {
      key: 'homework',
      name: '作业',
      icon: '📚',
      iconAlt: 'fa-solid fa-book-open',
      color: '#10B981',
      lightColor: 'rgba(16, 185, 129, 0.1)',
      gradient: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
      description: '普通作业任务，包括练习题、阅读等'
    },
    recite: {
      key: 'recite',
      name: '背诵',
      icon: '📖',
      iconAlt: 'fa-solid fa-microphone',
      color: '#8B5CF6',
      lightColor: 'rgba(139, 92, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
      description: '需要语音识别的背诵任务'
    },
    dictation: {
      key: 'dictation',
      name: '听写',
      icon: '✏️',
      iconAlt: 'fa-solid fa-pen',
      color: '#F59E0B',
      lightColor: 'rgba(245, 158, 11, 0.1)',
      gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
      description: '需要TTS播放的听写任务'
    },
    copywrite: {
      key: 'copywrite',
      name: '默写',
      icon: '✍️',
      iconAlt: 'fa-solid fa-pencil',
      color: '#3B82F6',
      lightColor: 'rgba(59, 130, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
      description: '静默默写任务'
    },
    reading: {
      key: 'reading',
      name: '朗读',
      icon: '🎤',
      iconAlt: 'fa-solid fa-volume-high',
      color: '#EC4899',
      lightColor: 'rgba(236, 72, 153, 0.1)',
      gradient: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)',
      description: '朗读练习任务'
    }
  },
  
  // 任务状态定义
  statuses: {
    pending: {
      key: 'pending',
      name: '待执行',
      color: '#9CA3AF',
      description: '等待开始的任务'
    },
    active: {
      key: 'active',
      name: '进行中',
      color: '#10B981',
      description: '当前正在执行的任务'
    },
    paused: {
      key: 'paused',
      name: '已暂停',
      color: '#F59E0B',
      description: '暂时中断的任务'
    },
    completed: {
      key: 'completed',
      name: '已完成',
      color: '#22C55E',
      description: '成功完成的任务'
    },
    failed: {
      key: 'failed',
      name: '未完成',
      color: '#EF4444',
      description: '未能完成的任务'
    }
  },
  
  // 学科图标
  subjectIcons: {
    语文: '📖',
    数学: '🔢',
    英语: '🔤',
    物理: '⚛️',
    化学: '🧪',
    生物: '🧬',
    历史: '📜',
    地理: '🌍',
    政治: '⚖️',
    其他: '📚'
  }
};

// ==========================================
// 二、任务卡片生成器
// ==========================================

const TaskCardGenerator = {
  
  /**
   * 生成首页任务列表卡片
   * @param {Object} task - 任务数据
   * @param {Object} options - 配置选项
   * @returns {string} HTML字符串
   */
  createListCard(task, options = {}) {
    const mode = TaskCardConfig.modes[task.mode] || TaskCardConfig.modes.homework;
    const status = TaskCardConfig.statuses[task.status] || TaskCardConfig.statuses.pending;
    const subjectIcon = TaskCardConfig.subjectIcons[task.subject] || '📚';
    
    const {
      showDelete = true,
      showMaterial = true,
      animated = false,
      index = 0
    } = options;
    
    const animationDelay = animated ? `style="animation-delay: ${index * 0.1}s"` : '';
    const animateClass = animated ? 'animate-in' : '';
    
    // 素材状态（可点击交互）
    let materialHtml = '';
    if (showMaterial && (task.mode === 'recite' || task.mode === 'dictation' || task.mode === 'copywrite')) {
      const hasMaterial = task.material || task.materialUrl;
      materialHtml = `
        <span class="material-indicator ${hasMaterial ? 'has-material' : 'no-material'}"
              data-task-id="${task.id}"
              data-action="${hasMaterial ? 'view-material' : 'upload-material'}"
              onclick="event.stopPropagation(); TaskCardGenerator.handleMaterialClick(this, '${task.id}', ${hasMaterial ? 'true' : 'false'})">
          <i class="fa-solid ${hasMaterial ? 'fa-image' : 'fa-cloud-arrow-up'}"></i>
          ${hasMaterial ? '查看素材' : '上传素材'}
        </span>
      `;
    }
    
    // 删除按钮
    const deleteBtn = showDelete ? `
      <button class="task-delete-btn" data-task-id="${task.id}" title="删除任务">
        <i class="fa-solid fa-xmark"></i>
      </button>
    ` : '';
    
    return `
      <div class="task-list-card mode-${mode.key} status-${status.key} ${animateClass}" 
           data-task-id="${task.id}" 
           data-mode="${mode.key}"
           ${animationDelay}>
        <div class="task-icon-wrapper mode-${mode.key}">
          ${subjectIcon}
        </div>
        <div class="task-content">
          <h4 class="task-name">${this.escapeHtml(task.name)}</h4>
          <div class="task-meta">
            <span class="task-subject">${task.subject || '学习'}</span>
            <span class="task-duration">
              <i class="fa-regular fa-clock"></i>
              ${task.duration || 30}分钟
            </span>
            <span class="task-mode-badge mode-${mode.key}">${mode.name}</span>
            ${materialHtml}
          </div>
        </div>
        ${deleteBtn}
      </div>
    `;
  },
  
  /**
   * 生成监督页面悬浮任务卡片
   * @param {Object} task - 任务数据
   * @param {Object} state - 状态数据（时间、进度等）
   * @returns {string} HTML字符串
   */
  createFloatingCard(task, state = {}) {
    const mode = TaskCardConfig.modes[task.mode] || TaskCardConfig.modes.homework;
    
    const {
      elapsedTime = 0,      // 已用时间（秒）
      totalTime = 1800,     // 总时间（秒）
      currentIndex = 1,     // 当前任务序号
      totalTasks = 1,       // 总任务数
      progress = 0          // 特殊进度（听写等）
    } = state;
    
    // 计算进度环偏移
    const circumference = 2 * Math.PI * 34; // 213.6
    const progressPercent = Math.min(elapsedTime / totalTime, 1);
    const strokeOffset = circumference * (1 - progressPercent);
    
    // 格式化时间
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };
    
    // 听写/背诵进度条
    let progressBar = '';
    if ((task.mode === 'dictation' || task.mode === 'recite') && progress > 0) {
      progressBar = `
        <div class="task-progress-bar mode-${mode.key}">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      `;
    }
    
    return `
      <div class="floating-task-card animate-in">
        <div class="floating-task-inner mode-${mode.key}">
          <!-- 进度环 -->
          <div class="floating-progress-section">
            <svg class="floating-progress-ring mode-${mode.key}" viewBox="0 0 80 80">
              <circle class="progress-bg" cx="40" cy="40" r="34" />
              <circle class="progress-fill" cx="40" cy="40" r="34" 
                      style="stroke-dashoffset: ${strokeOffset}; stroke: ${mode.color};" />
            </svg>
            <div class="floating-time-display">
              <span class="time-value">${formatTime(elapsedTime)}</span>
            </div>
          </div>
          
          <!-- 任务信息 -->
          <div class="floating-task-info">
            <div class="floating-task-label">
              <span class="mode-icon">${mode.icon}</span>
              <span class="label-text">当前任务</span>
            </div>
            <h3 class="floating-task-name">${this.escapeHtml(task.name)}</h3>
            <div class="floating-task-meta mode-${mode.key}">
              <span class="total-time">${formatTime(totalTime)}</span>
              <span class="task-index">${currentIndex}/${totalTasks}</span>
            </div>
            ${progressBar}
          </div>
          
          <!-- 完成按钮 -->
          <button class="floating-complete-btn mode-${mode.key}" data-task-id="${task.id}">
            <i class="fa-solid fa-check"></i>
          </button>
        </div>
        
        <!-- 任务指示点 -->
        <div class="task-dots-indicator">
          ${this.createTaskDots(currentIndex, totalTasks)}
        </div>
      </div>
    `;
  },
  
  /**
   * 生成任务指示点
   */
  createTaskDots(current, total) {
    let dots = '';
    for (let i = 1; i <= total; i++) {
      const isActive = i === current;
      const isCompleted = i < current;
      dots += `<span class="task-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"></span>`;
    }
    return dots;
  },
  
  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },
  
  /**
   * 处理素材指示器点击
   * @param {HTMLElement} element - 点击的元素
   * @param {string} taskId - 任务ID
   * @param {boolean} hasMaterial - 是否已有素材
   */
  handleMaterialClick(element, taskId, hasMaterial) {
    if (hasMaterial) {
      // 查看已上传的素材
      this.viewMaterial(taskId);
    } else {
      // 打开上传素材界面
      this.openMaterialUpload(taskId);
    }
  },
  
  /**
   * 查看素材
   */
  viewMaterial(taskId) {
    // 查找任务数据
    const task = window.AppState?.tasks?.find(t => t.id === taskId);
    if (task && (task.material || task.materialUrl)) {
      // 显示素材预览弹窗
      this.showMaterialPreview(task);
    } else {
      // 如果是展示页面的演示，显示示例
      this.showDemoMaterialPreview();
    }
  },
  
  /**
   * 打开素材上传
   */
  openMaterialUpload(taskId) {
    // 触发全局的上传素材事件
    if (window.openTaskEditModal) {
      window.openTaskEditModal(taskId, 'material');
    } else if (window.showToast) {
      window.showToast('请先添加任务再上传素材', 'info');
    } else {
      // 演示模式：显示提示
      this.showDemoUploadHint();
    }
  },
  
  /**
   * 显示素材预览（实际应用）
   */
  showMaterialPreview(task) {
    const previewHtml = `
      <div class="material-preview-modal" id="material-preview-modal" onclick="this.remove()">
        <div class="material-preview-content" onclick="event.stopPropagation()">
          <div class="material-preview-header">
            <h3><i class="fa-solid fa-image"></i> 素材预览</h3>
            <button class="material-preview-close" onclick="document.getElementById('material-preview-modal').remove()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="material-preview-body">
            <img src="${task.material || task.materialUrl}" alt="任务素材" />
          </div>
          <div class="material-preview-footer">
            <span class="material-task-name">${task.name}</span>
            <button class="material-change-btn" onclick="TaskCardGenerator.openMaterialUpload('${task.id}'); document.getElementById('material-preview-modal').remove();">
              <i class="fa-solid fa-pen"></i> 更换素材
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', previewHtml);
  },
  
  /**
   * 演示用素材预览
   */
  showDemoMaterialPreview() {
    const demoHtml = `
      <div class="material-preview-modal" id="material-preview-modal" onclick="this.remove()">
        <div class="material-preview-content demo" onclick="event.stopPropagation()">
          <div class="material-preview-header">
            <h3><i class="fa-solid fa-image"></i> 素材预览</h3>
            <button class="material-preview-close" onclick="document.getElementById('material-preview-modal').remove()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="material-preview-body demo">
            <div class="demo-material-content">
              <div class="demo-material-icon">📄</div>
              <div class="demo-material-text">
                <h4>古诗词背诵内容</h4>
                <p>床前明月光，疑是地上霜。<br>举头望明月，低头思故乡。</p>
                <span class="demo-tag">示例素材</span>
              </div>
            </div>
          </div>
          <div class="material-preview-footer">
            <span class="material-task-name">古诗词背诵</span>
            <button class="material-change-btn" onclick="document.getElementById('material-preview-modal').remove();">
              <i class="fa-solid fa-check"></i> 确定
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', demoHtml);
  },
  
  /**
   * 演示用上传提示
   */
  showDemoUploadHint() {
    const hintHtml = `
      <div class="material-preview-modal" id="material-preview-modal" onclick="this.remove()">
        <div class="material-preview-content upload-hint" onclick="event.stopPropagation()">
          <div class="material-preview-header">
            <h3><i class="fa-solid fa-cloud-arrow-up"></i> 上传素材</h3>
            <button class="material-preview-close" onclick="document.getElementById('material-preview-modal').remove()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="material-upload-body">
            <div class="upload-area">
              <div class="upload-icon">
                <i class="fa-solid fa-camera"></i>
              </div>
              <div class="upload-text">
                <h4>拍照或上传素材</h4>
                <p>支持课本、作业本、生词本等图片</p>
              </div>
            </div>
            <div class="upload-options">
              <button class="upload-option-btn camera">
                <i class="fa-solid fa-camera"></i>
                拍照
              </button>
              <button class="upload-option-btn album">
                <i class="fa-solid fa-images"></i>
                相册
              </button>
            </div>
            <div class="upload-tips">
              <i class="fa-solid fa-lightbulb"></i>
              <span>小贴士：清晰的图片能帮助 AI 更准确地识别内容</span>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', hintHtml);
  },
  
  // ==========================================
  // 特殊任务模式卡片生成器
  // ==========================================
  
  /**
   * 生成听写模式交互卡片
   * @param {Object} task - 任务数据
   * @param {Object} state - 当前状态
   */
  createDictationCard(task, state = {}) {
    const {
      words = ['apple', 'banana', 'orange', 'grape', 'watermelon'],
      currentIndex = 0,
      playCount = 0,
      speed = 1,
      isPlaying = false,
      completedWords = [],
      errorWords = []
    } = state;
    
    const currentWord = words[currentIndex] || '';
    const progress = Math.round(((currentIndex) / words.length) * 100);
    
    // 生成单词点状指示器
    const wordDots = words.map((_, i) => {
      let dotClass = '';
      if (i === currentIndex) dotClass = 'current';
      else if (completedWords.includes(i)) dotClass = 'completed';
      else if (errorWords.includes(i)) dotClass = 'error';
      return `<span class="word-dot ${dotClass}"></span>`;
    }).join('');
    
    return `
      <div class="dictation-card" data-task-id="${task.id}">
        <!-- 当前单词显示 -->
        <div class="dictation-word-display">
          <div class="current-word">${isPlaying ? currentWord : ''}</div>
          <div class="word-hidden">${!isPlaying ? '● ● ● ● ●' : ''}</div>
        </div>
        
        <!-- 播放控制 -->
        <div class="dictation-controls">
          <button class="dictation-control-btn btn-prev" ${currentIndex === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-backward-step"></i>
          </button>
          <button class="dictation-control-btn btn-play ${isPlaying ? 'playing' : ''}">
            <i class="fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}"></i>
          </button>
          <button class="dictation-control-btn btn-next" ${currentIndex >= words.length - 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-forward-step"></i>
          </button>
        </div>
        
        <!-- 播放信息 -->
        <div class="dictation-playback-info">
          <div class="playback-count">
            <i class="fa-solid fa-rotate-right"></i>
            <span>已播放 <span class="count-value">${playCount}</span> 次</span>
          </div>
          <div class="playback-speed ${speed === 0.5 ? 'active' : ''}" data-speed="0.5">0.5x</div>
          <div class="playback-speed ${speed === 1 ? 'active' : ''}" data-speed="1">1x</div>
          <div class="playback-speed ${speed === 1.5 ? 'active' : ''}" data-speed="1.5">1.5x</div>
        </div>
        
        <!-- 进度条 -->
        <div class="dictation-progress">
          <div class="dictation-progress-bar">
            <div class="fill" style="width: ${progress}%"></div>
          </div>
          <div class="dictation-progress-text">
            <span class="current">${currentIndex + 1}</span>/${words.length}
          </div>
        </div>
        
        <!-- 单词指示点 -->
        <div class="dictation-word-list">
          ${wordDots}
        </div>
      </div>
    `;
  },
  
  /**
   * 生成默写模式交互卡片
   * @param {Object} task - 任务数据
   * @param {Object} state - 当前状态
   */
  createCopywriteCard(task, state = {}) {
    const {
      promptText = '床前明月光，疑是地上霜。',
      currentLine = 1,
      totalLines = 4,
      userInput = '',
      showResult = false,
      isCorrect = true,
      correctAnswer = ''
    } = state;
    
    // 生成提示文本（带空白）
    const promptWithBlanks = promptText.replace(/(.{2})/g, '$1<span class="blank"></span>').slice(0, -28);
    
    let resultHtml = '';
    if (showResult) {
      resultHtml = `
        <div class="copywrite-result ${isCorrect ? 'correct' : 'incorrect'}">
          <span class="result-icon">${isCorrect ? '✅' : '❌'}</span>
          <span class="result-text">${isCorrect ? '完全正确！' : '有错误，请检查'}</span>
          ${!isCorrect ? `<div class="correct-answer">正确答案：${correctAnswer}</div>` : ''}
        </div>
      `;
    }
    
    return `
      <div class="copywrite-card" data-task-id="${task.id}">
        <!-- 提示区域 -->
        <div class="copywrite-prompt">
          <div class="prompt-label">第 ${currentLine}/${totalLines} 句 - 根据提示默写</div>
          <div class="prompt-text">
            ${promptText.split('').map((char, i) => 
              i % 3 === 0 ? `<span class="highlight">${char}</span>` : char
            ).join('')}
          </div>
        </div>
        
        <!-- 输入区域 -->
        <div class="copywrite-input-area">
          <div class="input-label">请在下方默写</div>
          <textarea class="copywrite-textarea" placeholder="在此输入你的默写内容...">${userInput}</textarea>
        </div>
        
        ${resultHtml}
        
        <!-- 操作按钮 -->
        <div class="copywrite-actions">
          <button class="copywrite-btn btn-hint">
            <i class="fa-solid fa-lightbulb"></i>
            提示
          </button>
          <button class="copywrite-btn btn-check">
            <i class="fa-solid fa-check"></i>
            检查
          </button>
        </div>
      </div>
    `;
  },
  
  /**
   * 生成背诵模式交互卡片
   * @param {Object} task - 任务数据
   * @param {Object} state - 当前状态
   */
  createReciteCard(task, state = {}) {
    const {
      originalText = '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。',
      currentVerse = 1,
      isListening = false,
      recognizedText = '',
      accuracy = 0,
      correctCount = 0,
      incorrectCount = 0,
      elapsedTime = 0
    } = state;
    
    // 格式化原文
    const verses = originalText.split('\n');
    const formattedText = verses.map((verse, i) => 
      `<span class="verse-number">${i + 1}</span>${verse}`
    ).join('<br>');
    
    // 生成波形条
    const waveformBars = Array(10).fill(0).map(() => 
      `<div class="waveform-bar"></div>`
    ).join('');
    
    // 准确率环偏移计算
    const circumference = 226;
    const accuracyOffset = circumference - (circumference * accuracy / 100);
    const accuracyClass = accuracy >= 80 ? 'high' : accuracy >= 60 ? 'medium' : 'low';
    
    return `
      <div class="recite-card" data-task-id="${task.id}">
        <!-- 原文显示 -->
        <div class="recite-original">
          <div class="original-label">背诵内容</div>
          <div class="original-text">${formattedText}</div>
        </div>
        
        <!-- 识别状态 -->
        <div class="recite-status ${isListening ? 'listening' : 'idle'}">
          <div class="status-icon">
            ${isListening ? '<i class="fa-solid fa-microphone"></i>' : '<i class="fa-solid fa-microphone-slash"></i>'}
          </div>
          <div class="status-text">
            <div class="main">${isListening ? '正在聆听...' : '点击开始背诵'}</div>
            <div class="sub">${isListening ? '请大声朗读上方内容' : '准备好后点击录音按钮'}</div>
          </div>
        </div>
        
        <!-- 语音波形 -->
        <div class="recite-waveform ${isListening ? '' : 'idle'}">
          ${waveformBars}
        </div>
        
        ${accuracy > 0 ? `
        <!-- 准确率显示 -->
        <div class="recite-accuracy">
          <div class="accuracy-circle">
            <svg viewBox="0 0 80 80">
              <circle class="bg" cx="40" cy="40" r="36" />
              <circle class="fill ${accuracyClass}" cx="40" cy="40" r="36" 
                      style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${accuracyOffset};" />
            </svg>
            <div class="value">${accuracy}%</div>
          </div>
          <div class="accuracy-details">
            <div class="detail-item">
              <i class="fa-solid fa-check correct"></i>
              <span>正确 ${correctCount} 字</span>
            </div>
            <div class="detail-item">
              <i class="fa-solid fa-xmark incorrect"></i>
              <span>错误 ${incorrectCount} 字</span>
            </div>
            <div class="detail-item">
              <i class="fa-solid fa-clock time"></i>
              <span>用时 ${Math.floor(elapsedTime / 60)}:${String(elapsedTime % 60).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
        ` : ''}
        
        <!-- 操作按钮 -->
        <div class="recite-actions">
          <button class="recite-btn btn-hint">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="recite-btn btn-record ${isListening ? 'recording' : ''}">
            <i class="fa-solid fa-microphone"></i>
          </button>
          <button class="recite-btn btn-retry">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      </div>
    `;
  },
  
  /**
   * 生成朗读模式交互卡片
   * @param {Object} task - 任务数据
   * @param {Object} state - 当前状态
   */
  createReadingCard(task, state = {}) {
    const {
      text = 'The quick brown fox jumps over the lazy dog.',
      words = [],
      currentWordIndex = -1,
      isRecording = false,
      hasRecording = false,
      score = 0,
      fluency = 0,
      accuracy = 0,
      intonation = 0
    } = state;
    
    // 解析单词
    const textWords = text.split(' ');
    const wordsHtml = textWords.map((word, i) => {
      let wordClass = '';
      if (i === currentWordIndex) wordClass = 'current';
      else if (i < currentWordIndex) wordClass = 'read';
      return `<span class="word ${wordClass}">${word}</span>`;
    }).join(' ');
    
    return `
      <div class="reading-card" data-task-id="${task.id}">
        <!-- 朗读文本 -->
        <div class="reading-text-display">
          <div class="text-label">
            <i class="fa-solid fa-book-open"></i>
            请朗读以下内容
          </div>
          <div class="text-content">
            ${wordsHtml}
          </div>
        </div>
        
        <!-- 录音控制 -->
        <div class="reading-controls">
          <button class="reading-btn btn-sample" title="听示范">
            <i class="fa-solid fa-headphones"></i>
          </button>
          <button class="reading-btn btn-record ${isRecording ? 'recording' : ''}" title="录音">
            <i class="fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'}"></i>
          </button>
          <button class="reading-btn btn-play" title="播放录音" ${!hasRecording ? 'disabled' : ''}>
            <i class="fa-solid fa-play"></i>
          </button>
        </div>
        
        ${score > 0 ? `
        <!-- 评分显示 -->
        <div class="reading-score">
          <div class="score-main">
            <div class="score-value">${score}</div>
            <div class="score-label">综合评分</div>
          </div>
          <div class="score-details">
            <div class="score-item">
              <span class="score-item-label">流利度</span>
              <div class="score-item-bar">
                <div class="fill fluency" style="width: ${fluency}%"></div>
              </div>
              <span class="score-item-value">${fluency}</span>
            </div>
            <div class="score-item">
              <span class="score-item-label">准确度</span>
              <div class="score-item-bar">
                <div class="fill accuracy" style="width: ${accuracy}%"></div>
              </div>
              <span class="score-item-value">${accuracy}</span>
            </div>
            <div class="score-item">
              <span class="score-item-label">语调</span>
              <div class="score-item-bar">
                <div class="fill intonation" style="width: ${intonation}%"></div>
              </div>
              <span class="score-item-value">${intonation}</span>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  },
  
  /**
   * 生成结果提交卡片
   * @param {Object} task - 任务数据
   * @param {Object} result - 结果数据
   */
  createResultCard(task, result = {}) {
    const {
      status = 'success', // success, partial, failed
      score = 100,
      totalItems = 10,
      correctItems = 10,
      incorrectItems = 0,
      duration = 300, // 秒
      points = 50,
      combo = 3,
      correctList = ['apple', 'banana', 'orange'],
      incorrectList = [],
      rankText = '超过了 95% 的同学'
    } = result;
    
    const mode = TaskCardConfig.modes[task.mode] || TaskCardConfig.modes.homework;
    
    // 状态配置
    const statusConfig = {
      success: { icon: '🎉', title: '太棒了！', subtitle: '完美完成任务' },
      partial: { icon: '👍', title: '做得不错', subtitle: '继续加油' },
      failed: { icon: '💪', title: '别灰心', subtitle: '再试一次吧' }
    };
    const statusInfo = statusConfig[status];
    
    // 格式化时间
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
    
    return `
      <div class="result-card ${status} animate-in" data-task-id="${task.id}">
        <!-- 状态头部 -->
        <div class="result-header">
          <div class="result-icon-wrapper">
            ${statusInfo.icon}
          </div>
          <h2 class="result-title">${statusInfo.title}</h2>
          <p class="result-subtitle">${statusInfo.subtitle}</p>
        </div>
        
        <!-- 主要得分 -->
        <div class="result-score-main">
          <div class="score-big-number">
            ${score}<span class="unit">分</span>
          </div>
          ${rankText ? `
          <div class="score-rank">
            <i class="fa-solid fa-trophy"></i>
            ${rankText}
          </div>
          ` : ''}
        </div>
        
        <!-- 统计数据 -->
        <div class="result-stats">
          <div class="result-stat-item highlight">
            <div class="result-stat-value">${correctItems}</div>
            <div class="result-stat-label">正确</div>
          </div>
          <div class="result-stat-item ${incorrectItems > 0 ? 'warning' : ''}">
            <div class="result-stat-value">${incorrectItems}</div>
            <div class="result-stat-label">错误</div>
          </div>
          <div class="result-stat-item">
            <div class="result-stat-value">${timeStr}</div>
            <div class="result-stat-label">用时</div>
          </div>
        </div>
        
        ${incorrectList.length > 0 ? `
        <!-- 错误项列表 -->
        <div class="result-detail-list">
          <div class="result-detail-title">
            <i class="fa-solid fa-circle-xmark" style="color: #EF4444;"></i>
            需要复习的内容
          </div>
          <div class="result-detail-items">
            ${incorrectList.map(item => `
              <span class="result-detail-item incorrect">${item}</span>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <!-- 奖励展示 -->
        <div class="result-rewards">
          <div class="reward-item">
            <span class="reward-icon">⭐</span>
            <div class="reward-info">
              <div class="reward-value">+${points}</div>
              <div class="reward-label">积分</div>
            </div>
          </div>
          ${combo > 1 ? `
          <div class="reward-item">
            <span class="reward-icon">🔥</span>
            <div class="reward-info">
              <div class="reward-value">${combo}连击</div>
              <div class="reward-label">连续完成</div>
            </div>
          </div>
          ` : ''}
        </div>
        
        <!-- 操作按钮 -->
        <div class="result-actions">
          ${status !== 'success' ? `
          <button class="result-btn btn-retry">
            <i class="fa-solid fa-rotate-right"></i>
            再试一次
          </button>
          ` : ''}
          <button class="result-btn btn-primary">
            <i class="fa-solid fa-arrow-right"></i>
            ${status === 'success' ? '继续下一个' : '跳过'}
          </button>
        </div>
      </div>
    `;
  }
};

// ==========================================
// 三、任务卡片状态管理器
// ==========================================

const TaskCardStateManager = {
  
  /**
   * 更新卡片状态
   * @param {HTMLElement} cardEl - 卡片元素
   * @param {string} newStatus - 新状态
   */
  updateStatus(cardEl, newStatus) {
    if (!cardEl) return;
    
    // 移除所有状态类
    Object.keys(TaskCardConfig.statuses).forEach(status => {
      cardEl.classList.remove(`status-${status}`);
    });
    
    // 添加新状态类
    cardEl.classList.add(`status-${newStatus}`);
    
    // 触发状态动画
    if (newStatus === 'completed') {
      this.playCompleteAnimation(cardEl);
    }
  },
  
  /**
   * 更新卡片模式
   * @param {HTMLElement} cardEl - 卡片元素
   * @param {string} newMode - 新模式
   */
  updateMode(cardEl, newMode) {
    if (!cardEl) return;
    
    // 移除所有模式类
    Object.keys(TaskCardConfig.modes).forEach(mode => {
      cardEl.classList.remove(`mode-${mode}`);
    });
    
    // 添加新模式类
    cardEl.classList.add(`mode-${newMode}`);
    
    // 更新内部元素的模式
    const innerElements = cardEl.querySelectorAll('[class*="mode-"]');
    innerElements.forEach(el => {
      Object.keys(TaskCardConfig.modes).forEach(mode => {
        el.classList.remove(`mode-${mode}`);
      });
      el.classList.add(`mode-${newMode}`);
    });
    
    // 模式切换动画
    const inner = cardEl.querySelector('.floating-task-inner');
    if (inner) {
      inner.classList.add('mode-switching');
      setTimeout(() => inner.classList.remove('mode-switching'), 400);
    }
  },
  
  /**
   * 播放完成动画
   */
  playCompleteAnimation(cardEl) {
    cardEl.classList.add('animate-complete');
    setTimeout(() => cardEl.classList.remove('animate-complete'), 600);
  },
  
  /**
   * 播放删除动画
   */
  playRemoveAnimation(cardEl, callback) {
    cardEl.classList.add('animate-remove');
    setTimeout(() => {
      if (callback) callback();
      cardEl.remove();
    }, 400);
  },
  
  /**
   * 播放高亮动画
   */
  playHighlightAnimation(cardEl) {
    cardEl.classList.add('animate-highlight');
    setTimeout(() => cardEl.classList.remove('animate-highlight'), 1500);
  },
  
  /**
   * 更新悬浮卡片进度
   */
  updateFloatingProgress(cardEl, elapsedSeconds, totalSeconds) {
    if (!cardEl) return;
    
    const circumference = 2 * Math.PI * 34;
    const progressPercent = Math.min(elapsedSeconds / totalSeconds, 1);
    const strokeOffset = circumference * (1 - progressPercent);
    
    const progressFill = cardEl.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.strokeDashoffset = strokeOffset;
    }
    
    const timeValue = cardEl.querySelector('.time-value');
    if (timeValue) {
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      timeValue.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }
};

// ==========================================
// 四、展示页面渲染器
// ==========================================

const TaskCardShowcase = {
  
  /**
   * 初始化展示页面
   */
  init() {
    const container = document.getElementById('task-cards-showcase-content');
    if (!container) return;
    
    container.innerHTML = this.renderShowcase();
    this.bindEvents();
  },
  
  /**
   * 渲染完整展示页面
   */
  renderShowcase() {
    return `
      <div class="task-cards-showcase">
        <!-- 设计系统概述 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-palette"></i>
            设计系统概述
          </h3>
          <p class="showcase-note">
            任务卡片设计系统为盯盯作业提供统一的视觉语言。支持<strong>5种任务模式</strong>
            （作业、背诵、听写、默写、朗读）和<strong>5种任务状态</strong>
            （待执行、进行中、已暂停、已完成、未完成）的组合展示。
          </p>
        </div>
        
        <!-- 任务模式颜色参考 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-swatchbook"></i>
            任务模式颜色
          </h3>
          <table class="showcase-reference-table">
            <thead>
              <tr>
                <th>模式</th>
                <th>图标</th>
                <th>主色</th>
                <th>应用场景</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(TaskCardConfig.modes).map(mode => `
                <tr>
                  <td><strong>${mode.name}</strong></td>
                  <td>${mode.icon}</td>
                  <td>
                    <span class="color-swatch" style="background: ${mode.gradient}"></span>
                    ${mode.color}
                  </td>
                  <td>${mode.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- 首页任务列表卡片 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-list"></i>
            首页任务列表卡片
          </h3>
          
          <h4 style="font-size: 14px; color: #6B7280; margin: 16px 0 12px;">不同模式</h4>
          <div class="showcase-cards-grid" id="showcase-list-modes">
            ${this.renderListCardsByMode()}
          </div>
          
          <h4 style="font-size: 14px; color: #6B7280; margin: 24px 0 12px;">不同状态</h4>
          <div class="showcase-cards-grid" id="showcase-list-statuses">
            ${this.renderListCardsByStatus()}
          </div>
          
          <div class="showcase-actions">
            <button class="showcase-action-btn" data-action="animate-all">
              <i class="fa-solid fa-play"></i> 播放入场动画
            </button>
            <button class="showcase-action-btn" data-action="complete-demo">
              <i class="fa-solid fa-check"></i> 演示完成效果
            </button>
            <button class="showcase-action-btn" data-action="delete-demo">
              <i class="fa-solid fa-trash"></i> 演示删除效果
            </button>
          </div>
        </div>
        
        <!-- 监督页面悬浮卡片 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-video"></i>
            监督页面悬浮卡片
          </h3>
          
          <div class="showcase-preview-box" id="floating-preview-container">
            ${TaskCardGenerator.createFloatingCard(
              { id: 'demo', name: '数学计算题', mode: 'homework', subject: '数学' },
              { elapsedTime: 125, totalTime: 1200, currentIndex: 1, totalTasks: 3 }
            )}
          </div>
          
          <div class="showcase-actions">
            ${Object.values(TaskCardConfig.modes).map(mode => `
              <button class="showcase-action-btn ${mode.key === 'homework' ? 'active' : ''}" 
                      data-action="switch-mode" 
                      data-mode="${mode.key}">
                ${mode.icon} ${mode.name}
              </button>
            `).join('')}
          </div>
          
          <div class="showcase-note">
            <strong>说明：</strong>监督页面卡片采用玻璃态（Glassmorphism）设计，半透明背景使其能够
            与下方的虚拟老师视频和谐融合。不同模式会改变卡片的主题色，包括进度环、时间文字和完成按钮。
          </div>
        </div>
        
        <!-- 特殊任务进度条 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-bars-progress"></i>
            特殊任务进度条
          </h3>
          
          <p class="showcase-note" style="margin-bottom: 16px;">
            听写、背诵、默写等特殊任务会显示额外的进度条，表示当前完成的词数/句数进度。
          </p>
          
          <div class="showcase-cards-grid">
            ${this.renderProgressBarDemo()}
          </div>
        </div>
        
        <!-- 素材状态指示器 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-paperclip"></i>
            素材状态指示器
          </h3>
          
          <div class="showcase-cards-grid">
            ${this.renderMaterialIndicatorDemo()}
          </div>
          
          <div class="showcase-note">
            <strong>提示：</strong>背诵、听写、默写任务需要上传素材（如课文图片）。
            卡片会显示素材状态：绿色表示已上传，红色表示待上传。
          </div>
        </div>
        
        <!-- 动画效果参考 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            动画效果参考
          </h3>
          
          <table class="showcase-reference-table">
            <thead>
              <tr>
                <th>动画名称</th>
                <th>触发时机</th>
                <th>持续时间</th>
                <th>缓动函数</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>cardSlideIn</strong></td>
                <td>卡片首次出现</td>
                <td>400ms</td>
                <td>ease-out</td>
              </tr>
              <tr>
                <td><strong>cardComplete</strong></td>
                <td>任务完成时</td>
                <td>600ms</td>
                <td>spring</td>
              </tr>
              <tr>
                <td><strong>cardRemove</strong></td>
                <td>删除任务时</td>
                <td>400ms</td>
                <td>ease-in</td>
              </tr>
              <tr>
                <td><strong>cardHighlight</strong></td>
                <td>提示关注时</td>
                <td>1500ms</td>
                <td>ease (循环)</td>
              </tr>
              <tr>
                <td><strong>modeSwitch</strong></td>
                <td>切换任务模式</td>
                <td>400ms</td>
                <td>ease</td>
              </tr>
              <tr>
                <td><strong>activePulse</strong></td>
                <td>进行中状态</td>
                <td>2000ms</td>
                <td>ease (循环)</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- 听写模式特殊卡片 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-pen" style="color: #F59E0B;"></i>
            听写模式交互卡片
          </h3>
          
          <div class="showcase-preview-box" style="background: linear-gradient(180deg, #F59E0B 0%, #D97706 100%);" id="dictation-card-preview">
            ${TaskCardGenerator.createDictationCard(
              { id: 'demo_dictation', name: '英语单词听写', mode: 'dictation' },
              { words: ['apple', 'banana', 'orange', 'grape', 'watermelon'], currentIndex: 2, playCount: 3, isPlaying: true, completedWords: [0, 1] }
            )}
          </div>
          
          <div class="showcase-note">
            <strong>听写卡片功能：</strong>
            <ul style="margin: 8px 0 0 16px; padding: 0;">
              <li>单词/词组播放控制（上一个、播放/暂停、下一个）</li>
              <li>播放次数统计和速度调节（0.5x / 1x / 1.5x）</li>
              <li>进度条和单词点状指示器</li>
              <li>当前单词显示（播放时显示，否则隐藏）</li>
            </ul>
          </div>
        </div>
        
        <!-- 默写模式特殊卡片 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-pencil" style="color: #3B82F6;"></i>
            默写模式交互卡片
          </h3>
          
          <div class="showcase-preview-box" style="background: linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%);" id="copywrite-card-preview">
            ${TaskCardGenerator.createCopywriteCard(
              { id: 'demo_copywrite', name: '古诗默写', mode: 'copywrite' },
              { promptText: '床前明月光，疑是地上霜。', currentLine: 1, totalLines: 4 }
            )}
          </div>
          
          <div class="showcase-note">
            <strong>默写卡片功能：</strong>
            <ul style="margin: 8px 0 0 16px; padding: 0;">
              <li>提示区域（显示部分内容作为提示）</li>
              <li>输入/书写区域</li>
              <li>检查按钮（对比正确答案）</li>
              <li>提示功能（逐步显示更多内容）</li>
              <li>检查结果显示（正确/错误+正确答案）</li>
            </ul>
          </div>
        </div>
        
        <!-- 背诵模式特殊卡片 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-microphone" style="color: #8B5CF6;"></i>
            背诵模式交互卡片
          </h3>
          
          <div class="showcase-preview-box" style="background: linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%);" id="recite-card-preview">
            ${TaskCardGenerator.createReciteCard(
              { id: 'demo_recite', name: '古诗背诵', mode: 'recite' },
              { originalText: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。', isListening: true, accuracy: 85, correctCount: 17, incorrectCount: 3, elapsedTime: 45 }
            )}
          </div>
          
          <div class="showcase-note">
            <strong>背诵卡片功能：</strong>
            <ul style="margin: 8px 0 0 16px; padding: 0;">
              <li>原文显示（带句号标记）</li>
              <li>语音识别状态指示（等待/聆听中）</li>
              <li>实时语音波形动画</li>
              <li>准确率圆环显示（高/中/低三色）</li>
              <li>正确/错误字数和用时统计</li>
              <li>提示、录音、重试按钮</li>
            </ul>
          </div>
        </div>
        
        <!-- 朗读模式特殊卡片 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-volume-high" style="color: #EC4899;"></i>
            朗读模式交互卡片
          </h3>
          
          <div class="showcase-preview-box" style="background: linear-gradient(180deg, #EC4899 0%, #BE185D 100%);" id="reading-card-preview">
            ${TaskCardGenerator.createReadingCard(
              { id: 'demo_reading', name: '英语朗读', mode: 'reading' },
              { text: 'The quick brown fox jumps over the lazy dog. This is a sample sentence for reading practice.', currentWordIndex: 4, isRecording: false, hasRecording: true, score: 92, fluency: 95, accuracy: 88, intonation: 93 }
            )}
          </div>
          
          <div class="showcase-note">
            <strong>朗读卡片功能：</strong>
            <ul style="margin: 8px 0 0 16px; padding: 0;">
              <li>朗读文本显示（高亮当前词）</li>
              <li>听示范按钮（TTS播放）</li>
              <li>录音控制（开始/停止）</li>
              <li>播放录音按钮</li>
              <li>综合评分显示（流利度、准确度、语调）</li>
            </ul>
          </div>
        </div>
        
        <!-- 结果提交卡片 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-flag-checkered" style="color: #22C55E;"></i>
            结果提交卡片
          </h3>
          
          <div class="showcase-preview-box" style="background: linear-gradient(180deg, #1F2937 0%, #111827 100%);" id="result-card-preview-success">
            ${TaskCardGenerator.createResultCard(
              { id: 'demo_result', name: '英语听写', mode: 'dictation' },
              { status: 'success', score: 95, totalItems: 20, correctItems: 19, incorrectItems: 1, duration: 325, points: 80, combo: 5, incorrectList: ['watermelon'], rankText: '超过了 92% 的同学' }
            )}
          </div>
          
          <div class="showcase-actions" style="margin-top: 16px;">
            <button class="showcase-action-btn active" data-action="result-success">🎉 成功</button>
            <button class="showcase-action-btn" data-action="result-partial">👍 部分完成</button>
            <button class="showcase-action-btn" data-action="result-failed">💪 未完成</button>
          </div>
          
          <div class="showcase-note">
            <strong>结果卡片功能：</strong>
            <ul style="margin: 8px 0 0 16px; padding: 0;">
              <li>三种状态：成功（绿）、部分完成（黄）、未完成（红）</li>
              <li>主要得分展示（大数字+排名）</li>
              <li>统计数据网格（正确、错误、用时）</li>
              <li>需要复习的内容列表</li>
              <li>积分和连击奖励展示</li>
              <li>继续/重试按钮</li>
            </ul>
          </div>
        </div>
        
        <!-- 使用示例 -->
        <div class="showcase-section">
          <h3 class="showcase-section-title">
            <i class="fa-solid fa-code"></i>
            使用示例
          </h3>
          
          <div class="showcase-code">
            <pre><span class="code-comment">// 生成首页任务卡片</span>
const html = TaskCardGenerator.<span class="code-class">createListCard</span>({
  id: <span class="code-string">'task_001'</span>,
  name: <span class="code-string">'语文古诗背诵'</span>,
  mode: <span class="code-string">'recite'</span>,
  subject: <span class="code-string">'语文'</span>,
  duration: 15,
  status: <span class="code-string">'pending'</span>
});

<span class="code-comment">// 生成监督页悬浮卡片</span>
const floatingHtml = TaskCardGenerator.<span class="code-class">createFloatingCard</span>(task, {
  elapsedTime: 300,
  totalTime: 900,
  currentIndex: 2,
  totalTasks: 4
});

<span class="code-comment">// 生成听写模式交互卡片</span>
const dictationHtml = TaskCardGenerator.<span class="code-class">createDictationCard</span>(task, {
  words: [<span class="code-string">'apple'</span>, <span class="code-string">'banana'</span>, <span class="code-string">'orange'</span>],
  currentIndex: 1,
  isPlaying: true
});

<span class="code-comment">// 生成结果提交卡片</span>
const resultHtml = TaskCardGenerator.<span class="code-class">createResultCard</span>(task, {
  status: <span class="code-string">'success'</span>,
  score: 95,
  correctItems: 19,
  incorrectItems: 1,
  points: 80
});

<span class="code-comment">// 更新卡片状态</span>
TaskCardStateManager.<span class="code-class">updateStatus</span>(cardEl, <span class="code-string">'completed'</span>);

<span class="code-comment">// 更新卡片模式</span>
TaskCardStateManager.<span class="code-class">updateMode</span>(cardEl, <span class="code-string">'dictation'</span>);</pre>
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * 按模式渲染列表卡片
   */
  renderListCardsByMode() {
    const modes = ['homework', 'recite', 'dictation', 'copywrite', 'reading'];
    const names = ['数学计算题', '古诗词背诵', '英语单词听写', '课文默写', '英语朗读'];
    const subjects = ['数学', '语文', '英语', '语文', '英语'];
    
    return modes.map((mode, i) => {
      return TaskCardGenerator.createListCard({
        id: `demo_${mode}`,
        name: names[i],
        mode: mode,
        subject: subjects[i],
        duration: 15 + i * 5,
        status: 'pending',
        material: mode === 'recite' // 只有背诵有素材
      }, { showDelete: true, showMaterial: true });
    }).join('');
  },
  
  /**
   * 按状态渲染列表卡片
   */
  renderListCardsByStatus() {
    const statuses = ['pending', 'active', 'paused', 'completed', 'failed'];
    const names = ['待执行任务', '进行中任务', '暂停任务', '已完成任务', '未完成任务'];
    
    return statuses.map((status, i) => {
      return TaskCardGenerator.createListCard({
        id: `demo_status_${status}`,
        name: names[i],
        mode: 'homework',
        subject: '示例',
        duration: 30,
        status: status
      }, { showDelete: status !== 'completed', showMaterial: false });
    }).join('');
  },
  
  /**
   * 渲染进度条演示
   */
  renderProgressBarDemo() {
    const modes = ['dictation', 'recite', 'copywrite'];
    const names = ['听写进度 (7/10)', '背诵进度 (3/5)', '默写进度 (15/20)'];
    const progresses = [70, 60, 75];
    
    return modes.map((mode, i) => {
      const modeConfig = TaskCardConfig.modes[mode];
      return `
        <div class="task-list-card mode-${mode}" style="padding-bottom: 12px;">
          <div class="task-icon-wrapper mode-${mode}">${modeConfig.icon}</div>
          <div class="task-content" style="width: 100%;">
            <h4 class="task-name">${names[i]}</h4>
            <div class="task-progress-bar mode-${mode}" style="margin-top: 8px;">
              <div class="progress-fill" style="width: ${progresses[i]}%; background: ${modeConfig.gradient};"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },
  
  /**
   * 渲染素材指示器演示
   */
  renderMaterialIndicatorDemo() {
    return `
      <div class="task-list-card mode-recite">
        <div class="task-icon-wrapper mode-recite">📖</div>
        <div class="task-content">
          <h4 class="task-name">古诗背诵（已上传素材）</h4>
          <div class="task-meta">
            <span class="task-subject">语文</span>
            <span class="task-mode-badge mode-recite">背诵</span>
            <span class="material-indicator has-material"
                  data-task-id="demo_recite"
                  onclick="event.stopPropagation(); TaskCardGenerator.showDemoMaterialPreview()">
              <i class="fa-solid fa-image"></i>
              查看素材
            </span>
          </div>
        </div>
      </div>
      <div class="task-list-card mode-dictation">
        <div class="task-icon-wrapper mode-dictation">✏️</div>
        <div class="task-content">
          <h4 class="task-name">英语听写（待上传素材）</h4>
          <div class="task-meta">
            <span class="task-subject">英语</span>
            <span class="task-mode-badge mode-dictation">听写</span>
            <span class="material-indicator no-material"
                  data-task-id="demo_dictation"
                  onclick="event.stopPropagation(); TaskCardGenerator.showDemoUploadHint()">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              上传素材
            </span>
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * 绑定交互事件
   */
  bindEvents() {
    // 模式切换
    document.querySelectorAll('[data-action="switch-mode"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.switchFloatingMode(mode);
        
        // 更新按钮状态
        document.querySelectorAll('[data-action="switch-mode"]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });
    
    // 动画演示
    document.querySelector('[data-action="animate-all"]')?.addEventListener('click', () => {
      this.playAllAnimations();
    });
    
    document.querySelector('[data-action="complete-demo"]')?.addEventListener('click', () => {
      this.playCompleteDemoAnimation();
    });
    
    document.querySelector('[data-action="delete-demo"]')?.addEventListener('click', () => {
      this.playDeleteDemoAnimation();
    });
    
    // 结果卡片状态切换
    document.querySelector('[data-action="result-success"]')?.addEventListener('click', (e) => {
      this.switchResultStatus('success');
      this.updateResultButtons(e.currentTarget);
    });
    
    document.querySelector('[data-action="result-partial"]')?.addEventListener('click', (e) => {
      this.switchResultStatus('partial');
      this.updateResultButtons(e.currentTarget);
    });
    
    document.querySelector('[data-action="result-failed"]')?.addEventListener('click', (e) => {
      this.switchResultStatus('failed');
      this.updateResultButtons(e.currentTarget);
    });
  },
  
  /**
   * 切换结果卡片状态
   */
  switchResultStatus(status) {
    const container = document.getElementById('result-card-preview-success');
    if (!container) return;
    
    const resultConfigs = {
      success: {
        status: 'success',
        score: 95,
        totalItems: 20,
        correctItems: 19,
        incorrectItems: 1,
        duration: 325,
        points: 80,
        combo: 5,
        incorrectList: ['watermelon'],
        rankText: '超过了 92% 的同学'
      },
      partial: {
        status: 'partial',
        score: 72,
        totalItems: 20,
        correctItems: 14,
        incorrectItems: 6,
        duration: 480,
        points: 45,
        combo: 2,
        incorrectList: ['watermelon', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'pineapple'],
        rankText: '超过了 58% 的同学'
      },
      failed: {
        status: 'failed',
        score: 35,
        totalItems: 20,
        correctItems: 7,
        incorrectItems: 13,
        duration: 600,
        points: 10,
        combo: 0,
        incorrectList: ['watermelon', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'pineapple', 'mango', 'papaya'],
        rankText: ''
      }
    };
    
    container.innerHTML = TaskCardGenerator.createResultCard(
      { id: 'demo_result', name: '英语听写', mode: 'dictation' },
      resultConfigs[status]
    );
  },
  
  /**
   * 更新结果按钮状态
   */
  updateResultButtons(activeBtn) {
    document.querySelectorAll('[data-action^="result-"]').forEach(btn => {
      btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
  },
  
  /**
   * 切换悬浮卡片模式
   */
  switchFloatingMode(mode) {
    const container = document.getElementById('floating-preview-container');
    if (!container) return;
    
    const modeConfig = TaskCardConfig.modes[mode];
    const names = {
      homework: '数学计算题',
      recite: '古诗词背诵',
      dictation: '英语单词听写',
      copywrite: '课文默写',
      reading: '英语朗读'
    };
    
    container.innerHTML = TaskCardGenerator.createFloatingCard(
      { id: 'demo', name: names[mode], mode: mode, subject: modeConfig.name },
      { elapsedTime: Math.floor(Math.random() * 300) + 60, totalTime: 1200, currentIndex: 1, totalTasks: 3, progress: mode !== 'homework' ? 45 : 0 }
    );
  },
  
  /**
   * 播放所有入场动画
   */
  playAllAnimations() {
    const cards = document.querySelectorAll('#showcase-list-modes .task-list-card, #showcase-list-statuses .task-list-card');
    cards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        card.style.transition = 'all 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 100);
    });
  },
  
  /**
   * 播放完成动画演示
   */
  playCompleteDemoAnimation() {
    const card = document.querySelector('#showcase-list-statuses .task-list-card');
    if (card) {
      TaskCardStateManager.playCompleteAnimation(card);
      TaskCardStateManager.updateStatus(card, 'completed');
    }
  },
  
  /**
   * 播放删除动画演示
   */
  playDeleteDemoAnimation() {
    const cards = document.querySelectorAll('#showcase-list-modes .task-list-card');
    const lastCard = cards[cards.length - 1];
    if (lastCard) {
      TaskCardStateManager.playRemoveAnimation(lastCard, () => {
        // 重新渲染
        setTimeout(() => {
          document.getElementById('showcase-list-modes').innerHTML = this.renderListCardsByMode();
        }, 500);
      });
    }
  }
};

// ==========================================
// 五、导出到全局
// ==========================================

window.TaskCardConfig = TaskCardConfig;
window.TaskCardGenerator = TaskCardGenerator;
window.TaskCardStateManager = TaskCardStateManager;
window.TaskCardShowcase = TaskCardShowcase;

console.log('🎴 任务卡片设计系统已加载');
