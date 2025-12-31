/**
 * AI伴读小精灵 - 作业模块
 * 包含：拍照批改、背诵、听写功能
 */

// ==========================================
// 拍照作业批改
// ==========================================
const HomeworkCamera = {
  stream: null,
  currentMode: 'correction', // correction | handwriting | search | translate
  
  modes: [
    { id: 'dictation-check', name: '听写批改' },
    { id: 'handwriting', name: '练字检查' },
    { id: 'correction', name: '作业批改' },
    { id: 'search', name: '搜题' },
    { id: 'translate', name: '翻译' },
  ],
  
  /**
   * 初始化相机
   */
  async init() {
    this.bindEvents();
    await this.startCamera();
  },
  
  /**
   * 启动相机
   */
  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // 使用后置摄像头
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      const videoElement = document.getElementById('camera-video');
      if (videoElement) {
        videoElement.srcObject = this.stream;
      }
    } catch (error) {
      console.error('无法访问相机:', error);
      this.showError('无法访问相机，请检查权限设置');
    }
  },
  
  /**
   * 停止相机
   */
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  },
  
  /**
   * 拍照
   */
  capture() {
    const video = document.getElementById('camera-video');
    const canvas = document.createElement('canvas');
    
    if (!video) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    // 播放拍照动画
    this.playShutterAnimation();
    
    // 模拟处理
    this.processImage(imageData);
    
    return imageData;
  },
  
  /**
   * 播放快门动画
   */
  playShutterAnimation() {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      background: white;
      z-index: 1000;
      animation: shutterFlash 0.3s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
  },
  
  /**
   * 处理图片（模拟AI识别和批改）
   */
  async processImage(imageData) {
    // 显示加载状态
    this.showLoading('正在识别作业...');
    
    // 模拟处理延迟
    await this.sleep(2000);
    
    // 模拟批改结果
    const result = this.mockCorrectionResult();
    
    // 隐藏加载
    this.hideLoading();
    
    // 显示结果页面
    this.showResult(result);
  },
  
  /**
   * 模拟批改结果
   */
  mockCorrectionResult() {
    return {
      score: 85,
      total: 5,
      correct: 4,
      wrong: 1,
      items: [
        {
          id: 1,
          question: '01 填空题：最大的两位数与最小的三位数的积是',
          answer: '9900',
          userAnswer: '9900',
          isCorrect: true
        },
        {
          id: 2,
          question: '02 选择题：正方形的边长是4厘米，它的周长是',
          answer: 'B 16厘米',
          userAnswer: 'B 16厘米',
          isCorrect: true
        },
        {
          id: 3,
          question: '03 判断题：表面积相等的两个圆柱，体积也相等',
          answer: '✗',
          userAnswer: '✗',
          isCorrect: true
        },
        {
          id: 4,
          question: '04 计算题：88-27+18=',
          answer: '79',
          userAnswer: '78',
          isCorrect: false,
          correctAnswer: '79'
        },
        {
          id: 5,
          question: '05 应用题：小明5分钟打了325个字，再打20分钟，一共能打多少个字？',
          answer: '1625',
          userAnswer: '1625',
          isCorrect: true
        }
      ]
    };
  },
  
  /**
   * 显示结果
   */
  showResult(result) {
    // 切换到结果页面
    if (window.Router) {
      window.Router.navigateTo('homework-result');
    }
    
    // 更新结果数据
    this.renderResult(result);
  },
  
  /**
   * 渲染结果
   */
  renderResult(result) {
    const container = document.getElementById('correction-list');
    if (!container) return;
    
    const scoreElement = document.querySelector('.correction-score');
    if (scoreElement) {
      scoreElement.innerHTML = `${result.score}<span>分</span>`;
    }
    
    container.innerHTML = result.items.map(item => `
      <div class="correction-item">
        <div class="correction-status ${item.isCorrect ? 'correct' : 'wrong'}">
          <i class="fa-solid fa-${item.isCorrect ? 'check' : 'xmark'}"></i>
        </div>
        <div class="correction-content">
          <div class="correction-question">${item.question}</div>
          <div class="correction-answer ${item.isCorrect ? '' : 'wrong'}">
            你的答案：${item.userAnswer}
          </div>
          ${!item.isCorrect ? `<div class="correction-right-answer">正确答案：${item.correctAnswer}</div>` : ''}
        </div>
      </div>
    `).join('');
  },
  
  /**
   * 切换模式
   */
  switchMode(mode) {
    this.currentMode = mode;
    
    // 更新UI
    document.querySelectorAll('.camera-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    // 更新提示文字
    const hints = {
      'correction': '对准作业拍照，AI自动批改',
      'handwriting': '对准练字内容，检查书写质量',
      'search': '拍照搜题，获取详细解析',
      'translate': '拍照翻译，支持多种语言',
      'dictation-check': '拍照检查听写作业'
    };
    
    const hintElement = document.querySelector('.camera-hint-text');
    if (hintElement) {
      hintElement.textContent = hints[mode] || '';
    }
  },
  
  /**
   * 绑定事件
   */
  bindEvents() {
    // 关闭按钮
    const closeBtn = document.getElementById('btn-close-camera');
    if (closeBtn) {
      closeBtn.onclick = () => {
        this.stopCamera();
        if (window.Router) {
          window.Router.navigateTo('home');
        }
      };
    }
    
    // 拍照按钮
    const captureBtn = document.getElementById('btn-capture');
    if (captureBtn) {
      captureBtn.onclick = () => this.capture();
    }
    
    // 模式切换
    document.querySelectorAll('.camera-tab').forEach(tab => {
      tab.onclick = () => this.switchMode(tab.dataset.mode);
    });
  },
  
  /**
   * 显示加载
   */
  showLoading(message) {
    let loader = document.getElementById('homework-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'homework-loader';
      loader.className = 'homework-loader';
      document.body.appendChild(loader);
    }
    
    loader.innerHTML = `
      <div class="loader-content">
        <div class="loader-spinner"></div>
        <div class="loader-text">${message}</div>
      </div>
    `;
    loader.style.display = 'flex';
  },
  
  /**
   * 隐藏加载
   */
  hideLoading() {
    const loader = document.getElementById('homework-loader');
    if (loader) {
      loader.style.display = 'none';
    }
  },
  
  /**
   * 显示错误
   */
  showError(message) {
    alert(message); // 简单实现，可以替换为更好看的Toast
  },
  
  /**
   * 延迟工具函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// ==========================================
// 背诵功能
// ==========================================
const ReciteModule = {
  isRecording: false,
  recognition: null,
  currentText: '',
  recognizedText: '',
  
  poems: [
    {
      id: 1,
      title: '静夜思',
      author: '李白',
      content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。'
    },
    {
      id: 2,
      title: '春晓',
      author: '孟浩然',
      content: '春眠不觉晓，处处闻啼鸟。\n夜来风雨声，花落知多少。'
    },
    {
      id: 3,
      title: '登鹳雀楼',
      author: '王之涣',
      content: '白日依山尽，黄河入海流。\n欲穷千里目，更上一层楼。'
    }
  ],
  
  currentPoem: null,
  
  /**
   * 初始化
   */
  init() {
    this.currentPoem = this.poems[0];
    this.renderPoem();
    this.bindEvents();
    this.initSpeechRecognition();
  },
  
  /**
   * 渲染诗词内容
   */
  renderPoem() {
    const titleElement = document.querySelector('.recite-title');
    const authorElement = document.querySelector('.recite-author');
    const textElement = document.querySelector('.recite-text');
    
    if (this.currentPoem) {
      if (titleElement) titleElement.textContent = this.currentPoem.title;
      if (authorElement) authorElement.textContent = `【${this.currentPoem.author}】`;
      if (textElement) textElement.innerHTML = this.currentPoem.content.replace(/\n/g, '<br>');
    }
  },
  
  /**
   * 初始化语音识别
   */
  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'zh-CN';
      
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
        
        this.recognizedText = finalTranscript + interimTranscript;
        this.updateRecognitionDisplay();
      };
      
      this.recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        this.stopRecording();
      };
      
      this.recognition.onend = () => {
        if (this.isRecording) {
          // 自动重启（用于连续识别）
          this.recognition.start();
        }
      };
    } else {
      console.log('浏览器不支持语音识别');
    }
  },
  
  /**
   * 开始录音
   */
  startRecording() {
    if (!this.recognition) {
      alert('您的浏览器不支持语音识别功能');
      return;
    }
    
    this.isRecording = true;
    this.recognizedText = '';
    this.recognition.start();
    this.updateRecordingUI(true);
  },
  
  /**
   * 停止录音
   */
  stopRecording() {
    this.isRecording = false;
    if (this.recognition) {
      this.recognition.stop();
    }
    this.updateRecordingUI(false);
    
    // 计算得分
    if (this.recognizedText) {
      this.calculateScore();
    }
  },
  
  /**
   * 切换录音状态
   */
  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },
  
  /**
   * 更新录音UI
   */
  updateRecordingUI(isRecording) {
    const micBtn = document.querySelector('.recite-btn-mic');
    const voiceWave = document.querySelector('.voice-wave');
    const voiceText = document.querySelector('.voice-text');
    
    if (micBtn) {
      micBtn.classList.toggle('recording', isRecording);
      micBtn.innerHTML = isRecording ? 
        '<i class="fa-solid fa-stop"></i>' : 
        '<i class="fa-solid fa-microphone"></i>';
    }
    
    if (voiceWave) {
      voiceWave.style.display = isRecording ? 'flex' : 'none';
    }
    
    if (voiceText) {
      voiceText.textContent = isRecording ? '正在聆听...' : '点击麦克风开始背诵';
    }
  },
  
  /**
   * 更新识别显示
   */
  updateRecognitionDisplay() {
    const displayElement = document.getElementById('recognized-text');
    if (displayElement) {
      displayElement.textContent = this.recognizedText;
    }
  },
  
  /**
   * 计算得分
   */
  calculateScore() {
    if (!this.currentPoem) return;
    
    const originalText = this.currentPoem.content.replace(/[，。！？、\n]/g, '');
    const userText = this.recognizedText.replace(/[，。！？、\s]/g, '');
    
    // 简单的相似度计算
    let matchCount = 0;
    const originalChars = originalText.split('');
    const userChars = userText.split('');
    
    originalChars.forEach((char, index) => {
      if (userChars[index] === char) {
        matchCount++;
      }
    });
    
    const accuracy = Math.round((matchCount / originalChars.length) * 100);
    const fluency = Math.min(100, Math.round((userChars.length / originalChars.length) * 100));
    const overall = Math.round((accuracy * 0.7 + fluency * 0.3));
    
    this.showScoreResult({
      overall,
      accuracy,
      fluency
    });
  },
  
  /**
   * 显示评分结果
   */
  showScoreResult(scores) {
    const resultContainer = document.getElementById('score-result');
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
      <div class="score-result">
        <div class="score-circle">
          <div class="score-value">${scores.overall}</div>
        </div>
        <div class="score-label">
          ${scores.overall >= 90 ? '🌟 太棒了！' : 
            scores.overall >= 70 ? '👍 继续加油！' : 
            '💪 再试一次！'}
        </div>
        <div class="score-detail">
          <div class="score-detail-item">
            <div class="score-detail-value">${scores.accuracy}%</div>
            <div class="score-detail-label">准确率</div>
          </div>
          <div class="score-detail-item">
            <div class="score-detail-value">${scores.fluency}%</div>
            <div class="score-detail-label">完整度</div>
          </div>
          <div class="score-detail-item">
            <div class="score-detail-value">${scores.overall}</div>
            <div class="score-detail-label">总分</div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="ReciteModule.retryRecite()">
          <i class="fa-solid fa-rotate-right"></i>
          再试一次
        </button>
      </div>
    `;
    
    resultContainer.style.display = 'block';
  },
  
  /**
   * 重新背诵
   */
  retryRecite() {
    const resultContainer = document.getElementById('score-result');
    if (resultContainer) {
      resultContainer.style.display = 'none';
    }
    this.recognizedText = '';
    this.updateRecognitionDisplay();
  },
  
  /**
   * 播放原文朗读
   */
  playAudio() {
    if (!this.currentPoem) return;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(this.currentPoem.content);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      alert('您的浏览器不支持语音朗读功能');
    }
  },
  
  /**
   * 绑定事件
   */
  bindEvents() {
    const micBtn = document.querySelector('.recite-btn-mic');
    if (micBtn) {
      micBtn.onclick = () => this.toggleRecording();
    }
    
    const playBtn = document.querySelector('.recite-btn-play');
    if (playBtn) {
      playBtn.onclick = () => this.playAudio();
    }
  }
};

// ==========================================
// 听写功能
// ==========================================
const DictationModule = {
  words: [
    { id: 1, chinese: '苹果', pinyin: 'píng guǒ', english: 'apple' },
    { id: 2, chinese: '香蕉', pinyin: 'xiāng jiāo', english: 'banana' },
    { id: 3, chinese: '老师', pinyin: 'lǎo shī', english: 'teacher' },
    { id: 4, chinese: '学校', pinyin: 'xué xiào', english: 'school' },
    { id: 5, chinese: '朋友', pinyin: 'péng yǒu', english: 'friend' },
  ],
  
  currentIndex: 0,
  answers: [],
  isPlaying: false,
  
  /**
   * 初始化
   */
  init() {
    this.currentIndex = 0;
    this.answers = [];
    this.renderWord();
    this.bindEvents();
  },
  
  /**
   * 渲染当前词语
   */
  renderWord() {
    const word = this.words[this.currentIndex];
    const wordElement = document.querySelector('.dictation-word');
    const progressElement = document.querySelector('.dictation-progress');
    
    if (wordElement) {
      wordElement.textContent = `第 ${this.currentIndex + 1} 个`;
    }
    
    if (progressElement) {
      progressElement.textContent = `${this.currentIndex + 1} / ${this.words.length}`;
    }
  },
  
  /**
   * 播放当前词语发音
   */
  playCurrentWord() {
    if (this.isPlaying) return;
    
    const word = this.words[this.currentIndex];
    if (!word) return;
    
    this.isPlaying = true;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.chinese);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.7;
      
      utterance.onend = () => {
        this.isPlaying = false;
      };
      
      speechSynthesis.speak(utterance);
    }
    
    // 更新播放按钮状态
    const playBtn = document.querySelector('.dictation-play-btn');
    if (playBtn) {
      playBtn.classList.add('playing');
      setTimeout(() => playBtn.classList.remove('playing'), 1500);
    }
  },
  
  /**
   * 下一个词语
   */
  nextWord() {
    if (this.currentIndex < this.words.length - 1) {
      this.currentIndex++;
      this.renderWord();
      // 清空画布
      this.clearCanvas();
      // 自动播放下一个
      setTimeout(() => this.playCurrentWord(), 500);
    } else {
      this.showResult();
    }
  },
  
  /**
   * 清空画布
   */
  clearCanvas() {
    const canvas = document.querySelector('.dictation-canvas');
    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  },
  
  /**
   * 显示结果
   */
  showResult() {
    alert(`听写完成！共 ${this.words.length} 个词语`);
    // 可以扩展为拍照批改流程
  },
  
  /**
   * 绑定事件
   */
  bindEvents() {
    const playBtn = document.querySelector('.dictation-play-btn');
    if (playBtn) {
      playBtn.onclick = () => this.playCurrentWord();
    }
    
    const nextBtn = document.querySelector('.dictation-next-btn');
    if (nextBtn) {
      nextBtn.onclick = () => this.nextWord();
    }
  }
};

// ==========================================
// 注入加载器样式
// ==========================================
function injectHomeworkStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shutterFlash {
      0% { opacity: 0; }
      50% { opacity: 1; }
      100% { opacity: 0; }
    }
    
    .homework-loader {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    
    .loader-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    
    .loader-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #34D399;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loader-text {
      color: white;
      font-size: 16px;
    }
  `;
  document.head.appendChild(style);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  injectHomeworkStyles();
});

// 导出模块
window.HomeworkCamera = HomeworkCamera;
window.ReciteModule = ReciteModule;
window.DictationModule = DictationModule;

