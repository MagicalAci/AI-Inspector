/**
 * AI伴读小精灵 - 主应用逻辑
 * StudyBuddy Main Application
 */

// ==========================================
// 应用状态管理
// ==========================================
const AppState = {
  currentPage: 'home',
  isVideoCallActive: false,
  isMicOn: true,
  isCameraOn: true,
  userStream: null,
  focusScore: 87,
  tasksCompleted: 3,
  totalTasks: 8,
  stars: 120,
  streak: 7,
};

// ==========================================
// DOM 元素缓存
// ==========================================
const DOM = {
  app: null,
  pages: null,
  tabItems: null,
  init() {
    this.app = document.getElementById('app');
    this.pages = document.querySelectorAll('.page');
    this.tabItems = document.querySelectorAll('.tab-item');
  }
};

// ==========================================
// 页面导航
// ==========================================
const Router = {
  /**
   * 切换到指定页面
   * @param {string} pageName - 页面名称
   */
  navigateTo(pageName) {
    // 如果是 parent 页面，重定向到 profile（暂时合并）
    if (pageName === 'parent') {
      pageName = 'profile';
    }
    
    // 隐藏所有页面
    DOM.pages.forEach(page => {
      page.classList.remove('active');
    });
    
    // 显示目标页面
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
      targetPage.classList.add('active');
      AppState.currentPage = pageName;
      
      // 更新 Tab 栏状态
      this.updateTabBar(pageName);
      
      // 页面特定初始化
      this.onPageEnter(pageName);
    }
  },
  
  /**
   * 更新 Tab 栏激活状态
   * @param {string} pageName - 当前页面名称
   */
  updateTabBar(pageName) {
    DOM.tabItems.forEach(item => {
      const itemPage = item.dataset.page;
      if (itemPage === pageName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },
  
  /**
   * 页面进入时的初始化
   * @param {string} pageName - 页面名称
   */
  onPageEnter(pageName) {
    switch (pageName) {
      case 'video':
        VideoCall.init();
        break;
      case 'tasks':
        TaskBoard.init();
        break;
      case 'parent':
        ParentDashboard.init();
        break;
    }
  }
};

// ==========================================
// 视频通话功能
// ==========================================
const VideoCall = {
  /**
   * 初始化视频通话
   */
  async init() {
    if (AppState.isCameraOn) {
      await this.startCamera();
    }
    this.bindEvents();
  },
  
  /**
   * 开启摄像头
   */
  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 480 },
        audio: false
      });
      
      const videoElement = document.getElementById('user-video');
      const placeholder = document.getElementById('video-placeholder');
      
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.style.display = 'block';
        AppState.userStream = stream;
      }
      
      if (placeholder) {
        placeholder.style.display = 'none';
      }
      
      AppState.isCameraOn = true;
      this.updateCameraButton();
      
    } catch (error) {
      console.log('无法访问摄像头:', error);
      this.showPlaceholder();
    }
  },
  
  /**
   * 停止摄像头
   */
  stopCamera() {
    if (AppState.userStream) {
      AppState.userStream.getTracks().forEach(track => track.stop());
      AppState.userStream = null;
    }
    
    const videoElement = document.getElementById('user-video');
    if (videoElement) {
      videoElement.srcObject = null;
      videoElement.style.display = 'none';
    }
    
    this.showPlaceholder();
    AppState.isCameraOn = false;
    this.updateCameraButton();
  },
  
  /**
   * 显示占位符
   */
  showPlaceholder() {
    const placeholder = document.getElementById('video-placeholder');
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  },
  
  /**
   * 切换摄像头
   */
  toggleCamera() {
    if (AppState.isCameraOn) {
      this.stopCamera();
    } else {
      this.startCamera();
    }
  },
  
  /**
   * 更新摄像头按钮状态
   */
  updateCameraButton() {
    const btn = document.getElementById('btn-camera');
    if (btn) {
      if (AppState.isCameraOn) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fa-solid fa-video"></i>';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
      }
    }
  },
  
  /**
   * 切换麦克风
   */
  toggleMic() {
    AppState.isMicOn = !AppState.isMicOn;
    const btn = document.getElementById('btn-mic');
    if (btn) {
      if (AppState.isMicOn) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
      }
    }
  },
  
  /**
   * 结束通话
   */
  endCall() {
    this.stopCamera();
    AppState.isVideoCallActive = false;
    Router.navigateTo('home');
  },
  
  /**
   * 绑定事件
   */
  bindEvents() {
    const btnMic = document.getElementById('btn-mic');
    const btnCamera = document.getElementById('btn-camera');
    const btnEndCall = document.getElementById('btn-end-call');
    
    if (btnMic) {
      btnMic.onclick = () => this.toggleMic();
    }
    if (btnCamera) {
      btnCamera.onclick = () => this.toggleCamera();
    }
    if (btnEndCall) {
      btnEndCall.onclick = () => this.endCall();
    }
  }
};

// ==========================================
// 任务看板功能
// ==========================================
const TaskBoard = {
  tasks: [
    { id: 1, name: '语文 - 背诵《静夜思》', reward: 20, difficulty: 2, duration: 5, completed: false },
    { id: 2, name: '数学 - 完成口算练习', reward: 30, difficulty: 3, duration: 10, completed: false },
    { id: 3, name: '英语 - 听写单词', reward: 25, difficulty: 2, duration: 8, completed: false },
    { id: 4, name: '阅读 - 看书20分钟', reward: 15, difficulty: 1, duration: 20, completed: true },
  ],
  
  /**
   * 初始化任务看板
   */
  init() {
    this.bindEvents();
    this.updateProgress();
  },
  
  /**
   * 绑定事件
   */
  bindEvents() {
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
      item.onclick = () => this.toggleTask(item);
    });
  },
  
  /**
   * 切换任务完成状态
   * @param {HTMLElement} taskElement - 任务元素
   */
  toggleTask(taskElement) {
    const taskId = parseInt(taskElement.dataset.id);
    const task = this.tasks.find(t => t.id === taskId);
    
    if (task) {
      task.completed = !task.completed;
      taskElement.classList.toggle('completed');
      
      // 播放完成动画
      if (task.completed) {
        this.playCompleteAnimation(taskElement);
        this.addStars(task.reward);
      }
      
      this.updateProgress();
    }
  },
  
  /**
   * 播放完成动画
   * @param {HTMLElement} element - 元素
   */
  playCompleteAnimation(element) {
    element.style.animation = 'none';
    element.offsetHeight; // 触发重排
    element.style.animation = 'taskComplete 0.5s ease-out';
    
    // 显示星星飞出效果
    this.showStarEffect(element);
  },
  
  /**
   * 显示星星效果
   * @param {HTMLElement} element - 元素
   */
  showStarEffect(element) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('div');
      star.innerHTML = '⭐';
      star.style.cssText = `
        position: fixed;
        font-size: 24px;
        pointer-events: none;
        z-index: 1000;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        animation: starFly 0.8s ease-out forwards;
        animation-delay: ${i * 0.1}s;
      `;
      document.body.appendChild(star);
      setTimeout(() => star.remove(), 1000);
    }
  },
  
  /**
   * 添加星星奖励
   * @param {number} amount - 星星数量
   */
  addStars(amount) {
    AppState.stars += amount;
    // 更新UI显示
    const statValue = document.querySelector('.stat-value:nth-child(2)');
    if (statValue) {
      statValue.textContent = `⭐ ${AppState.stars}`;
    }
  },
  
  /**
   * 更新进度
   */
  updateProgress() {
    const completed = this.tasks.filter(t => t.completed).length;
    const total = this.tasks.length;
    const percentage = (completed / total) * 100;
    
    AppState.tasksCompleted = completed;
    AppState.totalTasks = total;
    
    // 更新进度条
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    // 更新计数
    const progressCount = document.querySelector('.progress-count');
    if (progressCount) {
      progressCount.textContent = `${completed}/${total} 已完成`;
    }
  }
};

// ==========================================
// 家长监控面板
// ==========================================
const ParentDashboard = {
  /**
   * 初始化
   */
  init() {
    this.updateFocusScore();
    this.animateFocusChart();
  },
  
  /**
   * 更新专注度分数
   */
  updateFocusScore() {
    const scoreElement = document.querySelector('.focus-score');
    if (scoreElement) {
      // 模拟专注度变化
      this.animateNumber(scoreElement, AppState.focusScore);
    }
  },
  
  /**
   * 数字动画
   * @param {HTMLElement} element - 元素
   * @param {number} target - 目标值
   */
  animateNumber(element, target) {
    let current = 0;
    const duration = 1000;
    const step = target / (duration / 16);
    
    const animate = () => {
      current += step;
      if (current < target) {
        element.innerHTML = `${Math.floor(current)}<span>%</span>`;
        requestAnimationFrame(animate);
      } else {
        element.innerHTML = `${target}<span>%</span>`;
      }
    };
    
    animate();
  },
  
  /**
   * 动画化专注度图表
   */
  animateFocusChart() {
    const chartLine = document.querySelector('.focus-chart-line');
    if (chartLine) {
      chartLine.style.animation = 'chartGrow 1s ease-out forwards';
    }
  }
};

// ==========================================
// 首页交互
// ==========================================
const HomePage = {
  /**
   * 初始化
   */
  init() {
    this.bindEvents();
  },
  
  /**
   * 绑定事件
   */
  bindEvents() {
    // 开始讲题按钮
    const startBtn = document.getElementById('btn-start-lesson');
    if (startBtn) {
      startBtn.onclick = () => {
        Router.navigateTo('video');
      };
    }
    
    // 任务卡片点击
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach(card => {
      card.onclick = () => {
        const taskType = card.dataset.task;
        this.openTask(taskType);
      };
    });
    
    // 返回按钮
    const backBtn = document.getElementById('btn-back-teacher');
    if (backBtn) {
      backBtn.onclick = () => Router.navigateTo('home');
    }
  },
  
  /**
   * 打开任务
   * @param {string} taskType - 任务类型
   */
  openTask(taskType) {
    // 根据任务类型设置问题内容
    const questions = {
      literature: '《童年》刻画了众多的人物形象，( )是一个贪婪自私、专横残暴的人，经常毒打外祖母和孩子们，狠心地剥削手下的工人。',
      history: '明朝的郑和下西洋，带回来哪些宝贝？',
      science: '空间站里的宇航员是怎么睡觉的？'
    };
    
    const questionText = document.getElementById('question-text');
    if (questionText && questions[taskType]) {
      questionText.textContent = questions[taskType];
    }
    
    Router.navigateTo('teacher');
  }
};

// ==========================================
// 动画样式注入
// ==========================================
function injectAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes taskComplete {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); background: #E8F5E9; }
      100% { transform: scale(1); }
    }
    
    @keyframes starFly {
      0% {
        opacity: 1;
        transform: translate(0, 0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(${Math.random() * 100 - 50}px, -100px) scale(0.5);
      }
    }
    
    @keyframes chartGrow {
      from {
        clip-path: polygon(0 100%, 0 100%, 0 100%, 0 100%, 0 100%, 0 100%, 0 100%, 0 100%, 100% 100%, 0 100%);
      }
      to {
        clip-path: polygon(0 60%, 10% 40%, 25% 55%, 40% 30%, 55% 45%, 70% 20%, 85% 35%, 100% 25%, 100% 100%, 0 100%);
      }
    }
    
    .self-video-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #E5E7EB, #D1D5DB);
      color: #9CA3AF;
      font-size: 32px;
    }
    
    /* 隐藏视频占位符当视频可用时 */
    #user-video:not([src=""]) + .self-video-placeholder {
      display: none;
    }
  `;
  document.head.appendChild(style);
}

// ==========================================
// 应用初始化
// ==========================================
function initApp() {
  // 初始化 DOM 缓存
  DOM.init();
  
  // 注入动画样式
  injectAnimations();
  
  // 初始化首页
  HomePage.init();
  
  // 绑定 Tab 栏事件
  DOM.tabItems.forEach(item => {
    item.onclick = () => {
      const pageName = item.dataset.page;
      Router.navigateTo(pageName);
    };
  });
  
  // 模拟打字效果
  simulateTypingEffect();
  
  console.log('🌟 AI伴读小精灵已启动！');
}

/**
 * 模拟实时打字效果
 */
function simulateTypingEffect() {
  const realtimeText = document.getElementById('realtime-text');
  if (!realtimeText) return;
  
  const texts = [
    '你好呀同学，我们今天来聊一个很有意思的历史话题：',
    '你看，就是这个我们',
    '这其中最出名的就是长颈鹿...',
    '舅米哈伊尔和雅科夫，确实也很贪婪自私，为了家产争斗不休。但他们并不是'
  ];
  
  let currentIndex = 0;
  
  setInterval(() => {
    if (AppState.currentPage === 'teacher') {
      currentIndex = (currentIndex + 1) % texts.length;
      realtimeText.textContent = texts[currentIndex];
    }
  }, 3000);
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

// 导出给控制台调试
window.AppState = AppState;
window.Router = Router;
window.VideoCall = VideoCall;
window.TaskBoard = TaskBoard;

