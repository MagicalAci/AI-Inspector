/**
 * AI督学 - 主应用程序 v5
 * 新增：新用户引导流程（家教面试签约体验）
 */

// ==========================================
// 引导流程配置
// ==========================================
const INTERVIEW_QUESTIONS = [
  {
    type: 'input',
    text: '你好呀！我是小影老师 👋 我会每天陪你一起学习，帮你变得更厉害！先告诉我，你叫什么名字呀？',
    placeholder: '输入你的名字...',
    field: 'nickname',
    delay: 800
  },
  {
    type: 'quick',
    text: '{nickname}，好好听的名字！你现在上几年级啦？',
    options: ['低年级', '中年级', '高年级'],
    field: 'grade'
  },
  {
    type: 'quick',
    text: '写作业一般要多长时间？',
    options: ['半小时', '1小时', '更久'],
    field: 'homeworkTime'
  },
  {
    type: 'quick',
    text: '写作业时容易走神吗？',
    options: ['经常', '有时候', '很少'],
    field: 'focusLevel'
  },
  {
    type: 'action',
    text: '太棒了！我已经了解你了～',
    action: 'goToContract'
  }
];

// 引导状态
const OnboardingState = {
  stage: 'intro', // intro | interview | contract | done
  currentSlide: 0,
  currentQuestion: 0,
  userData: {
    nickname: '',
    grade: '',
    homeworkTime: '',
    focusLevel: '',
    avatar: '1'
  }
};

// 特工等级配置
const AGENT_LEVELS = [
  { 
    name: '见习特工', 
    minPoints: 0, 
    icon: '🎖️',
    color: '#9CA3AF',
    perks: ['基础督学功能', '每日3次AI批改']
  },
  { 
    name: '初级特工', 
    minPoints: 100, 
    icon: '🥉',
    color: '#CD7F32',
    perks: ['解锁专注度报告', '每日5次AI批改']
  },
  { 
    name: '中级特工', 
    minPoints: 300, 
    icon: '🥈',
    color: '#C0C0C0',
    perks: ['解锁学习数据周报', '无限AI批改']
  },
  { 
    name: '高级特工', 
    minPoints: 600, 
    icon: '🥇',
    color: '#FFD700',
    perks: ['解锁虚拟人皮肤', '优先客服支持']
  },
  { 
    name: '精英特工', 
    minPoints: 1000, 
    icon: '🏅',
    color: '#10B981',
    perks: ['解锁家长监控', '专属成就徽章']
  },
  { 
    name: '王牌特工', 
    minPoints: 2000, 
    icon: '🏆',
    color: '#3B82F6',
    perks: ['解锁所有功能', '月度学习报告']
  },
  { 
    name: '传奇特工', 
    minPoints: 5000, 
    icon: '👑',
    color: '#8B5CF6',
    perks: ['传奇专属头衔', 'VIP专属客服']
  }
];

// 应用状态
const AppState = {
  currentPage: 'home',
  user: {
    name: '小明同学',
    level: 0,
    levelName: '见习特工',
    balance: 0,
    stars: 0,
    totalMissions: 0,
    totalStudyTime: 0,
    streakDays: 0,
    achievements: []
  },
  tasks: [],
  currentTask: null,
  currentTaskIndex: 0,
  studyTimer: null,
  taskTimer: null,
  focusTimer: null,
  totalStudyTime: 0,
  taskElapsedTime: 0,
  selectedDuration: 30,
  selectedSubjects: ['语文'],
  selectedTaskType: 'homework',
  selectedTaskMode: 'homework', // homework | recite | dictation
  tempMaterial: null, // 临时存储的材料图片
  isPaused: false,
  focusScore: 90,
  // 休息系统
  isBreaking: false,           // 是否正在休息
  breakTimer: null,            // 休息计时器
  breakRemaining: 0,           // 休息剩余时间
  lastBreakTime: 0,            // 上次休息时间（学习秒数）
  studySessionWithoutBreak: 0  // 无休息连续学习时间
};

// 任务模式识别关键词
const TASK_MODE_PATTERNS = {
  recite: ['背诵', '背默', '熟读', '记忆', '默写', '朗读', '背课文', '背古诗'],
  dictation: ['听写', '听默', '词语听写', '生字听写', '单词听写', '默写词语']
};

// 检测任务模式
function detectTaskMode(taskName) {
  for (const [mode, keywords] of Object.entries(TASK_MODE_PATTERNS)) {
    if (keywords.some(kw => taskName.includes(kw))) {
      return mode;
    }
  }
  return 'homework';
}

// AI消息库
const AI_MESSAGES = {
  greetings: [
    '特工，准备好执行任务了吗？',
    '今天要完成什么任务呀？',
    '小影老师在等你呢！'
  ],
  noTask: [
    '先设置今日任务吧~',
    '点击下方按钮设置任务~',
    '特工，该安排任务了！'
  ],
  hasTask: [
    '任务已就绪，随时可以开始！',
    '准备好了吗？开始吧！',
    '特工任务等你来执行！'
  ],
  encouragements: [
    '加油！你正在认真学习呢~',
    '真棒！保持专注！',
    '小影老师看到你很努力哦~',
    '继续保持，你是最棒的！',
    '专心致志，特工就是这么酷！',
    '小影老师陪着你呢~',
    '你的专注力真强！',
    '这道题难不倒你的！',
    '做得真好，继续加油！'
  ],
  focusReminders: [
    '小特工，注意力集中哦~',
    '抬起头，看看老师~',
    '专注一下，任务快完成啦！',
    '不要分心哦，你可以的！',
    '深呼吸，继续加油！'
  ],
  timeCheckpoints: {
    5: '才刚开始，保持节奏！',
    10: '已经10分钟了，状态不错！',
    15: '15分钟了，可以休息一下眼睛~',
    20: '过半了！继续保持！',
    25: '快完成了，冲刺一下！',
    30: '30分钟了，真棒！'
  },
  completions: [
    '太棒了！任务完成！',
    '你真是个优秀的特工！',
    '完美！继续下一个吧！',
    '厉害！这个任务搞定了！',
    '小特工真能干！'
  ],
  allDone: [
    '所有任务都完成啦！',
    '今天的任务全部搞定！',
    '满分特工！给你比心~',
    '太厉害了，全部完成！'
  ],
  paused: [
    '休息一下吧~',
    '喝口水，马上回来！',
    '休息是为了更好地出发~'
  ],
  resumed: [
    '欢迎回来！继续加油！',
    '准备好了吗？继续！',
    '能量充满，出发！'
  ]
};

// 专注度模拟配置
const FOCUS_CONFIG = {
  checkInterval: 30000, // 30秒检查一次
  reminderChance: 0.15, // 15%几率触发提醒
  minFocusScore: 75,
  maxFocusScore: 98
};

// DOM 元素缓存
const DOM = {};

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
  // 检查是否需要重置（用于测试）
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reset') === '1') {
    localStorage.clear();
    // 清理 IndexedDB
    indexedDB.deleteDatabase(DB_NAME);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // 初始化 Lucide 图标
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  // 初始化数据库
  try {
    await initDatabase();
  } catch (e) {
    console.warn('IndexedDB not available:', e);
  }
  
  loadUserData();
  initDOM();
  initEventListeners();
  
  // 如果已经重置，直接初始化引导流程
  if (urlParams.get('reset') === '1') {
    initOnboarding();
    return;
  }
  
  // 检查是否需要显示引导流程
  const hasOnboarded = localStorage.getItem('ai_study_onboarded');
  if (hasOnboarded) {
    // 已完成引导，隐藏引导容器
    const onboarding = document.getElementById('onboarding');
    if (onboarding) onboarding.classList.remove('active');
    updateUI();
    updateUserNameDisplay(); // 更新用户名和问候语
  } else {
    // 首次使用，初始化引导流程
    initOnboarding();
  }
});

// 加载用户数据
function loadUserData() {
  const saved = localStorage.getItem('ai_study_user');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      Object.assign(AppState.user, data);
    } catch (e) {
      console.log('Failed to load user data');
    }
  }
  
  const savedTasks = localStorage.getItem('ai_study_tasks');
  if (savedTasks) {
    try {
      AppState.tasks = JSON.parse(savedTasks);
      
      // 自动清理已完成的任务（每次加载时）
      const beforeCount = AppState.tasks.length;
      AppState.tasks = AppState.tasks.filter(t => !t.completed);
      const removedCount = beforeCount - AppState.tasks.length;
      if (removedCount > 0) {
        console.log(`[自动清理] 已移除 ${removedCount} 个已完成任务`);
        localStorage.setItem('ai_study_tasks', JSON.stringify(AppState.tasks));
      }
    } catch (e) {
      console.log('Failed to load tasks');
    }
  }
  
  // 加载头像
  const savedAvatar = localStorage.getItem('ai_study_user_avatar');
  if (savedAvatar) {
    const avatarPath = `assets/images/avatars/avatar-${savedAvatar}.svg`;
    document.querySelectorAll('.user-avatar-btn img, .sidebar-avatar img').forEach(img => {
      img.src = avatarPath;
    });
  }
  
  // 加载用户档案
  const savedProfile = localStorage.getItem('ai_study_user_profile');
  if (savedProfile) {
    try {
      const profile = JSON.parse(savedProfile);
      Object.assign(OnboardingState.userData, profile);
      // 如果AppState.user.name未设置，使用profile中的nickname
      if (!AppState.user.name || AppState.user.name === '小明同学') {
        AppState.user.name = profile.nickname || '小特工';
      }
    } catch (e) {
      console.log('Failed to load profile');
    }
  }
  
  updateAgentLevel();
}

// 保存用户数据
function saveUserData() {
  localStorage.setItem('ai_study_user', JSON.stringify(AppState.user));
  localStorage.setItem('ai_study_tasks', JSON.stringify(AppState.tasks));
  
  // 保存任务历史到 IndexedDB
  saveTaskHistory();
}

/**
 * 清理已完成的任务（只保留未完成的）
 * 可在控制台调用: cleanupCompletedTasks()
 */
function cleanupCompletedTasks() {
  const before = AppState.tasks.length;
  AppState.tasks = AppState.tasks.filter(t => !t.completed);
  const after = AppState.tasks.length;
  saveUserData();
  updateUI();
  console.log(`[清理] 已删除 ${before - after} 个已完成任务，剩余 ${after} 个任务`);
  showToast(`已清理 ${before - after} 个已完成任务`, 'success');
  return { removed: before - after, remaining: after };
}

/**
 * 重置所有任务数据
 * 可在控制台调用: resetAllTasks()
 */
function resetAllTasks() {
  if (confirm('确定要清空所有任务吗？此操作不可撤销。')) {
    AppState.tasks = [];
    saveUserData();
    updateUI();
    showToast('已清空所有任务', 'info');
  }
}

// 暴露清理函数到全局
window.cleanupCompletedTasks = cleanupCompletedTasks;
window.resetAllTasks = resetAllTasks;

// ==========================================
// IndexedDB 任务历史存储
// ==========================================
const DB_NAME = 'AIStudyBuddy';
const DB_VERSION = 1;
const STORE_TASK_HISTORY = 'taskHistory';
const STORE_DAILY_STATS = 'dailyStats';

let db = null;

// 初始化数据库
function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('IndexedDB open failed');
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // 任务历史存储
      if (!database.objectStoreNames.contains(STORE_TASK_HISTORY)) {
        const taskStore = database.createObjectStore(STORE_TASK_HISTORY, { keyPath: 'id' });
        taskStore.createIndex('date', 'date', { unique: false });
        taskStore.createIndex('subject', 'subject', { unique: false });
        taskStore.createIndex('completed', 'completed', { unique: false });
      }
      
      // 每日统计存储
      if (!database.objectStoreNames.contains(STORE_DAILY_STATS)) {
        const statsStore = database.createObjectStore(STORE_DAILY_STATS, { keyPath: 'date' });
        statsStore.createIndex('month', 'month', { unique: false });
      }
    };
  });
}

// 保存任务历史
async function saveTaskHistory() {
  if (!db) {
    try {
      await initDatabase();
    } catch (e) {
      console.error('Failed to init database:', e);
      return;
    }
  }
  
  const completedTasks = AppState.tasks.filter(t => t.completed);
  if (completedTasks.length === 0) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  const transaction = db.transaction([STORE_TASK_HISTORY, STORE_DAILY_STATS], 'readwrite');
  const taskStore = transaction.objectStore(STORE_TASK_HISTORY);
  const statsStore = transaction.objectStore(STORE_DAILY_STATS);
  
  // 保存完成的任务
  completedTasks.forEach(task => {
    const historyTask = {
      ...task,
      date: today,
      month: today.substring(0, 7)
    };
    taskStore.put(historyTask);
  });
  
  // 更新每日统计
  const totalDuration = completedTasks.reduce((sum, t) => sum + (t.actualDuration || t.duration * 60), 0);
  
  const statsRequest = statsStore.get(today);
  statsRequest.onsuccess = () => {
    const existing = statsRequest.result || {
      date: today,
      month: today.substring(0, 7),
      tasksCompleted: 0,
      totalDuration: 0,
      focusScore: 0,
      sessions: 0
    };
    
    existing.tasksCompleted += completedTasks.length;
    existing.totalDuration += totalDuration;
    existing.sessions += 1;
    existing.focusScore = Math.round((existing.focusScore * (existing.sessions - 1) + 85) / existing.sessions);
    
    statsStore.put(existing);
  };
}

// 获取任务历史
async function getTaskHistory(days = 7) {
  if (!db) {
    try {
      await initDatabase();
    } catch (e) {
      console.error('Failed to init database:', e);
      return [];
    }
  }
  
  return new Promise((resolve, reject) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const transaction = db.transaction([STORE_TASK_HISTORY], 'readonly');
    const store = transaction.objectStore(STORE_TASK_HISTORY);
    const index = store.index('date');
    const range = IDBKeyRange.lowerBound(startDateStr);
    
    const request = index.getAll(range);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// 获取每日统计
async function getDailyStats(days = 7) {
  if (!db) {
    try {
      await initDatabase();
    } catch (e) {
      console.error('Failed to init database:', e);
      return [];
    }
  }
  
  return new Promise((resolve, reject) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const transaction = db.transaction([STORE_DAILY_STATS], 'readonly');
    const store = transaction.objectStore(STORE_DAILY_STATS);
    const range = IDBKeyRange.lowerBound(startDateStr);
    
    const request = store.getAll(range);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// 获取学习报告数据
async function getStudyReport(period = 'week') {
  const days = period === 'week' ? 7 : 30;
  const stats = await getDailyStats(days);
  const tasks = await getTaskHistory(days);
  
  const totalTasks = tasks.length;
  const totalDuration = stats.reduce((sum, s) => sum + s.totalDuration, 0);
  const totalSessions = stats.reduce((sum, s) => sum + s.sessions, 0);
  const avgFocus = stats.length > 0 
    ? Math.round(stats.reduce((sum, s) => sum + s.focusScore, 0) / stats.length)
    : 0;
  
  // 按科目统计
  const subjectStats = {};
  tasks.forEach(task => {
    if (!subjectStats[task.subject]) {
      subjectStats[task.subject] = { count: 0, duration: 0 };
    }
    subjectStats[task.subject].count++;
    subjectStats[task.subject].duration += task.actualDuration || task.duration * 60;
  });
  
  return {
    period,
    totalTasks,
    totalDuration: Math.round(totalDuration / 60), // 转为分钟
    totalSessions,
    avgFocus,
    subjectStats,
    dailyData: stats
  };
}

// 更新特工等级
function updateAgentLevel() {
  const points = AppState.user.stars;
  const oldLevel = AppState.user.level;
  let levelIndex = 0;
  
  for (let i = AGENT_LEVELS.length - 1; i >= 0; i--) {
    if (points >= AGENT_LEVELS[i].minPoints) {
      levelIndex = i;
      break;
    }
  }
  
  AppState.user.level = levelIndex;
  AppState.user.levelName = AGENT_LEVELS[levelIndex].name;
  
  // 检查是否升级
  if (levelIndex > oldLevel && oldLevel >= 0) {
    showLevelUpAnimation(AGENT_LEVELS[levelIndex]);
  }
  
  return levelIndex;
}

// 显示升级动画
function showLevelUpAnimation(level) {
  // 创建升级弹窗
  const modal = document.createElement('div');
  modal.className = 'level-up-modal';
  modal.innerHTML = `
    <div class="level-up-content">
      <div class="level-up-glow"></div>
      <div class="level-up-badge" style="--level-color: ${level.color}">
        <span class="level-up-icon">${level.icon}</span>
      </div>
      <h2 class="level-up-title">恭喜晋升!</h2>
      <p class="level-up-name">${level.name}</p>
      <div class="level-up-perks">
        <p class="perks-title">解锁特权：</p>
        ${level.perks.map(perk => `<div class="perk-item"><i class="fa-solid fa-check"></i>${perk}</div>`).join('')}
      </div>
      <button class="btn-level-up-close">太棒了！</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 动画显示
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
  
  // 关闭按钮
  modal.querySelector('.btn-level-up-close').addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  });
  
  // 播放升级音效（如果有）
  playLevelUpSound();
}

// 播放升级音效
function playLevelUpSound() {
  // 使用 Web Audio API 生成简单的升级音效
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 简单的升调音效
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.2);
    oscillator.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.4);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    // 音频不可用时静默失败
  }
}

// 获取下一等级所需积分
function getNextLevelPoints() {
  const currentLevel = AppState.user.level;
  if (currentLevel >= AGENT_LEVELS.length - 1) {
    return 0;
  }
  return AGENT_LEVELS[currentLevel + 1].minPoints - AppState.user.stars;
}

// 获取当前等级详情
function getCurrentLevelDetails() {
  const level = AGENT_LEVELS[AppState.user.level];
  const nextLevel = AGENT_LEVELS[AppState.user.level + 1];
  const progress = getLevelProgress();
  const pointsToNext = getNextLevelPoints();
  
  return {
    ...level,
    levelNumber: AppState.user.level + 1,
    progress,
    pointsToNext,
    nextLevel: nextLevel || null,
    isMaxLevel: AppState.user.level >= AGENT_LEVELS.length - 1
  };
}

// 获取等级进度百分比
function getLevelProgress() {
  const currentLevel = AppState.user.level;
  if (currentLevel >= AGENT_LEVELS.length - 1) {
    return 100;
  }
  
  const currentMin = AGENT_LEVELS[currentLevel].minPoints;
  const nextMin = AGENT_LEVELS[currentLevel + 1].minPoints;
  const progress = ((AppState.user.stars - currentMin) / (nextMin - currentMin)) * 100;
  
  return Math.min(Math.max(progress, 0), 100);
}

// 缓存DOM元素
function initDOM() {
  // 页面
  DOM.pages = {
    home: document.getElementById('page-home'),
    photo: document.getElementById('page-photo'),
    quick: document.getElementById('page-quick'),
    study: document.getElementById('page-study'),
    complete: document.getElementById('page-complete'),
    parent: document.getElementById('page-parent'),
    history: document.getElementById('page-history'),
    achievements: document.getElementById('page-achievements'),
    settings: document.getElementById('page-settings')
  };
  
  // 侧边栏
  DOM.sidebar = document.getElementById('sidebar');
  DOM.sidebarOverlay = document.getElementById('sidebar-overlay');
  
  // 弹窗
  DOM.modalAddTask = document.getElementById('modal-add-task');
  DOM.modalRecharge = document.getElementById('modal-recharge');
  DOM.modalTaskChoice = document.getElementById('modal-task-choice');
  
  // 首页元素
  DOM.avatarGreeting = document.getElementById('avatar-greeting');
  DOM.todayTasks = document.getElementById('today-tasks');
  DOM.streakDays = document.getElementById('streak-days');
  DOM.agentLevelShort = document.getElementById('agent-level-short');
  DOM.agentLevelName = document.getElementById('agent-level-name');
  DOM.levelIcon = document.getElementById('level-icon');
  DOM.homeLevelDot = document.getElementById('home-level-dot');
  DOM.userBalance = document.getElementById('user-balance');
  
  // 首页 V2 元素 (特工档案)
  DOM.streakDaysV2 = document.getElementById('streak-days-v2');
  DOM.totalMissionsV2 = document.getElementById('total-missions-v2');
  DOM.agentLevelDisplay = document.getElementById('agent-level-display');
  DOM.agentTitleDisplay = document.getElementById('agent-title-display');
  DOM.agentBadgeIcon = document.getElementById('agent-badge-icon');
  DOM.briefingEmpty = document.getElementById('briefing-empty');
  DOM.briefingTasks = document.getElementById('briefing-tasks');
  DOM.taskPreviewList = document.getElementById('task-preview-list');
  DOM.taskCountBadge = document.getElementById('task-count-badge');
  DOM.dailyProgressFill = document.getElementById('daily-progress-fill');
  DOM.dailyProgressText = document.getElementById('daily-progress-text');
  DOM.dailyMissionDesc = document.getElementById('daily-mission-desc');
  DOM.btnAddTask = document.getElementById('btn-add-task');
  
  // 任务相关
  DOM.pendingTasks = document.getElementById('pending-tasks');
  DOM.pendingList = document.getElementById('pending-list');
  DOM.btnMainAction = document.getElementById('btn-main-action');
  DOM.mainActionIcon = document.getElementById('main-action-icon');
  DOM.mainActionText = document.getElementById('main-action-text');
  
  // 督学页面元素 V2/V3
  DOM.studyTimer = document.getElementById('study-time-v2');
  DOM.aiMessage = document.getElementById('ai-bubble-text');
  DOM.aiBubble = document.getElementById('ai-bubble');
  DOM.currentTaskName = document.getElementById('current-task-name-v2');
  DOM.taskProgress = document.getElementById('task-progress-v2');
  DOM.taskTimeElapsed = document.getElementById('task-time-elapsed-v2');
  DOM.taskTimeTotal = document.getElementById('task-time-total-v2');
  DOM.focusValue = document.getElementById('focus-value');
  DOM.focusCurveLine = document.getElementById('focus-curve-line');
  DOM.focusCurveFill = document.getElementById('focus-curve-fill');
  DOM.taskSwiper = document.getElementById('task-swiper');
  DOM.taskDots = document.getElementById('task-dots');
  DOM.studyAvatarVideo = document.getElementById('study-avatar-video');
  
  // 视频加载失败时显示fallback图片
  if (DOM.studyAvatarVideo) {
    DOM.studyAvatarVideo.addEventListener('error', () => {
      console.log('Video load failed, showing fallback');
      showVideoFallback();
    });
    // 检查视频源是否可用
    DOM.studyAvatarVideo.addEventListener('loadeddata', () => {
      console.log('Video loaded successfully');
    });
  }
  
  // V3 新增元素
  DOM.focusBar = document.getElementById('focus-bar');
  DOM.focusBarFill = document.getElementById('focus-bar-fill');
  DOM.pointsBadge = document.getElementById('points-badge');
  DOM.sessionPoints = document.getElementById('session-points');
  DOM.comboBadge = document.getElementById('combo-badge');
  DOM.comboCount = document.getElementById('combo-count');
  DOM.teacherEmotion = document.getElementById('teacher-emotion');
  DOM.quickReplies = document.getElementById('quick-replies');
  DOM.progressRingFill = document.getElementById('progress-ring-fill');
  DOM.taskTimeBig = document.getElementById('task-time-big');
  DOM.taskTimeTotalSmall = document.getElementById('task-time-total-small');
  DOM.tomatoCount = document.getElementById('tomato-count');
  DOM.taskIndex = document.getElementById('task-index');
  DOM.achievementPopup = document.getElementById('achievement-popup');
  DOM.achievementPoints = document.getElementById('achievement-points');
  
  // 完成页面元素
  DOM.completeStats = {
    duration: document.getElementById('complete-duration'),
    tasks: document.getElementById('complete-tasks'),
    focus: document.getElementById('complete-focus'),
    stars: document.getElementById('reward-stars')
  };
  
  // 侧边栏元素
  DOM.sidebarLevelName = document.getElementById('sidebar-level-name');
  DOM.sidebarLevelBadge = document.getElementById('sidebar-level-badge');
  DOM.sidebarLevelCurrent = document.getElementById('sidebar-level-current');
  DOM.sidebarLevelProgress = document.getElementById('sidebar-level-progress');
  DOM.sidebarNextLevel = document.getElementById('sidebar-next-level');
  DOM.sidebarTotalStars = document.getElementById('sidebar-total-stars');
  DOM.sidebarTotalMissions = document.getElementById('sidebar-total-missions');
  DOM.sidebarTotalTime = document.getElementById('sidebar-total-time');
  DOM.sidebarStreak = document.getElementById('sidebar-streak');
}

// 初始化事件监听
function initEventListeners() {
  // 侧边栏
  document.getElementById('btn-open-sidebar')?.addEventListener('click', openSidebar);
  DOM.sidebarOverlay?.addEventListener('click', closeSidebar);
  
  // 虚拟人点击交互
  initAvatarInteraction();
  
  // 主按钮
  DOM.btnMainAction?.addEventListener('click', handleMainAction);
  
  // 添加任务按钮 (V2 浮动按钮)
  DOM.btnAddTask?.addEventListener('click', openTaskChoiceModal);
  
  // 添加任务按钮 (原版)
  document.getElementById('btn-edit-tasks')?.addEventListener('click', openAddTaskModal);
  
  // 任务选择弹窗
  document.getElementById('modal-choice-close')?.addEventListener('click', closeTaskChoiceModal);
  document.getElementById('choice-photo')?.addEventListener('click', () => {
    closeTaskChoiceModal();
    navigateTo('photo');
  });
  document.getElementById('choice-quick')?.addEventListener('click', () => {
    closeTaskChoiceModal();
    navigateTo('quick');
  });
  DOM.modalTaskChoice?.querySelector('.modal-overlay')?.addEventListener('click', closeTaskChoiceModal);
  
  // 返回按钮
  document.getElementById('btn-back-photo')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-quick')?.addEventListener('click', () => navigateTo('home'));
  
  // 拍照页面
  document.getElementById('btn-capture')?.addEventListener('click', handleCapturePhoto);
  document.getElementById('btn-retake')?.addEventListener('click', retakePhoto);
  document.getElementById('btn-gallery')?.addEventListener('click', openGallery);
  document.getElementById('btn-add-more-task')?.addEventListener('click', openAddTaskModal);
  document.getElementById('btn-confirm-photo-tasks')?.addEventListener('click', confirmPhotoTasks);
  
  // 示例蒙层 - 使用事件委托确保可靠性
  document.getElementById('btn-close-example')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hidePhotoExample();
  });
  document.getElementById('btn-example-confirm')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hidePhotoExample();
  });
  document.getElementById('btn-show-example')?.addEventListener('click', showPhotoExample);
  
  // 蒙层点击关闭（点击外部区域）
  document.getElementById('photo-example-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'photo-example-overlay') {
      hidePhotoExample();
    }
  });
  
  // 连拍模式
  document.getElementById('btn-batch-mode')?.addEventListener('click', toggleBatchMode);
  document.getElementById('btn-batch-done')?.addEventListener('click', finishBatchCapture);
  
  // 快速设置页面 - 旧版函数保留但不再使用
  initDurationOptions();
  initSubjectOptions();
  initTaskTypeOptions();
  // 注意：btn-start-quick 的事件监听已移至 initQuickStartButton，使用 startQuickStudy 函数
  
  // 督学页面
  document.getElementById('btn-pause')?.addEventListener('click', togglePause);
  // 注意：btn-complete-task 的事件绑定已移至 initStudyPageV4，避免重复绑定
  document.getElementById('btn-end-study')?.addEventListener('click', endStudy);
  document.getElementById('btn-minimize')?.addEventListener('click', () => navigateTo('home'));
  
  // V3 督学页面新按钮
  document.getElementById('btn-pause-v3')?.addEventListener('click', togglePauseV3);
  document.getElementById('btn-complete-task-v3')?.addEventListener('click', completeCurrentTaskV3);
  document.getElementById('btn-skip-task')?.addEventListener('click', skipCurrentTask);
  
  // 快捷回复按钮
  document.querySelectorAll('.quick-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => handleQuickReply(btn.dataset.reply));
  });
  
  // 完成页面
  document.getElementById('btn-complete-home')?.addEventListener('click', () => {
    navigateTo('home');
    updateUI();
  });
  document.getElementById('btn-share')?.addEventListener('click', shareResult);
  
  // 添加任务弹窗
  document.getElementById('modal-close')?.addEventListener('click', closeAddTaskModal);
  document.getElementById('btn-save-task')?.addEventListener('click', saveTask);
  initTimeBtns();
  initTypeBtns();
  initModeBtns();
  initMaterialUpload();
  initMaterialUploadModal();
  initReciteDictationEvents();
  initRecitePanelEventsV5();
  initDictationPanelEventsV5();
  initCopywritePanelEventsV5();
  
  // 充值
  document.getElementById('btn-recharge')?.addEventListener('click', openRechargeModal);
  document.getElementById('modal-recharge-close')?.addEventListener('click', closeRechargeModal);
  DOM.modalRecharge?.querySelector('.modal-overlay')?.addEventListener('click', closeRechargeModal);
  DOM.modalAddTask?.querySelector('.modal-overlay')?.addEventListener('click', closeAddTaskModal);
  
  // 侧边栏菜单
  initSidebarMenu();
  
  // 家长中心
  document.getElementById('btn-back-parent')?.addEventListener('click', () => navigateTo('home', 'back'));
  initParentDashboard();
}

// 主按钮点击处理
function handleMainAction() {
  // 只计算未完成的非挑战任务
  const pendingTasks = AppState.tasks.filter(t => !t.completed && !t.isChallenge);
  
  if (pendingTasks.length === 0) {
    // 无任务：弹出选择框
    openTaskChoiceModal();
  } else {
    // 有任务：直接开始
    navigateTo('study');
    startStudySession();
  }
}

// 快速开始今日挑战 - 一键开始30分钟学习
function quickStartChallenge() {
  const today = new Date().toDateString();
  
  // 检查今天是否已有挑战（完成或未完成）
  const todayChallenge = AppState.tasks.find(task => 
    task.isChallenge && 
    task.createdAt && 
    new Date(task.createdAt).toDateString() === today
  );
  
  if (todayChallenge) {
    if (todayChallenge.completed) {
      // 今日挑战已完成
      showToast('🎉 今日挑战已完成！明天再来吧~', 'success');
      return;
    } else {
      // 继续未完成的挑战
      const challengeIndex = AppState.tasks.indexOf(todayChallenge);
      AppState.currentTaskIndex = challengeIndex;
      showToast('📚 继续今日挑战！', 'info');
      
      setTimeout(() => {
        navigateTo('study');
        startStudySession();
      }, 300);
      return;
    }
  }
  
  // 创建一个30分钟的快速学习任务
  const quickTask = {
    id: Date.now(),
    name: '今日挑战 - 专注学习',
    duration: 30,
    subject: '其他',
    mode: 'quick',  // 快速学习模式，无需密码即可完成
    completed: false,
    isChallenge: true,  // 标记为挑战任务
    reward: 50,  // 完成奖励金币
    createdAt: new Date().toISOString()
  };
  
  // 添加到任务列表开头
  AppState.tasks.unshift(quickTask);
  AppState.currentTaskIndex = 0;  // 从这个任务开始
  saveUserData();
  
  // 显示提示
  showToast('🚀 开始30分钟专注挑战！', 'success');
  
  // 直接进入学习页面
  setTimeout(() => {
    navigateTo('study');
    startStudySession();
  }, 300);
}

/**
 * 获取今日挑战状态
 * @returns {object} { exists: boolean, completed: boolean, task: object|null }
 */
function getTodayChallengeStatus() {
  const today = new Date().toDateString();
  
  const todayChallenge = AppState.tasks.find(task => 
    task.isChallenge && 
    task.createdAt && 
    new Date(task.createdAt).toDateString() === today
  );
  
  return {
    exists: !!todayChallenge,
    completed: todayChallenge?.completed || false,
    task: todayChallenge || null
  };
}

// 任务选择弹窗
function openTaskChoiceModal() {
  if (DOM.modalTaskChoice) {
    // 强制重排确保动画正确播放
    DOM.modalTaskChoice.style.display = 'flex';
    DOM.modalTaskChoice.offsetHeight; // 触发重排
    DOM.modalTaskChoice.classList.add('active');
  }
}

function closeTaskChoiceModal() {
  if (DOM.modalTaskChoice) {
    DOM.modalTaskChoice.classList.remove('active');
    // 动画结束后隐藏
    setTimeout(() => {
      if (!DOM.modalTaskChoice.classList.contains('active')) {
        DOM.modalTaskChoice.style.display = '';
      }
    }, 300);
  }
}

// 更新所有UI
function updateUI() {
  updateAgentLevel();
  updateHomeUI();
  updateSidebarUI();
  updateTaskListUI();
  updateMainButton();
  
  // 更新用户名显示
  if (AppState.user.name) {
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = AppState.user.name;
  }
}

// 更新首页UI
function updateHomeUI() {
  // 今日任务数（只计算未完成的非挑战任务）
  const pendingTaskCount = AppState.tasks.filter(t => !t.completed && !t.isChallenge).length;
  if (DOM.todayTasks) {
    DOM.todayTasks.textContent = pendingTaskCount;
  }
  
  // 连续天数
  if (DOM.streakDays) {
    DOM.streakDays.textContent = AppState.user.streakDays;
  }
  
  // 等级显示
  const level = AGENT_LEVELS[AppState.user.level];
  if (DOM.agentLevelShort) {
    DOM.agentLevelShort.textContent = `Lv.${AppState.user.level + 1}`;
  }
  if (DOM.agentLevelName) {
    DOM.agentLevelName.textContent = level.name;
  }
  if (DOM.levelIcon) {
    DOM.levelIcon.textContent = level.icon;
  }
  if (DOM.homeLevelDot) {
    DOM.homeLevelDot.textContent = AppState.user.level + 1;
  }
  
  // 余额
  if (DOM.userBalance) {
    DOM.userBalance.textContent = AppState.user.stars;
  }
  
  // 问候语
  updateGreeting();
  
  // V2 特工档案更新
  updateDossierUI();
}

// 更新特工档案UI
function updateDossierUI() {
  const level = AGENT_LEVELS[AppState.user.level];
  
  // 等级徽章
  if (DOM.agentLevelDisplay) {
    DOM.agentLevelDisplay.textContent = `Lv.${AppState.user.level + 1}`;
  }
  if (DOM.agentTitleDisplay) {
    DOM.agentTitleDisplay.textContent = level.name;
  }
  if (DOM.agentBadgeIcon) {
    DOM.agentBadgeIcon.textContent = level.icon;
  }
  
  // 统计数据
  if (DOM.streakDaysV2) {
    DOM.streakDaysV2.textContent = AppState.user.streakDays;
  }
  if (DOM.totalMissionsV2) {
    DOM.totalMissionsV2.textContent = AppState.user.totalMissions || 0;
  }
  
  // 任务简报
  updateMissionBriefing();
  
  // 每日挑战进度
  updateDailyMissionProgress();
  
  // 主按钮状态
  updateMainActionButton();
}

// 更新任务简报
function updateMissionBriefing() {
  const subjectIcons = {
    '语文': '📖', '数学': '🔢', '英语': '🔤',
    '科学': '🔬', '阅读': '📚', '其他': '✏️',
    '写作业': '📝', '背诵': '🎤'
  };
  
  const modeLabels = {
    'recite': '背诵',
    'dictation': '听写',
    'copywrite': '默写',
    'homework': '作业'
  };
  
  // 过滤已完成的任务和今日挑战任务（挑战任务有独立的卡片显示）
  const pendingTasks = AppState.tasks.filter(task => 
    !task.completed && !task.isChallenge
  );
  
  // 基于未完成任务数量判断是否有任务
  const hasPendingTasks = pendingTasks.length > 0;
  
  if (DOM.briefingEmpty) {
    DOM.briefingEmpty.style.display = hasPendingTasks ? 'none' : 'block';
  }
  if (DOM.briefingTasks) {
    DOM.briefingTasks.style.display = hasPendingTasks ? 'block' : 'none';
  }
  
  if (!hasPendingTasks) {
    // 没有待完成任务，显示空状态
    if (DOM.taskCountBadge) DOM.taskCountBadge.textContent = '0项';
    return;
  }
  
  if (DOM.taskPreviewList) {
    // 只显示前3个未完成任务
    const previewTasks = pendingTasks.slice(0, 3);
    const hasMore = pendingTasks.length > 3;
    
    // 渲染任务列表
    DOM.taskPreviewList.innerHTML = previewTasks.map((task, index) => {
      // 找到任务在原数组中的真实索引
      const realIndex = AppState.tasks.indexOf(task);
      return `
        <div class="task-preview-item" onclick="startStudyFromTask(${realIndex})">
          <span class="task-preview-icon">${subjectIcons[task.subject] || '📝'}</span>
          <div class="task-preview-info">
            <div class="task-preview-name">${task.name}</div>
            <div class="task-preview-meta">
              <span>${task.subject}</span>
              ${task.mode && task.mode !== 'homework' ? `· ${modeLabels[task.mode]}` : ''}
            </div>
          </div>
          <div class="task-preview-duration">
            <i class="fa-regular fa-clock"></i>
            ${task.duration}分
          </div>
        </div>
      `;
    }).join('') + (hasMore ? `
      <div class="task-preview-more">
        +${pendingTasks.length - 3} 更多任务
      </div>
    ` : '');
    
    if (DOM.taskCountBadge) {
      DOM.taskCountBadge.textContent = `${pendingTasks.length}项`;
    }
  }
}

// 更新每日挑战进度
function updateDailyMissionProgress() {
  const dailyMission = document.getElementById('daily-mission');
  const progressBar = document.getElementById('mission-progress-bar');
  const quickStartHint = document.getElementById('quick-start-hint');
  const missionDesc = document.getElementById('daily-mission-desc');
  const missionReward = dailyMission?.querySelector('.mission-reward');
  
  // 获取今日挑战状态
  const challengeStatus = getTodayChallengeStatus();
  
  if (challengeStatus.completed) {
    // 今日挑战已完成 - 隐藏卡片
    if (dailyMission) {
      dailyMission.style.display = 'none';
    }
    
  } else if (challengeStatus.exists) {
    // 有进行中的挑战 - 显示进度
    const task = challengeStatus.task;
    const actualDuration = task.actualDuration || 0;
    const progress = Math.min((actualDuration / 60 / task.duration) * 100, 100);
    
    if (dailyMission) {
      dailyMission.style.display = '';  // 确保显示
      dailyMission.classList.add('has-progress');
      dailyMission.classList.remove('completed');
      dailyMission.style.pointerEvents = '';
      dailyMission.style.opacity = '';
    }
    if (progressBar) progressBar.style.display = 'block';
    if (quickStartHint) quickStartHint.style.display = 'none';
    
    if (DOM.dailyProgressFill) {
      DOM.dailyProgressFill.style.width = `${progress}%`;
    }
    if (DOM.dailyProgressText) {
      DOM.dailyProgressText.textContent = `${Math.floor(actualDuration / 60)}/${task.duration}分钟`;
    }
    if (missionDesc) {
      missionDesc.textContent = '继续30分钟专注学习';
    }
    if (missionReward) {
      missionReward.innerHTML = '<span class="reward-value">+50</span><i class="fa-solid fa-coins"></i>';
    }
    
  } else {
    // 今天还没有挑战 - 显示开始状态
    if (dailyMission) {
      dailyMission.style.display = '';  // 确保显示
      dailyMission.classList.remove('has-progress', 'completed');
      dailyMission.style.pointerEvents = '';
      dailyMission.style.opacity = '';
    }
    if (progressBar) progressBar.style.display = 'none';
    if (quickStartHint) quickStartHint.style.display = 'flex';
    
    if (missionDesc) {
      missionDesc.textContent = '完成30分钟专注学习';
    }
    if (missionReward) {
      missionReward.innerHTML = '<span class="reward-value">+50</span><i class="fa-solid fa-coins"></i>';
    }
  }
}

// 更新主按钮状态
function updateMainActionButton() {
  // 只计算未完成的非挑战任务
  const pendingTasks = AppState.tasks.filter(t => !t.completed && !t.isChallenge);
  const hasTasks = pendingTasks.length > 0;
  
  if (DOM.btnMainAction) {
    DOM.btnMainAction.classList.toggle('has-tasks', hasTasks);
  }
  
  if (DOM.mainActionIcon) {
    DOM.mainActionIcon.className = hasTasks 
      ? 'fa-solid fa-rocket' 
      : 'fa-solid fa-crosshairs';
  }
  
  if (DOM.mainActionText) {
    DOM.mainActionText.textContent = hasTasks 
      ? '开始执行任务' 
      : '设置特工任务';
  }
  
  // 添加任务按钮显示
  if (DOM.btnAddTask) {
    DOM.btnAddTask.style.display = hasTasks ? 'flex' : 'none';
  }
}

// 从任务简报开始学习
function startStudyFromTask(taskIndex) {
  // 验证任务索引有效性
  if (taskIndex < 0 || taskIndex >= AppState.tasks.length) {
    console.warn('[startStudyFromTask] 无效的任务索引:', taskIndex);
    showToast('任务不存在', 'error');
    return;
  }
  
  const task = AppState.tasks[taskIndex];
  if (!task) {
    console.warn('[startStudyFromTask] 任务不存在');
    showToast('任务不存在', 'error');
    return;
  }
  
  // 如果任务已完成，提示并返回
  if (task.completed) {
    showToast('该任务已完成', 'info');
    return;
  }
  
  // 设置当前任务索引
  AppState.currentTaskIndex = taskIndex;
  
  // 导航到学习页面并启动学习会话
  navigateTo('study');
  
  // 延迟启动确保页面渲染完成
  setTimeout(() => {
    startStudySession();
  }, 100);
}

// 更新问候语（基于时间和状态）
function updateGreeting() {
  if (!DOM.avatarGreeting) return;
  
  const hour = new Date().getHours();
  const userName = AppState.user.name || '小特工';
  
  // 时间相关问候
  let timeGreeting = '';
  if (hour >= 5 && hour < 12) {
    timeGreeting = `早上好，${userName}！`;
  } else if (hour >= 12 && hour < 14) {
    timeGreeting = `中午好，${userName}！`;
  } else if (hour >= 14 && hour < 18) {
    timeGreeting = `下午好，${userName}！`;
  } else if (hour >= 18 && hour < 22) {
    timeGreeting = `晚上好，${userName}！`;
  } else {
    timeGreeting = `夜深了，${userName}~`;
  }
  
  // 根据状态添加后续语（只计算未完成的非挑战任务）
  const pendingCount = AppState.tasks.filter(t => !t.completed && !t.isChallenge).length;
  let statusMessage = '';
  if (pendingCount === 0) {
    const noTaskMessages = [
      '今天想学点什么呢？',
      '点击下方设置任务吧~',
      '准备好开始学习了吗？',
      '特工任务等你来挑战！'
    ];
    statusMessage = noTaskMessages[Math.floor(Math.random() * noTaskMessages.length)];
  } else {
    const hasTaskMessages = [
      `还有 ${pendingCount} 个任务哦！`,
      '任务已就绪，开始吧！',
      '准备好了吗？出发！',
      '今天也要加油哦~'
    ];
    statusMessage = hasTaskMessages[Math.floor(Math.random() * hasTaskMessages.length)];
  }
  
  DOM.avatarGreeting.textContent = `${timeGreeting} ${statusMessage}`;
}

// 更新侧边栏UI
function updateSidebarUI() {
  const level = AGENT_LEVELS[AppState.user.level];
  
  if (DOM.sidebarLevelName) {
    DOM.sidebarLevelName.textContent = level.name;
  }
  if (DOM.sidebarLevelCurrent) {
    DOM.sidebarLevelCurrent.textContent = `Lv.${AppState.user.level + 1}`;
  }
  if (DOM.sidebarLevelProgress) {
    DOM.sidebarLevelProgress.style.width = `${getLevelProgress()}%`;
  }
  if (DOM.sidebarNextLevel) {
    const next = getNextLevelPoints();
    DOM.sidebarNextLevel.textContent = next > 0 ? `距下级 ${next} 积分` : '已满级';
  }
  if (DOM.sidebarTotalStars) {
    DOM.sidebarTotalStars.textContent = AppState.user.stars;
  }
  if (DOM.sidebarTotalMissions) {
    DOM.sidebarTotalMissions.textContent = AppState.user.totalMissions;
  }
  if (DOM.sidebarTotalTime) {
    DOM.sidebarTotalTime.textContent = `${Math.floor(AppState.user.totalStudyTime / 60)}h`;
  }
  if (DOM.sidebarStreak) {
    DOM.sidebarStreak.textContent = AppState.user.streakDays;
  }
}

// 更新任务列表UI
function updateTaskListUI() {
  if (AppState.tasks.length === 0) {
    if (DOM.pendingTasks) DOM.pendingTasks.style.display = 'none';
  } else {
    if (DOM.pendingTasks) DOM.pendingTasks.style.display = 'block';
    
    if (DOM.pendingList) {
      const subjectIcons = {
        '语文': '📖', '数学': '🔢', '英语': '🔤',
        '科学': '🔬', '阅读': '📚', '其他': '✏️',
        '写作业': '📝', '背诵': '🎤'
      };
      
      const modeLabels = {
        'recite': '背诵',
        'dictation': '听写'
      };
      
      const modeClasses = {
        'recite': 'recite',
        'dictation': 'dictation'
      };
      
      DOM.pendingList.innerHTML = AppState.tasks.map((task, index) => {
        // 简化：只显示模式标签，点击整行可编辑
        const needsMaterial = task.mode === 'recite' || task.mode === 'dictation';
        const hasMaterial = task.material?.uploaded;
        
        return `
        <div class="pending-item ${task.completed ? 'completed' : ''}" data-index="${index}">
          <div class="pending-item-drag" onclick="event.stopPropagation()">
            <i class="fa-solid fa-grip-vertical"></i>
          </div>
          <span class="pending-item-icon">${subjectIcons[task.subject] || '📝'}</span>
          <div class="pending-item-info" onclick="editTask(${index})">
            <div class="pending-item-name">${task.name}</div>
            <div class="pending-item-meta">
              <span class="task-duration">${task.duration}分钟</span>
                ${task.mode && task.mode !== 'homework' ? `<span class="mode-tag-small ${task.mode}">${modeLabels[task.mode]}</span>` : ''}
                ${needsMaterial && !hasMaterial ? `<span class="upload-tag" onclick="uploadTaskMaterial(${index}); event.stopPropagation();">待上传</span>` : ''}
                ${needsMaterial && hasMaterial ? '<span class="uploaded-tag">已备好</span>' : ''}
                ${task.completed ? '<span class="task-status completed">已完成</span>' : ''}
            </div>
          </div>
          <div class="pending-item-actions">
            <button class="action-btn edit" onclick="editTask(${index})" title="编辑">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-btn delete" onclick="removeTask(${index})" title="删除">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
        `;
      }).join('');
      
      // 初始化任务排序拖拽
      initTaskDragSort();
    }
  }
  
  // 更新任务统计
  updateTaskStats();
}

// 上传任务材料
function uploadTaskMaterial(index) {
  const task = AppState.tasks[index];
  if (!task) return;
  
  AppState.currentUploadTaskIndex = index;
  
  // 使用材料上传弹窗
  showMaterialUploadModal(task);
  
  // 修改确认按钮的行为
  const confirmBtn = document.getElementById('btn-confirm-material');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (AppState.tempMaterial) {
        AppState.tasks[AppState.currentUploadTaskIndex].material = {
          image: AppState.tempMaterial,
          uploaded: true
        };
        saveUserData();
        updateUI();
      }
      closeMaterialModal();
    };
  }
  
  // 修改跳过按钮的行为
  const skipBtn = document.getElementById('btn-skip-material');
  if (skipBtn) {
    skipBtn.onclick = () => {
      closeMaterialModal();
    };
  }
}

// 查看任务材料
function viewTaskMaterial(index) {
  const task = AppState.tasks[index];
  if (!task || !task.material?.image) return;
  
  // 创建预览弹窗
  const overlay = document.createElement('div');
  overlay.className = 'material-preview-overlay';
  overlay.innerHTML = `
    <div class="material-preview-content">
      <button class="material-preview-close"><i class="fa-solid fa-xmark"></i></button>
      <img src="${task.material.image}" alt="材料预览">
    </div>
  `;
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('.material-preview-close')) {
      overlay.remove();
    }
  });
  
  document.body.appendChild(overlay);
}

// 更新任务统计
function updateTaskStats() {
  const totalTasks = AppState.tasks.length;
  const completedTasks = AppState.tasks.filter(t => t.completed).length;
  const totalDuration = AppState.tasks.reduce((sum, t) => sum + t.duration, 0);
  
  const statsEl = document.getElementById('task-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <span>${completedTasks}/${totalTasks} 已完成</span>
      <span>共 ${totalDuration} 分钟</span>
    `;
  }
}

// 任务拖拽排序（简化版）
function initTaskDragSort() {
  const items = document.querySelectorAll('.pending-item');
  items.forEach((item, index) => {
    const dragHandle = item.querySelector('.pending-item-drag');
    
    // 上移按钮
    if (index > 0) {
      dragHandle.innerHTML = `
        <i class="fa-solid fa-chevron-up move-btn" onclick="moveTask(${index}, -1)"></i>
        <i class="fa-solid fa-chevron-down move-btn" onclick="moveTask(${index}, 1)"></i>
      `;
    } else if (items.length > 1) {
      dragHandle.innerHTML = `
        <i class="fa-solid fa-chevron-down move-btn" onclick="moveTask(${index}, 1)"></i>
      `;
    }
  });
}

// 更新主按钮
function updateMainButton() {
  if (!DOM.btnMainAction) return;
  
  // 只计算未完成的非挑战任务
  const pendingTasks = AppState.tasks.filter(t => !t.completed && !t.isChallenge);
  const pendingCount = pendingTasks.length;
  
  if (pendingCount === 0) {
    DOM.btnMainAction.classList.remove('has-tasks');
    if (DOM.mainActionIcon) {
      DOM.mainActionIcon.className = 'fa-solid fa-clipboard-list';
    }
    if (DOM.mainActionText) {
      DOM.mainActionText.textContent = '设置特工任务';
    }
  } else {
    DOM.btnMainAction.classList.add('has-tasks');
    if (DOM.mainActionIcon) {
      DOM.mainActionIcon.className = 'fa-solid fa-rocket';
    }
    if (DOM.mainActionText) {
      DOM.mainActionText.textContent = `开始特工任务 (${pendingCount})`;
    }
  }
}

// 删除任务
function removeTask(index) {
  if (index >= 0 && index < AppState.tasks.length) {
    const task = AppState.tasks[index];
    
    // 添加删除动画
    const taskElements = document.querySelectorAll('.pending-item');
    if (taskElements[index]) {
      taskElements[index].classList.add('removing');
      
      setTimeout(() => {
        AppState.tasks.splice(index, 1);
        saveUserData();
        updateUI();
      }, 300);
    } else {
      AppState.tasks.splice(index, 1);
      saveUserData();
      updateUI();
    }
  }
}

// 编辑任务
function editTask(index) {
  if (index >= 0 && index < AppState.tasks.length) {
    const task = AppState.tasks[index];
    AppState.editingTaskIndex = index;
    
    // 打开编辑弹窗（不重置状态）
    DOM.modalAddTask?.classList.add('active');
    
    // 填充现有数据
    const nameInput = document.getElementById('input-task-name');
    if (nameInput) nameInput.value = task.name;
    
    // 设置时长选择
    const timeBtns = document.querySelectorAll('.time-btn');
    timeBtns.forEach(btn => {
      btn.classList.remove('active');
      if (parseInt(btn.dataset.time) === task.duration) {
        btn.classList.add('active');
      }
    });
    
    // 设置类型选择
    const typeBtns = document.querySelectorAll('.type-btn');
    typeBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.type === task.subject) {
        btn.classList.add('active');
      }
    });
    
    // 设置模式选择
    const modeBtns = document.querySelectorAll('.mode-btn');
    const materialGroup = document.getElementById('material-upload-group');
    const mode = task.mode || 'homework';
    
    modeBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      }
    });
    
    // 显示/隐藏材料上传区域
    if (materialGroup) {
      if (mode === 'recite' || mode === 'dictation') {
        materialGroup.style.display = 'block';
        
        // 如果有材料，显示预览
        const placeholder = document.getElementById('upload-placeholder');
        const preview = document.getElementById('upload-preview');
        const previewImg = document.getElementById('material-preview-img');
        
        if (task.material?.image) {
          AppState.tempMaterial = task.material.image;
          if (previewImg) previewImg.src = task.material.image;
          if (placeholder) placeholder.style.display = 'none';
          if (preview) preview.style.display = 'block';
        } else {
          AppState.tempMaterial = null;
          if (placeholder) placeholder.style.display = 'flex';
          if (preview) preview.style.display = 'none';
        }
      } else {
        materialGroup.style.display = 'none';
      }
    }
    
    // 更新保存按钮文本
    const saveBtn = document.getElementById('btn-save-task');
    if (saveBtn) saveBtn.textContent = '保存修改';
    
    // 更新弹窗标题
    const modalTitle = document.querySelector('#modal-add-task .modal-header h2');
    if (modalTitle) modalTitle.textContent = '编辑任务';
  }
}

// 复制任务
function duplicateTask(index) {
  if (index >= 0 && index < AppState.tasks.length) {
    const task = AppState.tasks[index];
    const newTask = {
      ...task,
      id: Date.now(),
      name: task.name + ' (副本)',
      completed: false
    };
    
    AppState.tasks.splice(index + 1, 0, newTask);
    saveUserData();
    updateUI();
    
    // 高亮新任务
    setTimeout(() => {
      const taskElements = document.querySelectorAll('.pending-item');
      if (taskElements[index + 1]) {
        taskElements[index + 1].classList.add('highlight');
        setTimeout(() => {
          taskElements[index + 1].classList.remove('highlight');
        }, 1000);
      }
    }, 100);
  }
}

// 移动任务顺序
function moveTask(index, direction) {
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < AppState.tasks.length) {
    const temp = AppState.tasks[index];
    AppState.tasks[index] = AppState.tasks[newIndex];
    AppState.tasks[newIndex] = temp;
    
    saveUserData();
    updateUI();
  }
}

// 清空所有任务
function clearAllTasks() {
  if (confirm('确定要清空所有任务吗？')) {
    AppState.tasks = [];
    saveUserData();
    updateUI();
  }
}

// 页面导航（带动画）
function navigateTo(pageId, direction = 'forward') {
  const currentPage = DOM.pages[AppState.currentPage];
  const targetPage = DOM.pages[pageId];
  
  if (!targetPage || pageId === AppState.currentPage) {
    return;
  }
  
  // 设置动画方向
  const slideOutClass = direction === 'forward' ? 'slide-out-left' : 'slide-out-right';
  const slideInClass = direction === 'forward' ? 'slide-in-right' : 'slide-in-left';
  
  // 先隐藏当前页面再显示目标页面
  if (currentPage) {
    currentPage.classList.remove('active');
    currentPage.classList.add(slideOutClass);
    currentPage.style.setProperty('z-index', '5', 'important');
  }
  
  // 目标页面滑入
  targetPage.classList.add(slideInClass, 'active');
  targetPage.style.setProperty('z-index', '20', 'important');
  
  // 动画结束后清理
  setTimeout(() => {
    if (currentPage) {
      currentPage.classList.remove(slideOutClass);
      currentPage.style.removeProperty('z-index');
    }
    targetPage.classList.remove(slideInClass);
  }, 300);
  
  AppState.currentPage = pageId;
  
  // 页面特殊初始化
  if (pageId === 'home') {
    // 更新首页UI（包括任务简报、进度等）
    updateUI();
  }
  if (pageId === 'photo') {
    initCamera();
    initPhotoPage();
  }
  if (pageId === 'study') {
    startStudySession();
  }
  if (pageId === 'achievements') {
    showAchievementsPage();
  }
  if (pageId === 'history') {
    showHistoryPage();
  }
  if (pageId === 'parent') {
    loadParentData();
  }
  
  // 专注度指示器管理 - 只在学习页面显示
  if (typeof FocusMonitor !== 'undefined') {
    if (pageId === 'study') {
      FocusMonitor.show();
    } else {
      FocusMonitor.hide();
    }
  }
}

// 返回上一页
function goBack() {
  const backMap = {
    'photo': 'home',
    'quick': 'home',
    'study': 'home',
    'complete': 'home'
  };
  
  const target = backMap[AppState.currentPage] || 'home';
  navigateTo(target, 'back');
}

// 侧边栏
function openSidebar() {
  DOM.sidebar?.classList.add('active');
}

function closeSidebar() {
  DOM.sidebar?.classList.remove('active');
}

// 初始化侧边栏菜单
function initSidebarMenu() {
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      closeSidebar();
      
      setTimeout(() => {
        switch(page) {
          case 'parent':
            navigateTo('parent');
            loadParentData();
            break;
          case 'achievements':
            navigateTo('achievements');
            break;
          case 'history':
            showHistoryPage();
            break;
          case 'vip':
            openRechargeModal();
            break;
          case 'settings':
            navigateTo('settings');
            break;
        }
      }, 300);
    });
  });
}

// ==========================================
// 家长中心
// ==========================================

function initParentDashboard() {
  // 趋势标签切换
  const trendTabs = document.querySelectorAll('.trend-tab');
  trendTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      trendTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadParentData(tab.dataset.period);
    });
  });
}

// 加载家长中心数据
async function loadParentData(period = 'week') {
  try {
    const report = await getStudyReport(period);
    
    // 更新概览数据
    const totalTasksEl = document.getElementById('parent-total-tasks');
    const totalTimeEl = document.getElementById('parent-total-time');
    const focusScoreEl = document.getElementById('parent-focus-score');
    const streakEl = document.getElementById('parent-streak');
    
    if (totalTasksEl) totalTasksEl.textContent = report.totalTasks;
    if (totalTimeEl) totalTimeEl.textContent = `${Math.floor(report.totalDuration / 60)}h${report.totalDuration % 60}m`;
    if (focusScoreEl) focusScoreEl.textContent = `${report.avgFocus}%`;
    if (streakEl) streakEl.textContent = AppState.user.streakDays;
    
    // 更新趋势图
    updateTrendChart(report.dailyData);
    
    // 更新科目分布
    updateSubjectDistribution(report.subjectStats);
    
  } catch (e) {
    console.error('Failed to load parent data:', e);
  }
}

// 更新趋势图
function updateTrendChart(dailyData) {
  const chartBars = document.getElementById('chart-bars');
  if (!chartBars) return;
  
  // 获取过去7天的数据
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const today = new Date().getDay();
  const maxDuration = Math.max(...dailyData.map(d => d.totalDuration || 0), 60);
  
  let barsHTML = '';
  for (let i = 0; i < 7; i++) {
    const dayData = dailyData[i] || { totalDuration: 0 };
    const duration = Math.floor((dayData.totalDuration || 0) / 60);
    const height = maxDuration > 0 ? ((dayData.totalDuration || 0) / maxDuration) * 100 : 0;
    const isToday = i === (today === 0 ? 6 : today - 1);
    
    barsHTML += `
      <div class="chart-bar ${isToday ? 'today' : ''}">
        <div class="bar-fill" style="height: ${height}%"></div>
        <span class="bar-value">${duration}m</span>
      </div>
    `;
  }
  
  chartBars.innerHTML = barsHTML;
}

// 更新科目分布
function updateSubjectDistribution(subjectStats) {
  const container = document.getElementById('subject-distribution');
  if (!container) return;
  
  const subjectIcons = {
    '语文': '📖', '数学': '🔢', '英语': '🔤',
    '科学': '🔬', '阅读': '📚', '其他': '✏️'
  };
  
  const total = Object.values(subjectStats).reduce((sum, s) => sum + s.count, 0);
  
  if (total === 0) {
    container.innerHTML = '<p class="empty-message">暂无学习数据</p>';
    return;
  }
  
  let html = '';
  for (const [subject, stats] of Object.entries(subjectStats)) {
    const percent = Math.round((stats.count / total) * 100);
    html += `
      <div class="subject-item">
        <div class="subject-info">
          <span class="subject-icon">${subjectIcons[subject] || '📝'}</span>
          <span class="subject-name">${subject}</span>
        </div>
        <div class="subject-progress">
          <div class="subject-bar">
            <div class="subject-fill" style="width: ${percent}%"></div>
          </div>
          <span class="subject-percent">${percent}%</span>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// 显示成就页面
function showAchievementsPage() {
  setTimeout(() => {
    renderAchievementsList();
  }, 100);
}

// 渲染成就列表
function renderAchievementsList(filter = 'all') {
  const achievements = getAllAchievements();
  const stats = getAchievementStats();
  const list = document.getElementById('achievements-list');
  
  if (!list) return;
  
  // 更新统计
  const unlockedEl = document.getElementById('achievements-unlocked');
  const totalEl = document.getElementById('achievements-total');
  const pointsEl = document.getElementById('achievements-points');
  
  if (unlockedEl) unlockedEl.textContent = stats.unlocked;
  if (totalEl) totalEl.textContent = stats.total;
  if (pointsEl) pointsEl.textContent = stats.totalReward;
  
  // 过滤成就
  let filtered = achievements;
  if (filter === 'unlocked') {
    filtered = achievements.filter(a => a.unlocked);
  } else if (filter === 'locked') {
    filtered = achievements.filter(a => !a.unlocked);
  }
  
  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="detail-empty">
        <div class="detail-empty-icon">🏆</div>
        <p class="detail-empty-title">暂无成就</p>
        <p class="detail-empty-desc">继续努力解锁更多成就吧</p>
      </div>
    `;
    return;
  }
  
  // 按分类分组
  const groupedByCategory = {};
  filtered.forEach(a => {
    const cat = a.category || 'other';
    if (!groupedByCategory[cat]) {
      groupedByCategory[cat] = [];
    }
    groupedByCategory[cat].push(a);
  });
  
  // 渲染分类成就
  let html = '';
  
  for (const [catKey, catAchievements] of Object.entries(groupedByCategory)) {
    const catInfo = ACHIEVEMENT_CATEGORIES[catKey] || { name: '其他成就', icon: '🏆', color: '#6B7280' };
    const unlockedCount = catAchievements.filter(a => a.unlocked).length;
    
    html += `
      <div class="achievement-category">
        <div class="achievement-category-header">
          <span class="category-icon" style="background: ${catInfo.color}20; color: ${catInfo.color};">${catInfo.icon}</span>
          <span class="category-name">${catInfo.name}</span>
          <span class="category-count">${unlockedCount}/${catAchievements.length}</span>
          </div>
        <div class="achievement-category-list">
    `;
    
    catAchievements.forEach(a => {
      const progressText = a.target ? `${Math.min(a.current, a.target)}/${a.target}` : '';
      
      html += `
        <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon-wrapper">
            <span class="achievement-icon">${a.icon}</span>
            ${a.unlocked ? '<span class="achievement-check">✓</span>' : ''}
          </div>
          <div class="achievement-info">
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-desc">${a.desc}</div>
            ${!a.unlocked && a.progress !== undefined ? `
              <div class="achievement-progress-bar">
                <div class="achievement-progress-fill" style="width: ${a.progress}%;"></div>
        </div>
              <div class="achievement-progress-text">${progressText}</div>
            ` : ''}
            </div>
          <div class="achievement-reward ${a.unlocked ? 'earned' : ''}">
            ${a.unlocked ? '<i class="fa-solid fa-check"></i>' : `+${a.reward}⭐`}
      </div>
    </div>
  `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  list.innerHTML = html;
}


// 显示历史记录页面
async function showHistoryPage() {
  navigateTo('history');
  // 加载历史记录
  setTimeout(() => {
    if (typeof loadTaskHistory === 'function') {
      loadTaskHistory('all');
    }
  }, 100);
}

// ==========================================
// 虚拟人交互系统
// ==========================================

// 虚拟人反应消息
const AVATAR_REACTIONS = {
  tap: [
    '嘿！别戳我啦~',
    '有什么事吗？',
    '你好呀！',
    '准备好学习了吗？',
    '今天想完成什么任务？'
  ],
  doubleTap: [
    '哇，别这么着急~',
    '有话好好说~',
    '让我休息一下~'
  ],
  longPress: [
    '你想和我说什么呢？',
    '我在听呢~',
    '有心事吗？'
  ]
};

// 初始化虚拟人交互
function initAvatarInteraction() {
  const avatarWrapper = document.querySelector('.avatar-wrapper');
  const avatarVideo = document.getElementById('avatar-video');
  
  if (!avatarWrapper || !avatarVideo) return;
  
  let tapCount = 0;
  let tapTimer = null;
  let longPressTimer = null;
  
  // 点击检测
  avatarWrapper.addEventListener('click', (e) => {
    tapCount++;
    
    if (tapCount === 1) {
      tapTimer = setTimeout(() => {
        // 单击
        handleAvatarTap();
        tapCount = 0;
      }, 300);
    } else if (tapCount === 2) {
      // 双击
      clearTimeout(tapTimer);
      handleAvatarDoubleTap();
      tapCount = 0;
    }
  });
  
  // 长按检测
  avatarWrapper.addEventListener('touchstart', () => {
    longPressTimer = setTimeout(() => {
      handleAvatarLongPress();
    }, 800);
  });
  
  avatarWrapper.addEventListener('touchend', () => {
    clearTimeout(longPressTimer);
  });
  
  // 添加交互提示样式
  avatarWrapper.classList.add('interactive');
}

// 处理单击
function handleAvatarTap() {
  const avatarWrapper = document.querySelector('.avatar-wrapper');
  
  // 添加反应动画
  avatarWrapper?.classList.add('tap-reaction');
  setTimeout(() => {
    avatarWrapper?.classList.remove('tap-reaction');
  }, 500);
  
  // 显示反应消息
  const message = AVATAR_REACTIONS.tap[Math.floor(Math.random() * AVATAR_REACTIONS.tap.length)];
  showAvatarReaction(message);
}

// 处理双击
function handleAvatarDoubleTap() {
  const avatarWrapper = document.querySelector('.avatar-wrapper');
  
  avatarWrapper?.classList.add('double-tap-reaction');
  setTimeout(() => {
    avatarWrapper?.classList.remove('double-tap-reaction');
  }, 600);
  
  const message = AVATAR_REACTIONS.doubleTap[Math.floor(Math.random() * AVATAR_REACTIONS.doubleTap.length)];
  showAvatarReaction(message);
}

// 处理长按
function handleAvatarLongPress() {
  const avatarWrapper = document.querySelector('.avatar-wrapper');
  
  avatarWrapper?.classList.add('long-press-reaction');
  setTimeout(() => {
    avatarWrapper?.classList.remove('long-press-reaction');
  }, 800);
  
  const message = AVATAR_REACTIONS.longPress[Math.floor(Math.random() * AVATAR_REACTIONS.longPress.length)];
  showAvatarReaction(message);
}

// 显示虚拟人反应
function showAvatarReaction(message) {
  const greeting = document.getElementById('avatar-greeting');
  if (!greeting) return;
  
  // 保存原消息
  const originalMessage = greeting.textContent;
  
  // 显示反应消息
  greeting.classList.add('reaction-message');
  greeting.textContent = message;
  
  // 恢复原消息
  setTimeout(() => {
    greeting.classList.remove('reaction-message');
    greeting.textContent = originalMessage;
  }, 2500);
}

// 虚拟人表情变化（基于状态）
function updateAvatarExpression(state) {
  const avatarWrapper = document.querySelector('.avatar-wrapper');
  if (!avatarWrapper) return;
  
  // 移除所有表情类
  avatarWrapper.classList.remove('happy', 'thinking', 'encouraging', 'proud');
  
  // 添加对应表情
  switch(state) {
    case 'happy':
      avatarWrapper.classList.add('happy');
      break;
    case 'thinking':
      avatarWrapper.classList.add('thinking');
      break;
    case 'encouraging':
      avatarWrapper.classList.add('encouraging');
      break;
    case 'proud':
      avatarWrapper.classList.add('proud');
      break;
  }
}

// ==========================================
// 拍照识别
// ==========================================

// 连拍模式状态
let batchModeEnabled = false;
let batchPhotos = [];

// 初始化拍照页面
function initPhotoPage() {
  // 显示示例蒙层
  showPhotoExample();
  
  // 重置连拍模式
  batchModeEnabled = false;
  batchPhotos = [];
  updateBatchModeUI();
  updateBatchThumbnails();
}

// 显示示例蒙层
function showPhotoExample() {
  const overlay = document.getElementById('photo-example-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

// 隐藏示例蒙层
function hidePhotoExample() {
  const overlay = document.getElementById('photo-example-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

// 切换连拍模式
function toggleBatchMode() {
  batchModeEnabled = !batchModeEnabled;
  updateBatchModeUI();
  
  if (!batchModeEnabled) {
    // 退出连拍模式时，如果有照片，询问是否保留
    if (batchPhotos.length > 0) {
      finishBatchCapture();
    }
  }
  
  showToast(batchModeEnabled ? '已切换到连拍模式' : '已切换到单拍模式', 'info');
}

// 更新连拍模式 UI
function updateBatchModeUI() {
  const modeBtn = document.getElementById('btn-batch-mode');
  const modeIcon = document.getElementById('batch-mode-icon');
  const modeLabel = document.getElementById('mode-label');
  const thumbnailsArea = document.getElementById('batch-thumbnails');
  
  if (modeBtn) {
    modeBtn.classList.toggle('active', batchModeEnabled);
  }
  if (modeIcon) {
    modeIcon.className = batchModeEnabled ? 'fa-solid fa-layer-group' : 'fa-solid fa-file';
  }
  if (modeLabel) {
    modeLabel.textContent = batchModeEnabled ? '连拍' : '单拍';
  }
  if (thumbnailsArea) {
    thumbnailsArea.style.display = batchModeEnabled ? 'flex' : 'none';
  }
}

// 更新连拍缩略图
function updateBatchThumbnails() {
  const scroll = document.getElementById('thumbnails-scroll');
  const countEl = document.getElementById('batch-count');
  
  if (scroll) {
    scroll.innerHTML = batchPhotos.map((photo, index) => `
      <div class="thumbnail-item" data-index="${index}" onclick="previewBatchPhoto(${index})">
        <img src="${photo}" alt="照片${index + 1}">
        <span class="thumbnail-index">${index + 1}</span>
        <span class="thumbnail-delete" onclick="event.stopPropagation(); removeBatchPhoto(${index})">
          <i class="fa-solid fa-xmark"></i>
        </span>
      </div>
    `).join('');
  }
  
  if (countEl) {
    countEl.textContent = batchPhotos.length;
  }
}

// 预览连拍照片
function previewBatchPhoto(index) {
  // 可以实现全屏预览功能
  console.log('预览照片:', index);
}

// 删除连拍照片
function removeBatchPhoto(index) {
  batchPhotos.splice(index, 1);
  updateBatchThumbnails();
  showToast('已删除照片', 'info');
}

// 处理拍照（区分单拍/连拍）
function handleCapturePhoto() {
  const video = document.getElementById('camera-preview');
  
  if (video && video.srcObject) {
    // 创建 canvas 捕获当前帧
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    if (batchModeEnabled) {
      // 连拍模式：添加到列表
      batchPhotos.push(photoDataUrl);
      updateBatchThumbnails();
      
      // 拍照动画反馈
      showCaptureFlash();
      showToast(`已拍摄 ${batchPhotos.length} 张`, 'success');
    } else {
      // 单拍模式：直接识别
      const capturedImg = document.getElementById('captured-image');
      if (capturedImg) {
        capturedImg.src = photoDataUrl;
        capturedImg.style.display = 'block';
      }
      video.style.display = 'none';
      capturePhoto();
    }
  } else {
    // 如果没有相机流，使用模拟拍照
    if (batchModeEnabled) {
      // 模拟添加照片
      batchPhotos.push('assets/images/example-homework.svg');
      updateBatchThumbnails();
      showCaptureFlash();
      showToast(`已拍摄 ${batchPhotos.length} 张`, 'success');
    } else {
      capturePhoto();
    }
  }
}

// 拍照闪光动画
function showCaptureFlash() {
  const preview = document.getElementById('photo-preview');
  if (preview) {
    preview.style.animation = 'none';
    preview.offsetHeight; // 触发重绘
    preview.style.animation = 'captureFlash 0.2s ease';
  }
}

// 完成连拍
function finishBatchCapture() {
  if (batchPhotos.length === 0) {
    showToast('请先拍摄照片', 'warning');
    return;
  }
  
  // 使用连拍的照片进行识别
  const capturedImg = document.getElementById('captured-image');
  const video = document.getElementById('camera-preview');
  
  if (capturedImg && batchPhotos.length > 0) {
    capturedImg.src = batchPhotos[0]; // 显示第一张作为预览
    capturedImg.style.display = 'block';
  }
  if (video) {
    video.style.display = 'none';
  }
  
  // 存储所有照片供后续使用
  AppState.batchPhotos = [...batchPhotos];
  
  // 触发识别
  capturePhoto();
}

function initCamera() {
  const video = document.getElementById('camera-preview');
  const result = document.getElementById('recognize-result');
  
  if (result) result.style.display = 'none';
  
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    })
    .then(stream => {
      if (video) {
        video.srcObject = stream;
        video.style.display = 'block';
      }
    })
    .catch(err => {
      console.log('Camera error:', err);
    });
  }
}

// 拍照识别作业 - 接入Coze智能体
async function capturePhoto() {
  const result = document.getElementById('recognize-result');
  const capturedImage = document.getElementById('captured-image');
  
  // 1. 显示AI识别Loading状态
  if (typeof LoadingManager !== 'undefined') {
    LoadingManager.show('AI正在识别作业...');
    LoadingManager.updateProgress(20, '正在上传图片...');
  }
  
  // 2. 添加扫描动画到图片
  if (capturedImage && typeof LoadingManager !== 'undefined') {
    LoadingManager.showAIScanning(capturedImage);
  }
  
  try {
    // 3. 获取图片数据
    let imageData = null;
    if (capturedImage && capturedImage.src) {
      imageData = capturedImage.src;
    }
    
    // 4. 调用Coze智能体识别作业
    if (typeof LoadingManager !== 'undefined') {
      LoadingManager.updateProgress(40, 'AI正在识别作业...');
    }
    
    const recognizedTasks = await recognizeHomeworkWithCoze(imageData);
    
    if (typeof LoadingManager !== 'undefined') {
      LoadingManager.updateProgress(90, '正在解析结果...');
    }
    
    // 5. 处理识别结果
    if (recognizedTasks && recognizedTasks.length > 0) {
      AppState.tempTasks = recognizedTasks.map(task => ({
      ...task,
        mode: task.mode || detectTaskMode(task.name)
    }));
    } else {
      // 如果Coze返回空结果，使用fallback
      AppState.tempTasks = getFallbackTasks();
    }
    
    // 6. 完成
    if (typeof LoadingManager !== 'undefined') {
      LoadingManager.updateProgress(100, '识别完成！');
    }
    
  } catch (error) {
    console.error('Coze识别失败，使用本地模拟:', error);
    // 失败时使用本地模拟结果
    AppState.tempTasks = getFallbackTasks();
  }
  
  // 7. 移除扫描动画并显示结果
  setTimeout(() => {
    if (capturedImage && typeof LoadingManager !== 'undefined') {
      LoadingManager.hideAIScanning(capturedImage);
    }
    
    if (typeof LoadingManager !== 'undefined') {
      LoadingManager.hide();
    }
    
    // 渲染列表（带动画）
    renderResultList();
    
    if (result) {
      result.style.display = 'block';
      result.style.animation = 'fadeInUp 0.4s ease-out';
    }
    
    // 显示成功提示
    const taskCount = AppState.tempTasks?.length || 0;
    if (typeof showEnhancedToast !== 'undefined') {
      showEnhancedToast(`成功识别 ${taskCount} 个任务`, 'success');
    } else {
      showToast(`成功识别 ${taskCount} 个任务`, 'success');
    }
  }, 300);
}

// 调用Coze智能体识别作业
async function recognizeHomeworkWithCoze(imageData) {
  // Coze API配置
  const API_KEY = 'sat_7QkA0So3pta62lcNhcqmEYKjHjtXJ5nJgBKgtxLikjOLwh9TvYOhNnHlt6x4dmbc';
  
  // 优先使用OCR专用智能体，fallback到helper
  let BOT_ID = CozeAPI?.getBotId?.('ocr') || '';
  if (!BOT_ID) {
    BOT_ID = CozeAPI?.getBotId?.('helper') || '7592223346214518793';
  }
  
  console.log('[Coze OCR] Using bot:', BOT_ID);
  
  // 构建识别提示词
  const prompt = `你是一个作业识别助手。请分析用户的作业内容，识别出所有的作业任务。

请以JSON格式返回识别结果，格式如下：
\`\`\`json
{
  "tasks": [
    {
      "name": "任务名称",
      "subject": "科目(语文/数学/英语/其他)",
      "duration": 预估时长(分钟数字),
      "mode": "任务模式(homework/recite/dictation)",
      "details": "任务详情描述"
    }
  ]
}
\`\`\`

任务模式说明：
- homework: 普通作业（抄写、计算、阅读等）
- recite: 背诵任务（背诵课文、古诗等）
- dictation: 听写任务（听写词语、单词等）

请根据任务内容智能判断模式。如果没有具体内容，请返回一个合理的示例任务列表。

用户拍摄了一张作业照片，请识别其中的任务。`;

  try {
    const response = await fetch('https://api.coze.cn/v3/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bot_id: BOT_ID,
        user_id: 'user_' + Date.now(),
        stream: false,
        auto_save_history: false,
        additional_messages: [
          {
            role: 'user',
            content: prompt,
            content_type: 'text'
          }
        ]
      })
    });
    
    const data = await response.json();
    console.log('[Coze OCR] Response:', data);
    
    // 解析Coze返回的消息
    if (data.data?.messages) {
      for (const msg of data.data.messages) {
        if (msg.role === 'assistant' && msg.content) {
          return parseCozeTaskResponse(msg.content);
        }
      }
    }
    
    // 如果是流式响应或需要轮询
    if (data.data?.conversation_id && data.data?.id) {
      return await pollCozeResult(data.data.conversation_id, data.data.id, API_KEY, BOT_ID);
    }
    
    return null;
  } catch (error) {
    console.error('[Coze OCR] Error:', error);
    throw error;
  }
}

// 轮询获取Coze结果
async function pollCozeResult(conversationId, chatId, apiKey, botId) {
  const maxAttempts = 10;
  const delay = 1000;
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      const response = await fetch(
        `https://api.coze.cn/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.data?.status === 'completed') {
        // 获取消息列表
        const msgResponse = await fetch(
          `https://api.coze.cn/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          }
        );
        
        const msgData = await msgResponse.json();
        
        if (msgData.data) {
          for (const msg of msgData.data) {
            if (msg.role === 'assistant' && msg.type === 'answer') {
              return parseCozeTaskResponse(msg.content);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Coze Poll] Error:', error);
    }
  }
  
  return null;
}

// 解析Coze返回的任务JSON
function parseCozeTaskResponse(content) {
  try {
    // 尝试从内容中提取JSON
    let jsonStr = content;
    
    // 如果内容包含markdown代码块，提取其中的JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // 尝试直接解析
    const parsed = JSON.parse(jsonStr);
    
    if (parsed.tasks && Array.isArray(parsed.tasks)) {
      return parsed.tasks.map(task => ({
        name: task.name || '未知任务',
        subject: task.subject || '其他',
        duration: parseInt(task.duration) || 15,
        mode: task.mode || 'homework',
        details: task.details || ''
      }));
    }
    
    return null;
  } catch (error) {
    console.error('[Coze Parse] JSON解析失败:', error);
    
    // 尝试用正则提取任务信息
    const tasks = [];
    const taskMatches = content.matchAll(/["']?name["']?\s*[:：]\s*["']([^"']+)["']/gi);
    
    for (const match of taskMatches) {
      tasks.push({
        name: match[1],
        subject: '语文',
        duration: 15,
        mode: detectTaskMode(match[1])
      });
    }
    
    return tasks.length > 0 ? tasks : null;
  }
}

// 获取备用任务列表（Coze失败时使用）
function getFallbackTasks() {
  const fallbackTasks = [
    { name: '语文生字抄写', subject: '语文', duration: 15 },
    { name: '数学计算题', subject: '数学', duration: 20 },
    { name: '英语单词背诵', subject: '英语', duration: 10 }
  ];
  
  return fallbackTasks.map(task => ({
    ...task,
    mode: detectTaskMode(task.name)
  }));
}

function retakePhoto() {
  const result = document.getElementById('recognize-result');
  if (result) result.style.display = 'none';
  
  // 重置连拍状态
  batchPhotos = [];
  updateBatchThumbnails();
  
  initCamera();
}

function openGallery() {
  const fileInput = document.getElementById('photo-file-input');
  if (fileInput) {
    fileInput.onchange = handlePhotoFileSelect;
    fileInput.click();
  }
}

function handlePhotoFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const capturedImg = document.getElementById('captured-image');
      const videoPreview = document.getElementById('camera-preview');
      
      if (capturedImg) {
        capturedImg.src = event.target.result;
        capturedImg.style.display = 'block';
      }
      if (videoPreview) {
        videoPreview.style.display = 'none';
      }
      
      // 触发识别
      capturePhoto();
    };
    reader.readAsDataURL(file);
  }
}

function removeResultItem(index) {
  if (AppState.tempTasks && AppState.tempTasks.length > 0) {
    // 获取要删除的元素
    const resultItems = document.querySelectorAll('.result-item');
    const itemToRemove = resultItems[index];
    
    if (itemToRemove) {
      // 添加删除动画
      itemToRemove.classList.add('removing');
      
      setTimeout(() => {
        // 从数组中删除
    AppState.tempTasks.splice(index, 1);
        // 重新渲染列表
        renderResultList();
      }, 300);
    } else {
      AppState.tempTasks.splice(index, 1);
      renderResultList();
    }
  }
}

// 渲染识别结果列表
function renderResultList() {
  const resultList = document.getElementById('result-list');
  if (!resultList || !AppState.tempTasks) return;
  
  const subjectIcons = {
    '语文': '📖',
    '数学': '🔢',
    '英语': '🔤',
    '其他': '📝'
  };
  
  const modeLabels = {
    'homework': '作业',
    'recite': '背诵',
    'dictation': '听写'
  };
  
  const modeColors = {
    'homework': '',
    'recite': 'mode-recite',
    'dictation': 'mode-dictation'
  };
  
  if (AppState.tempTasks.length === 0) {
    resultList.innerHTML = `
      <div class="empty-result">
        <i class="fa-solid fa-inbox"></i>
        <p>暂无任务，点击下方添加</p>
      </div>
    `;
    return;
  }
  
  resultList.innerHTML = AppState.tempTasks.map((task, index) => `
    <div class="result-item" data-index="${index}" data-mode="${task.mode || 'homework'}">
      <span class="result-item-icon">${subjectIcons[task.subject] || '📝'}</span>
      <div class="result-item-info">
        <div class="result-item-name">${task.name}</div>
        <div class="result-item-meta">
          ${task.subject} · ${task.duration}分钟
          ${task.mode && task.mode !== 'homework' ? `<span class="mode-tag ${modeColors[task.mode]}">${modeLabels[task.mode]}</span>` : ''}
        </div>
        ${task.details ? `<div class="result-item-details">${task.details}</div>` : ''}
      </div>
      <button class="result-item-delete" onclick="removeResultItem(${index})" aria-label="删除任务">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

function confirmPhotoTasks() {
  if (AppState.tempTasks && AppState.tempTasks.length > 0) {
    AppState.tasks = AppState.tempTasks.map(task => ({
      ...task,
      completed: false,
      id: Date.now() + Math.random()
    }));
    saveUserData();
    navigateTo('home');
    updateUI();
  }
}

// ==========================================
// 快速设置
// ==========================================
function initDurationOptions() {
  const options = document.querySelectorAll('.duration-option');
  options.forEach(option => {
    option.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      AppState.selectedDuration = parseInt(option.dataset.duration);
    });
  });
  
  const customInput = document.getElementById('custom-duration');
  customInput?.addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    if (value >= 5 && value <= 120) {
      document.querySelectorAll('.duration-option').forEach(o => o.classList.remove('active'));
      AppState.selectedDuration = value;
    }
  });
}

function initSubjectOptions() {
  const options = document.querySelectorAll('.subject-option');
  options.forEach(option => {
    option.addEventListener('click', () => {
      option.classList.toggle('active');
      
      const subject = option.dataset.subject;
      const index = AppState.selectedSubjects.indexOf(subject);
      if (index > -1) {
        AppState.selectedSubjects.splice(index, 1);
      } else {
        AppState.selectedSubjects.push(subject);
      }
    });
  });
}

function initTaskTypeOptions() {
  const typeInputs = document.querySelectorAll('input[name="taskType"]');
  const reciteUpload = document.getElementById('recite-upload');
  
  typeInputs.forEach(input => {
    input.addEventListener('change', () => {
      AppState.selectedTaskType = input.value;
      if (reciteUpload) {
        reciteUpload.style.display = input.value === 'recite' ? 'block' : 'none';
      }
    });
  });
}

function confirmQuickTasks() {
  const taskTypeNames = {
    homework: '写作业',
    reading: '阅读',
    recite: '背诵'
  };
  
  const subjects = AppState.selectedSubjects.length > 0 ? AppState.selectedSubjects : ['学习'];
  
  AppState.tasks = subjects.map((subject, index) => ({
    id: Date.now() + index,
    name: `${subject}${taskTypeNames[AppState.selectedTaskType]}`,
    subject: subject,
    duration: Math.floor(AppState.selectedDuration / subjects.length),
    completed: false
  }));
  
  saveUserData();
  navigateTo('home');
  updateUI();
}

// ==========================================
// 督学会话
// ==========================================
// 专注度历史数据 (用于曲线) - 使用全局变量
// focusHistory 在后面统一定义
const MAX_FOCUS_POINTS = 12;

function startStudySession() {
  AppState.currentTaskIndex = 0;
  AppState.totalStudyTime = 0;
  AppState.taskElapsedTime = 0;
  focusHistory = Array(MAX_FOCUS_POINTS).fill(100);
  
  if (AppState.tasks.length > 0) {
    const firstTask = AppState.tasks[0];
    
    // 检查背诵/听写任务是否需要材料
    if ((firstTask.mode === 'recite' || firstTask.mode === 'dictation') && !firstTask.material?.uploaded) {
      showMaterialUploadModal(firstTask);
      return;
    }
    
    continueStudySession();
  }
}

// 视频加载失败时显示fallback
function showVideoFallback() {
  const teacherContainer = document.querySelector('.teacher-fullscreen-v4');
  if (teacherContainer) {
    // 隐藏视频，显示静态图片
    const video = teacherContainer.querySelector('video');
    if (video) {
      video.style.display = 'none';
    }
    // 添加fallback背景
    teacherContainer.style.background = `
      linear-gradient(180deg, 
        rgba(15, 23, 42, 0.3) 0%, 
        rgba(30, 41, 59, 0.5) 100%
      ),
      url('assets/images/xiaoying-avatar.png') center/cover no-repeat
    `;
  }
}

// 继续学习（材料上传后或普通任务）
function continueStudySession() {
  // 确保视频播放
  if (DOM.studyAvatarVideo) {
    DOM.studyAvatarVideo.play().catch(e => console.log('Video autoplay blocked'));
  }
  
  if (AppState.tasks.length > 0 && AppState.currentTaskIndex < AppState.tasks.length) {
    // 使用当前任务索引获取正确的任务
    AppState.currentTask = AppState.tasks[AppState.currentTaskIndex];
    updateCurrentTaskUIV2();
    updateTaskSwiperUI();
    updateStudyModeUI(); // 根据任务模式更新UI
    startTimersV2();
    
    // 🎙️ 启动监督模式视频通话
    if (typeof CozeRealtime !== 'undefined' && CozeRealtime.startSupervisor) {
      CozeRealtime.startSupervisor();
    } else {
    showAIBubble(getStudyStartMessage());
    }
  }
}

// 获取学习开始消息
function getStudyStartMessage() {
  const task = AppState.currentTask;
  if (!task) return '开始学习啦！一起加油吧！';
  
  if (task.mode === 'recite') {
    return '背诵任务开始！先看看内容，准备好了就开始背诵哦~';
  } else if (task.mode === 'dictation') {
    return '听写任务开始！认真听，仔细写~';
  }
  return '开始学习啦！一起加油吧！';
}

// 根据任务模式更新监督页面UI - V5
function updateStudyModeUI() {
  const task = AppState.currentTask;
  const recitePanel = document.getElementById('recite-panel');
  const dictationPanel = document.getElementById('dictation-panel');
  const copywritePanel = document.getElementById('copywrite-panel');
  const taskCard = document.getElementById('task-main-card');
  
  // 隐藏所有特殊面板
  if (recitePanel) recitePanel.style.display = 'none';
  if (dictationPanel) dictationPanel.style.display = 'none';
  if (copywritePanel) copywritePanel.style.display = 'none';
  
  // 显示/隐藏任务卡片
  const specialModes = ['recite', 'dictation', 'copywrite'];
  if (taskCard) {
    taskCard.style.display = specialModes.includes(task?.mode) ? 'none' : 'block';
  }
  
  if (!task) return;
  
  if (task.mode === 'recite' && recitePanel) {
    recitePanel.style.display = 'block';
    updateRecitePanelV5(task);
  } else if (task.mode === 'dictation' && dictationPanel) {
    dictationPanel.style.display = 'block';
    updateDictationPanelV5(task);
  } else if (task.mode === 'copywrite' && copywritePanel) {
    copywritePanel.style.display = 'block';
    updateCopywritePanelV5(task);
  }
  
  // 更新完成按钮状态
  updateCompleteButtonState();
}

// 背诵会话实例
let currentReciteSession = null;

// 更新背诵面板 V5 - 使用ReciteSession
function updateRecitePanelV5(task) {
  const panel = document.getElementById('recite-panel');
  if (!panel) return;
  
  // 获取所有状态区域
  const uploadState = document.getElementById('recite-upload-state');
  const contentArea = document.getElementById('recite-content-area');
  const listeningState = document.getElementById('recite-listening-state');
  const analyzingState = document.getElementById('recite-analyzing-state');
  const resultState = document.getElementById('recite-result-state');
  const statusEl = document.getElementById('recite-status');
  
  // 获取操作按钮组
  const readyActions = document.getElementById('ready-actions');
  const listeningActions = document.getElementById('listening-actions');
  const resultActions = document.getElementById('result-actions');
  
  // 隐藏所有状态
  [uploadState, contentArea, listeningState, analyzingState, resultState].forEach(el => {
    if (el) el.style.display = 'none';
  });
  [readyActions, listeningActions, resultActions].forEach(el => {
    if (el) el.style.display = 'none';
  });
  
  // 检查是否有材料
  if (!task.material?.image && !task.material?.text) {
    // 显示上传状态
    if (uploadState) uploadState.style.display = 'block';
    if (statusEl) statusEl.textContent = '待上传';
    showAIBubbleV4('需要先上传背诵内容才能开始哦~');
    return;
  }
  
  // 有材料，显示内容
  const img = document.getElementById('recite-material-img');
  const textContent = document.getElementById('recite-text-content');
  
  if (task.material.image && img) {
    img.src = task.material.image;
    img.style.display = 'block';
    if (textContent) textContent.style.display = 'none';
  } else if (task.material.text && textContent) {
    textContent.textContent = task.material.text;
    textContent.style.display = 'block';
    if (img) img.style.display = 'none';
  }
  
  if (contentArea) contentArea.style.display = 'block';
  if (readyActions) readyActions.style.display = 'flex';
  if (statusEl) statusEl.textContent = '准备中';
  
  // 隐藏遮罩
  const mask = document.getElementById('content-hidden-mask');
  if (mask) mask.style.display = 'none';
  
  showAIBubbleV4('仔细看看背诵内容，准备好了点击"开始背诵"哦~');
  
  // 初始化ReciteSession
  initReciteSessionV5(task);
}

// 初始化背诵会话
function initReciteSessionV5(task) {
  // 销毁旧会话
  if (currentReciteSession) {
    currentReciteSession.destroy();
  }
  
  // 创建新会话
  currentReciteSession = new ReciteSession({
    originalText: task.material?.text || '',
    taskId: task.id,
    taskName: task.name,
    
    onStatusChange: (newStatus, oldStatus) => {
      updateRecitePanelStatusV5(newStatus);
    },
    
    onSpeechRecognized: (fullText, latestText, interimText) => {
      updateLiveTranscript(fullText, interimText);
    },
    
    onHint: (hintResponse) => {
      showAIBubbleV4(hintResponse.message || '下一句开头是...');
    },
    
    onResult: (result) => {
      renderReciteResultV5(result);
    },
    
    onError: (error) => {
      showToast(error, 'error');
    }
  });
}

// 更新背诵面板状态显示
function updateRecitePanelStatusV5(status) {
  const statusEl = document.getElementById('recite-status');
  const contentArea = document.getElementById('recite-content-area');
  const listeningState = document.getElementById('recite-listening-state');
  const analyzingState = document.getElementById('recite-analyzing-state');
  const resultState = document.getElementById('recite-result-state');
  const mask = document.getElementById('content-hidden-mask');
  
  const readyActions = document.getElementById('ready-actions');
  const listeningActions = document.getElementById('listening-actions');
  const resultActions = document.getElementById('result-actions');
  
  // 隐藏所有状态
  [contentArea, listeningState, analyzingState, resultState].forEach(el => {
    if (el) el.style.display = 'none';
  });
  [readyActions, listeningActions, resultActions].forEach(el => {
    if (el) el.style.display = 'none';
  });
  
  const ReciteStatus = ReciteSession.STATUS;
  
  switch (status) {
    case ReciteStatus.READY:
      if (contentArea) contentArea.style.display = 'block';
      if (mask) mask.style.display = 'none';
      if (readyActions) readyActions.style.display = 'flex';
      if (statusEl) statusEl.textContent = '准备中';
      break;
      
    case ReciteStatus.LISTENING:
      if (contentArea) contentArea.style.display = 'block';
      if (mask) mask.style.display = 'flex';
      if (listeningState) listeningState.style.display = 'block';
      if (listeningActions) listeningActions.style.display = 'flex';
      if (statusEl) statusEl.textContent = '背诵中';
      break;
      
    case ReciteStatus.PROMPTING:
      if (statusEl) statusEl.textContent = '提示中';
      break;
      
    case ReciteStatus.ANALYZING:
      if (analyzingState) analyzingState.style.display = 'block';
      if (statusEl) statusEl.textContent = '批改中';
      break;
      
    case ReciteStatus.RESULT:
      if (resultState) resultState.style.display = 'block';
      if (resultActions) resultActions.style.display = 'flex';
      if (statusEl) statusEl.textContent = '完成';
      break;
  }
}

// 更新实时识别文本显示
function updateLiveTranscript(fullText, interimText) {
  const transcriptEl = document.getElementById('transcript-text');
  if (transcriptEl) {
    const displayText = fullText + (interimText ? `<span class="interim">${interimText}</span>` : '');
    transcriptEl.innerHTML = displayText || '正在听你背诵...';
  }
}

// 渲染背诵结果 V5
function renderReciteResultV5(result) {
  if (!result) return;
  
  // 更新准确率环形图
  const ringFill = document.getElementById('result-ring-fill');
  const accuracyEl = document.getElementById('result-accuracy');
  
  const accuracy = result.accuracy || 0;
  
  if (ringFill) {
    // 环形周长 = 2 * PI * r = 2 * 3.14 * 50 ≈ 314
    const circumference = 314;
    const offset = circumference * (1 - accuracy / 100);
    ringFill.style.strokeDashoffset = offset;
    
    // 根据准确率改变颜色
    if (accuracy >= 90) {
      ringFill.style.stroke = '#34D399';
    } else if (accuracy >= 70) {
      ringFill.style.stroke = '#FBBF24';
    } else {
      ringFill.style.stroke = '#F87171';
    }
  }
  
  if (accuracyEl) {
    accuracyEl.textContent = accuracy;
  }
  
  // 更新状态徽章
  const badgeEl = document.getElementById('result-badge');
  const badgeText = document.getElementById('result-status-text');
  const badgeIcon = badgeEl?.querySelector('.badge-icon');
  
  if (badgeText) {
    const statusMap = {
      'excellent': { text: '太棒了！', icon: '🎉' },
      'good': { text: '背得不错！', icon: '👍' },
      'need_practice': { text: '继续加油！', icon: '💪' },
      'need_retry': { text: '再试一次~', icon: '📚' }
    };
    const statusInfo = statusMap[result.status] || statusMap['good'];
    badgeText.textContent = statusInfo.text;
    if (badgeIcon) badgeIcon.textContent = statusInfo.icon;
  }
  
  // 鼓励语
  const encouragementEl = document.getElementById('result-encouragement');
  if (encouragementEl && result.encouragement) {
    encouragementEl.textContent = result.encouragement;
  }
  
  // 记忆技巧
  const memoryTip = document.getElementById('memory-tip');
  const memoryTipText = document.getElementById('memory-tip-text');
  if (memoryTip && result.memory_tip) {
    memoryTip.style.display = 'inline-flex';
    if (memoryTipText) memoryTipText.textContent = result.memory_tip;
  }
  
  // 详细对比
  renderReciteDetails(result.comparison);
}

// 渲染背诵详细对比
function renderReciteDetails(comparison) {
  if (!comparison || !comparison.details) return;
  
  const detailsContainer = document.getElementById('result-details');
  if (!detailsContainer) return;
  
  let html = '';
  comparison.details.forEach(item => {
    const matchClass = item.match ? 'correct' : 'error';
    html += `
      <div class="detail-row">
        <span class="detail-original">${item.original || ''}</span>
        <span class="detail-recited ${matchClass}">${item.recited || '--'}</span>
        ${item.issue ? `<span class="detail-issue">${item.issue}</span>` : ''}
      </div>
    `;
  });
  
  detailsContainer.innerHTML = html;
}

// 初始化背诵面板V5事件监听
function initRecitePanelEventsV5() {
  // 上传按钮
  const uploadBtn = document.getElementById('btn-recite-upload');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      showMaterialUploadModal(AppState.currentTask);
    });
  }
  
  // 隐藏/显示内容按钮
  const toggleContentBtn = document.getElementById('btn-toggle-content');
  if (toggleContentBtn) {
    toggleContentBtn.addEventListener('click', () => {
      toggleReciteContentV5();
    });
  }
  
  // 开始背诵按钮
  const startReciteBtn = document.getElementById('btn-start-recite');
  if (startReciteBtn) {
    startReciteBtn.addEventListener('click', async () => {
      if (currentReciteSession) {
        await currentReciteSession.start();
      }
    });
  }
  
  // 提示按钮
  const hintBtn = document.getElementById('btn-request-hint');
  if (hintBtn) {
    hintBtn.addEventListener('click', async () => {
      if (currentReciteSession) {
        await currentReciteSession.requestHint();
      }
    });
  }
  
  // 完成背诵按钮
  const finishBtn = document.getElementById('btn-finish-recite');
  if (finishBtn) {
    finishBtn.addEventListener('click', async () => {
      if (currentReciteSession) {
        await currentReciteSession.finish();
      }
    });
  }
  
  // 再背一次按钮
  const retryBtn = document.getElementById('btn-retry-recite');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      if (currentReciteSession) {
        await currentReciteSession.restart();
        await currentReciteSession.start();
      }
    });
  }
  
  // 完成任务按钮 - 只有审核完成后才能完成
  const completeBtn = document.getElementById('btn-complete-recite');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      // 检查是否有审核结果
      if (!currentReciteSession || !currentReciteSession.result) {
        showAIBubble('小特工，请先完成背诵并提交审核哦~ 📝', 'high');
        // 如果没有上传材料，弹出上传弹窗
        if (!AppState.currentTask?.material?.uploaded) {
          showMaterialUploadModal(AppState.currentTask);
        } else {
          showToast('请点击"开始背诵"完成背诵任务', 'warning');
        }
        return;
      }
      // 先销毁会话
      currentReciteSession.destroy();
      currentReciteSession = null;
      // 调用统一的任务完成处理
      handleTaskComplete();
    });
  }
  
  // 详情展开/收起
  const detailsToggle = document.getElementById('result-details-toggle');
  const detailsContainer = document.getElementById('result-details');
  if (detailsToggle && detailsContainer) {
    detailsToggle.addEventListener('click', () => {
      const isExpanded = detailsContainer.style.display !== 'none';
      detailsContainer.style.display = isExpanded ? 'none' : 'block';
      detailsToggle.classList.toggle('expanded', !isExpanded);
    });
  }
}

// 切换背诵内容显示/隐藏 V5
function toggleReciteContentV5() {
  const mask = document.getElementById('content-hidden-mask');
  const toggleBtn = document.getElementById('btn-toggle-content');
  
  if (!mask) return;
  
  const isHidden = mask.style.display !== 'none';
  mask.style.display = isHidden ? 'none' : 'flex';
  
  if (toggleBtn) {
    const icon = toggleBtn.querySelector('i');
    const span = toggleBtn.querySelector('span');
    if (isHidden) {
      if (icon) icon.className = 'fa-solid fa-eye-slash';
      if (span) span.textContent = '隐藏内容';
    } else {
      if (icon) icon.className = 'fa-solid fa-eye';
      if (span) span.textContent = '显示内容';
  }
  }
}

// 更新背诵面板 V4（保持兼容）
function updateRecitePanelV4(task) {
  // 使用V5版本
  updateRecitePanelV5(task);
}

// 兼容旧函数
function updateRecitePanel(task) { updateRecitePanelV4(task); }

// 切换背诵内容显示/隐藏
function toggleReciteContent() {
  const body = document.getElementById('recite-body');
  const hint = document.getElementById('recite-hidden-hint');
  const toggleBtn = document.getElementById('btn-toggle-recite');
  
  AppState.reciteContentVisible = !AppState.reciteContentVisible;
  
  if (AppState.reciteContentVisible) {
    if (body) body.style.display = 'block';
    if (hint) hint.style.display = 'none';
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i><span>隐藏</span>';
    }
  } else {
    if (body) body.style.display = 'none';
    if (hint) hint.style.display = 'block';
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i><span>显示</span>';
    }
  }
}

// 听写会话实例
let currentDictationSession = null;

// 更新听写面板 V5 - 使用DictationSession
function updateDictationPanelV5(task) {
  const panel = document.getElementById('dictation-panel');
  if (!panel) return;
  
  // 获取所有状态区域
  const uploadState = document.getElementById('dictation-upload-state');
  const speakingState = document.getElementById('dictation-speaking-state');
  const submitState = document.getElementById('dictation-submit-state');
  const analyzingState = document.getElementById('dictation-analyzing-state');
  const resultState = document.getElementById('dictation-result-state');
  const statusEl = document.getElementById('dictation-status');
  
  // 获取操作按钮组
  const speakingActions = document.getElementById('speaking-actions');
  const resultActions = document.getElementById('dictation-result-actions');
  
  // 隐藏所有状态
  [uploadState, speakingState, submitState, analyzingState, resultState].forEach(el => {
    if (el) el.style.display = 'none';
  });
  [speakingActions, resultActions].forEach(el => {
    if (el) el.style.display = 'none';
  });
  
  // 检查是否有词表
  const words = task.material?.words || [];
  
  if (words.length === 0) {
    // 显示上传状态
    if (uploadState) uploadState.style.display = 'block';
    if (statusEl) statusEl.textContent = '待上传';
    showAIBubbleV4('需要先上传听写词表哦~');
    return;
  }
  
  // 有词表，初始化会话并开始
  initDictationSessionV5(task, words);
}

// 初始化听写会话
function initDictationSessionV5(task, words) {
  // 销毁旧会话
  if (currentDictationSession) {
    currentDictationSession.destroy();
  }
  
  // 创建新会话
  currentDictationSession = new DictationSession({
    wordList: words,
    taskId: task.id,
    taskName: task.name,
    waitTime: 5000,
    
    onStatusChange: (newStatus, oldStatus) => {
      updateDictationPanelStatusV5(newStatus);
    },
    
    onWordSpeak: (word, index, total) => {
      updateDictationWordDisplay(index, total);
    },
    
    onProgress: (current, total) => {
      updateDictationProgress(current, total);
    },
    
    onResult: (result) => {
      renderDictationResultV5(result);
    },
    
    onError: (error) => {
      showToast(error, 'error');
    }
  });
  
  // 自动开始
  currentDictationSession.start();
}

// 更新听写面板状态显示
function updateDictationPanelStatusV5(status) {
  const statusEl = document.getElementById('dictation-status');
  const uploadState = document.getElementById('dictation-upload-state');
  const speakingState = document.getElementById('dictation-speaking-state');
  const submitState = document.getElementById('dictation-submit-state');
  const analyzingState = document.getElementById('dictation-analyzing-state');
  const resultState = document.getElementById('dictation-result-state');
  
  const speakingActions = document.getElementById('speaking-actions');
  const resultActions = document.getElementById('dictation-result-actions');
  
  // 隐藏所有状态
  [uploadState, speakingState, submitState, analyzingState, resultState].forEach(el => {
    if (el) el.style.display = 'none';
  });
  [speakingActions, resultActions].forEach(el => {
    if (el) el.style.display = 'none';
  });
  
  const DictStatus = DictationSession.STATUS;
  
  switch (status) {
    case DictStatus.SPEAKING:
    case DictStatus.WAITING:
      if (speakingState) speakingState.style.display = 'block';
      if (speakingActions) speakingActions.style.display = 'flex';
      if (statusEl) statusEl.textContent = status === DictStatus.SPEAKING ? '朗读中' : '书写中';
      break;
      
    case DictStatus.WAITING_SUBMIT:
      if (submitState) submitState.style.display = 'block';
      if (statusEl) statusEl.textContent = '待提交';
      break;
      
    case DictStatus.ANALYZING:
      if (analyzingState) analyzingState.style.display = 'block';
      if (statusEl) statusEl.textContent = '批改中';
      break;
      
    case DictStatus.RESULT:
      if (resultState) resultState.style.display = 'block';
      if (resultActions) resultActions.style.display = 'flex';
      if (statusEl) statusEl.textContent = '完成';
      break;
  }
}

// 更新词语显示
function updateDictationWordDisplay(index, total) {
  const indexEl = document.getElementById('current-word-index');
  if (indexEl) {
    indexEl.textContent = `第 ${index + 1} 个`;
  }
}

// 更新进度
function updateDictationProgress(current, total) {
  const progressFill = document.getElementById('dictation-progress-fill');
  const progressText = document.getElementById('dictation-progress-text');
  
  if (progressFill) {
    progressFill.style.width = `${(current / total) * 100}%`;
  }
  if (progressText) {
    progressText.textContent = `${current} / ${total}`;
  }
}

// 渲染听写结果 V5
function renderDictationResultV5(result) {
  if (!result) return;
  
  // 更新统计
  const correctEl = document.getElementById('dictation-correct-count');
  const totalEl = document.getElementById('dictation-total-count');
  const accuracyEl = document.getElementById('dictation-accuracy');
  
  if (correctEl) correctEl.textContent = result.correct_count || 0;
  if (totalEl) totalEl.textContent = result.total_words || 0;
  if (accuracyEl) accuracyEl.textContent = (result.accuracy || 0) + '%';
  
  // 渲染结果列表
  const listEl = document.getElementById('dictation-results-list');
  if (listEl && result.results) {
    let html = '';
    result.results.forEach(item => {
      const isCorrect = item.correct;
      html += `
        <div class="dictation-result-item">
          <span class="word-correct">${item.word || ''}</span>
          <span class="word-wrote ${isCorrect ? 'correct' : 'error'}">${item.user_wrote || '--'}</span>
          <span class="result-icon ${isCorrect ? 'correct' : 'error'}">
            <i class="fa-solid fa-${isCorrect ? 'check' : 'xmark'}"></i>
          </span>
        </div>
      `;
    });
    listEl.innerHTML = html;
  }
  
  // 鼓励语
  const encouragementEl = document.getElementById('dictation-encouragement');
  if (encouragementEl && result.encouragement) {
    encouragementEl.textContent = result.encouragement;
  }
}

// 初始化听写面板V5事件监听
function initDictationPanelEventsV5() {
  // 上传按钮
  const uploadBtn = document.getElementById('btn-dictation-upload');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      showMaterialUploadModal(AppState.currentTask);
    });
  }
  
  // 重听按钮
  const repeatBtn = document.getElementById('btn-dictation-repeat');
  if (repeatBtn) {
    repeatBtn.addEventListener('click', async () => {
      if (currentDictationSession) {
        await currentDictationSession.repeat();
      }
    });
  }
  
  // 下一个按钮
  const nextBtn = document.getElementById('btn-dictation-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      if (currentDictationSession) {
        await currentDictationSession.nextWord();
      }
    });
  }
  
  // 拍照提交按钮
  const submitBtn = document.getElementById('btn-dictation-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      // 打开相机拍照
      openDictationCamera();
    });
  }
  
  // 重新听写按钮
  const retryBtn = document.getElementById('btn-dictation-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      if (currentDictationSession) {
        currentDictationSession.destroy();
        const task = AppState.currentTask;
        if (task) {
          initDictationSessionV5(task, task.material?.words || []);
        }
      }
    });
  }
  
  // 完成任务按钮 - 只有审核完成后才能完成
  const completeBtn = document.getElementById('btn-dictation-complete');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      // 检查是否有审核结果
      if (!currentDictationSession || !currentDictationSession.result) {
        showAIBubble('小特工，请先完成听写并拍照提交审核哦~ 📝', 'high');
        // 弹出拍照上传弹窗
        openDictationCamera();
        return;
      }
      // 先销毁会话
      currentDictationSession.destroy();
      currentDictationSession = null;
      // 调用统一的任务完成处理
      handleTaskComplete();
    });
  }
}

// 打开听写拍照
function openDictationCamera() {
  // 使用现有的相机组件
  if (typeof showMaterialUploadModal === 'function') {
    showMaterialUploadModal(AppState.currentTask, {
      mode: 'dictation_submit',
      onCapture: async (imageData) => {
        if (currentDictationSession) {
          await currentDictationSession.submitPhoto(imageData);
        }
      }
    });
  }
}

// 更新听写面板（保持兼容）
function updateDictationPanelV4(task) {
  updateDictationPanelV5(task);
}

function updateDictationPanel(task) {
  updateDictationPanelV5(task);
}

// ==========================================
// 默写模式 V5
// ==========================================

// 默写会话实例
let currentCopywriteSession = null;

// 更新默写面板 V5 - 使用CopywriteSession
function updateCopywritePanelV5(task) {
  const panel = document.getElementById('copywrite-panel');
  if (!panel) return;
  
  // 获取所有状态区域
  const uploadState = document.getElementById('copywrite-upload-state');
  const memorizeState = document.getElementById('copywrite-memorize-state');
  const writingState = document.getElementById('copywrite-writing-state');
  const submitState = document.getElementById('copywrite-submit-state');
  const analyzingState = document.getElementById('copywrite-analyzing-state');
  const resultState = document.getElementById('copywrite-result-state');
  const statusEl = document.getElementById('copywrite-status');
  
  // 获取操作按钮组
  const writingActions = document.getElementById('writing-actions');
  const resultActions = document.getElementById('copywrite-result-actions');
  
  // 隐藏所有状态
  [uploadState, memorizeState, writingState, submitState, analyzingState, resultState].forEach(el => {
    if (el) el.style.display = 'none';
  });
  [writingActions, resultActions].forEach(el => {
    if (el) el.style.display = 'none';
  });
  
  // 检查是否有原文
  const originalText = task.material?.text || '';
  
  if (!originalText) {
    // 显示上传状态
    if (uploadState) uploadState.style.display = 'block';
    if (statusEl) statusEl.textContent = '待上传';
    showAIBubbleV4('需要先上传默写内容哦~');
    return;
  }
  
  // 有原文，初始化会话
  initCopywriteSessionV5(task, originalText);
}

// 初始化默写会话
function initCopywriteSessionV5(task, originalText) {
  // 销毁旧会话
  if (currentCopywriteSession) {
    currentCopywriteSession.destroy();
  }
  
  // 创建新会话
  currentCopywriteSession = new CopywriteSession({
    originalText,
    taskId: task.id,
    taskName: task.name,
    memorizeTime: 60, // 60秒记忆时间
    
    onStatusChange: (newStatus, oldStatus) => {
      updateCopywritePanelStatusV5(newStatus);
    },
    
    onTimeUpdate: (remaining, total) => {
      updateCopywriteCountdown(remaining, total);
    },
    
    onResult: (result) => {
      renderCopywriteResultV5(result);
    },
    
    onError: (error) => {
      showToast(error, 'error');
    }
  });
  
  // 显示原文，开始记忆
  displayOriginalText(originalText);
  currentCopywriteSession.startMemorize();
}

// 显示原文
function displayOriginalText(text) {
  const textEl = document.getElementById('copywrite-original-text');
  if (textEl) {
    textEl.textContent = text;
  }
}

// 更新默写面板状态显示
function updateCopywritePanelStatusV5(status) {
  const statusEl = document.getElementById('copywrite-status');
  const uploadState = document.getElementById('copywrite-upload-state');
  const memorizeState = document.getElementById('copywrite-memorize-state');
  const writingState = document.getElementById('copywrite-writing-state');
  const submitState = document.getElementById('copywrite-submit-state');
  const analyzingState = document.getElementById('copywrite-analyzing-state');
  const resultState = document.getElementById('copywrite-result-state');
  
  const writingActions = document.getElementById('writing-actions');
  const resultActions = document.getElementById('copywrite-result-actions');
  
  // 隐藏所有状态
  [uploadState, memorizeState, writingState, submitState, analyzingState, resultState].forEach(el => {
    if (el) el.style.display = 'none';
  });
  [writingActions, resultActions].forEach(el => {
    if (el) el.style.display = 'none';
  });
  
  const CopyStatus = CopywriteSession.STATUS;
  
  switch (status) {
    case CopyStatus.MEMORIZING:
      if (memorizeState) memorizeState.style.display = 'block';
      if (statusEl) statusEl.textContent = '记忆中';
      break;
      
    case CopyStatus.WRITING:
      if (writingState) writingState.style.display = 'block';
      if (writingActions) writingActions.style.display = 'flex';
      if (statusEl) statusEl.textContent = '默写中';
      break;
      
    case CopyStatus.WAITING_SUBMIT:
      if (submitState) submitState.style.display = 'block';
      if (statusEl) statusEl.textContent = '待提交';
      break;
      
    case CopyStatus.ANALYZING:
      if (analyzingState) analyzingState.style.display = 'block';
      if (statusEl) statusEl.textContent = '批改中';
      break;
      
    case CopyStatus.RESULT:
      if (resultState) resultState.style.display = 'block';
      if (resultActions) resultActions.style.display = 'flex';
      if (statusEl) statusEl.textContent = '完成';
      break;
  }
}

// 更新倒计时显示
function updateCopywriteCountdown(remaining, total) {
  const countdownEl = document.getElementById('memorize-countdown');
  const ringFill = document.getElementById('countdown-ring-fill');
  
  if (countdownEl) {
    countdownEl.textContent = remaining;
  }
  
  if (ringFill) {
    // 环形周长 = 2 * PI * r = 2 * 3.14 * 40 ≈ 251
    const circumference = 251;
    const offset = circumference * (1 - remaining / total);
    ringFill.style.strokeDashoffset = offset;
  }
}

// 渲染默写结果 V5
function renderCopywriteResultV5(result) {
  if (!result) return;
  
  // 更新准确率环形图
  const ringFill = document.getElementById('copywrite-accuracy-ring');
  const accuracyEl = document.getElementById('copywrite-accuracy-value');
  
  const accuracy = result.accuracy || 0;
  
  if (ringFill) {
    const circumference = 314;
    const offset = circumference * (1 - accuracy / 100);
    ringFill.style.strokeDashoffset = offset;
  }
  
  if (accuracyEl) {
    accuracyEl.textContent = accuracy;
  }
  
  // 更新统计
  const correctEl = document.getElementById('copywrite-correct-chars');
  const totalEl = document.getElementById('copywrite-total-chars');
  const errorCountEl = document.getElementById('copywrite-error-count');
  
  if (correctEl) correctEl.textContent = result.correct_chars || 0;
  if (totalEl) totalEl.textContent = result.total_chars || 0;
  if (errorCountEl) errorCountEl.textContent = (result.errors?.length) || 0;
  
  // 渲染错误列表
  const errorsContainer = document.getElementById('copywrite-errors');
  const errorsList = document.getElementById('copywrite-errors-list');
  
  if (result.errors && result.errors.length > 0 && errorsContainer && errorsList) {
    errorsContainer.style.display = 'block';
    let html = '';
    result.errors.forEach(err => {
      html += `
        <span class="copywrite-error-item">
          <span class="error-original">${err.original || ''}</span>
          <span class="error-arrow">→</span>
          <span class="error-wrote">${err.user_wrote || '✕'}</span>
        </span>
      `;
    });
    errorsList.innerHTML = html;
  } else if (errorsContainer) {
    errorsContainer.style.display = 'none';
  }
  
  // 鼓励语
  const encouragementEl = document.getElementById('copywrite-encouragement');
  if (encouragementEl && result.encouragement) {
    encouragementEl.textContent = result.encouragement;
  }
}

// 初始化默写面板V5事件监听
function initCopywritePanelEventsV5() {
  // 上传按钮
  const uploadBtn = document.getElementById('btn-copywrite-upload');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      showMaterialUploadModal(AppState.currentTask);
    });
  }
  
  // 开始默写按钮
  const startWritingBtn = document.getElementById('btn-start-writing');
  if (startWritingBtn) {
    startWritingBtn.addEventListener('click', async () => {
      if (currentCopywriteSession) {
        await currentCopywriteSession.startWriting();
      }
    });
  }
  
  // 写完了按钮
  const finishWritingBtn = document.getElementById('btn-finish-writing');
  if (finishWritingBtn) {
    finishWritingBtn.addEventListener('click', async () => {
      if (currentCopywriteSession) {
        await currentCopywriteSession.finishWriting();
      }
    });
  }
  
  // 拍照提交按钮
  const submitBtn = document.getElementById('btn-copywrite-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      openCopywriteCamera();
    });
  }
  
  // 重新默写按钮
  const retryBtn = document.getElementById('btn-copywrite-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      if (currentCopywriteSession) {
        currentCopywriteSession.destroy();
        const task = AppState.currentTask;
        if (task) {
          initCopywriteSessionV5(task, task.material?.text || '');
        }
      }
    });
  }
  
  // 完成任务按钮 - 只有审核完成后才能完成
  const completeBtn = document.getElementById('btn-copywrite-complete');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      // 检查是否有审核结果
      if (!currentCopywriteSession || !currentCopywriteSession.result) {
        showAIBubble('小特工，请先完成默写并拍照提交审核哦~ 📝', 'high');
        // 弹出拍照上传弹窗
        openCopywriteCamera();
        return;
      }
      // 先销毁会话
      currentCopywriteSession.destroy();
      currentCopywriteSession = null;
      // 调用统一的任务完成处理
      handleTaskComplete();
    });
  }
}

// 打开默写拍照
function openCopywriteCamera() {
  if (typeof showMaterialUploadModal === 'function') {
    showMaterialUploadModal(AppState.currentTask, {
      mode: 'copywrite_submit',
      onCapture: async (imageData) => {
        if (currentCopywriteSession) {
          await currentCopywriteSession.submitPhoto(imageData);
        }
      }
    });
  }
}

// 开始听写一个词
function startDictationItem() {
  const state = AppState.dictationState;
  if (!state) return;
  
  const timerValueEl = document.querySelector('.dictation-timer .timer-value');
  let timeLeft = state.timePerItem;
  
  // 更新进度显示
  const progressEl = document.getElementById('dictation-progress');
  if (progressEl) {
    progressEl.textContent = `听写进行中 ${state.currentIndex + 1}/${state.totalItems}`;
  }
  
  // 播放TTS（模拟）
  speakWord('词语' + (state.currentIndex + 1));
  
  // 开始倒计时
  if (state.timer) clearInterval(state.timer);
  
  if (timerValueEl) timerValueEl.textContent = timeLeft;
  
  state.timer = setInterval(() => {
    timeLeft--;
    if (timerValueEl) timerValueEl.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(state.timer);
      // 自动跳到下一个
      nextDictationItem();
    }
  }, 1000);
}

// 下一个听写词
function nextDictationItem() {
  const state = AppState.dictationState;
  if (!state) return;
  
  if (state.timer) clearInterval(state.timer);
  
  if (state.currentIndex < state.totalItems - 1) {
    state.currentIndex++;
    startDictationItem();
  } else {
    // 听写完成
    finishDictation();
  }
}

// 重听当前词
function repeatDictationItem() {
  speakWord('词语' + (AppState.dictationState?.currentIndex + 1 || 1));
}

// 完成听写
function finishDictation() {
  const state = AppState.dictationState;
  if (state?.timer) clearInterval(state.timer);
  
  showToast('听写完成！请核对答案', 'success');
  
  // 显示核对界面（可以扩展）
}

// TTS朗读（使用Web Speech API）
function speakWord(word) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }
}

// 初始化背诵/听写面板事件
function initReciteDictationEvents() {
  // 背诵面板
  const toggleBtn = document.getElementById('btn-toggle-recite');
  const showBtn = document.getElementById('btn-show-recite');
  const checkBtn = document.getElementById('btn-recite-check');
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleReciteContent);
  }
  
  if (showBtn) {
    showBtn.addEventListener('click', () => {
      AppState.reciteContentVisible = true;
      toggleReciteContent();
      toggleReciteContent(); // 切换两次恢复显示
    });
  }
  
  if (checkBtn) {
    checkBtn.addEventListener('click', startReciteCheck);
  }
  
  // 听写面板
  const repeatBtn = document.getElementById('btn-dictation-repeat');
  const nextBtn = document.getElementById('btn-dictation-next');
  const finishBtn = document.getElementById('btn-dictation-finish');
  
  if (repeatBtn) {
    repeatBtn.addEventListener('click', repeatDictationItem);
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', nextDictationItem);
  }
  
  if (finishBtn) {
    finishBtn.addEventListener('click', finishDictation);
  }
}

// ==========================================
// 语音识别功能
// ==========================================
let speechRecognition = null;
let isRecognizing = false;

// 初始化语音识别
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.log('浏览器不支持语音识别');
    return null;
  }
  
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'zh-CN';
  
  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    // 更新识别结果显示
    updateRecognitionResult(finalTranscript || interimTranscript);
    
    if (finalTranscript) {
      // 计算匹配度
      calculateReciteAccuracy(finalTranscript);
    }
  };
  
  recognition.onerror = (event) => {
    console.error('语音识别错误:', event.error);
    if (event.error === 'no-speech') {
      showToast('没有检测到语音，请再试一次', 'info');
    } else if (event.error === 'not-allowed') {
      showToast('请允许麦克风权限', 'error');
    }
    stopReciteCheck();
  };
  
  recognition.onend = () => {
    if (isRecognizing) {
      // 意外结束，重新开始
      recognition.start();
    }
  };
  
  return recognition;
}

// 开始背诵检测
function startReciteCheck() {
  const checkBtn = document.getElementById('btn-recite-check');
  
  if (isRecognizing) {
    // 停止检测
    stopReciteCheck();
    return;
  }
  
  // 隐藏内容
  if (AppState.reciteContentVisible) {
    toggleReciteContent();
  }
  
  // 初始化语音识别
  if (!speechRecognition) {
    speechRecognition = initSpeechRecognition();
  }
  
  if (!speechRecognition) {
    showToast('您的浏览器不支持语音识别', 'error');
    return;
  }
  
  try {
    speechRecognition.start();
    isRecognizing = true;
    
    if (checkBtn) {
      checkBtn.classList.add('recording');
      checkBtn.innerHTML = '<i class="fa-solid fa-stop"></i> 停止检测';
    }
    
    showToast('开始背诵检测，请大声朗读...', 'info');
    showAIBubble('我在听，开始背诵吧~');
    
    // 显示识别结果区域
    showRecognitionPanel();
    
  } catch (error) {
    console.error('启动语音识别失败:', error);
    showToast('启动语音识别失败', 'error');
  }
}

// 停止背诵检测
function stopReciteCheck() {
  const checkBtn = document.getElementById('btn-recite-check');
  
  if (speechRecognition && isRecognizing) {
    isRecognizing = false;
    speechRecognition.stop();
  }
  
  if (checkBtn) {
    checkBtn.classList.remove('recording');
    checkBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> 开始背诵检测';
  }
}

// 显示识别结果面板
function showRecognitionPanel() {
  // 检查是否已存在
  let panel = document.getElementById('recognition-result-panel');
  
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'recognition-result-panel';
    panel.className = 'recognition-result-panel';
    panel.innerHTML = `
      <div class="recognition-header">
        <span class="recognition-label">
          <i class="fa-solid fa-waveform"></i>
          识别中...
        </span>
        <span class="recognition-accuracy" id="recognition-accuracy"></span>
      </div>
      <div class="recognition-text" id="recognition-text">
        等待您的声音...
      </div>
    `;
    
    const recitePanel = document.getElementById('recite-panel');
    if (recitePanel) {
      recitePanel.appendChild(panel);
    }
  }
  
  panel.style.display = 'block';
}

// 更新识别结果显示
function updateRecognitionResult(text) {
  const textEl = document.getElementById('recognition-text');
  const labelEl = document.querySelector('.recognition-label');
  
  if (textEl) {
    textEl.textContent = text || '等待您的声音...';
  }
  
  if (labelEl && text) {
    labelEl.innerHTML = '<i class="fa-solid fa-waveform"></i> 正在识别';
  }
}

// 计算背诵准确率（简化版本）
function calculateReciteAccuracy(spokenText) {
  // 这里使用简化的匹配算法
  // 实际应用中可以使用更复杂的文本相似度算法
  
  const task = AppState.currentTask;
  if (!task) return;
  
  // 假设我们有预期的文本（实际应用中应该从OCR获取）
  const expectedText = task.material?.text || '';
  
  let accuracy = 0;
  
  if (expectedText && spokenText) {
    // 简单的字符匹配率
    const expectedChars = expectedText.replace(/\s/g, '');
    const spokenChars = spokenText.replace(/\s/g, '');
    
    let matchCount = 0;
    for (let char of spokenChars) {
      if (expectedChars.includes(char)) {
        matchCount++;
      }
    }
    
    accuracy = Math.min(100, Math.round((matchCount / expectedChars.length) * 100));
  } else {
    // 如果没有预期文本，使用模拟的准确率
    accuracy = Math.floor(Math.random() * 20) + 80; // 80-100%
  }
  
  // 显示准确率
  const accuracyEl = document.getElementById('recognition-accuracy');
  if (accuracyEl) {
    accuracyEl.textContent = `${accuracy}%`;
    accuracyEl.className = `recognition-accuracy ${accuracy >= 80 ? 'good' : accuracy >= 60 ? 'ok' : 'poor'}`;
  }
  
  // 保存结果
  if (!task.voiceCheck) {
    task.voiceCheck = { attempts: 0, accuracy: 0 };
  }
  task.voiceCheck.attempts++;
  task.voiceCheck.accuracy = Math.max(task.voiceCheck.accuracy, accuracy);
  
  // 给予反馈
  if (accuracy >= 80) {
    showAIBubble('太棒了！背诵得很好！👏');
  } else if (accuracy >= 60) {
    showAIBubble('不错，再练习一下会更好~');
  } else {
    showAIBubble('继续加油，多练几遍~');
  }
}

function updateCurrentTaskUI() {
  const task = AppState.currentTask;
  if (!task) return;
  
  if (DOM.currentTaskName) DOM.currentTaskName.textContent = task.name;
  if (DOM.taskTimeTotal) DOM.taskTimeTotal.textContent = formatTime(task.duration * 60);
  if (DOM.taskTimeElapsed) DOM.taskTimeElapsed.textContent = '00:00';
  if (DOM.taskProgress) DOM.taskProgress.style.width = '0%';
}

// V4 版本更新当前任务UI
function updateCurrentTaskUIV2() {
  const task = AppState.currentTask;
  if (!task) return;
  
  // 设置任务模式属性（用于样式切换）
  const taskCard = document.querySelector('.floating-task-card-v6');
  if (taskCard) {
    const mode = task.mode || 'homework';
    taskCard.setAttribute('data-mode', mode);
    
    // 更新模式图标
    const modeIcons = {
      recite: '📖',
      dictation: '✍️',
      copywrite: '📝',
      homework: '📚',
      quick: '⚡'
    };
    const modeIcon = taskCard.querySelector('.task-mode-icon');
    if (modeIcon) {
      modeIcon.textContent = modeIcons[mode] || '📚';
    }
  }
  
  // 更新任务名称
  const taskName = document.getElementById('current-task-name-v2');
  if (taskName) taskName.textContent = task.name;
  
  // 更新时间显示
  const timeBig = document.getElementById('task-time-big');
  const timeTotal = document.getElementById('task-time-total-small');
  if (timeBig) timeBig.textContent = '00:00';
  if (timeTotal) timeTotal.textContent = formatTime(task.duration * 60);
  
  // 更新任务索引
  const taskIndex = document.getElementById('task-index');
  if (taskIndex) {
    taskIndex.textContent = `${AppState.currentTaskIndex + 1}/${AppState.tasks.length}`;
  }
  
  // 更新环形进度条
  updateProgressRingV4(0, task.duration * 60);
  
  // 更新任务点指示器
  updateTaskDotsV4();
}

// 更新环形进度条 V4
function updateProgressRingV4(elapsed, total) {
  const progressFill = document.getElementById('progress-ring-fill');
  if (!progressFill) return;
  
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(elapsed / total, 1);
  const offset = circumference * (1 - progress);
  
  progressFill.style.strokeDasharray = `${circumference}`;
  progressFill.style.strokeDashoffset = offset;
}

// 更新任务点指示器 V4
function updateTaskDotsV4() {
  const dotsContainer = document.getElementById('task-dots');
  if (!dotsContainer) return;
  
  dotsContainer.innerHTML = AppState.tasks.map((_, i) => `
    <span class="dot ${i === AppState.currentTaskIndex ? 'active' : ''}"></span>
  `).join('');
}

// 更新任务滑动卡片UI
function updateTaskSwiperUI() {
  if (!DOM.taskSwiper || !DOM.taskDots) return;
  
  // 清空现有卡片（保留当前任务卡片）
  const existingCards = DOM.taskSwiper.querySelectorAll('.task-swipe-card:not(:first-child)');
  existingCards.forEach(card => card.remove());
  
  // 更新当前任务卡片
  const currentCard = DOM.taskSwiper.querySelector('.task-swipe-card');
  if (currentCard && AppState.currentTask) {
    const nameEl = currentCard.querySelector('.task-name');
    const timeEl = currentCard.querySelector('.time-total');
    if (nameEl) nameEl.textContent = AppState.currentTask.name;
    if (timeEl) timeEl.textContent = formatTime(AppState.currentTask.duration * 60);
  }
  
  // 添加后续任务卡片
  const upcomingTasks = AppState.tasks.slice(AppState.currentTaskIndex + 1);
  upcomingTasks.forEach((task, index) => {
    const card = document.createElement('div');
    card.className = 'task-swipe-card';
    card.dataset.index = index + 1;
    card.innerHTML = `
      <div class="task-card-header">
        <span class="task-tag next">接下来</span>
        <span class="task-name">${task.name}</span>
      </div>
      <div class="task-card-progress">
        <div class="progress-bar-v2">
          <div class="progress-fill-v2" style="width: 0%"></div>
        </div>
        <div class="progress-info">
          <span class="time-elapsed">00:00</span>
          <span class="time-divider">/</span>
          <span class="time-total">${formatTime(task.duration * 60)}</span>
        </div>
      </div>
    `;
    DOM.taskSwiper.appendChild(card);
  });
  
  // 更新指示点
  updateSwiperDots();
  
  // 初始化滑动监听
  initTaskSwiperEvents();
}

// 更新滑动指示点
function updateSwiperDots() {
  if (!DOM.taskDots) return;
  
  const totalCards = AppState.tasks.length;
  DOM.taskDots.innerHTML = '';
  
  for (let i = 0; i < totalCards; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    DOM.taskDots.appendChild(dot);
  }
}

// 初始化任务滑动事件
function initTaskSwiperEvents() {
  if (!DOM.taskSwiper) return;
  
  DOM.taskSwiper.addEventListener('scroll', () => {
    const scrollLeft = DOM.taskSwiper.scrollLeft;
    const cardWidth = DOM.taskSwiper.querySelector('.task-swipe-card')?.offsetWidth || 300;
    const currentIndex = Math.round(scrollLeft / (cardWidth + 12)); // 12 is the gap
    
    // 更新指示点
    const dots = DOM.taskDots?.querySelectorAll('.dot');
    dots?.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
  });
}

// V4 计时器 - 增强版
function startTimersV2() {
  if (AppState.studyTimer) clearInterval(AppState.studyTimer);
  if (AppState.taskTimer) clearInterval(AppState.taskTimer);
  if (AppState.focusTimer) clearInterval(AppState.focusTimer);
  
  // 显示专注度指示器
  if (typeof FocusMonitor !== 'undefined') {
    FocusMonitor.show();
  }
  
  // 启动 Coze 监督智能体
  if (typeof CozeAgent !== 'undefined') {
    CozeAgent.startSupervisor({
      taskName: AppState.currentTask?.name || '学习任务'
    });
  }
  
  // 主计时器
  AppState.studyTimer = setInterval(() => {
    // 如果在休息中，跳过
    if (AppState.isBreaking) return;
    
    AppState.totalStudyTime++;
    
    // 更新V4时间显示
    const studyTimer = document.getElementById('study-time-v2');
    if (studyTimer) studyTimer.textContent = formatTime(AppState.totalStudyTime);
    
    // 每5秒更新专注度
    if (AppState.totalStudyTime % 5 === 0) {
      updateFocusBarV4();
      
      // 更新专注度监测器
      if (typeof FocusMonitor !== 'undefined') {
        const currentFocus = AppState.currentFocus || 85;
        FocusMonitor.updateLevel(currentFocus);
      }
    }
    
    // 专注里程碑提示（每5分钟）
    const minutes = Math.floor(AppState.totalStudyTime / 60);
    if (AppState.totalStudyTime % 300 === 0 && minutes > 0) { // 每5分钟
      if (typeof FocusMonitor !== 'undefined') {
        FocusMonitor.showMilestone(minutes);
      }
    }
    
    // 时间检查点反馈
    if (AppState.totalStudyTime % 60 === 0 && AI_MESSAGES.timeCheckpoints[minutes]) {
      showAIBubbleV4(AI_MESSAGES.timeCheckpoints[minutes]);
    }
    
    // 休息提醒检测（每45分钟）
    checkBreakReminder();
  }, 1000);
  
  // 任务计时器
  AppState.taskTimer = setInterval(() => {
    AppState.taskElapsedTime++;
    
    const task = AppState.currentTask;
    if (!task) return;
    
    const totalSeconds = task.duration * 60;
    
    // 更新V4时间显示
    const timeBig = document.getElementById('task-time-big');
    if (timeBig) timeBig.textContent = formatTime(AppState.taskElapsedTime);
    
    // 更新环形进度条
    updateProgressRingV4(AppState.taskElapsedTime, totalSeconds);
    
    // 任务完成检查 - 只在刚好到达时间时触发一次
    if (AppState.taskElapsedTime >= totalSeconds && !AppState.currentTask?.completed) {
      handleTaskComplete();
    }
  }, 1000);
  
  // 专注度检测计时器
  AppState.focusTimer = setInterval(() => {
    updateFocusStatus();
  }, 3000);
}

// 更新专注度条 V4
function updateFocusBarV4() {
  // 模拟专注度变化
  focusScore = Math.max(60, Math.min(100, focusScore + (Math.random() - 0.5) * 10));
  
  const focusFill = document.getElementById('focus-bar-fill');
  if (focusFill) {
    focusFill.style.width = focusScore + '%';
    
    // 根据专注度改变颜色
    focusFill.classList.remove('warning', 'danger');
    if (focusScore < 60) {
      focusFill.classList.add('danger');
    } else if (focusScore < 80) {
      focusFill.classList.add('warning');
    }
  }
}

// 更新专注度曲线
function updateFocusCurve() {
  // 模拟专注度变化 (实际应用中应该从检测系统获取)
  const currentFocus = Math.max(85, Math.min(100, 95 + (Math.random() - 0.5) * 10));
  
  // 更新历史数据
  focusHistory.shift();
  focusHistory.push(currentFocus);
  
  // 更新显示值
  if (DOM.focusValue) {
    DOM.focusValue.textContent = Math.round(currentFocus) + '%';
  }
  
  // 生成SVG路径
  if (DOM.focusCurveLine && DOM.focusCurveFill) {
    const points = focusHistory.map((val, i) => {
      const x = (i / (MAX_FOCUS_POINTS - 1)) * 60;
      const y = 24 - (val / 100) * 20; // 反转Y轴
      return `${x},${y}`;
    });
    
    const linePath = `M${points.join(' L')}`;
    DOM.focusCurveLine.setAttribute('d', linePath);
    
    const fillPath = `M0,24 L${points.join(' L')} L60,24 Z`;
    DOM.focusCurveFill.setAttribute('d', fillPath);
  }
}

// 更新专注状态
function updateFocusStatus() {
  const focusDot = document.querySelector('.focus-dot-v2');
  if (focusDot) {
    // 模拟状态变化
    const isGood = Math.random() > 0.1;
    focusDot.style.background = isGood ? '#34D399' : '#FBBF24';
  }
}

// ==========================================
// 休息提醒系统
// ==========================================

const BREAK_CONFIG = {
  studyDuration: 45 * 60,  // 45分钟后提醒休息
  breakDuration: 5 * 60,   // 休息5分钟
  minTimeBetweenBreaks: 30 * 60 // 两次休息间隔最少30分钟
};

/**
 * 检查是否需要休息提醒
 */
function checkBreakReminder() {
  // 如果已经在休息，跳过
  if (AppState.isBreaking) return;
  
  // 计算无休息的连续学习时间
  const timeSinceLastBreak = AppState.totalStudyTime - AppState.lastBreakTime;
  
  // 达到45分钟，提醒休息
  if (timeSinceLastBreak >= BREAK_CONFIG.studyDuration) {
    showBreakReminderPanel();
  }
}

/**
 * 显示休息提醒面板
 */
function showBreakReminderPanel() {
  let panel = document.getElementById('break-reminder-panel');
  
  if (!panel) {
    // 动态创建休息面板
    panel = document.createElement('div');
    panel.id = 'break-reminder-panel';
    panel.className = 'break-reminder-panel';
    panel.innerHTML = `
      <div class="break-reminder-content">
        <div class="break-avatar">
          <img src="assets/images/xiaoying-avatar.png" alt="小影老师">
        </div>
        <h3 class="break-title">🎉 学习45分钟了！</h3>
        <p class="break-desc">小特工辛苦啦~休息一下眼睛吧</p>
        
        <div class="break-timer-display" id="break-timer-display" style="display: none;">
          <div class="break-countdown-ring">
            <svg viewBox="0 0 100 100">
              <circle class="ring-bg" cx="50" cy="50" r="40" />
              <circle class="ring-fill" id="break-ring-fill" cx="50" cy="50" r="40" />
            </svg>
            <span class="break-time" id="break-time">5:00</span>
          </div>
          <p class="break-hint">休息中，远离屏幕~</p>
        </div>
        
        <div class="break-actions" id="break-actions">
          <button class="break-btn secondary" id="btn-skip-break">
            <span>继续学习</span>
          </button>
          <button class="break-btn primary" id="btn-start-break">
            <i class="fa-solid fa-mug-hot"></i>
            <span>休息5分钟</span>
          </button>
        </div>
        
        <div class="break-complete-actions" id="break-complete-actions" style="display: none;">
          <button class="break-btn primary" id="btn-resume-study">
            <i class="fa-solid fa-play"></i>
            <span>继续学习</span>
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('page-study').appendChild(panel);
    
    // 绑定事件
    document.getElementById('btn-skip-break')?.addEventListener('click', skipBreak);
    document.getElementById('btn-start-break')?.addEventListener('click', startBreak);
    document.getElementById('btn-resume-study')?.addEventListener('click', resumeFromBreak);
  }
  
  // 显示面板
  panel.classList.add('show');
  
  // 语音提醒
  if (typeof CozeRealtime !== 'undefined' && CozeRealtime.speak) {
    CozeRealtime.speak('小特工，你已经学习45分钟了，休息一下眼睛吧~');
  }
}

/**
 * 跳过休息
 */
function skipBreak() {
  const panel = document.getElementById('break-reminder-panel');
  if (panel) {
    panel.classList.remove('show');
  }
  
  // 更新上次休息时间（视为已休息）
  AppState.lastBreakTime = AppState.totalStudyTime;
  
  showToast('继续加油！注意保护眼睛哦~', 'info');
}

/**
 * 开始休息
 */
function startBreak() {
  AppState.isBreaking = true;
  AppState.breakRemaining = BREAK_CONFIG.breakDuration;
  
  // 更新UI
  const panel = document.getElementById('break-reminder-panel');
  const timerDisplay = document.getElementById('break-timer-display');
  const actions = document.getElementById('break-actions');
  
  if (timerDisplay) timerDisplay.style.display = 'block';
  if (actions) actions.style.display = 'none';
  
  // 暂停监督
  if (typeof CozeRealtime !== 'undefined' && CozeRealtime.RoomManager) {
    CozeRealtime.RoomManager.pauseSupervisor();
  }
  
  // 开始倒计时
  updateBreakTimer();
  AppState.breakTimer = setInterval(() => {
    AppState.breakRemaining--;
    updateBreakTimer();
    
    if (AppState.breakRemaining <= 0) {
      endBreak();
    }
  }, 1000);
  
  // 语音提示
  if (typeof CozeRealtime !== 'undefined' && CozeRealtime.speak) {
    CozeRealtime.speak('休息开始啦，离开座位活动一下吧~');
  }
}

/**
 * 更新休息计时器显示
 */
function updateBreakTimer() {
  const timeEl = document.getElementById('break-time');
  const ringFill = document.getElementById('break-ring-fill');
  
  const minutes = Math.floor(AppState.breakRemaining / 60);
  const seconds = AppState.breakRemaining % 60;
  
  if (timeEl) {
    timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  if (ringFill) {
    // 环形周长 = 2 * PI * r = 2 * 3.14 * 40 ≈ 251
    const circumference = 251;
    const progress = AppState.breakRemaining / BREAK_CONFIG.breakDuration;
    const offset = circumference * (1 - progress);
    ringFill.style.strokeDashoffset = offset;
  }
}

/**
 * 休息结束
 */
function endBreak() {
  if (AppState.breakTimer) {
    clearInterval(AppState.breakTimer);
    AppState.breakTimer = null;
  }
  
  AppState.isBreaking = false;
  AppState.lastBreakTime = AppState.totalStudyTime;
  
  // 更新UI
  const timerDisplay = document.getElementById('break-timer-display');
  const completeActions = document.getElementById('break-complete-actions');
  
  if (timerDisplay) timerDisplay.style.display = 'none';
  if (completeActions) completeActions.style.display = 'flex';
  
  // 语音提示
  if (typeof CozeRealtime !== 'undefined' && CozeRealtime.speak) {
    CozeRealtime.speak('休息结束啦，继续加油吧~');
  }
}

/**
 * 从休息恢复学习
 */
function resumeFromBreak() {
  const panel = document.getElementById('break-reminder-panel');
  if (panel) {
    panel.classList.remove('show');
  }
  
  // 重置UI
  const actions = document.getElementById('break-actions');
  const completeActions = document.getElementById('break-complete-actions');
  
  if (actions) actions.style.display = 'flex';
  if (completeActions) completeActions.style.display = 'none';
  
  // 恢复监督
  if (typeof CozeRealtime !== 'undefined' && CozeRealtime.RoomManager) {
    CozeRealtime.RoomManager.resumeSupervisor();
  }
  
  showAIBubbleV4('休息好了吗？我们继续学习吧！💪');
}

// ==========================================
// 统一结果展示组件
// ==========================================

/**
 * 显示任务结果面板
 * @param {string} type - 结果类型: 'dictation' | 'recite' | 'copywrite'
 * @param {object} result - 结果数据
 * @param {function} onComplete - 完成回调
 */
function showTaskResultPanel(type, result, onComplete) {
  // 创建或获取结果面板
  let panel = document.getElementById('task-result-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'task-result-panel';
    panel.className = 'task-result-panel';
    document.body.appendChild(panel);
  }
  
  // 计算成绩等级
  const accuracy = result.accuracy || 0;
  let gradeClass, gradeText;
  if (accuracy >= 90) {
    gradeClass = 'excellent';
    gradeText = '优秀';
  } else if (accuracy >= 80) {
    gradeClass = 'good';
    gradeText = '良好';
  } else if (accuracy >= 70) {
    gradeClass = 'pass';
    gradeText = '及格';
  } else {
    gradeClass = 'fail';
    gradeText = '需加油';
  }
  
  // 计算环形进度
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * (1 - accuracy / 100);
  
  // 生成类型标题
  const typeTitle = {
    dictation: '听写结果',
    recite: '背诵结果',
    copywrite: '默写结果'
  }[type] || '作业结果';
  
  // 生成统计数据
  const total = result.total || result.total_chars || 0;
  const correct = result.correct || result.correct_chars || 0;
  const wrong = result.wrong || (total - correct) || 0;
  
  // 生成错误列表HTML
  let errorsHTML = '';
  const errors = result.errors || result.details?.filter(d => !d.correct) || [];
  if (errors.length > 0) {
    const errorItems = errors.slice(0, 5).map(err => {
      const original = err.word || err.original || '';
      const user = err.user || err.user_wrote || '';
      const errorType = err.error_type || '错误';
      return `
        <div class="result-error-item">
          <span class="result-error-original">${original}</span>
          <span class="result-error-arrow">→</span>
          <span class="result-error-user">${user || '×'}</span>
          <span class="result-error-type">${errorType}</span>
        </div>
      `;
    }).join('');
    
    errorsHTML = `
      <div class="result-errors">
        <div class="result-errors-title">
          <i class="fa-solid fa-circle-xmark"></i>
          需要改正 (${errors.length}处)
        </div>
        <div class="result-error-list">
          ${errorItems}
          ${errors.length > 5 ? `<div class="result-error-more">还有${errors.length - 5}处错误</div>` : ''}
        </div>
      </div>
    `;
  }
  
  // 鼓励语
  const encouragement = result.encouragement || (accuracy >= 90 ? '太棒了！继续保持！' : '加油！多练习几遍！');
  
  panel.innerHTML = `
    <div class="result-content">
      <div class="result-header">
        <div class="result-score-ring">
          <svg viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="45" />
            <circle class="ring-fill ${gradeClass}" cx="50" cy="50" r="45" 
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};" />
          </svg>
          <div class="result-score-value">
            <div class="result-score-number ${gradeClass}">${accuracy}</div>
            <div class="result-score-label">分</div>
          </div>
        </div>
        <div class="result-grade ${gradeClass}">${gradeText}</div>
        <div class="result-stats">
          <div class="result-stat">
            <div class="result-stat-value">${total}</div>
            <div class="result-stat-label">总数</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value" style="color: #10B981">${correct}</div>
            <div class="result-stat-label">正确</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value" style="color: #EF4444">${wrong}</div>
            <div class="result-stat-label">错误</div>
          </div>
        </div>
      </div>
      
      ${errorsHTML}
      
      <div class="result-encouragement">
        <div class="result-encouragement-icon">${accuracy >= 90 ? '🎉' : '💪'}</div>
        <div class="result-encouragement-text">${encouragement}</div>
      </div>
      
      <div class="result-actions">
        <button class="result-btn secondary" id="btn-result-retry">
          <i class="fa-solid fa-rotate"></i>
          再练一次
        </button>
        <button class="result-btn primary" id="btn-result-complete">
          <i class="fa-solid fa-check"></i>
          完成
        </button>
      </div>
    </div>
  `;
  
  // 显示面板
  requestAnimationFrame(() => {
    panel.classList.add('show');
  });
  
  // 绑定事件
  document.getElementById('btn-result-complete').onclick = () => {
    panel.classList.remove('show');
    if (onComplete) onComplete();
  };
  
  document.getElementById('btn-result-retry').onclick = () => {
    panel.classList.remove('show');
    // 重新开始当前任务
    restartCurrentTask();
  };
  
  // 点击背景关闭
  panel.onclick = (e) => {
    if (e.target === panel) {
      panel.classList.remove('show');
      if (onComplete) onComplete();
    }
  };
}

/**
 * 重新开始当前任务
 */
function restartCurrentTask() {
  const task = AppState.currentTask;
  if (!task) return;
  
  // 重置任务状态
  AppState.taskElapsedTime = 0;
  
  // 根据任务类型重新初始化
  const mode = task.mode || 'homework';
  if (mode === 'recite' && window.currentReciteSession) {
    window.currentReciteSession.restart();
  } else if (mode === 'dictation' && window.currentDictationSession) {
    window.currentDictationSession.restart();
  } else if (mode === 'copywrite' && window.currentCopywriteSession) {
    window.currentCopywriteSession.restart();
  }
  
  showAIBubble('我们再来一次吧！💪');
}

// 全局导出
window.showTaskResultPanel = showTaskResultPanel;

// ==========================================
// 统一AI气泡管理系统
// 避免多个弹窗互相覆盖
// ==========================================

const AIBubbleManager = {
  queue: [],
  isShowing: false,
  currentTimeout: null,
  minInterval: 2000, // 最小间隔2秒
  lastShowTime: 0,
  
  /**
   * 显示AI气泡
   * @param {string} message - 消息内容
   * @param {object} options - 配置项
   */
  show(message, options = {}) {
    const { 
      priority = 'normal', // 'high' | 'normal' | 'low'
      duration = 4000,
      emotion = 'happy',
      speak = false 
    } = options;
  
    // 高优先级直接显示，清空队列
    if (priority === 'high') {
      this.queue = [];
      this._showNow(message, { duration, emotion, speak });
      return;
    }
    
    // 正在显示时加入队列
    if (this.isShowing) {
      // 低优先级且队列已满则丢弃
      if (priority === 'low' && this.queue.length >= 3) {
        return;
      }
      this.queue.push({ message, options: { duration, emotion, speak } });
      return;
    }
    
    // 检查最小间隔
    const now = Date.now();
    if (now - this.lastShowTime < this.minInterval) {
      this.queue.push({ message, options: { duration, emotion, speak } });
      setTimeout(() => this._processQueue(), this.minInterval);
      return;
    }
    
    this._showNow(message, { duration, emotion, speak });
  },
  
  _showNow(message, { duration, emotion, speak }) {
    const bubble = document.getElementById('ai-bubble');
    const bubbleText = document.getElementById('ai-bubble-text');
    
    if (!bubble || !bubbleText) return;
    
    // 清除之前的定时器
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }
    
    this.isShowing = true;
    this.lastShowTime = Date.now();
    
    // 更新内容
    bubbleText.textContent = message;
    bubble.classList.add('show');
    
    // 添加情绪样式
    bubble.classList.remove('warning', 'success', 'encouraging');
    if (emotion === 'warning') {
      bubble.classList.add('warning');
    } else if (emotion === 'success') {
      bubble.classList.add('success');
  }
  
  // 自动隐藏
    this.currentTimeout = setTimeout(() => {
      bubble.classList.remove('show');
      this.isShowing = false;
      
      // 处理队列中的下一条
      setTimeout(() => this._processQueue(), 500);
  }, duration);
  },
  
  _processQueue() {
    if (this.queue.length > 0 && !this.isShowing) {
      const next = this.queue.shift();
      this._showNow(next.message, next.options);
    }
  },
  
  // 清空队列
  clear() {
    this.queue = [];
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }
    const bubble = document.getElementById('ai-bubble');
    if (bubble) bubble.classList.remove('show');
    this.isShowing = false;
  }
};

// 兼容旧版函数
function showAIBubble(message, options = {}) {
  AIBubbleManager.show(message, options);
}

// 语音播报消息
function speakMessage(text) {
  if (!('speechSynthesis' in window)) return;
  
  // 取消之前的语音
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  
  // 尝试获取中文语音
  const voices = window.speechSynthesis.getVoices();
  const chineseVoice = voices.find(v => v.lang.includes('zh'));
  if (chineseVoice) {
    utterance.voice = chineseVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}

// ==========================================
// 家长密码验证系统
// ==========================================
const PARENT_CONFIG = {
  password: localStorage.getItem('parentPassword') || '123456',
  // 不需要密码就能完成的任务类型
  noPasswordModes: ['quick', 'homework'],
  // 需要密码的任务类型（不能提前完成，必须等时间结束）
  passwordRequiredModes: ['recite', 'dictation', 'copywrite']
};

/**
 * 检查任务是否需要密码才能提前完成
 */
function taskRequiresPassword(task) {
  if (!task) return false;
  const mode = task.mode || 'homework';
  return PARENT_CONFIG.passwordRequiredModes.includes(mode);
}

/**
 * 检查任务时间是否已用完
 */
function isTaskTimeComplete(task) {
  if (!task) return false;
  const totalSeconds = task.duration * 60;
  return AppState.taskElapsedTime >= totalSeconds;
}

/**
 * 显示家长密码验证弹窗
 */
function showParentPasswordModal(onSuccess) {
  // 创建密码弹窗
  let modal = document.getElementById('parent-password-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'parent-password-modal';
    modal.className = 'parent-password-modal';
    modal.innerHTML = `
      <div class="password-modal-content">
        <div class="password-modal-header">
          <div class="password-icon">🔐</div>
          <h3>家长验证</h3>
          <p>作业任务需要完成规定时间，提前结束需要家长密码</p>
        </div>
        <div class="password-input-group">
          <input type="password" id="parent-password-input" placeholder="请输入家长密码" maxlength="10">
          <div class="password-hint" id="password-hint"></div>
        </div>
        <div class="password-modal-actions">
          <button class="password-btn secondary" id="btn-password-cancel">取消</button>
          <button class="password-btn primary" id="btn-password-confirm">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  const input = modal.querySelector('#parent-password-input');
  const hint = modal.querySelector('#password-hint');
  const btnConfirm = modal.querySelector('#btn-password-confirm');
  const btnCancel = modal.querySelector('#btn-password-cancel');
  
  // 重置
  input.value = '';
  hint.textContent = '';
  hint.className = 'password-hint';
  
  // 显示
  requestAnimationFrame(() => {
    modal.classList.add('show');
    input.focus();
  });
  
  // 确认按钮
  const handleConfirm = () => {
    const enteredPassword = input.value.trim();
    if (enteredPassword === PARENT_CONFIG.password) {
      modal.classList.remove('show');
      if (onSuccess) onSuccess();
    } else {
      hint.textContent = '密码错误，请重试';
      hint.className = 'password-hint error';
      input.value = '';
      input.focus();
    }
  };
  
  // 取消按钮
  const handleCancel = () => {
    modal.classList.remove('show');
  };
  
  // 绑定事件
  btnConfirm.onclick = handleConfirm;
  btnCancel.onclick = handleCancel;
  input.onkeypress = (e) => {
    if (e.key === 'Enter') handleConfirm();
  };
  
  // 点击背景关闭
  modal.onclick = (e) => {
    if (e.target === modal) handleCancel();
  };
}

// 处理任务完成
function handleTaskComplete() {
  console.log('[handleTaskComplete] 开始处理任务完成');
  console.log('[handleTaskComplete] 当前任务索引:', AppState.currentTaskIndex);
  console.log('[handleTaskComplete] 总任务数:', AppState.tasks.length);
  
  // 防止重复调用 - 如果当前任务已完成则跳过
  if (!AppState.currentTask) {
    console.log('[handleTaskComplete] 没有当前任务，跳过');
    return;
  }
  
  if (AppState.currentTask.completed) {
    console.log('[handleTaskComplete] 当前任务已完成，跳过重复调用');
    return;
  }
  
  // 检查是否需要密码验证
  if (taskRequiresPassword(AppState.currentTask) && !isTaskTimeComplete(AppState.currentTask)) {
    console.log('[handleTaskComplete] 任务需要密码验证才能提前完成');
    showParentPasswordModal(() => {
      // 密码验证成功，执行真正的完成逻辑
      doTaskComplete();
    });
    return;
  }
  
  // 不需要密码，直接完成
  doTaskComplete();
}

/**
 * 执行任务完成逻辑（密码验证后或不需要密码时调用）
 */
function doTaskComplete() {
  console.log('[doTaskComplete] 执行任务完成逻辑');
  
  if (!AppState.currentTask || AppState.currentTask.completed) {
    return;
  }
  
  console.log('[doTaskComplete] 所有任务:', JSON.stringify(AppState.tasks.map(t => ({name: t.name, completed: t.completed}))));
  
  // 标记当前任务为已完成
  AppState.currentTask.completed = true;
  AppState.currentTask.completedAt = Date.now();
  AppState.currentTask.actualDuration = AppState.taskElapsedTime;
  console.log('[doTaskComplete] 已标记任务完成:', AppState.currentTask.name);
  
  // 发放任务奖励（如果是挑战任务）
  if (AppState.currentTask.isChallenge && AppState.currentTask.reward) {
    AppState.user.stars = (AppState.user.stars || 0) + AppState.currentTask.reward;
    showToast(`🎉 获得 ${AppState.currentTask.reward} 金币奖励！`, 'success');
  }
  
  // 增加完成任务数
  AppState.user.totalMissions = (AppState.user.totalMissions || 0) + 1;
  
  // 保存数据
  saveUserData();
  
  showAIBubble('这个任务完成啦！太棒了！');
  
  // 切换到下一个任务
  const hasMoreTasks = AppState.currentTaskIndex < AppState.tasks.length - 1;
  console.log('[doTaskComplete] 是否有更多任务:', hasMoreTasks, `(${AppState.currentTaskIndex} < ${AppState.tasks.length - 1})`);
  
  if (hasMoreTasks) {
    AppState.currentTaskIndex++;
    AppState.currentTask = AppState.tasks[AppState.currentTaskIndex];
    AppState.taskElapsedTime = 0;
    
    console.log('[doTaskComplete] 切换到下一个任务:', AppState.currentTask?.name);
    
    // 更新UI
    updateCurrentTaskUIV2();
    updateTaskDotsV4();
    updateStudyModeUI();  // 更新任务模式UI（切换背诵/听写/默写/普通模式）
    
    // 滚动到下一个卡片
    if (DOM.taskSwiper) {
      const cardWidth = DOM.taskSwiper.querySelector('.task-swipe-card')?.offsetWidth || 300;
      DOM.taskSwiper.scrollTo({
        left: AppState.currentTaskIndex * (cardWidth + 12),
        behavior: 'smooth'
      });
    }
    
    // 显示下一个任务的提示
    setTimeout(() => {
      showAIBubble(`开始下一个任务：${AppState.currentTask.name || '专注学习'}`);
    }, 500);
  } else {
    // 所有任务完成
    console.log('[doTaskComplete] 所有任务已完成，结束会话');
    finishStudySession();
  }
}

// 结束学习会话
function finishStudySession() {
  clearInterval(AppState.studyTimer);
  clearInterval(AppState.taskTimer);
  clearInterval(AppState.focusTimer);
  
  showAIBubble('全部任务完成！你太厉害了！');
  
  setTimeout(() => {
    navigateTo('complete');
    updateCompletionStats();
  }, 2000);
}

function updateQueueUI() {
  if (!DOM.queueItems) return;
  
  const upcomingTasks = AppState.tasks.slice(AppState.currentTaskIndex + 1);
  
  if (upcomingTasks.length === 0) {
    DOM.queueItems.innerHTML = '<span class="queue-item">最后一个任务啦！</span>';
  } else {
    DOM.queueItems.innerHTML = upcomingTasks.map(task => 
      `<span class="queue-item">${task.name}</span>`
    ).join('');
  }
}

function startTimers() {
  if (AppState.studyTimer) clearInterval(AppState.studyTimer);
  if (AppState.taskTimer) clearInterval(AppState.taskTimer);
  if (AppState.focusTimer) clearInterval(AppState.focusTimer);
  
  // 主计时器
  AppState.studyTimer = setInterval(() => {
    AppState.totalStudyTime++;
    if (DOM.studyTimer) {
      DOM.studyTimer.textContent = formatTime(AppState.totalStudyTime);
    }
    
    // 时间检查点反馈
    const minutes = Math.floor(AppState.totalStudyTime / 60);
    if (AppState.totalStudyTime % 60 === 0 && AI_MESSAGES.timeCheckpoints[minutes]) {
      showAIMessage(AI_MESSAGES.timeCheckpoints[minutes]);
    }
  }, 1000);
  
  // 任务计时器
  AppState.taskTimer = setInterval(() => {
    AppState.taskElapsedTime++;
    
    if (DOM.taskTimeElapsed) {
      DOM.taskTimeElapsed.textContent = formatTime(AppState.taskElapsedTime);
    }
    
    const task = AppState.currentTask;
    if (task && DOM.taskProgress) {
      const progress = Math.min((AppState.taskElapsedTime / (task.duration * 60)) * 100, 100);
      DOM.taskProgress.style.width = `${progress}%`;
      
      // 进度颜色变化
      if (progress >= 75) {
        DOM.taskProgress.classList.add('almost-done');
      }
    }
    
    // 每60秒随机鼓励
    if (AppState.taskElapsedTime % 60 === 0 && AppState.taskElapsedTime > 0) {
      if (Math.random() > 0.5) {
        showRandomEncouragement();
      }
    }
  }, 1000);
  
  // 专注度模拟计时器
  AppState.focusTimer = setInterval(() => {
    simulateFocusCheck();
  }, FOCUS_CONFIG.checkInterval);
}

// 模拟专注度检测
function simulateFocusCheck() {
  // 随机生成专注度分数
  const focusScore = FOCUS_CONFIG.minFocusScore + 
    Math.floor(Math.random() * (FOCUS_CONFIG.maxFocusScore - FOCUS_CONFIG.minFocusScore));
  
  // 更新专注状态显示
  updateFocusStatus(focusScore);
  
  // 随机触发专注提醒
  if (Math.random() < FOCUS_CONFIG.reminderChance) {
    const reminder = AI_MESSAGES.focusReminders[
      Math.floor(Math.random() * AI_MESSAGES.focusReminders.length)
    ];
    showAIMessage(reminder, 'reminder');
    triggerAvatarAnimation('remind');
  }
}

// 更新专注状态
function updateFocusStatus(score) {
  const statusDot = document.querySelector('.study-status .status-dot');
  const statusText = document.getElementById('focus-status');
  
  if (score >= 90) {
    statusDot?.classList.remove('warning');
    statusDot?.classList.add('active');
    if (statusText) statusText.textContent = '非常专注';
  } else if (score >= 75) {
    statusDot?.classList.remove('warning');
    statusDot?.classList.add('active');
    if (statusText) statusText.textContent = '专注中';
  } else {
    statusDot?.classList.remove('active');
    statusDot?.classList.add('warning');
    if (statusText) statusText.textContent = '需要专注';
  }
}

// 触发虚拟人动画
function triggerAvatarAnimation(type) {
  const avatarWrapper = document.querySelector('.study-avatar-wrapper');
  if (!avatarWrapper) return;
  
  avatarWrapper.classList.remove('shake', 'bounce', 'nod');
  
  switch(type) {
    case 'remind':
      avatarWrapper.classList.add('shake');
      break;
    case 'encourage':
      avatarWrapper.classList.add('bounce');
      break;
    case 'nod':
      avatarWrapper.classList.add('nod');
      break;
  }
  
  setTimeout(() => {
    avatarWrapper.classList.remove('shake', 'bounce', 'nod');
  }, 600);
}

function stopTimers() {
  if (AppState.studyTimer) {
    clearInterval(AppState.studyTimer);
    AppState.studyTimer = null;
  }
  if (AppState.taskTimer) {
    clearInterval(AppState.taskTimer);
    AppState.taskTimer = null;
  }
  if (AppState.focusTimer) {
    clearInterval(AppState.focusTimer);
    AppState.focusTimer = null;
  }
  
  // 停止 Coze 监督智能体
  if (typeof CozeAgent !== 'undefined') {
    CozeAgent.stopSupervisor();
  }
}

function togglePause() {
  const btn = document.getElementById('btn-pause');
  const icon = btn?.querySelector('i');
  const text = btn?.querySelector('span');
  const statusDot = document.querySelector('.study-status .status-dot');
  const statusText = document.getElementById('focus-status');
  
  if (AppState.studyTimer) {
    // 暂停
    stopTimers();
    AppState.isPaused = true;
    if (icon) icon.className = 'fa-solid fa-play';
    if (text) text.textContent = '继续';
    statusDot?.classList.remove('active');
    statusDot?.classList.add('paused');
    if (statusText) statusText.textContent = '已暂停';
    
    const pauseMsg = AI_MESSAGES.paused[Math.floor(Math.random() * AI_MESSAGES.paused.length)];
    showAIMessage(pauseMsg);
  } else {
    // 继续
    startTimers();
    AppState.isPaused = false;
    if (icon) icon.className = 'fa-solid fa-pause';
    if (text) text.textContent = '暂停';
    statusDot?.classList.remove('paused');
    statusDot?.classList.add('active');
    if (statusText) statusText.textContent = '执行中';
    
    const resumeMsg = AI_MESSAGES.resumed[Math.floor(Math.random() * AI_MESSAGES.resumed.length)];
    showAIMessage(resumeMsg);
    triggerAvatarAnimation('encourage');
  }
}

function completeCurrentTask() {
  console.warn('[completeCurrentTask] 被调用 - 这个函数不应该被调用了！');
  console.trace(); // 打印调用栈
  
  if (!AppState.currentTask) return;
  
  // 标记任务完成
  AppState.currentTask.completed = true;
  AppState.currentTask.completedAt = Date.now();
  AppState.currentTask.actualDuration = AppState.taskElapsedTime;
  
  // 显示任务完成动画
  showTaskCompleteAnimation();
  
  AppState.currentTaskIndex++;
  AppState.taskElapsedTime = 0;
  
  if (AppState.currentTaskIndex < AppState.tasks.length) {
    // 还有下一个任务
    setTimeout(() => {
      AppState.currentTask = AppState.tasks[AppState.currentTaskIndex];
      updateCurrentTaskUI();
      updateQueueUI();
      
      const msg = AI_MESSAGES.completions[Math.floor(Math.random() * AI_MESSAGES.completions.length)];
      showAIMessage(msg, 'success');
    }, 800);
  } else {
    // 所有任务完成
    setTimeout(() => {
      const allDoneMsg = AI_MESSAGES.allDone[Math.floor(Math.random() * AI_MESSAGES.allDone.length)];
      showAIMessage(allDoneMsg, 'success');
      
      setTimeout(() => {
        endStudy();
      }, 1000);
    }, 800);
  }
}

// ============================================
// V3 督学页面新功能
// ============================================

// V3 积分系统状态
let sessionPoints = 0;
let comboCount = 0;
let lastFocusTime = 0;
let tomatoCount = 0;

// V3 暂停切换
function togglePauseV3() {
  const studyPage = document.getElementById('page-study');
  const pauseBtn = document.getElementById('btn-pause-v3');
  
  AppState.isPaused = !AppState.isPaused;
  
  if (AppState.isPaused) {
    studyPage?.classList.add('paused');
    if (pauseBtn) {
      pauseBtn.classList.add('active');
      pauseBtn.querySelector('i').className = 'fa-solid fa-play';
      pauseBtn.querySelector('span').textContent = '继续';
    }
    updateTeacherEmotion('waiting');
    showAIBubble('休息一下也很重要哦~');
  } else {
    studyPage?.classList.remove('paused');
    if (pauseBtn) {
      pauseBtn.classList.remove('active');
      pauseBtn.querySelector('i').className = 'fa-solid fa-pause';
      pauseBtn.querySelector('span').textContent = '暂停';
    }
    updateTeacherEmotion('happy');
    showAIBubble('继续加油！');
  }
}

// V3 完成任务
function completeCurrentTaskV3() {
  if (!AppState.currentTask) return;
  
  // 计算积分
  const earnedPoints = Math.floor(AppState.taskElapsedTime / 60) * 2 + 10;
  sessionPoints += earnedPoints;
  tomatoCount++;
  
  // 更新积分显示
  updatePointsDisplay(earnedPoints);
  
  // 显示成就弹窗
  showAchievementPopup(earnedPoints);
  
  // 标记任务完成
  AppState.currentTask.completed = true;
  AppState.currentTask.completedAt = Date.now();
  AppState.currentTask.actualDuration = AppState.taskElapsedTime;
  
  AppState.currentTaskIndex++;
  AppState.taskElapsedTime = 0;
  
  setTimeout(() => {
    hideAchievementPopup();
    
    if (AppState.currentTaskIndex < AppState.tasks.length) {
      AppState.currentTask = AppState.tasks[AppState.currentTaskIndex];
      updateCurrentTaskUIV3();
      updateTeacherEmotion('encouraging');
      showAIBubble('太棒了！继续下一个任务吧！');
    } else {
      endStudy();
    }
  }, 2000);
}

// 跳过当前任务
function skipCurrentTask() {
  if (!AppState.currentTask) return;
  
  AppState.currentTaskIndex++;
  AppState.taskElapsedTime = 0;
  
  if (AppState.currentTaskIndex < AppState.tasks.length) {
    AppState.currentTask = AppState.tasks[AppState.currentTaskIndex];
    updateCurrentTaskUIV3();
    showAIBubble('好的，我们来做下一个任务~');
  } else {
    endStudy();
  }
}

// 更新积分显示
function updatePointsDisplay(earned) {
  if (DOM.sessionPoints) {
    DOM.sessionPoints.textContent = '+' + sessionPoints;
    DOM.pointsBadge?.classList.add('pulse');
    setTimeout(() => DOM.pointsBadge?.classList.remove('pulse'), 500);
  }
}

// 显示成就弹窗
function showAchievementPopup(points) {
  if (DOM.achievementPopup) {
    DOM.achievementPopup.style.display = 'flex';
    if (DOM.achievementPoints) {
      DOM.achievementPoints.textContent = '+' + points;
    }
  }
}

// 隐藏成就弹窗
function hideAchievementPopup() {
  if (DOM.achievementPopup) {
    DOM.achievementPopup.style.display = 'none';
  }
}

// 更新老师表情
function updateTeacherEmotion(emotion) {
  if (!DOM.teacherEmotion) return;
  
  const emotions = {
    happy: '😊',
    encouraging: '💪',
    waiting: '😴',
    concerned: '😟',
    celebrating: '🎉',
    focused: '🧐'
  };
  
  const emotionEl = DOM.teacherEmotion.querySelector('.emotion-icon');
  if (emotionEl) {
    emotionEl.textContent = emotions[emotion] || '😊';
  }
}

// 快捷回复处理
function handleQuickReply(reply) {
  if (reply === 'ok') {
    showAIBubble('好的，继续加油！');
    updateTeacherEmotion('happy');
  } else if (reply === 'rest') {
    togglePauseV3();
  }
  
  // 隐藏快捷回复
  if (DOM.quickReplies) {
    DOM.quickReplies.style.display = 'none';
    setTimeout(() => {
      DOM.quickReplies.style.display = 'flex';
    }, 5000);
  }
}

// 更新V3任务UI
function updateCurrentTaskUIV3() {
  const task = AppState.currentTask;
  if (!task) return;
  
  // 更新任务名称
  if (DOM.currentTaskName) DOM.currentTaskName.textContent = task.name;
  
  // 更新时间显示
  if (DOM.taskTimeBig) DOM.taskTimeBig.textContent = '00:00';
  if (DOM.taskTimeTotalSmall) DOM.taskTimeTotalSmall.textContent = '/ ' + formatTime(task.duration * 60);
  
  // 更新番茄计数
  if (DOM.tomatoCount) DOM.tomatoCount.textContent = '🍅 ' + tomatoCount;
  
  // 更新任务索引
  if (DOM.taskIndex) {
    DOM.taskIndex.textContent = (AppState.currentTaskIndex + 1) + '/' + AppState.tasks.length;
  }
  
  // 重置环形进度条
  updateProgressRing(0);
  
  // 更新任务指示器
  updateTaskDotsV3();
}

// 更新环形进度条
function updateProgressRing(percentage) {
  if (!DOM.progressRingFill) return;
  
  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference - (percentage / 100) * circumference;
  DOM.progressRingFill.style.strokeDashoffset = offset;
}

// 更新任务指示器V3
function updateTaskDotsV3() {
  if (!DOM.taskDots) return;
  
  DOM.taskDots.innerHTML = AppState.tasks.map((_, index) => {
    const isActive = index === AppState.currentTaskIndex;
    return `<span class="dot ${isActive ? 'active' : ''}"></span>`;
  }).join('');
}

// 更新专注度条V3
function updateFocusBarV3(focusLevel) {
  if (!DOM.focusBarFill) return;
  
  DOM.focusBarFill.style.width = focusLevel + '%';
  
  // 根据专注度改变颜色
  DOM.focusBarFill.classList.remove('warning', 'danger');
  if (focusLevel < 50) {
    DOM.focusBarFill.classList.add('danger');
    updateTeacherEmotion('concerned');
  } else if (focusLevel < 75) {
    DOM.focusBarFill.classList.add('warning');
  }
  
  // 更新连击计数
  if (focusLevel >= 80) {
    comboCount++;
    if (comboCount >= 5 && DOM.comboBadge) {
      DOM.comboBadge.style.display = 'flex';
      if (DOM.comboCount) DOM.comboCount.textContent = 'x' + comboCount;
    }
  } else {
    comboCount = 0;
    if (DOM.comboBadge) DOM.comboBadge.style.display = 'none';
  }
}

// 在计时器更新中调用V3更新函数
function updateStudyTimerV3() {
  if (AppState.isPaused) return;
  
  AppState.taskElapsedTime++;
  AppState.totalStudyTime++;
  
  // 更新时间显示
  if (DOM.studyTimer) {
    DOM.studyTimer.textContent = formatTime(AppState.totalStudyTime);
  }
  
  if (DOM.taskTimeBig) {
    DOM.taskTimeBig.textContent = formatTime(AppState.taskElapsedTime);
  }
  
  // 更新环形进度条
  if (AppState.currentTask) {
    const totalSeconds = AppState.currentTask.duration * 60;
    const percentage = Math.min(100, (AppState.taskElapsedTime / totalSeconds) * 100);
    updateProgressRing(percentage);
  }
  
  // 模拟专注度更新
  const focusLevel = 80 + Math.random() * 20;
  updateFocusBarV3(focusLevel);
  
  // 每分钟增加积分
  if (AppState.taskElapsedTime % 60 === 0) {
    sessionPoints += 1;
    updatePointsDisplay(1);
  }
}

// 任务完成动画
function showTaskCompleteAnimation() {
  const taskCard = document.getElementById('current-task-card');
  if (!taskCard) return;
  
  // 添加完成动画类
  taskCard.classList.add('task-complete-animation');
  
  // 创建星星粒子效果
  createStarParticles(taskCard);
  
  // 移除动画类
  setTimeout(() => {
    taskCard.classList.remove('task-complete-animation');
  }, 800);
}

// 创建星星粒子效果
function createStarParticles(container) {
  const rect = container.getBoundingClientRect();
  
  for (let i = 0; i < 8; i++) {
    const star = document.createElement('div');
    star.className = 'star-particle';
    star.innerHTML = '⭐';
    star.style.left = `${rect.left + rect.width / 2}px`;
    star.style.top = `${rect.top + rect.height / 2}px`;
    star.style.setProperty('--angle', `${(i * 45)}deg`);
    star.style.setProperty('--delay', `${i * 50}ms`);
    
    document.body.appendChild(star);
    
    setTimeout(() => {
      star.remove();
    }, 1000);
  }
}

function endStudy() {
  stopTimers();
  
  const completedTasks = AppState.tasks.filter(t => t.completed).length;
  const studyMinutes = Math.floor(AppState.totalStudyTime / 60);
  
  // 计算奖励星星
  const starReward = calculateStarReward(completedTasks, studyMinutes);
  const earnedStars = starReward.total;
  
  const oldLevel = AppState.user.level;
  AppState.user.stars += earnedStars;
  AppState.user.totalMissions += completedTasks;
  AppState.user.totalStudyTime += AppState.totalStudyTime;
  
  if (completedTasks === AppState.tasks.length && AppState.tasks.length > 0) {
    AppState.user.streakDays++;
    // 连续学习奖励
    if (AppState.user.streakDays >= 3) {
      AppState.user.stars += 10 * AppState.user.streakDays;
    }
  }
  
  const newLevel = updateAgentLevel();
  const leveledUp = newLevel > oldLevel;
  
  // 检查并发放成就
  checkAchievements(completedTasks, studyMinutes);
  
  // 更新完成页面
  updateCompletePageUI(studyMinutes, completedTasks, earnedStars, starReward, leveledUp);
  
  AppState.tasks = [];
  AppState.currentTask = null;
  
  saveUserData();
  navigateTo('complete');
  
  // 显示星星奖励动画
  showStarRewardAnimation(earnedStars);
}

// ==========================================
// 星星奖励系统
// ==========================================

// 奖励规则配置
const STAR_REWARDS = {
  taskComplete: 10,      // 每完成一个任务
  minuteStudy: 2,        // 每学习一分钟
  allTasksComplete: 20,  // 完成所有任务奖励
  focusBonus: 15,        // 专注度>90%奖励
  streakBonus: {         // 连续学习奖励
    3: 30,
    5: 50,
    7: 100,
    14: 200,
    30: 500
  }
};

// 计算星星奖励
function calculateStarReward(completedTasks, studyMinutes) {
  const taskReward = completedTasks * STAR_REWARDS.taskComplete;
  const timeReward = studyMinutes * STAR_REWARDS.minuteStudy;
  const allCompleteBonus = (completedTasks === AppState.tasks.length && AppState.tasks.length > 0) 
    ? STAR_REWARDS.allTasksComplete : 0;
  
  // 专注度奖励（基于模拟值）
  const focusScore = 80 + Math.random() * 18;
  AppState.focusScore = focusScore;
  const focusBonus = focusScore >= 90 ? STAR_REWARDS.focusBonus : 0;
  
  // 连续天数奖励
  let streakBonus = 0;
  for (const [days, bonus] of Object.entries(STAR_REWARDS.streakBonus)) {
    if (AppState.user.streakDays >= parseInt(days)) {
      streakBonus = bonus;
    }
  }
  
  return {
    taskReward,
    timeReward,
    allCompleteBonus,
    focusBonus,
    streakBonus,
    total: taskReward + timeReward + allCompleteBonus + focusBonus + streakBonus
  };
}

// 更新完成页面UI
function updateCompletePageUI(studyMinutes, completedTasks, earnedStars, starReward, leveledUp) {
  if (DOM.completeStats.duration) DOM.completeStats.duration.textContent = studyMinutes;
  if (DOM.completeStats.tasks) DOM.completeStats.tasks.textContent = completedTasks;
  if (DOM.completeStats.focus) DOM.completeStats.focus.textContent = `${Math.floor(AppState.focusScore)}%`;
  if (DOM.completeStats.stars) DOM.completeStats.stars.textContent = `+${earnedStars}`;
  
  // 显示奖励明细
  const rewardBreakdown = document.getElementById('reward-breakdown');
  if (rewardBreakdown) {
    let breakdownHTML = '';
    if (starReward.taskReward > 0) breakdownHTML += `<div class="reward-item"><span>任务完成</span><span>+${starReward.taskReward}</span></div>`;
    if (starReward.timeReward > 0) breakdownHTML += `<div class="reward-item"><span>学习时长</span><span>+${starReward.timeReward}</span></div>`;
    if (starReward.allCompleteBonus > 0) breakdownHTML += `<div class="reward-item bonus"><span>全部完成</span><span>+${starReward.allCompleteBonus}</span></div>`;
    if (starReward.focusBonus > 0) breakdownHTML += `<div class="reward-item bonus"><span>专注之星</span><span>+${starReward.focusBonus}</span></div>`;
    if (starReward.streakBonus > 0) breakdownHTML += `<div class="reward-item bonus"><span>连续学习</span><span>+${starReward.streakBonus}</span></div>`;
    rewardBreakdown.innerHTML = breakdownHTML;
  }
  
  // 升级提示
  const levelUpNotice = document.getElementById('level-up-notice');
  const newLevelName = document.getElementById('new-level');
  if (levelUpNotice && newLevelName && leveledUp) {
    newLevelName.textContent = AppState.user.levelName;
    levelUpNotice.style.display = 'flex';
  } else if (levelUpNotice) {
    levelUpNotice.style.display = 'none';
  }
}

// 星星奖励动画
function showStarRewardAnimation(stars) {
  const rewardStars = document.getElementById('reward-stars');
  if (!rewardStars) return;
  
  // 数字滚动动画
  let current = 0;
  const target = stars;
  const duration = 1500;
  const startTime = performance.now();
  
  function animate(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // 缓出效果
    const easeOut = 1 - Math.pow(1 - progress, 3);
    current = Math.floor(easeOut * target);
    
    rewardStars.textContent = `+${current}`;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      rewardStars.textContent = `+${target}`;
      // 添加完成动画
      rewardStars.classList.add('complete');
      setTimeout(() => rewardStars.classList.remove('complete'), 500);
    }
  }
  
  requestAnimationFrame(animate);
}

// 消费星星
function spendStars(amount, reason) {
  if (AppState.user.stars < amount) {
    return { success: false, message: '星星不足' };
  }
  
  AppState.user.stars -= amount;
  
  // 记录消费历史
  const record = {
    type: 'spend',
    amount: amount,
    reason: reason,
    date: Date.now(),
    balance: AppState.user.stars
  };
  
  // 保存消费记录
  const history = JSON.parse(localStorage.getItem('ai_study_star_history') || '[]');
  history.push(record);
  localStorage.setItem('ai_study_star_history', JSON.stringify(history));
  
  saveUserData();
  updateUI();
  
  return { success: true, balance: AppState.user.stars };
}

// 获取星星历史
function getStarHistory() {
  return JSON.parse(localStorage.getItem('ai_study_star_history') || '[]');
}

// ==========================================
// 成就系统
// ==========================================

// 成就定义
const ACHIEVEMENTS = {
  // 新手成就
  firstMission: {
    id: 'firstMission',
    name: '初次出击',
    desc: '完成第一个任务',
    icon: '🎯',
    category: 'beginner',
    target: 1,
    getValue: (user) => user.totalMissions,
    condition: (user) => user.totalMissions >= 1,
    reward: 20
  },
  firstHour: {
    id: 'firstHour',
    name: '一小时特工',
    desc: '累计学习1小时',
    icon: '⏰',
    category: 'beginner',
    target: 60,
    getValue: (user) => Math.floor(user.totalStudyTime / 60),
    condition: (user) => user.totalStudyTime >= 3600,
    reward: 50
  },
  
  // 连续学习成就
  streak3: {
    id: 'streak3',
    name: '三连胜',
    desc: '连续3天完成任务',
    icon: '🔥',
    category: 'streak',
    target: 3,
    getValue: (user) => user.streakDays,
    condition: (user) => user.streakDays >= 3,
    reward: 100
  },
  streak7: {
    id: 'streak7',
    name: '周冠军',
    desc: '连续7天完成任务',
    icon: '🏆',
    category: 'streak',
    target: 7,
    getValue: (user) => user.streakDays,
    condition: (user) => user.streakDays >= 7,
    reward: 200
  },
  streak14: {
    id: 'streak14',
    name: '双周达人',
    desc: '连续14天完成任务',
    icon: '💪',
    category: 'streak',
    target: 14,
    getValue: (user) => user.streakDays,
    condition: (user) => user.streakDays >= 14,
    reward: 400
  },
  streak30: {
    id: 'streak30',
    name: '月度之星',
    desc: '连续30天完成任务',
    icon: '🌟',
    category: 'streak',
    target: 30,
    getValue: (user) => user.streakDays,
    condition: (user) => user.streakDays >= 30,
    reward: 1000
  },
  
  // 任务量成就
  missions10: {
    id: 'missions10',
    name: '小能手',
    desc: '累计完成10个任务',
    icon: '📝',
    category: 'mission',
    target: 10,
    getValue: (user) => user.totalMissions,
    condition: (user) => user.totalMissions >= 10,
    reward: 80
  },
  missions50: {
    id: 'missions50',
    name: '任务高手',
    desc: '累计完成50个任务',
    icon: '📋',
    category: 'mission',
    target: 50,
    getValue: (user) => user.totalMissions,
    condition: (user) => user.totalMissions >= 50,
    reward: 200
  },
  missions100: {
    id: 'missions100',
    name: '百战精英',
    desc: '累计完成100个任务',
    icon: '🎖️',
    category: 'mission',
    target: 100,
    getValue: (user) => user.totalMissions,
    condition: (user) => user.totalMissions >= 100,
    reward: 500
  },
  
  // 学习时长成就
  time5h: {
    id: 'time5h',
    name: '勤奋学生',
    desc: '累计学习5小时',
    icon: '📚',
    category: 'time',
    target: 300,
    getValue: (user) => Math.floor(user.totalStudyTime / 60),
    condition: (user) => user.totalStudyTime >= 5 * 3600,
    reward: 150
  },
  time20h: {
    id: 'time20h',
    name: '学霸初成',
    desc: '累计学习20小时',
    icon: '🎓',
    category: 'time',
    target: 1200,
    getValue: (user) => Math.floor(user.totalStudyTime / 60),
    condition: (user) => user.totalStudyTime >= 20 * 3600,
    reward: 500
  },
  time50h: {
    id: 'time50h',
    name: '超级学霸',
    desc: '累计学习50小时',
    icon: '👑',
    category: 'time',
    target: 3000,
    getValue: (user) => Math.floor(user.totalStudyTime / 60),
    condition: (user) => user.totalStudyTime >= 50 * 3600,
    reward: 1000
  },
  
  // 专注度成就
  focusMaster: {
    id: 'focusMaster',
    name: '专注大师',
    desc: '单次学习专注度95%+',
    icon: '🧠',
    category: 'focus',
    condition: (user, focusScore) => focusScore >= 95,
    reward: 100
  },
  focus5Times: {
    id: 'focus5Times',
    name: '心如止水',
    desc: '5次专注度超过90%',
    icon: '🎯',
    category: 'focus',
    condition: (user) => (user.highFocusCount || 0) >= 5,
    reward: 200
  },
  
  // 等级成就
  levelElite: {
    id: 'levelElite',
    name: '精英特工',
    desc: '达到精英特工等级',
    icon: '🏅',
    category: 'level',
    condition: (user) => user.level >= 4,
    reward: 300
  },
  levelLegend: {
    id: 'levelLegend',
    name: '传奇特工',
    desc: '达到传奇特工等级',
    icon: '👑',
    category: 'level',
    condition: (user) => user.level >= 6,
    reward: 1000
  },
  
  // 科目成就
  mathExpert: {
    id: 'mathExpert',
    name: '数学小达人',
    desc: '完成10个数学任务',
    icon: '🔢',
    category: 'subject',
    condition: (user) => (user.subjectCount?.math || 0) >= 10,
    reward: 150
  },
  chineseExpert: {
    id: 'chineseExpert',
    name: '语文小达人',
    desc: '完成10个语文任务',
    icon: '📖',
    category: 'subject',
    condition: (user) => (user.subjectCount?.chinese || 0) >= 10,
    reward: 150
  },
  englishExpert: {
    id: 'englishExpert',
    name: '英语小达人',
    desc: '完成10个英语任务',
    icon: '🔤',
    category: 'subject',
    condition: (user) => (user.subjectCount?.english || 0) >= 10,
    reward: 150
  },
  
  // 特殊成就
  earlyBird: {
    id: 'earlyBird',
    name: '早起小鸟',
    desc: '早上7点前开始学习',
    icon: '🌅',
    category: 'special',
    condition: (user) => user.earlyBirdCount >= 1,
    reward: 80
  },
  nightOwl: {
    id: 'nightOwl',
    name: '夜猫子',
    desc: '晚上10点后完成任务',
    icon: '🦉',
    category: 'special',
    condition: (user) => user.nightOwlCount >= 1,
    reward: 80
  },
  weekendWarrior: {
    id: 'weekendWarrior',
    name: '周末战士',
    desc: '在周末完成5个任务',
    icon: '⚔️',
    category: 'special',
    condition: (user) => (user.weekendTasks || 0) >= 5,
    reward: 120
  },
  perfectWeek: {
    id: 'perfectWeek',
    name: '完美一周',
    desc: '一周内每天都完成任务',
    icon: '✨',
    category: 'special',
    condition: (user) => user.perfectWeeks >= 1,
    reward: 300
  },
  
  // 积分成就
  stars500: {
    id: 'stars500',
    name: '小富翁',
    desc: '累计获得500积分',
    icon: '💰',
    category: 'stars',
    condition: (user) => user.totalStarsEarned >= 500,
    reward: 50
  },
  stars2000: {
    id: 'stars2000',
    name: '大富翁',
    desc: '累计获得2000积分',
    icon: '💎',
    category: 'stars',
    condition: (user) => user.totalStarsEarned >= 2000,
    reward: 200
  },
  stars5000: {
    id: 'stars5000',
    name: '积分之王',
    desc: '累计获得5000积分',
    icon: '👑',
    category: 'stars',
    condition: (user) => user.totalStarsEarned >= 5000,
    reward: 500
  }
};

// 成就分类
const ACHIEVEMENT_CATEGORIES = {
  beginner: { name: '新手入门', icon: '🌱', color: '#10B981' },
  streak: { name: '坚持不懈', icon: '🔥', color: '#F59E0B' },
  mission: { name: '任务达人', icon: '📋', color: '#3B82F6' },
  time: { name: '时间管理', icon: '⏰', color: '#8B5CF6' },
  focus: { name: '专注力量', icon: '🧠', color: '#EC4899' },
  level: { name: '等级提升', icon: '🏅', color: '#F97316' },
  subject: { name: '学科专家', icon: '📚', color: '#06B6D4' },
  special: { name: '特殊成就', icon: '✨', color: '#EF4444' },
  stars: { name: '积分奖励', icon: '💰', color: '#FBBF24' }
};

// 检查并发放成就
function checkAchievements(completedTasks = 0, studyMinutes = 0) {
  const newAchievements = [];
  const focusScore = AppState.focusScore || 0;
  
  for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
    // 跳过已获得的成就
    if (AppState.user.achievements.includes(achievement.id)) {
      continue;
    }
    
    // 检查条件
    let conditionMet = false;
    if (achievement.id === 'focusMaster') {
      conditionMet = achievement.condition(AppState.user, focusScore);
    } else {
      conditionMet = achievement.condition(AppState.user);
    }
    
    if (conditionMet) {
      // 解锁成就
      AppState.user.achievements.push(achievement.id);
      AppState.user.stars += achievement.reward;
      newAchievements.push(achievement);
    }
  }
  
  // 显示成就解锁动画
  if (newAchievements.length > 0) {
    showAchievementUnlock(newAchievements);
  }
  
  return newAchievements;
}

// 显示成就解锁动画
function showAchievementUnlock(achievements) {
  achievements.forEach((achievement, index) => {
    setTimeout(() => {
      showAchievementToast(achievement);
    }, index * 1500);
  });
}

// 成就提示
function showAchievementToast(achievement) {
  // 创建提示元素
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="achievement-icon">${achievement.icon}</div>
    <div class="achievement-info">
      <div class="achievement-title">成就解锁!</div>
      <div class="achievement-name">${achievement.name}</div>
      <div class="achievement-reward">+${achievement.reward} ⭐</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // 动画显示
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // 自动消失
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 获取所有成就状态
function getAllAchievements() {
  return Object.values(ACHIEVEMENTS).map(achievement => {
    const unlocked = AppState.user.achievements.includes(achievement.id);
    let progress = 0;
    let current = 0;
    
    if (achievement.getValue && achievement.target) {
      current = achievement.getValue(AppState.user) || 0;
      progress = Math.min(100, Math.floor((current / achievement.target) * 100));
    }
    
    const category = ACHIEVEMENT_CATEGORIES[achievement.category] || { name: '其他', icon: '🏆', color: '#6B7280' };
    
    return {
    ...achievement,
      unlocked,
      progress,
      current,
      categoryInfo: category
    };
  });
}

// 获取成就统计
function getAchievementStats() {
  const total = Object.keys(ACHIEVEMENTS).length;
  const unlocked = AppState.user.achievements.length;
  const totalReward = AppState.user.achievements.reduce((sum, id) => {
    return sum + (ACHIEVEMENTS[id]?.reward || 0);
  }, 0);
  
  return { total, unlocked, totalReward };
}

// ==========================================
// 添加任务弹窗
// ==========================================
function openAddTaskModal() {
  // 重置编辑状态
  AppState.editingTaskIndex = null;
  
  // 重置表单状态
  const nameInput = document.getElementById('input-task-name');
  const materialGroup = document.getElementById('material-upload-group');
  const placeholder = document.getElementById('upload-placeholder');
  const preview = document.getElementById('upload-preview');
  const previewImg = document.getElementById('material-preview-img');
  const fileInput = document.getElementById('material-file-input');
  
  if (nameInput) nameInput.value = '';
  if (materialGroup) materialGroup.style.display = 'none';
  if (placeholder) placeholder.style.display = 'flex';
  if (preview) preview.style.display = 'none';
  if (previewImg) previewImg.src = '';
  if (fileInput) fileInput.value = '';
  
  // 重置模式选择到默认
  const modeBtns = document.querySelectorAll('.mode-btn');
  modeBtns.forEach(btn => {
    if (btn.dataset.mode === 'homework') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // 重置时间和科目选择到默认
  const timeBtns = document.querySelectorAll('.time-btn');
  timeBtns.forEach(btn => {
    if (btn.dataset.time === '20') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  const typeBtns = document.querySelectorAll('.type-btn');
  typeBtns.forEach(btn => {
    if (btn.dataset.type === '语文') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  AppState.selectedTaskMode = 'homework';
  AppState.tempMaterial = null;
  
  // 更新弹窗标题和按钮
  const modalTitle = document.querySelector('#modal-add-task .modal-header h2');
  const saveBtn = document.getElementById('btn-save-task');
  if (modalTitle) modalTitle.textContent = '添加特工任务';
  if (saveBtn) saveBtn.textContent = '添加任务';
  
  DOM.modalAddTask?.classList.add('active');
}

function closeAddTaskModal() {
  AppState.tempMaterial = null;
  DOM.modalAddTask?.classList.remove('active');
}

function initTimeBtns() {
  const btns = document.querySelectorAll('.time-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function initTypeBtns() {
  const btns = document.querySelectorAll('.type-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// 初始化任务模式选择按钮
function initModeBtns() {
  const btns = document.querySelectorAll('.mode-btn');
  const materialGroup = document.getElementById('material-upload-group');
  
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const mode = btn.dataset.mode;
      AppState.selectedTaskMode = mode;
      
      // 背诵/听写模式显示材料上传区域
      if (materialGroup) {
        if (mode === 'recite' || mode === 'dictation') {
          materialGroup.style.display = 'block';
        } else {
          materialGroup.style.display = 'none';
        }
      }
    });
  });
}

// 初始化材料上传功能（添加任务弹窗内）
function initMaterialUpload() {
  const uploadArea = document.getElementById('material-upload-area');
  const fileInput = document.getElementById('material-file-input');
  const placeholder = document.getElementById('upload-placeholder');
  const preview = document.getElementById('upload-preview');
  const previewImg = document.getElementById('material-preview-img');
  const removeBtn = document.getElementById('btn-remove-material');
  
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          AppState.tempMaterial = event.target.result;
          if (previewImg) previewImg.src = event.target.result;
          if (placeholder) placeholder.style.display = 'none';
          if (preview) preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      AppState.tempMaterial = null;
      if (fileInput) fileInput.value = '';
      if (previewImg) previewImg.src = '';
      if (placeholder) placeholder.style.display = 'flex';
      if (preview) preview.style.display = 'none';
    });
  }
}

// 初始化材料上传弹窗
function initMaterialUploadModal() {
  const modal = document.getElementById('modal-material-upload');
  const closeBtn = document.getElementById('modal-material-close');
  const cameraBtn = document.getElementById('btn-material-camera');
  const galleryBtn = document.getElementById('btn-material-gallery');
  const fileInput = document.getElementById('material-modal-file-input');
  const previewArea = document.getElementById('material-modal-preview');
  const previewImg = document.getElementById('material-modal-preview-img');
  const changeBtn = document.getElementById('btn-change-material');
  const skipBtn = document.getElementById('btn-skip-material');
  const confirmBtn = document.getElementById('btn-confirm-material');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMaterialModal);
  }
  
  if (cameraBtn) {
    cameraBtn.addEventListener('click', () => {
      if (fileInput) {
        fileInput.setAttribute('capture', 'environment');
        fileInput.click();
      }
    });
  }
  
  if (galleryBtn) {
    galleryBtn.addEventListener('click', () => {
      if (fileInput) {
        fileInput.removeAttribute('capture');
        fileInput.click();
      }
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          AppState.tempMaterial = event.target.result;
          if (previewImg) previewImg.src = event.target.result;
          if (previewArea) previewArea.style.display = 'block';
          if (confirmBtn) confirmBtn.disabled = false;
          
          // 隐藏上传按钮
          const uploadBtns = document.querySelector('.material-upload-buttons');
          if (uploadBtns) uploadBtns.style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      if (fileInput) {
        fileInput.removeAttribute('capture');
        fileInput.click();
      }
    });
  }
  
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      // 跳过当前任务
      if (AppState.tasks.length > 1) {
        AppState.tasks.shift();
        closeMaterialModal();
        startStudySession();
      } else {
        closeMaterialModal();
        showToast('没有其他任务了', 'info');
      }
    });
  }
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      // 保存材料到当前任务（使用当前任务索引）
      const currentTask = AppState.tasks[AppState.currentTaskIndex];
      if (currentTask && AppState.tempMaterial) {
        // 显示加载状态
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 识别中...';
        
        // 调用内容提取智能体
        try {
          if (typeof CozeAgent !== 'undefined' && CozeAgent.extractContentFromImage) {
            const result = await CozeAgent.extractContentFromImage(AppState.tempMaterial);
            console.log('[Material] 内容提取结果:', result);
            
            if (result.success && result.content) {
        currentTask.material = {
          image: AppState.tempMaterial,
                text: result.content,
                type: result.type || 'text',
                lines: result.lines || [],
                words: result.words || result.lines || [],
          uploaded: true
        };
              showToast('内容识别成功！', 'success');
            } else {
              // 识别失败，仍保存图片
              currentTask.material = {
                image: AppState.tempMaterial,
                uploaded: true,
                extractFailed: true
              };
              showToast('图片已保存，但内容识别可能不完整', 'warning');
            }
          } else {
            // 没有CozeAgent，直接保存图片
            currentTask.material = {
              image: AppState.tempMaterial,
              uploaded: true
            };
          }
        } catch (error) {
          console.error('[Material] 内容提取失败:', error);
          currentTask.material = {
            image: AppState.tempMaterial,
            uploaded: true,
            extractFailed: true
          };
        }
        
        saveUserData();
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> 确认';
      }
      closeMaterialModal();
      continueStudySession();
    });
  }
}

// 打开材料上传弹窗
function showMaterialUploadModal(task) {
  const modal = document.getElementById('modal-material-upload');
  const titleEl = document.getElementById('material-modal-title');
  const taskNameEl = document.getElementById('material-task-name');
  const hintEl = document.getElementById('material-hint');
  const iconEl = document.querySelector('.modal-icon-header i');
  const previewArea = document.getElementById('material-modal-preview');
  const uploadBtns = document.querySelector('.material-upload-buttons');
  const confirmBtn = document.getElementById('btn-confirm-material');
  
  // 重置状态
  AppState.tempMaterial = null;
  if (previewArea) previewArea.style.display = 'none';
  if (uploadBtns) uploadBtns.style.display = 'flex';
  if (confirmBtn) confirmBtn.disabled = true;
  
  // 设置内容
  if (task.mode === 'recite') {
    if (titleEl) titleEl.textContent = '需要上传背诵内容';
    if (hintEl) hintEl.textContent = '请上传需要背诵的内容图片，AI将帮助你练习';
    if (iconEl) iconEl.className = 'fa-solid fa-microphone';
  } else if (task.mode === 'dictation') {
    if (titleEl) titleEl.textContent = '需要上传听写内容';
    if (hintEl) hintEl.textContent = '请上传需要听写的词语图片，AI将为你朗读';
    if (iconEl) iconEl.className = 'fa-solid fa-pen';
  }
  
  if (taskNameEl) taskNameEl.textContent = `当前任务：${task.name}`;
  
  if (modal) modal.classList.add('active');
}

// 关闭材料上传弹窗
function closeMaterialModal() {
  const modal = document.getElementById('modal-material-upload');
  if (modal) modal.classList.remove('active');
}

function saveTask() {
  const nameInput = document.getElementById('input-task-name');
  const name = nameInput?.value?.trim();
  
  if (!name) {
    alert('请输入任务名称');
    return;
  }
  
  const activeTimeBtn = document.querySelector('.time-btn.active');
  const activeTypeBtn = document.querySelector('.type-btn.active');
  const activeModeBtn = document.querySelector('.mode-btn.active');
  
  const duration = parseInt(activeTimeBtn?.dataset.time || '20');
  const subject = activeTypeBtn?.dataset.type || '其他';
  const mode = activeModeBtn?.dataset.mode || 'homework';
  
  // 检查是否是编辑模式
  if (AppState.editingTaskIndex !== undefined && AppState.editingTaskIndex !== null) {
    // 更新现有任务
    const task = AppState.tasks[AppState.editingTaskIndex];
    if (task) {
      task.name = name;
      task.subject = subject;
      task.duration = duration;
      task.mode = mode;
      task.updatedAt = Date.now();
      
      // 更新材料
      if (AppState.tempMaterial) {
        task.material = {
          image: AppState.tempMaterial,
          uploaded: true
        };
      }
    }
    AppState.editingTaskIndex = null;
  } else {
    // 创建新任务
    const newTask = {
      id: Date.now(),
      name: name,
      subject: subject,
      duration: duration,
      mode: mode,
      completed: false,
      createdAt: Date.now(),
      material: AppState.tempMaterial ? {
        image: AppState.tempMaterial,
        uploaded: true
      } : null
    };
    
    AppState.tasks.push(newTask);
  }
  
  // 重置临时材料
  AppState.tempMaterial = null;
  
  saveUserData();
  
  if (nameInput) nameInput.value = '';
  
  // 重置保存按钮文本
  const saveBtn = document.getElementById('btn-save-task');
  if (saveBtn) saveBtn.textContent = '添加任务';
  
  closeAddTaskModal();
  updateUI();
}

// ==========================================
// 充值弹窗
// ==========================================
function openRechargeModal() {
  DOM.modalRecharge?.classList.add('active');
}

function closeRechargeModal() {
  DOM.modalRecharge?.classList.remove('active');
}

// ==========================================
// 工具函数
// ==========================================
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showAIMessage(message, type = 'normal') {
  const bubble = document.getElementById('speech-bubble');
  if (!bubble || !DOM.aiMessage) return;
  
  // 添加消息类型样式
  bubble.className = 'speech-bubble';
  if (type === 'reminder') {
    bubble.classList.add('reminder');
  } else if (type === 'success') {
    bubble.classList.add('success');
  }
  
  // 动画效果
  bubble.classList.remove('animate');
  void bubble.offsetWidth; // 强制重绘
  bubble.classList.add('animate');
  
  DOM.aiMessage.textContent = message;
  
  // 鼓励时触发虚拟人动画
  if (type === 'success') {
    triggerAvatarAnimation('encourage');
  }
}

function showRandomEncouragement() {
  const messages = AI_MESSAGES.encouragements;
  const randomIndex = Math.floor(Math.random() * messages.length);
  showAIMessage(messages[randomIndex]);
  
  // 随机触发点头动画
  if (Math.random() > 0.6) {
    triggerAvatarAnimation('nod');
  }
}

function shareResult() {
  if (navigator.share) {
    navigator.share({
      title: 'AI督学 - 特工任务完成',
      text: `我在AI督学完成了今日特工任务，获得了${DOM.completeStats.stars?.textContent || '+50'}特工积分！`,
      url: window.location.href
    });
  } else {
    alert('分享功能开发中~');
  }
}

// ==========================================
// 引导流程
// ==========================================
function initOnboarding() {
  // 介绍页事件
  document.getElementById('btn-intro-next')?.addEventListener('click', handleIntroNext);
  document.getElementById('btn-skip-intro')?.addEventListener('click', skipToInterview);
  
  // 面谈跳过按钮
  document.getElementById('btn-skip-interview')?.addEventListener('click', skipToContract);
  
  // 滑动点击 (支持新版和旧版类名)
  document.querySelectorAll('.intro-dot, .intro-dot-new').forEach(dot => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.dataset.index);
      goToSlide(index);
    });
  });
  
  // 面谈输入
  document.getElementById('interview-send-btn')?.addEventListener('click', handleInterviewSend);
  document.getElementById('interview-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleInterviewSend();
  });
  
  // 输入模式切换
  document.getElementById('btn-switch-keyboard')?.addEventListener('click', () => {
    switchInputMode('keyboard');
  });
  document.getElementById('btn-switch-voice')?.addEventListener('click', () => {
    switchInputMode('voice');
  });
  
  // 语音按钮
  const voiceBtn = document.getElementById('btn-voice-hold');
  if (voiceBtn) {
    voiceBtn.addEventListener('touchstart', startVoiceRecording);
    voiceBtn.addEventListener('touchend', stopVoiceRecording);
    voiceBtn.addEventListener('mousedown', startVoiceRecording);
    voiceBtn.addEventListener('mouseup', stopVoiceRecording);
    voiceBtn.addEventListener('mouseleave', stopVoiceRecording);
  }
  
  // 快捷选项按钮事件委托
  document.getElementById('quick-options')?.addEventListener('click', (e) => {
    // 处理快捷选项按钮
    const quickBtn = e.target.closest('.btn-quick-opt');
    if (quickBtn) {
      const value = quickBtn.dataset.value;
      const question = INTERVIEW_QUESTIONS[OnboardingState.currentQuestion];
      if (question && question.field) {
        handleQuickSelect(value, question.field);
      }
      return;
    }
    
    // 处理操作按钮（签订契约）
    const actionBtn = e.target.closest('.btn-action-go');
    if (actionBtn) {
      goToContract();
    }
  });
  
  // 签约按钮
  document.getElementById('btn-sign-contract')?.addEventListener('click', signContract);
  
  // 触摸滑动支持
  initSwipeGesture();
}

function initSwipeGesture() {
  const wrapper = document.getElementById('intro-slides');
  if (!wrapper) return;
  
  let startX = 0;
  let isDragging = false;
  
  wrapper.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  });
  
  wrapper.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0 && OnboardingState.currentSlide < 2) {
        goToSlide(OnboardingState.currentSlide + 1);
      } else if (diff < 0 && OnboardingState.currentSlide > 0) {
        goToSlide(OnboardingState.currentSlide - 1);
      }
    }
  });
}

function goToSlide(index) {
  OnboardingState.currentSlide = index;
  
  const wrapper = document.getElementById('intro-slides-wrapper');
  if (wrapper) {
    // Each slide is 1/3 of wrapper, so we move by 1/3 each time (33.333%)
    wrapper.style.transform = `translateX(-${index * 33.333}%)`;
  }
  
  // 更新指示器 (支持新版和旧版类名)
  document.querySelectorAll('.intro-dot, .intro-dot-new').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
  
  // 更新按钮文字
  const btnText = document.getElementById('btn-intro-text');
  if (btnText) {
    if (index === 2) {
      btnText.textContent = '认识小影老师';
    } else {
      btnText.textContent = '继续了解';
    }
  }
}

function handleIntroNext() {
  if (OnboardingState.currentSlide < 2) {
    goToSlide(OnboardingState.currentSlide + 1);
  } else {
    startInterview();
  }
}

function skipToInterview() {
  // 跳过介绍页，进入面谈页面
  startInterview();
}

function skipToContract() {
  // 设置默认值
  if (!OnboardingState.userData.nickname) {
    OnboardingState.userData.nickname = '小特工';
  }
  goToContract();
}

// 更新进度指示器
function updateProgressIndicator(step) {
  const steps = document.querySelectorAll('.progress-step');
  const lines = document.querySelectorAll('.progress-line');
  
  steps.forEach((stepEl, index) => {
    const stepNum = index + 1;
    stepEl.classList.remove('active', 'completed');
    
    if (stepNum < step) {
      stepEl.classList.add('completed');
    } else if (stepNum === step) {
      stepEl.classList.add('active');
    }
  });
  
  lines.forEach((line, index) => {
    line.classList.toggle('active', index < step - 1);
  });
}

function startInterview() {
  OnboardingState.stage = 'interview';
  
  // 切换显示
  document.getElementById('intro-slides')?.classList.remove('active');
  const interviewSection = document.getElementById('interview-section');
  if (interviewSection) {
    interviewSection.classList.add('active');
  }
  
  // 清空对话区域
  const chat = document.getElementById('interview-chat');
  if (chat) chat.innerHTML = '';
  
  // 开始对话
  OnboardingState.currentQuestion = 0;
  setTimeout(() => showNextQuestion(), 600);
}

// 流式输出文字
function typeText(element, text, callback) {
  let index = 0;
  const speed = 50; // 每个字符的打字速度（毫秒）
  
  // 添加光标
  element.innerHTML = '<span class="typing-cursor"></span>';
  
  function type() {
    if (index < text.length) {
      // 移除光标，添加字符，再添加光标
      const currentText = text.substring(0, index + 1);
      element.innerHTML = currentText + '<span class="typing-cursor"></span>';
      index++;
      setTimeout(type, speed);
    } else {
      // 完成后移除光标
      element.innerHTML = text;
      if (callback) callback();
    }
  }
  
  type();
}

function showNextQuestion() {
  const questionIndex = OnboardingState.currentQuestion;
  if (questionIndex >= INTERVIEW_QUESTIONS.length) return;
  
  const question = INTERVIEW_QUESTIONS[questionIndex];
  const bubbleText = document.getElementById('bubble-text');
  const inputArea = document.getElementById('interview-input-area');
  const quickOptions = document.getElementById('quick-options');
  const voiceBar = document.getElementById('voice-input-bar');
  const keyboardBar = document.getElementById('keyboard-input-bar');
  
  // 隐藏输入区域
  if (inputArea) inputArea.classList.remove('active');
  if (quickOptions) quickOptions.innerHTML = '';
  
  // 替换模板变量
  let text = question.text.replace('{nickname}', OnboardingState.userData.nickname || '小朋友');
  
  // 显示打字中状态
  if (bubbleText) {
    bubbleText.innerHTML = '<span class="typing-cursor"></span>';
  }
  
  // 短暂延迟后开始流式输出
  const startDelay = question.delay || 500;
  
  setTimeout(() => {
    // 流式输出文字
    typeText(bubbleText, text, () => {
      // 文字输出完成后显示输入区域
      showInputForQuestion(question);
    });
  }, startDelay);
}

function showInputForQuestion(question) {
  const inputArea = document.getElementById('interview-input-area');
  const quickOptions = document.getElementById('quick-options');
  const voiceBar = document.getElementById('voice-input-bar');
  const keyboardBar = document.getElementById('keyboard-input-bar');
  
    if (question.type === 'input') {
    if (inputArea) inputArea.classList.add('active');
    if (quickOptions) quickOptions.innerHTML = '';
    if (voiceBar) voiceBar.style.display = 'flex';
    if (keyboardBar) keyboardBar.style.display = 'none';
    
        const input = document.getElementById('interview-input');
    if (input) input.placeholder = question.placeholder || '输入回复...';
    
  } else if (question.type === 'quick') {
    // 快捷选项 + 按住说话
    if (inputArea) inputArea.classList.add('active');
    if (voiceBar) voiceBar.style.display = 'flex';
    if (keyboardBar) keyboardBar.style.display = 'none';
    
    // 生成3个快捷按钮
    if (quickOptions && question.options) {
      quickOptions.innerHTML = question.options.map(opt => 
        `<button class="btn-quick-opt" data-value="${opt}">${opt}</button>`
        ).join('');
      }
    
    } else if (question.type === 'action') {
    if (inputArea) inputArea.classList.add('active');
    if (voiceBar) voiceBar.style.display = 'none';
    if (keyboardBar) keyboardBar.style.display = 'none';
    
    // 显示操作按钮
    if (quickOptions) {
      quickOptions.innerHTML = `<button class="btn-action-go" id="btn-go-contract">
        签订特工契约 →
      </button>`;
    }
    
    } else {
      // 纯消息，自动进入下一个
    if (inputArea) inputArea.classList.remove('active');
      
      OnboardingState.currentQuestion++;
    setTimeout(() => showNextQuestion(), 600);
    }
}

function showTypingIndicator() {
  const chat = document.getElementById('interview-chat');
  if (!chat) return;
  
  const typing = document.createElement('div');
  typing.className = 'chat-message ai';
  typing.id = 'typing-indicator';
  typing.innerHTML = `
    <div class="message-bubble">
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;
}

function hideTypingIndicator() {
  const typing = document.getElementById('typing-indicator');
  if (typing) typing.remove();
}

function addAIMessage(text) {
  const chat = document.getElementById('interview-chat');
  if (!chat) return;
  
  const message = document.createElement('div');
  message.className = 'chat-message ai';
  message.innerHTML = `<div class="message-bubble">${text}</div>`;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function addUserMessage(text) {
  const chat = document.getElementById('interview-chat');
  if (!chat) return;
  
  const message = document.createElement('div');
  message.className = 'chat-message user';
  message.innerHTML = `<div class="message-bubble">${text}</div>`;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function handleInterviewSend() {
  const input = document.getElementById('interview-input');
  const value = input?.value?.trim();
  
  if (!value) return;
  
  const question = INTERVIEW_QUESTIONS[OnboardingState.currentQuestion];
  if (question && question.field) {
    OnboardingState.userData[question.field] = value;
  }
  
  // 不显示用户消息，直接进入下一步
  if (input) input.value = '';
  
  OnboardingState.currentQuestion++;
  setTimeout(() => showNextQuestion(), 300);
}

// 快捷选项点击
function handleQuickSelect(value, field) {
  if (field) {
    OnboardingState.userData[field] = value;
  }
  
  // 清空快捷选项
  const quickOptions = document.getElementById('quick-options');
  if (quickOptions) quickOptions.innerHTML = '';
  
  OnboardingState.currentQuestion++;
  setTimeout(() => showNextQuestion(), 300);
}

// 输入模式切换
function switchInputMode(mode) {
  const voiceBar = document.getElementById('voice-input-bar');
  const keyboardBar = document.getElementById('keyboard-input-bar');
  
  if (mode === 'keyboard') {
    if (voiceBar) voiceBar.style.display = 'none';
    if (keyboardBar) {
      keyboardBar.style.display = 'flex';
      const input = document.getElementById('interview-input');
      if (input) input.focus();
    }
  } else {
    if (keyboardBar) keyboardBar.style.display = 'none';
    if (voiceBar) voiceBar.style.display = 'flex';
  }
}

// 语音录制
let isRecording = false;
let recordingTimeout = null;

// 防重复点击
let isProcessingClick = false;

function startVoiceRecording(e) {
  e.preventDefault();
  isRecording = true;
  
  const btn = document.getElementById('btn-voice-hold');
  if (btn) {
    btn.classList.add('recording');
    btn.querySelector('span').textContent = '松开 发送';
  }
  
  // 模拟录音（实际项目中应该使用 Web Speech API）
  console.log('开始录音...');
}

function stopVoiceRecording(e) {
  if (!isRecording) return;
  e.preventDefault();
  isRecording = false;
  
  const btn = document.getElementById('btn-voice-hold');
  if (btn) {
    btn.classList.remove('recording');
    btn.querySelector('span').textContent = '按住 说话';
  }
  
  // 模拟语音识别结果
  console.log('停止录音，处理中...');
  
  // 这里可以集成实际的语音识别API
  // 暂时使用模拟数据
  simulateVoiceResult();
}

function simulateVoiceResult() {
  const question = INTERVIEW_QUESTIONS[OnboardingState.currentQuestion];
  if (!question) return;
  
  // 对于需要输入的问题，提示用户使用键盘
  if (question.type === 'input') {
    // 切换到键盘模式
    switchInputMode('keyboard');
  }
}

// 快捷回复
function renderQuickReplies(replies) {
  const container = document.getElementById('quick-replies');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!replies || replies.length === 0) return;
  
  replies.forEach(reply => {
    const btn = document.createElement('button');
    btn.className = 'btn-quick-reply';
    btn.textContent = reply;
    btn.addEventListener('click', () => {
      handleQuickReply(reply);
    });
    container.appendChild(btn);
  });
}

function handleQuickReply(text) {
  // 防重复点击
  if (isProcessingClick) return;
  isProcessingClick = true;
  
  const question = INTERVIEW_QUESTIONS[OnboardingState.currentQuestion];
  if (question.field) {
    OnboardingState.userData[question.field] = text;
  }
  
  addUserMessage(text);
  hideInputArea();
  
  OnboardingState.currentQuestion++;
  setTimeout(() => {
    showNextQuestion();
    isProcessingClick = false;
  }, 500);
}

function hideInputArea() {
  const inputArea = document.getElementById('interview-input-area');
  if (inputArea) inputArea.classList.remove('active');
  
  const options = document.getElementById('interview-options');
  if (options) options.classList.remove('active');
  
  // 清空快捷回复
  const quickReplies = document.getElementById('quick-replies');
  if (quickReplies) quickReplies.innerHTML = '';
}

function handleOptionSelect(value, field) {
  // 防重复点击
  if (isProcessingClick) return;
  isProcessingClick = true;
  
  if (field) {
    OnboardingState.userData[field] = value;
  }
  
  addUserMessage(value);
  hideInputArea();
  
  OnboardingState.currentQuestion++;
  setTimeout(() => {
    showNextQuestion();
    isProcessingClick = false;
  }, 500);
}

function goToContract() {
  OnboardingState.stage = 'contract';
  
  // 更新进度指示器
  updateProgressIndicator(3);
  
  // 隐藏面谈和介绍页
  document.getElementById('interview-section')?.classList.remove('active');
  document.getElementById('intro-slides')?.classList.remove('active');
  
  // 显示契约
  const contract = document.getElementById('contract-section');
  if (contract) contract.classList.add('active');
  
  // 填充契约信息
  const nickname = OnboardingState.userData.nickname || '小特工';
  
  // 更新所有显示名字的地方
  document.getElementById('contract-name')?.textContent && (document.getElementById('contract-name').textContent = nickname);
  document.getElementById('oath-name')?.textContent && (document.getElementById('oath-name').textContent = nickname);
  
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  document.getElementById('contract-date')?.textContent && (document.getElementById('contract-date').textContent = dateStr);
}

// ==========================================
// 条款勾选功能
// ==========================================
let termsChecked = {
  promise1: false,
  promise2: false,
  promise3: false
};

function initTermsCheckbox() {
  // 重置状态
  termsChecked = { promise1: false, promise2: false, promise3: false };
  
  // 绑定点击事件
  document.querySelectorAll('.term-item.clickable').forEach(item => {
    item.addEventListener('click', handleTermClick);
  });
  
  // 更新签名区域状态
  updateSignatureAreaState();
}

function handleTermClick(e) {
  const item = e.currentTarget;
  const field = item.dataset.field;
  
  if (!field) return;
  
  // 切换勾选状态
  termsChecked[field] = !termsChecked[field];
  item.classList.toggle('checked', termsChecked[field]);
  
  // 更新checkbox图标
  const checkbox = item.querySelector('.term-checkbox');
  if (checkbox) {
    if (termsChecked[field]) {
      checkbox.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else {
      checkbox.innerHTML = '';
    }
  }
  
  // 检查是否全部勾选
  checkAllTermsChecked();
}

function checkAllTermsChecked() {
  const allChecked = termsChecked.promise1 && termsChecked.promise2 && termsChecked.promise3;
  
  // 隐藏提示
  const hint = document.getElementById('term-hint');
  if (hint) {
    hint.classList.toggle('hidden', allChecked);
  }
  
  // 更新签名区域
  updateSignatureAreaState();
}

function updateSignatureAreaState() {
  const allChecked = termsChecked.promise1 && termsChecked.promise2 && termsChecked.promise3;
  const signatureArea = document.querySelector('.signature-area');
  const signatureHint = document.getElementById('signature-hint');
  
  if (signatureArea) {
    signatureArea.classList.toggle('disabled', !allChecked);
  }
  
  if (signatureHint && !allChecked) {
    signatureHint.textContent = '请先勾选所有承诺';
  } else if (signatureHint) {
    signatureHint.textContent = '请在上方签名';
  }
}

// ==========================================
// 签名画布功能
// ==========================================
let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;
let hasSigned = false;
let signatureInitialized = false;

function initSignatureCanvas() {
  signatureCanvas = document.getElementById('signature-canvas');
  if (!signatureCanvas) {
    console.error('签名Canvas未找到');
    return;
  }
  
  // 使用requestAnimationFrame确保DOM渲染完成
  requestAnimationFrame(() => {
    const rect = signatureCanvas.getBoundingClientRect();
    
    // 如果尺寸为0，延迟重试
    if (rect.width === 0 || rect.height === 0) {
      console.log('签名Canvas尺寸为0，延迟初始化');
      setTimeout(initSignatureCanvas, 100);
      return;
    }
    
    setupSignatureCanvas(rect);
  });
}

function setupSignatureCanvas(rect) {
  if (signatureInitialized) return;
  
  signatureCtx = signatureCanvas.getContext('2d');
  
  // 设置画布大小（考虑设备像素比）
  const dpr = window.devicePixelRatio || 1;
  signatureCanvas.width = rect.width * dpr;
  signatureCanvas.height = rect.height * dpr;
  signatureCtx.scale(dpr, dpr);
  signatureCanvas.style.width = rect.width + 'px';
  signatureCanvas.style.height = rect.height + 'px';
  
  // 设置画笔样式
  signatureCtx.strokeStyle = '#2C1810';
  signatureCtx.lineWidth = 2.5;
  signatureCtx.lineCap = 'round';
  signatureCtx.lineJoin = 'round';
  
  // 清空画布并显示引导
  clearSignature();
  showSignatureGuide();
  
  // 鼠标事件
  signatureCanvas.addEventListener('mousedown', startDrawing);
  signatureCanvas.addEventListener('mousemove', draw);
  signatureCanvas.addEventListener('mouseup', stopDrawing);
  signatureCanvas.addEventListener('mouseleave', stopDrawing);
  
  // 触摸事件
  signatureCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  signatureCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  signatureCanvas.addEventListener('touchend', stopDrawing);
  
  // 清除按钮
  document.getElementById('btn-clear-signature')?.addEventListener('click', clearSignature);
  
  signatureInitialized = true;
  console.log('签名Canvas初始化完成');
}

// 显示签名引导动画
function showSignatureGuide() {
  if (!signatureCtx || hasSigned) return;
  
  const dpr = window.devicePixelRatio || 1;
  const width = signatureCanvas.width / dpr;
  const height = signatureCanvas.height / dpr;
  
  // 绘制虚线引导
  signatureCtx.save();
  signatureCtx.strokeStyle = 'rgba(139, 115, 85, 0.3)';
  signatureCtx.lineWidth = 1;
  signatureCtx.setLineDash([4, 4]);
  
  // 底部基线
  const baseY = height - 15;
  signatureCtx.beginPath();
  signatureCtx.moveTo(10, baseY);
  signatureCtx.lineTo(width - 10, baseY);
  signatureCtx.stroke();
  
  signatureCtx.restore();
}

function getCanvasCoords(e) {
  const rect = signatureCanvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function startDrawing(e) {
  // 检查条款是否全部勾选
  const allTermsChecked = termsChecked.promise1 && termsChecked.promise2 && termsChecked.promise3;
  if (!allTermsChecked) {
    return;
  }
  
  isDrawing = true;
  const coords = getCanvasCoords(e);
  signatureCtx.beginPath();
  signatureCtx.moveTo(coords.x, coords.y);
  
  // 首次绘制时清除引导线
  if (!hasSigned) {
    clearSignatureGuide();
  }
}

function draw(e) {
  if (!isDrawing) return;
  const coords = getCanvasCoords(e);
  signatureCtx.lineTo(coords.x, coords.y);
  signatureCtx.stroke();
  
  if (!hasSigned) {
    hasSigned = true;
    updateSignButton();
    showSignatureConfirmation();
  }
}

function stopDrawing() {
  isDrawing = false;
}

// 清除引导线
function clearSignatureGuide() {
  if (!signatureCtx) return;
  const dpr = window.devicePixelRatio || 1;
  signatureCtx.clearRect(0, 0, signatureCanvas.width / dpr, signatureCanvas.height / dpr);
}

// 显示签名确认效果
function showSignatureConfirmation() {
  const hint = document.getElementById('signature-hint');
  if (hint) {
    hint.textContent = '✓ 签名完成';
    hint.style.color = '#10B981';
  }
  
  // 签名区域发光效果
  const container = document.querySelector('.signature-canvas-container');
  if (container) {
    container.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.3)';
    container.style.borderColor = '#10B981';
  }
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  signatureCanvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  signatureCanvas.dispatchEvent(mouseEvent);
}

function clearSignature() {
  if (!signatureCtx || !signatureCanvas) return;
  
  const dpr = window.devicePixelRatio || 1;
  signatureCtx.clearRect(0, 0, signatureCanvas.width / dpr, signatureCanvas.height / dpr);
  
  hasSigned = false;
  updateSignButton();
  
  // 恢复提示
  const hint = document.getElementById('signature-hint');
  if (hint) {
    hint.classList.remove('hidden');
    hint.textContent = '请在上方签名';
    hint.style.color = '';
  }
  
  // 恢复签名区域样式
  const container = document.querySelector('.signature-canvas-container');
  if (container) {
    container.style.boxShadow = '';
    container.style.borderColor = '';
  }
  
  // 重新显示引导
  showSignatureGuide();
}

function updateSignButton() {
  const btn = document.getElementById('btn-sign-contract');
  const tip = document.querySelector('.sign-tip');
  const hint = document.getElementById('signature-hint');
  
  if (hasSigned) {
    if (btn) btn.disabled = false;
    if (tip) tip.classList.add('hidden');
    if (hint) hint.classList.add('hidden');
  } else {
    if (btn) btn.disabled = true;
    if (tip) tip.classList.remove('hidden');
  }
}

function signContract() {
  console.log('开始盖章流程...');
  
  // 禁用按钮防止重复点击
  const btn = document.getElementById('btn-sign-contract');
  if (btn) btn.disabled = true;
  
  // 显示印章动画覆盖层
  const stampOverlay = document.getElementById('stamp-overlay');
  if (stampOverlay) {
    stampOverlay.classList.add('active');
    console.log('印章动画已显示');
  } else {
    console.error('stamp-overlay 未找到');
  }
  
  setTimeout(() => {
    // 在契约上显示迷你印章
    const placeholder = document.getElementById('stamp-placeholder');
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="stamp-placed">
          <div class="real-stamp-mini">
            <div class="stamp-outer-ring"></div>
            <div class="stamp-inner-ring"></div>
            <div class="stamp-star">★</div>
            <div class="stamp-text-top">特工训练营</div>
            <div class="stamp-text-bottom">正式成员</div>
          </div>
        </div>
      `;
      console.log('印章已放置到契约上');
    }
    
    // 隐藏印章覆盖层
    if (stampOverlay) stampOverlay.classList.remove('active');
    
    // 显示成功提示
    const success = document.getElementById('contract-success');
    if (success) {
      success.classList.add('active');
      console.log('成功界面已显示');
    }
    
    // 倒计时进入首页
    let count = 3;
    const countdownEl = document.getElementById('countdown-num');
    const countdown = setInterval(() => {
      count--;
      if (countdownEl) countdownEl.textContent = count;
      
      if (count <= 0) {
        clearInterval(countdown);
        completeOnboarding();
      }
    }, 1000);
  }, 1800);
}

function completeOnboarding() {
  // 保存用户数据
  const nickname = OnboardingState.userData.nickname || '小特工';
  AppState.user.name = nickname;
  
  // 更新头像（侧边栏和首页）
  const avatarNum = OnboardingState.userData.avatar || '1';
  const avatarPath = `assets/images/avatars/avatar-${avatarNum}.svg`;
  
  document.querySelectorAll('.user-avatar-btn img, .sidebar-avatar img').forEach(img => {
    img.src = avatarPath;
  });
  
  // 保存引导完成状态
  localStorage.setItem('ai_study_onboarded', 'true');
  localStorage.setItem('ai_study_user_avatar', avatarNum);
  localStorage.setItem('ai_study_user_profile', JSON.stringify(OnboardingState.userData));
  
  saveUserData();
  
  // 隐藏引导容器
  const onboarding = document.getElementById('onboarding');
  if (onboarding) onboarding.classList.remove('active');
  
  // 更新UI
  updateUI();
  updateUserNameDisplay();
}

function updateUserNameDisplay() {
  const name = AppState.user.name || '小明同学';
  document.getElementById('sidebar-user-name').textContent = name;
  
  // 根据时间更新问候语
  const hour = new Date().getHours();
  let greeting = '';
  if (hour < 12) {
    greeting = `早上好，${name}！今天也要加油哦~`;
  } else if (hour < 18) {
    greeting = `下午好，${name}！准备好学习了吗？`;
  } else {
    greeting = `晚上好，${name}！完成作业早点休息~`;
  }
  
  const greetingEl = document.getElementById('avatar-greeting');
  if (greetingEl && AppState.tasks.length === 0) {
    greetingEl.textContent = greeting;
  }
}

// ==========================================
// Toast 提示系统
// ==========================================
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const icons = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ℹ'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // 自动移除
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
  
  return toast;
}

// ==========================================
// 弹窗系统
// ==========================================
let dialogResolve = null;

function showDialog(options = {}) {
  const {
    icon = '⚠️',
    title = '确认',
    message = '确定要执行此操作吗？',
    confirmText = '确认',
    cancelText = '取消',
    confirmClass = 'confirm',
    showCancel = true
  } = options;
  
  const overlay = document.getElementById('dialog-overlay');
  const iconEl = document.getElementById('dialog-icon');
  const titleEl = document.getElementById('dialog-title');
  const messageEl = document.getElementById('dialog-message');
  const confirmBtn = document.getElementById('dialog-confirm');
  const cancelBtn = document.getElementById('dialog-cancel');
  
  if (!overlay) return Promise.resolve(false);
  
  iconEl.textContent = icon;
  titleEl.textContent = title;
  messageEl.innerHTML = message;
  confirmBtn.textContent = confirmText;
  confirmBtn.className = `dialog-btn ${confirmClass}`;
  cancelBtn.textContent = cancelText;
  cancelBtn.style.display = showCancel ? 'block' : 'none';
  
  overlay.classList.add('active');
  
  return new Promise((resolve) => {
    dialogResolve = resolve;
    
    const handleConfirm = () => {
      overlay.classList.remove('active');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      resolve(true);
    };
    
    const handleCancel = () => {
      overlay.classList.remove('active');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      resolve(false);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// 走神提醒弹窗
function showAlertDialog() {
  const overlay = document.getElementById('alert-overlay');
  if (!overlay) return;
  
  overlay.classList.add('active');
  
  const confirmBtn = document.getElementById('alert-confirm');
  const handleClose = () => {
    overlay.classList.remove('active');
    confirmBtn.removeEventListener('click', handleClose);
  };
  confirmBtn.addEventListener('click', handleClose);
}

// ==========================================
// 任务完成庆祝
// ==========================================
function showCelebration(stats = {}) {
  const overlay = document.getElementById('celebration-overlay');
  if (!overlay) return;
  
  const { duration = 30, focus = 95, points = 50 } = stats;
  
  document.getElementById('cel-duration').textContent = duration;
  document.getElementById('cel-focus').textContent = focus + '%';
  document.getElementById('cel-points').textContent = points;
  
  overlay.classList.add('active');
  
  // 礼花效果
  createConfetti();
  
  // 返回首页按钮
  document.getElementById('cel-continue')?.addEventListener('click', () => {
    overlay.classList.remove('active');
    navigateTo('home');
    updateUI();
  });
  
  // 分享按钮
  document.getElementById('cel-share')?.addEventListener('click', () => {
    showToast('分享功能开发中...', 'info');
  });
}

// 创建礼花效果
function createConfetti() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 2 + 's';
    confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
    container.appendChild(confetti);
  }
  
  setTimeout(() => container.remove(), 5000);
}

// ==========================================
// 视频监督页面交互 V4 - 视频通话式布局
// ==========================================
let cameraStream = null;
let focusCheckInterval = null;
let focusScore = 100;

// 初始化视频监督页面 V4
function initVideoSupervision() {
  // 摄像头小窗点击
  const studentPip = document.getElementById('student-pip');
  if (studentPip) {
    studentPip.addEventListener('click', toggleCameraV4);
  }
  
  // 摄像头开关按钮
  const btnCameraToggle = document.getElementById('btn-camera-toggle');
  if (btnCameraToggle) {
    btnCameraToggle.addEventListener('click', toggleCameraV4);
  }
  
  // 暂停按钮
  const btnPause = document.getElementById('btn-pause');
  if (btnPause) {
    btnPause.addEventListener('click', togglePauseV4);
  }
  
  // 完成任务按钮
  const btnComplete = document.getElementById('btn-complete-task');
  if (btnComplete) {
    btnComplete.addEventListener('click', completeCurrentTaskV4);
  }
  
  // 求助按钮
  const btnHelp = document.getElementById('btn-help');
  if (btnHelp) {
    btnHelp.addEventListener('click', handleHelpRequest);
  }
  
  // 结束学习按钮
  const btnEnd = document.getElementById('btn-end-study');
  if (btnEnd) {
    btnEnd.addEventListener('click', endStudySessionV4);
  }
  
  // 背诵模式按钮
  const btnToggleRecite = document.getElementById('btn-toggle-recite');
  if (btnToggleRecite) {
    btnToggleRecite.addEventListener('click', toggleReciteContent);
  }
  
  const btnReciteCheck = document.getElementById('btn-recite-check');
  if (btnReciteCheck) {
    btnReciteCheck.addEventListener('click', startReciteCheck);
  }
  
  // 听写模式按钮
  const btnDictationRepeat = document.getElementById('btn-dictation-repeat');
  if (btnDictationRepeat) {
    btnDictationRepeat.addEventListener('click', repeatDictation);
  }
  
  const btnDictationNext = document.getElementById('btn-dictation-next');
  if (btnDictationNext) {
    btnDictationNext.addEventListener('click', nextDictationWord);
  }
  
  const btnCloseAnswers = document.getElementById('btn-close-answers');
  if (btnCloseAnswers) {
    btnCloseAnswers.addEventListener('click', closeDictationAnswers);
  }
  
  // ==========================================
  // 监督设置面板 V5
  // ==========================================
  initSupervisionSettings();
}

// 监督设置状态
const SupervisionSettings = {
  mode: 'gentle', // 'gentle' 或 'strict'
  detections: {
    movement: true,
    distraction: true,
    phone: false,
    posture: false
  },
  
  // 获取当前模式的提醒风格
  getMessageStyle() {
    return this.mode === 'strict' ? 'strict' : 'gentle';
  },
  
  // 保存设置到本地存储
  save() {
    localStorage.setItem('supervisionSettings', JSON.stringify({
      mode: this.mode,
      detections: this.detections
    }));
  },
  
  // 从本地存储加载设置
  load() {
    const saved = localStorage.getItem('supervisionSettings');
    if (saved) {
      const data = JSON.parse(saved);
      this.mode = data.mode || 'gentle';
      this.detections = { ...this.detections, ...data.detections };
    }
  }
};

// 初始化监督设置面板
function initSupervisionSettings() {
  // 加载保存的设置
  SupervisionSettings.load();
  
  // 监督设置按钮
  const btnSupervisionSettings = document.getElementById('btn-supervision-settings');
  const supervisionPanel = document.getElementById('supervision-panel');
  const btnClosePanel = document.getElementById('btn-close-supervision-panel');
  
  if (btnSupervisionSettings && supervisionPanel) {
    btnSupervisionSettings.addEventListener('click', () => {
      if (supervisionPanel.style.display === 'none') {
        supervisionPanel.style.display = 'block';
        updateSupervisionPanelUI();
      } else {
        supervisionPanel.style.display = 'none';
      }
    });
    
    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
      if (!supervisionPanel.contains(e.target) && 
          !btnSupervisionSettings.contains(e.target) &&
          supervisionPanel.style.display !== 'none') {
        supervisionPanel.style.display = 'none';
      }
    });
  }
  
  if (btnClosePanel) {
    btnClosePanel.addEventListener('click', () => {
      supervisionPanel.style.display = 'none';
    });
  }
  
  // 监督模式切换
  const modeToggle = document.getElementById('supervision-mode-toggle');
  if (modeToggle) {
    modeToggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modeToggle.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SupervisionSettings.mode = btn.dataset.mode;
        SupervisionSettings.save();
        
        // 显示切换提示
        const modeName = btn.dataset.mode === 'strict' ? '严厉模式' : '温柔模式';
        showAIBubble(`已切换到${modeName}，小影老师会调整督学风格~`);
      });
    });
  }
  
  // 检测开关
  const toggles = {
    'toggle-movement': 'movement',
    'toggle-distraction': 'distraction',
    'toggle-phone': 'phone',
    'toggle-posture': 'posture'
  };
  
  Object.entries(toggles).forEach(([id, key]) => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.checked = SupervisionSettings.detections[key];
      toggle.addEventListener('change', () => {
        SupervisionSettings.detections[key] = toggle.checked;
        SupervisionSettings.save();
      });
    }
  });
}

// 更新监督设置面板UI
function updateSupervisionPanelUI() {
  // 更新模式按钮状态
  const modeToggle = document.getElementById('supervision-mode-toggle');
  if (modeToggle) {
    modeToggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === SupervisionSettings.mode);
    });
  }
  
  // 更新检测开关状态
  const toggles = {
    'toggle-movement': 'movement',
    'toggle-distraction': 'distraction',
    'toggle-phone': 'phone',
    'toggle-posture': 'posture'
  };
  
  Object.entries(toggles).forEach(([id, key]) => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.checked = SupervisionSettings.detections[key];
    }
  });
}

// 导出监督设置供其他模块使用
window.SupervisionSettings = SupervisionSettings

// V4/V5 摄像头切换 - 视频通话式
async function toggleCameraV4() {
  const pip = document.getElementById('student-pip');
  const video = document.getElementById('student-camera');
  const pipContent = pip?.querySelector('.pip-content');
  const btnCameraToggle = document.getElementById('btn-camera-toggle');
  const btnIcon = btnCameraToggle?.querySelector('.btn-icon-v4 i, .btn-icon-v5 i');
  
  if (cameraStream) {
    // 关闭摄像头
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    if (video) video.srcObject = null;
    
    // 更新 UI 状态
    pip?.classList.add('camera-off');
    if (pipContent) {
      pipContent.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
    }
    if (btnIcon) {
      btnIcon.className = 'fa-solid fa-video-slash';
    }
    showAIBubbleV4('摄像头已关闭');
  } else {
    // 开启摄像头
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 320 },
          height: { ideal: 426 }
        } 
      });
      
      if (video) {
        video.srcObject = cameraStream;
        await video.play();
      }
      
      pip?.classList.remove('camera-off');
      if (pipContent) {
        pipContent.style.display = 'none';
      }
      if (btnIcon) {
        btnIcon.className = 'fa-solid fa-video';
      }
      showAIBubbleV4('摄像头已开启，认真学习哦~');
      
    } catch (err) {
      console.error('摄像头访问失败:', err);
      showToast('无法访问摄像头', 'error');
    }
  }
}

// V4 暂停/继续
let isPaused = false;
function togglePauseV4() {
  const btnPause = document.getElementById('btn-pause');
  const pageStudy = document.getElementById('page-study');
  const btnIcon = btnPause?.querySelector('.btn-icon-v4 i');
  const btnText = btnPause?.querySelector('span');
  
  isPaused = !isPaused;
  
  if (isPaused) {
    clearInterval(AppState.studyTimer);
    clearInterval(AppState.taskTimer);
    pageStudy?.classList.add('paused');
    btnPause?.classList.add('paused');
    if (btnIcon) btnIcon.className = 'fa-solid fa-play';
    if (btnText) btnText.textContent = '继续';
    showAIBubbleV4('休息一下也不错哦~');
  } else {
    startTimersV2();
    pageStudy?.classList.remove('paused');
    btnPause?.classList.remove('paused');
    if (btnIcon) btnIcon.className = 'fa-solid fa-pause';
    if (btnText) btnText.textContent = '暂停';
    showAIBubbleV4('继续加油！');
  }
}

// V4 完成当前任务 - 增强版
function completeCurrentTaskV4() {
  console.log('[completeCurrentTaskV4] 被调用');
  
  // 防止重复点击 - 如果当前任务已完成则跳过
  if (!AppState.currentTask || AppState.currentTask.completed) {
    console.log('[completeCurrentTaskV4] 任务已完成或不存在，跳过');
    return;
  }
  
  const task = AppState.currentTask;
  const mode = task.mode || 'homework';
  
  // 检查作业类任务是否已完成审核
  if (mode === 'recite' || mode === 'dictation' || mode === 'copywrite') {
    const hasResult = checkTaskHasResult(mode);
    
    if (!hasResult) {
      // 弹出作业上传弹窗，引导用户完成作业
      console.log('[completeCurrentTaskV4] 作业未审核，弹出上传弹窗');
      showAIBubble('小特工，请先完成作业再点击完成哦~ 📝', 'high');
      
      // 根据不同模式打开对应的上传/提交方式
      if (mode === 'recite') {
        // 背诵模式：如果没有材料，先上传；如果有材料，提示开始背诵
        if (!task.material?.uploaded) {
          showMaterialUploadModal(task);
        } else {
          showToast('请先完成背诵并提交审核', 'warning');
        }
      } else if (mode === 'dictation') {
        // 听写模式：打开拍照提交
        openDictationCamera();
      } else if (mode === 'copywrite') {
        // 默写模式：打开拍照提交
        openCopywriteCamera();
      }
      return;
    }
    
    console.log('[completeCurrentTaskV4] 作业已审核，允许完成');
  }
  
  const taskCard = document.querySelector('.floating-task-card-v4');
  
  // 1. 增强动画效果
  if (taskCard) {
    enhancedTaskComplete(taskCard, 5);
  }
  
  // 2. 执行原有完成逻辑
  handleTaskComplete();
  
  // 注：成就弹窗仅在全部任务完成后的结算页面显示，不在学习过程中弹出
}

/**
 * 检查作业任务是否已有审核结果
 */
function checkTaskHasResult(mode) {
  switch (mode) {
    case 'recite':
      return currentReciteSession && currentReciteSession.result !== null;
    case 'dictation':
      return currentDictationSession && currentDictationSession.result !== null;
    case 'copywrite':
      return currentCopywriteSession && currentCopywriteSession.result !== null;
    default:
      return true; // 非作业任务默认允许完成
  }
}

/**
 * 更新完成按钮的视觉状态
 * 作业类任务在审核前显示禁用状态
 */
function updateCompleteButtonState() {
  const task = AppState.currentTask;
  if (!task) return;
  
  const mode = task.mode || 'homework';
  const isHomeworkTask = ['recite', 'dictation', 'copywrite'].includes(mode);
  
  // 获取所有完成按钮
  const mainCompleteBtn = document.getElementById('btn-complete-task');
  const reciteCompleteBtn = document.getElementById('btn-complete-recite');
  const dictationCompleteBtn = document.getElementById('btn-dictation-complete');
  const copywriteCompleteBtn = document.getElementById('btn-copywrite-complete');
  
  // 检查是否有审核结果
  const hasResult = checkTaskHasResult(mode);
  
  // 更新主任务卡片完成按钮
  if (mainCompleteBtn) {
    if (isHomeworkTask && !hasResult) {
      mainCompleteBtn.classList.add('needs-review', 'disabled');
      mainCompleteBtn.setAttribute('disabled', 'true');
    } else {
      mainCompleteBtn.classList.remove('needs-review', 'disabled');
      mainCompleteBtn.removeAttribute('disabled');
    }
  }
  
  // 更新背诵面板完成按钮
  if (reciteCompleteBtn && mode === 'recite') {
    if (!hasResult) {
      reciteCompleteBtn.classList.add('needs-review', 'disabled');
      reciteCompleteBtn.setAttribute('disabled', 'true');
    } else {
      reciteCompleteBtn.classList.remove('needs-review', 'disabled');
      reciteCompleteBtn.removeAttribute('disabled');
    }
  }
  
  // 更新听写面板完成按钮
  if (dictationCompleteBtn && mode === 'dictation') {
    if (!hasResult) {
      dictationCompleteBtn.classList.add('needs-review', 'disabled');
      dictationCompleteBtn.setAttribute('disabled', 'true');
    } else {
      dictationCompleteBtn.classList.remove('needs-review', 'disabled');
      dictationCompleteBtn.removeAttribute('disabled');
    }
  }
  
  // 更新默写面板完成按钮
  if (copywriteCompleteBtn && mode === 'copywrite') {
    if (!hasResult) {
      copywriteCompleteBtn.classList.add('needs-review', 'disabled');
      copywriteCompleteBtn.setAttribute('disabled', 'true');
    } else {
      copywriteCompleteBtn.classList.remove('needs-review', 'disabled');
      copywriteCompleteBtn.removeAttribute('disabled');
    }
  }
}

// 暴露给会话类使用
window.updateCompleteButtonState = updateCompleteButtonState;

// V4 结束学习
function endStudySessionV4() {
  if (confirm('确定要结束学习吗？')) {
    // 🎙️ 停止监督模式视频通话
    if (typeof CozeRealtime !== 'undefined') {
      CozeRealtime.stopSupervisor();
      CozeRealtime.stopHelper();
    }
    
    // 停止计时器
    clearInterval(AppState.studyTimer);
    clearInterval(AppState.taskTimer);
    
    // 关闭摄像头
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    
    // 保存数据并导航
    saveUserData();
    navigateTo('complete');
  }
}

// 求助处理
function handleHelpRequest() {
  showAIBubbleV4('别担心，我来帮你！有什么不会的？');
  showToast('老师已收到你的求助，马上来帮你！', 'info');
}

// 显示AI气泡 V4 - 使用统一管理器
function showAIBubbleV4(text, priority = 'normal') {
  AIBubbleManager.show(text, { priority });
}

// 显示成就弹窗
function showAchievementPopup() {
  const popup = document.getElementById('achievement-popup');
  const points = document.getElementById('achievement-points');
  
  if (popup) {
    if (points) points.textContent = '+10';
    popup.style.display = 'flex';
    
    setTimeout(() => {
      popup.style.display = 'none';
    }, 2000);
  }
}

// ==========================================
// 背诵模式 V4
// ==========================================
let reciteContentHidden = false;
let recognitionActive = false;
// speechRecognition 已在上面声明

function toggleReciteContent() {
  const contentArea = document.getElementById('recite-content-area');
  const hiddenState = document.getElementById('recite-hidden-state');
  const btn = document.getElementById('btn-toggle-recite');
  const btnIcon = btn?.querySelector('i');
  const btnText = btn?.querySelector('span');
  
  reciteContentHidden = !reciteContentHidden;
  
  if (reciteContentHidden) {
    if (contentArea) contentArea.style.display = 'none';
    if (hiddenState) hiddenState.style.display = 'block';
    if (btnIcon) btnIcon.className = 'fa-solid fa-eye';
    if (btnText) btnText.textContent = '显示';
  } else {
    if (contentArea) contentArea.style.display = 'block';
    if (hiddenState) hiddenState.style.display = 'none';
    if (btnIcon) btnIcon.className = 'fa-solid fa-eye-slash';
    if (btnText) btnText.textContent = '隐藏';
  }
}

function startReciteCheck() {
  const btn = document.getElementById('btn-recite-check');
  const recognition = document.getElementById('recite-recognition');
  const liveText = document.getElementById('recognition-live-text');
  const accuracyValue = document.querySelector('#accuracy-value') || document.querySelector('.accuracy-value');
  const hiddenState = document.getElementById('recite-hidden-state');
  const contentArea = document.getElementById('recite-content-area');
  
  if (recognitionActive) {
    // 停止识别
    stopReciteCheck();
    return;
  }
  
  // 先隐藏内容
  if (contentArea) contentArea.style.display = 'none';
  if (hiddenState) hiddenState.style.display = 'block';
  
  // 检查浏览器是否支持语音识别
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    // 浏览器不支持语音识别，使用模拟模式
    startSimulatedReciteCheck(btn, recognition, liveText, accuracyValue);
    return;
  }
  
  try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'zh-CN';
    
    speechRecognition.onstart = () => {
      recognitionActive = true;
      if (recognition) recognition.style.display = 'block';
      if (btn) {
        btn.classList.add('listening');
        const spanEl = btn.querySelector('span');
        if (spanEl) spanEl.textContent = '停止';
      }
      if (liveText) liveText.textContent = '正在识别中...';
      showAIBubbleV4('我在听，开始背诵吧~');
    };
    
    speechRecognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (liveText) liveText.textContent = transcript || '正在识别中...';
      
      // 模拟准确率计算
      const accuracy = Math.min(98, 75 + Math.random() * 23);
      if (accuracyValue) accuracyValue.textContent = accuracy.toFixed(0) + '%';
    };
    
    speechRecognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      // 如果是权限错误或不支持，切换到模拟模式
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        showToast('需要麦克风权限，已切换到练习模式', 'info');
        startSimulatedReciteCheck(btn, recognition, liveText, accuracyValue);
      } else {
      stopReciteCheck();
        // 使用模拟模式
        startSimulatedReciteCheck(btn, recognition, liveText, accuracyValue);
      }
    };
    
    speechRecognition.onend = () => {
      if (recognitionActive) {
        // 如果还在活动状态，重新启动
        try {
    speechRecognition.start();
        } catch (e) {
          console.log('Restart failed');
        }
      }
    };
    
    speechRecognition.start();
  } catch (error) {
    console.error('启动语音识别失败:', error);
    // 使用模拟模式
    startSimulatedReciteCheck(btn, recognition, liveText, accuracyValue);
  }
}

// 模拟背诵检测（用于不支持语音识别的浏览器）
function startSimulatedReciteCheck(btn, recognition, liveText, accuracyValue) {
  recognitionActive = true;
  
  if (recognition) recognition.style.display = 'block';
  if (btn) {
    btn.classList.add('listening');
    const spanEl = btn.querySelector('span');
    if (spanEl) spanEl.textContent = '停止';
  }
  if (liveText) liveText.textContent = '练习模式：请大声朗读...';
  
  showAIBubbleV4('开始练习背诵吧！大声朗读出来~');
  
  // 模拟进度
  let progress = 0;
  window.simulatedReciteInterval = setInterval(() => {
    if (!recognitionActive) {
      clearInterval(window.simulatedReciteInterval);
      return;
    }
    
    progress += Math.random() * 15;
    if (progress > 100) progress = 100;
    
    const accuracy = Math.min(98, 70 + progress * 0.28);
    if (accuracyValue) accuracyValue.textContent = accuracy.toFixed(0) + '%';
    
    const messages = ['正在听...', '继续背诵...', '很好，继续...', '快完成了...'];
    if (liveText) liveText.textContent = messages[Math.floor(progress / 25)] || '很棒！';
    
    if (progress >= 100) {
      clearInterval(window.simulatedReciteInterval);
      setTimeout(() => {
        stopReciteCheck();
        showAIBubbleV4('🎉 背诵完成！做得很棒！');
      }, 1000);
    }
  }, 2000);
}

function stopReciteCheck() {
  // 停止真实语音识别
  if (speechRecognition) {
    try {
    speechRecognition.stop();
    } catch (e) {}
    speechRecognition = null;
  }
  
  // 停止模拟模式
  if (window.simulatedReciteInterval) {
    clearInterval(window.simulatedReciteInterval);
    window.simulatedReciteInterval = null;
  }
  
  recognitionActive = false;
  const btn = document.getElementById('btn-recite-check');
  const recognition = document.getElementById('recite-recognition');
  
  if (btn) {
    btn.classList.remove('listening');
    const spanEl = btn.querySelector('span');
    if (spanEl) spanEl.textContent = '开始背诵';
  }
}

// ==========================================
// 听写模式 V4
// ==========================================
let dictationWords = [];
let currentDictationIndex = 0;
let dictationSpeaker = null;

function initDictationMode(words) {
  dictationWords = words || ['苹果', '香蕉', '橘子', '葡萄', '西瓜', '草莓', '樱桃', '芒果', '菠萝', '柠檬'];
  currentDictationIndex = 0;
  updateDictationProgress();
  speakCurrentWord();
}

function updateDictationProgress() {
  const progress = document.getElementById('dictation-progress');
  if (progress) {
    progress.textContent = `听写进行中 ${currentDictationIndex + 1}/${dictationWords.length}`;
  }
}

function speakCurrentWord() {
  if (currentDictationIndex >= dictationWords.length) {
    showDictationAnswers();
    return;
  }
  
  const word = dictationWords[currentDictationIndex];
  
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.8;
    
    const speakerAnim = document.getElementById('speaker-animation');
    speakerAnim?.classList.add('speaking');
    
    utterance.onend = () => {
      speakerAnim?.classList.remove('speaking');
    };
    
    window.speechSynthesis.speak(utterance);
  }
}

function repeatDictation() {
  speakCurrentWord();
}

function nextDictationWord() {
  currentDictationIndex++;
  
  if (currentDictationIndex >= dictationWords.length) {
    showDictationAnswers();
  } else {
    updateDictationProgress();
    speakCurrentWord();
  }
}

function showDictationAnswers() {
  const dictationPanel = document.getElementById('dictation-panel');
  const answersPanel = document.getElementById('dictation-answers');
  const answersList = document.getElementById('dictation-answers-list');
  
  if (dictationPanel) dictationPanel.style.display = 'none';
  if (answersPanel) answersPanel.style.display = 'block';
  
  if (answersList) {
    answersList.innerHTML = dictationWords.map((word, i) => `
      <div class="answer-item">
        <span class="answer-number">${i + 1}</span>
        <span class="answer-word">${word}</span>
      </div>
    `).join('');
  }
  
  showAIBubbleV4('听写完成！对照答案检查一下吧~');
}

function closeDictationAnswers() {
  const answersPanel = document.getElementById('dictation-answers');
  if (answersPanel) answersPanel.style.display = 'none';
  
  // 完成听写任务
  completeCurrentTaskV4();
}

// V2 兼容函数
function toggleCameraV2() { toggleCameraV4(); }
function togglePauseV2() { togglePauseV4(); }
function completeCurrentTaskV2() { completeCurrentTaskV4(); }

// V2 结束学习
function endStudySessionV2() {
  showModal({
    title: '确认结束',
    message: '确定要结束本次学习吗？当前进度会被保存。',
    confirmText: '结束学习',
    cancelText: '继续学习',
    onConfirm: () => {
      finishStudySession();
    }
  });
}

// 切换摄像头
async function toggleCamera() {
  const studentVideo = document.getElementById('student-camera');
  const placeholder = document.querySelector('.pip-placeholder');
  
  if (cameraStream) {
    // 关闭摄像头
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    studentVideo?.classList.remove('active');
    if (placeholder) placeholder.style.display = 'flex';
    showToast('摄像头已关闭', 'info');
  } else {
    // 开启摄像头
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (studentVideo) {
        studentVideo.srcObject = cameraStream;
        studentVideo.classList.add('active');
      }
      if (placeholder) placeholder.style.display = 'none';
      showToast('摄像头已开启，保持专注哦！', 'success');
      
      // 开始专注度检测模拟
      startFocusDetection();
    } catch (err) {
      showToast('无法访问摄像头', 'error');
      console.error('Camera error:', err);
    }
  }
}

// 开始专注度检测(模拟)
function startFocusDetection() {
  if (focusCheckInterval) clearInterval(focusCheckInterval);
  
  focusCheckInterval = setInterval(() => {
    // 模拟专注度变化
    const change = Math.random() > 0.7 ? -5 : 2;
    focusScore = Math.max(0, Math.min(100, focusScore + change));
    
    updateFocusDisplay(focusScore);
    
    // 专注度过低时提醒
    if (focusScore < 50) {
      showFocusAlert();
    }
  }, 5000);
}

// 专注度历史数据（用于绘制曲线）
var focusHistory = [];
const MAX_FOCUS_HISTORY = 60; // 最多保存60个点（5分钟）

// 更新专注度显示 - V7版
function updateFocusDisplay(score) {
  score = Math.round(score);
  AppState.focusScore = score;
  
  // 保存历史数据
  focusHistory.push({ time: Date.now(), score });
  if (focusHistory.length > MAX_FOCUS_HISTORY) {
    focusHistory.shift();
  }
  
  // 更新专注度分数
  const topStats = document.getElementById('top-info-combined');
  const focusNumber = document.getElementById('focus-score-value');
  const focusRingCombined = document.getElementById('focus-ring-combined');
  
  if (focusNumber) focusNumber.textContent = score;
  
  // 更新圆环进度 (r=11, 周长=69.1)
  if (focusRingCombined) {
    const circumference = 2 * Math.PI * 11;
    const offset = circumference * (1 - score / 100);
    focusRingCombined.style.strokeDashoffset = offset;
  }
  
  // 更新颜色状态
  if (topStats) {
    topStats.classList.remove('warning', 'danger');
    
    if (score >= 80) {
      // 绿色 - 专注极佳
    } else if (score >= 60) {
      topStats.classList.add('warning');
    } else {
      topStats.classList.add('danger');
    }
  }
  
  // 兼容旧版专注度徽章（如果存在）
  const focusBadge = document.getElementById('focus-score-badge');
  const focusRingFill = document.getElementById('focus-ring-fill');
  const focusValueOld = focusBadge?.querySelector('.focus-value');
  
  if (focusValueOld) focusValueOld.textContent = score;
  
  if (focusRingFill) {
    // 计算环形进度条的偏移量
    const circumference = 2 * Math.PI * 16; // r=16
    const offset = circumference * (1 - score / 100);
    focusRingFill.style.strokeDashoffset = offset;
  }
  
  if (focusBadge) {
    focusBadge.classList.remove('excellent', 'good', 'poor');
    if (score >= 80) {
      focusBadge.classList.add('excellent');
    } else if (score >= 60) {
      focusBadge.classList.add('good');
    } else {
      focusBadge.classList.add('poor');
    }
    
    // 添加脉冲动画
    focusBadge.classList.add('pulse');
    setTimeout(() => focusBadge.classList.remove('pulse'), 500);
  }
  
  // 更新旧版显示（兼容）
  const scoreValue = document.querySelector('.score-value');
  const scoreBadge = document.getElementById('focus-score');
  const focusDot = document.querySelector('.focus-dot');
  const focusText = document.querySelector('.focus-text');
  
  if (scoreValue) scoreValue.textContent = score + '%';
  
  if (score >= 80) {
    scoreBadge?.classList.remove('warning', 'danger');
    focusDot?.classList.remove('warning', 'danger');
    if (focusText) focusText.textContent = '专注极佳';
  } else if (score >= 60) {
    scoreBadge?.classList.add('warning');
    scoreBadge?.classList.remove('danger');
    focusDot?.classList.add('warning');
    focusDot?.classList.remove('danger');
    if (focusText) focusText.textContent = '注意力下降';
  } else {
    scoreBadge?.classList.add('danger');
    scoreBadge?.classList.remove('warning');
    focusDot?.classList.add('danger');
    focusDot?.classList.remove('warning');
    if (focusText) focusText.textContent = '需要专注';
  }
  
  // 更新专注度条
  const focusFill = document.getElementById('focus-bar-fill');
  if (focusFill) {
    focusFill.style.width = score + '%';
    focusFill.classList.remove('warning', 'danger');
    if (score < 60) {
      focusFill.classList.add('danger');
    } else if (score < 80) {
      focusFill.classList.add('warning');
    }
  }
}

// 获取专注度历史数据
function getFocusHistory() {
  return [...focusHistory];
}

// 重置专注度历史
function resetFocusHistory() {
  focusHistory = [];
}

// 显示专注度提醒弹窗
function showFocusAlert() {
  const alert = document.getElementById('focus-alert');
  if (alert && !alert.classList.contains('show')) {
    alert.classList.add('show');
    // 播放提示音(可选)
    // playAlertSound();
  }
}

// 关闭专注度提醒弹窗
function closeFocusAlert() {
  const alert = document.getElementById('focus-alert');
  if (alert) {
    alert.classList.remove('show');
    focusScore = 80; // 重置专注度
    updateFocusDisplay(focusScore);
    updateTeacherSpeech('太好了！继续加油~');
  }
}

// 更新虚拟人说话内容
let speechBubbleTimeout = null;

function updateTeacherSpeech(message, duration = 4000) {
  const speechBubble = document.getElementById('speech-bubble');
  const aiMessage = document.getElementById('ai-message');
  
  if (!speechBubble || !aiMessage) return;
  
  // 清除之前的定时器
  if (speechBubbleTimeout) {
    clearTimeout(speechBubbleTimeout);
  }
  
  // 更新内容并显示
  aiMessage.textContent = message;
  speechBubble.style.display = 'block';
  speechBubble.style.animation = 'none';
  speechBubble.offsetHeight; // 触发reflow
  speechBubble.style.animation = 'bubblePop 0.4s ease-out';
  
  // 设置自动隐藏
  if (duration > 0) {
    speechBubbleTimeout = setTimeout(() => {
      speechBubble.style.animation = 'bubbleFadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        speechBubble.style.display = 'none';
      }, 300);
    }, duration);
  }
}

// 更新任务队列显示
function updateTaskQueueDisplay() {
  const queueItems = document.getElementById('queue-items');
  const queueCount = document.getElementById('queue-count');
  
  if (!queueItems) return;
  
  const tasks = AppState.tasks || [];
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  
  if (queueCount) {
    queueCount.textContent = Math.max(0, pendingTasks.length - 1);
  }
  
  queueItems.innerHTML = tasks.map((task, index) => {
    const statusIcon = task.status === 'completed' ? '✅' : 
                       task.status === 'active' ? '▶️' : '⏳';
    const statusClass = task.status === 'completed' ? 'completed' : 
                        task.status === 'active' ? 'current' : '';
    const canDrag = task.status === 'pending'; // 只有待执行任务可以拖拽
    
    return `
      <div class="queue-task-item ${statusClass}" 
           draggable="${canDrag}" 
           data-task-index="${index}"
           data-task-id="${task.id || index}">
        <div class="drag-handle ${canDrag ? '' : 'disabled'}">
          <i class="fa-solid fa-grip-vertical"></i>
        </div>
        <div class="queue-task-icon">${task.subject === '语文' ? '📖' : 
                                       task.subject === '数学' ? '🔢' : 
                                       task.subject === '英语' ? '🔤' : '📚'}</div>
        <div class="queue-task-info">
          <div class="queue-task-name">${task.name || task.subject + '作业'}</div>
          <div class="queue-task-time">${task.duration || 30}分钟</div>
        </div>
        <div class="queue-task-actions">
          <button class="btn-edit-time" data-index="${index}" title="调整时间">
            <i class="fa-solid fa-clock"></i>
          </button>
          <span class="queue-task-status">${statusIcon}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // 添加拖拽事件
  initDragAndDrop();
  initTimeEditButtons();
}

// 初始化拖拽排序
let draggedItem = null;

function initDragAndDrop() {
  const queueItems = document.getElementById('queue-items');
  if (!queueItems) return;
  
  const items = queueItems.querySelectorAll('.queue-task-item[draggable="true"]');
  
  items.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragleave', handleDragLeave);
  });
}

function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.taskIndex);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.queue-task-item').forEach(item => {
    item.classList.remove('drag-over');
  });
  draggedItem = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  if (this !== draggedItem) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  if (draggedItem && this !== draggedItem) {
    const fromIndex = parseInt(draggedItem.dataset.taskIndex);
    const toIndex = parseInt(this.dataset.taskIndex);
    
    // 重新排序任务
    if (!isNaN(fromIndex) && !isNaN(toIndex)) {
      const tasks = AppState.tasks || [];
      const [movedTask] = tasks.splice(fromIndex, 1);
      tasks.splice(toIndex, 0, movedTask);
      AppState.tasks = tasks;
      
      // 重新渲染
      updateTaskQueueDisplay();
      showToast('任务顺序已调整', 'success');
    }
  }
}

// 初始化时间编辑按钮
function initTimeEditButtons() {
  const buttons = document.querySelectorAll('.btn-edit-time');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      showTimeEditDialog(index);
    });
  });
}

// 显示时间编辑对话框
function showTimeEditDialog(taskIndex) {
  const tasks = AppState.tasks || [];
  const task = tasks[taskIndex];
  if (!task) return;
  
  const currentDuration = task.duration || 30;
  
  // 创建简单的对话框
  const dialog = document.createElement('div');
  dialog.className = 'time-edit-dialog';
  dialog.innerHTML = `
    <div class="time-edit-content">
      <h4>调整任务时长</h4>
      <p>${task.name || task.subject + '作业'}</p>
      <div class="time-options">
        <button class="time-btn ${currentDuration === 10 ? 'active' : ''}" data-time="10">10分钟</button>
        <button class="time-btn ${currentDuration === 15 ? 'active' : ''}" data-time="15">15分钟</button>
        <button class="time-btn ${currentDuration === 20 ? 'active' : ''}" data-time="20">20分钟</button>
        <button class="time-btn ${currentDuration === 30 ? 'active' : ''}" data-time="30">30分钟</button>
        <button class="time-btn ${currentDuration === 45 ? 'active' : ''}" data-time="45">45分钟</button>
        <button class="time-btn ${currentDuration === 60 ? 'active' : ''}" data-time="60">60分钟</button>
      </div>
      <div class="dialog-actions">
        <button class="btn-cancel">取消</button>
        <button class="btn-confirm">确定</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // 时间选择
  let selectedTime = currentDuration;
  dialog.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dialog.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTime = parseInt(btn.dataset.time);
    });
  });
  
  // 取消按钮
  dialog.querySelector('.btn-cancel').addEventListener('click', () => {
    dialog.remove();
  });
  
  // 确定按钮
  dialog.querySelector('.btn-confirm').addEventListener('click', () => {
    tasks[taskIndex].duration = selectedTime;
    AppState.tasks = tasks;
    updateTaskQueueDisplay();
    dialog.remove();
    showToast(`任务时长已调整为${selectedTime}分钟`, 'success');
  });
  
  // 点击背景关闭
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove();
    }
  });
}

// 鼓励语列表
const ENCOURAGEMENT_MESSAGES = [
  '你做得很棒！继续保持~',
  '专注力满分！加油哦！',
  '认真学习的样子真帅！',
  '你的进步老师都看在眼里~',
  '再坚持一会儿就完成啦！',
  '遇到困难也不要放弃！',
  '相信自己，你可以的！',
  '今天的努力是明天的收获~'
];

// 随机更新鼓励语
function randomEncouragement() {
  const message = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
  updateTeacherSpeech(message);
}

// 页面显示时初始化
document.addEventListener('DOMContentLoaded', () => {
  initVideoSupervision();
  
  // 定时更新鼓励语
  setInterval(randomEncouragement, 30000);
});

// ==========================================
// 任务设定页面交互增强
// ==========================================
function initTaskSetupEnhancements() {
  // 时长选择
  document.querySelectorAll('.duration-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      updateDurationPreview(parseInt(chip.dataset.duration));
      updateTaskSummary();
    });
  });
  
  // 自定义时长输入
  const customInput = document.getElementById('custom-duration');
  if (customInput) {
    customInput.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      if (value >= 5 && value <= 120) {
        document.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('active'));
        updateDurationPreview(value);
        updateTaskSummary();
      }
    });
  }
  
  // 科目选择（多选）
  document.querySelectorAll('.subject-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('active');
      updateTaskSummary();
    });
  });
  
  // 学习模式选择
  document.querySelectorAll('.mode-option input').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.mode-option').forEach(opt => opt.classList.remove('active'));
      input.closest('.mode-option').classList.add('active');
      updateTaskSummary();
    });
  });
}

// 更新时长预览
function updateDurationPreview(minutes) {
  const previewTime = document.getElementById('preview-duration');
  const finishTime = document.getElementById('finish-time');
  const ring = document.getElementById('duration-ring');
  
  if (previewTime) previewTime.textContent = minutes;
  
  if (finishTime) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    finishTime.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  // 更新圆环进度（基于60分钟满）
  if (ring) {
    const progress = Math.min(minutes / 60, 1);
    const circumference = 2 * Math.PI * 45;
    ring.style.strokeDashoffset = circumference * (1 - progress);
  }
}

// 更新任务摘要
function updateTaskSummary() {
  const summary = document.getElementById('task-summary-text');
  if (!summary) return;
  
  // 获取选中的科目
  const subjects = [];
  document.querySelectorAll('.subject-card.active').forEach(card => {
    subjects.push(card.dataset.subject);
  });
  
  // 获取时长
  let duration = 30;
  const activeChip = document.querySelector('.duration-chip.active');
  if (activeChip) {
    duration = parseInt(activeChip.dataset.duration);
  } else {
    const customInput = document.getElementById('custom-duration');
    if (customInput && customInput.value) {
      duration = parseInt(customInput.value);
    }
  }
  
  // 获取模式
  const modeInput = document.querySelector('.mode-option input:checked');
  const modeMap = { homework: '写作业', reading: '阅读', recite: '背诵' };
  const mode = modeInput ? modeMap[modeInput.value] : '写作业';
  
  summary.textContent = `${subjects.join('、') || '未选择'} · ${duration}分钟 · ${mode}`;
}

// ==========================================
// 计时器环形进度更新
// ==========================================
function updateTimerRing(progress) {
  const ring = document.getElementById('timer-ring');
  if (!ring) return;
  
  const circumference = 2 * Math.PI * 130;
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference * (1 - progress);
}

// ==========================================
// 快速设置 - 极简版
// ==========================================
let pendingTasks = []; // 待开始的任务列表
let selectedDuration = 30;
let monitorSettings = {
  movement: true,
  distraction: true,
  phone: false,
  posture: false
};

function initTaskSetupV3() {
  initTimeSliderSimple();
  initMonitorOptions();
  initQuickStartButton();
}

// 初始化时间滑块 - 极简版
function initTimeSliderSimple() {
  const slider = document.getElementById('time-slider');
  const timeValue = document.getElementById('time-value');
  const minusBtn = document.getElementById('btn-time-minus');
  const plusBtn = document.getElementById('btn-time-plus');
  
  if (!slider) return;
  
  // 滑块变化
  slider.addEventListener('input', () => {
    selectedDuration = parseInt(slider.value);
    updateTimeUISimple();
  });
  
  // 减少按钮
  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      selectedDuration = Math.max(5, selectedDuration - 5);
      updateTimeUISimple();
    });
  }
  
  // 增加按钮
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      selectedDuration = Math.min(120, selectedDuration + 5);
      updateTimeUISimple();
    });
  }
  
  // 快捷按钮 - 极简版
  document.querySelectorAll('.preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDuration = parseInt(btn.dataset.minutes);
      updateTimeUISimple();
    });
  });
  
  // 初始化UI
  updateTimeUISimple();
}

// 更新时间UI - 极简版
function updateTimeUISimple() {
  const slider = document.getElementById('time-slider');
  const timeValue = document.getElementById('time-value');
  
  if (timeValue) timeValue.textContent = selectedDuration;
  if (slider) {
    slider.value = selectedDuration;
    // 更新滑块背景
    const percent = ((selectedDuration - 5) / 115) * 100;
    slider.style.background = `linear-gradient(to right, #34D399 0%, #34D399 ${percent}%, #E8E8E8 ${percent}%)`;
  }
  
  // 更新快捷按钮状态
  document.querySelectorAll('.preset-chip').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.minutes) === selectedDuration);
  });
}

// 初始化AI监督选项
function initMonitorOptions() {
  const checkboxes = {
    'monitor-movement': 'movement',
    'monitor-distraction': 'distraction',
    'monitor-phone': 'phone',
    'monitor-posture': 'posture'
  };
  
  Object.entries(checkboxes).forEach(([id, key]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      // 设置初始状态
      checkbox.checked = monitorSettings[key];
      
      // 监听变化
      checkbox.addEventListener('change', () => {
        monitorSettings[key] = checkbox.checked;
      });
    }
  });
}

// 初始化快速开始按钮
function initQuickStartButton() {
  const startBtn = document.getElementById('btn-start-quick');
  
  if (startBtn) {
    startBtn.addEventListener('click', startQuickStudy);
  }
}

// 快速开始学习
function startQuickStudy() {
  // 创建一个通用任务
  const task = {
    id: Date.now(),
    name: '专注学习',
    subject: '学习',
    emoji: '📚',
    color: '#34D399',
    duration: selectedDuration,
    status: 'pending'
  };
  
  // 添加到任务列表
  AppState.tasks = [task];
  AppState.monitorSettings = { ...monitorSettings };
  
  // 关闭快速设置，开始学习 (startStudySession 会在 navigateTo 中自动调用)
  navigateTo('study');
  
  // 显示监督设置提示
  const enabledMonitors = [];
  if (monitorSettings.movement) enabledMonitors.push('乱动检测');
  if (monitorSettings.distraction) enabledMonitors.push('分心检测');
  if (monitorSettings.phone) enabledMonitors.push('手机检测');
  if (monitorSettings.posture) enabledMonitors.push('坐姿提醒');
  
  if (enabledMonitors.length > 0) {
    setTimeout(() => {
      showToast(`已开启: ${enabledMonitors.join('、')}`, 'info');
    }, 500);
  }
}

// 更新已添加任务UI
function updateAddedTasksUI() {
  const listEl = document.getElementById('added-tasks-list');
  const countEl = document.getElementById('added-count');
  const totalTimeEl = document.getElementById('total-time');
  const startBtn = document.getElementById('btn-start-quick');
  
  if (!listEl) return;
  
  const totalMinutes = pendingTasks.reduce((sum, t) => sum + t.duration, 0);
  
  if (countEl) countEl.textContent = pendingTasks.length;
  if (totalTimeEl) totalTimeEl.textContent = `共 ${totalMinutes} 分钟`;
  if (startBtn) startBtn.disabled = pendingTasks.length === 0;
  
  listEl.innerHTML = pendingTasks.map(task => `
    <div class="task-item-v3" data-id="${task.id}">
      <div class="task-icon-v3" style="background: ${task.color}15;">
        ${task.emoji}
      </div>
      <div class="task-info-v3">
        <div class="task-name-v3">${task.subject}</div>
        <div class="task-duration-v3">${task.duration}分钟</div>
      </div>
      <button class="btn-delete-v3" onclick="removeTaskFromList(${task.id})">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');
}

// 从列表移除任务
function removeTaskFromList(id) {
  pendingTasks = pendingTasks.filter(t => t.id !== id);
  updateAddedTasksUI();
}

// 开始所有任务V3
function startAllTasksV3() {
  if (pendingTasks.length === 0) {
    showToast('请先添加学习任务', 'warning');
    return;
  }
  
  AppState.tasks = pendingTasks.map((task, index) => ({
    ...task,
    status: index === 0 ? 'active' : 'pending'
  }));
  
  const totalDuration = pendingTasks.reduce((sum, t) => sum + t.duration, 0);
  showToast(`开始学习！共${pendingTasks.length}个任务，${totalDuration}分钟`, 'success');
  
  pendingTasks = [];
  
  navigateTo('study');
  startStudySession();
}

// ==========================================
// 初始化增强功能
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // 延迟初始化任务设定增强
  setTimeout(() => {
    initTaskSetupEnhancements();
    initTaskSetupV3(); // V3版任务设置
    updateDurationPreview(30);
    updateTaskSummary();
  }, 100);
});

// 暴露全局函数
window.removeTask = removeTask;
window.removeResultItem = removeResultItem;
window.showToast = showToast;
window.showDialog = showDialog;
window.showAlertDialog = showAlertDialog;
window.showCelebration = showCelebration;

// ==========================================
// 深度优化增强功能 v3
// 基于最佳实践的交互与游戏化系统
// ==========================================

// ==========================================
// 一、增强Toast系统
// ==========================================
const ToastQueue = [];
let toastContainer = null;

function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

function showEnhancedToast(message, type = 'info', duration = 3000) {
  initToastContainer();
  
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type]} toast-icon"></i>
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  }, duration);
  
  return toast;
}

// ==========================================
// 二、积分飘字动画
// ==========================================
function showPointsPopup(points, x, y, isBonus = false) {
  const popup = document.createElement('div');
  popup.className = `points-popup ${isBonus ? 'bonus' : ''}`;
  popup.textContent = `+${points}`;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  
  document.body.appendChild(popup);
  
  setTimeout(() => popup.remove(), 1000);
}

function showPointsAtElement(points, element, isBonus = false) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top;
  showPointsPopup(points, x, y, isBonus);
}

// ==========================================
// 三、成就弹窗系统
// ==========================================
const AchievementSystem = {
  achievements: [
    { id: 'first_task', name: '初次挑战', desc: '完成第一个任务', icon: '🎯', reward: 10 },
    { id: 'streak_3', name: '三连胜', desc: '连续3天完成任务', icon: '🔥', reward: 30 },
    { id: 'streak_7', name: '周冠军', desc: '连续7天完成任务', icon: '👑', reward: 100 },
    { id: 'focus_master', name: '专注大师', desc: '连续专注30分钟', icon: '🧘', reward: 50 },
    { id: 'speed_learner', name: '效率王', desc: '提前完成所有任务', icon: '⚡', reward: 40 },
    { id: 'perfect_day', name: '完美一天', desc: '100%专注度完成学习', icon: '✨', reward: 80 },
  ],
  
  unlocked: JSON.parse(localStorage.getItem('unlockedAchievements') || '[]'),
  
  check(achievementId) {
    if (this.unlocked.includes(achievementId)) return;
    
    const achievement = this.achievements.find(a => a.id === achievementId);
    if (achievement) {
      this.unlock(achievement);
    }
  },
  
  unlock(achievement) {
    this.unlocked.push(achievement.id);
    localStorage.setItem('unlockedAchievements', JSON.stringify(this.unlocked));
    this.showPopup(achievement);
  },
  
  showPopup(achievement) {
    // 如果在学习模式中，不显示弹窗，只记录成就
    if (AppState.currentPage === 'study') {
      console.log('[Achievement] 学习中暂不显示成就弹窗:', achievement.name);
      // 添加积分但不显示弹窗
      if (typeof AppState !== 'undefined') {
        AppState.points += achievement.reward;
        saveUserData();
      }
      return;
    }
    
    // 移除旧的弹窗
    document.querySelectorAll('.achievement-popup').forEach(el => el.remove());
    
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <h3 class="achievement-title">🎉 解锁成就！</h3>
      <p class="achievement-desc">${achievement.name}</p>
      <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin-bottom: 16px;">${achievement.desc}</p>
      <div class="achievement-reward">
        <i class="fa-solid fa-star"></i>
        <span>+${achievement.reward} 积分</span>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // 添加积分
    if (typeof AppState !== 'undefined') {
      AppState.points += achievement.reward;
      saveUserData();
      updateUI();
    }
    
    // 自动关闭
    setTimeout(() => {
      popup.style.transform = 'translate(-50%, -50%) scale(0)';
      popup.style.transition = 'transform 0.3s ease-in';
      setTimeout(() => popup.remove(), 300);
    }, 3000);
    
    // 点击关闭
    popup.addEventListener('click', () => {
      popup.style.transform = 'translate(-50%, -50%) scale(0)';
      setTimeout(() => popup.remove(), 300);
    });
  }
};

// ==========================================
// 四、专注度监测增强
// ==========================================
const FocusMonitor = {
  level: 'excellent', // excellent, good, poor
  score: 100,
  indicator: null,
  milestoneShown: {},
  
  init() {
    this.createIndicator();
    this.startMonitoring();
  },
  
  createIndicator() {
    // 不再创建单独的专注状态指示器，使用专注度分数徽章代替
    // 这样避免UI重复
  },
  
  show() {
    // 只切换study-mode类，不显示单独的指示器
    document.body.classList.add('study-mode');
  },
  
  hide() {
    document.body.classList.remove('study-mode');
  },
  
  updateLevel(score) {
    this.score = score;
    
    // 只更新内部状态，不再显示单独的指示器
    if (score >= 80) {
      this.level = 'excellent';
    } else if (score >= 50) {
      this.level = 'good';
    } else {
      this.level = 'poor';
    }
    
    // 更新专注度分数徽章（已有的UI元素）
    if (typeof window.updateFocusDisplay === 'function') {
      window.updateFocusDisplay(score);
    }
  },
  
  startMonitoring() {
    // 模拟专注度变化
    setInterval(() => {
      if (AppState.currentPage === 'study' && AppState.isStudying) {
        // 随机波动，偏向高分
        const change = (Math.random() - 0.4) * 10;
        this.score = Math.max(0, Math.min(100, this.score + change));
        this.updateLevel(this.score);
      }
    }, 5000);
  },
  
  showMilestone(minutes) {
    if (this.milestoneShown[minutes]) return;
    this.milestoneShown[minutes] = true;
    
    const milestone = document.createElement('div');
    milestone.className = 'focus-milestone';
    milestone.innerHTML = `
      <i class="fa-solid fa-fire"></i>
      <span>太棒了！已专注 ${minutes} 分钟！</span>
    `;
    document.body.appendChild(milestone);
    
    requestAnimationFrame(() => {
      milestone.classList.add('show');
    });
    
    setTimeout(() => {
      milestone.classList.remove('show');
      setTimeout(() => milestone.remove(), 500);
    }, 3000);
    
    // 检查成就
    if (minutes >= 30) {
      AchievementSystem.check('focus_master');
    }
  },
  
  showDistraction() {
    const alert = document.createElement('div');
    alert.className = 'distraction-alert active';
    alert.innerHTML = `
      <div class="distraction-icon">😵</div>
      <p class="distraction-message">检测到分心啦！</p>
      <p class="distraction-hint">深呼吸，让我们重新集中注意力</p>
      <button class="btn-focus-back" onclick="this.parentElement.remove()">
        继续学习 💪
      </button>
    `;
    document.body.appendChild(alert);
    
    // 震动反馈（如果支持）
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }
};

// ==========================================
// 五、Loading状态管理
// ==========================================
const LoadingManager = {
  overlay: null,
  
  init() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';
    this.overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
      <div class="loading-progress">
        <div class="loading-progress-bar" style="width: 0%"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);
  },
  
  show(text = '加载中...') {
    if (!this.overlay) this.init();
    this.overlay.querySelector('.loading-text').textContent = text;
    this.overlay.querySelector('.loading-progress-bar').style.width = '0%';
    this.overlay.classList.add('active');
  },
  
  updateProgress(percent, text) {
    if (!this.overlay) return;
    this.overlay.querySelector('.loading-progress-bar').style.width = `${percent}%`;
    if (text) {
      this.overlay.querySelector('.loading-text').textContent = text;
    }
  },
  
  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
  },
  
  // AI识别动画
  showAIScanning(element) {
    if (element) {
      element.classList.add('ai-scanning');
    }
  },
  
  hideAIScanning(element) {
    if (element) {
      element.classList.remove('ai-scanning');
    }
  }
};

// ==========================================
// 六、连续打卡系统
// ==========================================
const StreakSystem = {
  data: JSON.parse(localStorage.getItem('streakData') || '{"days":0,"lastDate":null,"history":[]}'),
  
  checkIn() {
    const today = new Date().toDateString();
    
    if (this.data.lastDate === today) {
      return false; // 已打卡
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (this.data.lastDate === yesterday.toDateString()) {
      this.data.days++;
    } else {
      this.data.days = 1;
    }
    
    this.data.lastDate = today;
    this.data.history.push(today);
    
    localStorage.setItem('streakData', JSON.stringify(this.data));
    
    // 检查连续成就
    if (this.data.days === 3) {
      AchievementSystem.check('streak_3');
    } else if (this.data.days === 7) {
      AchievementSystem.check('streak_7');
    }
    
    return true;
  },
  
  getDays() {
    return this.data.days;
  },
  
  renderStreakBar(container) {
    if (!container) return;
    
    const today = new Date();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    
    let html = '';
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const isCompleted = this.data.history.includes(dateStr);
      const isToday = i === 0;
      
      html += `
        <div class="streak-day ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}">
          ${weekDays[date.getDay()]}
        </div>
      `;
    }
    
    container.innerHTML = html;
  }
};

// ==========================================
// 七、任务完成增强动画
// ==========================================
function enhancedTaskComplete(taskElement, points) {
  if (!taskElement) return;
  
  // 1. 卡片完成动画
  taskElement.classList.add('task-confirmed');
  
  // 2. 积分飘字
  showPointsAtElement(points, taskElement);
  
  // 3. 震动反馈
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  
  // 4. 音效（如果有）
  playSound('complete');
  
  // 5. 检查首次完成成就
  const completedTasks = parseInt(localStorage.getItem('completedTasksCount') || '0') + 1;
  localStorage.setItem('completedTasksCount', completedTasks.toString());
  
  if (completedTasks === 1) {
    AchievementSystem.check('first_task');
  }
}

// ==========================================
// 八、音效系统
// ==========================================
const SoundSystem = {
  enabled: localStorage.getItem('soundEnabled') !== 'false',
  sounds: {},
  
  init() {
    // 预加载音效（如果有音效文件）
    // this.sounds.complete = new Audio('assets/sounds/complete.mp3');
    // this.sounds.points = new Audio('assets/sounds/points.mp3');
  },
  
  play(soundName) {
    if (!this.enabled || !this.sounds[soundName]) return;
    
    try {
      this.sounds[soundName].currentTime = 0;
      this.sounds[soundName].play();
    } catch (e) {
      console.log('Sound play failed:', e);
    }
  },
  
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('soundEnabled', this.enabled.toString());
    return this.enabled;
  }
};

function playSound(name) {
  SoundSystem.play(name);
}

// ==========================================
// 九、初始化增强功能
// ==========================================
function initEnhancements() {
  // 初始化各系统
  LoadingManager.init();
  FocusMonitor.createIndicator();
  SoundSystem.init();
  
  // 监听学习会话开始
  const originalStartStudy = window.startStudySession;
  if (typeof originalStartStudy === 'function') {
    window.startStudySession = function() {
      FocusMonitor.show();
      StreakSystem.checkIn();
      originalStartStudy.apply(this, arguments);
    };
  }
  
  console.log('✨ 深度优化增强功能已加载');
}

// 在DOMContentLoaded后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEnhancements);
} else {
  initEnhancements();
}

// 暴露增强功能到全局
window.showEnhancedToast = showEnhancedToast;
window.showPointsPopup = showPointsPopup;
window.showPointsAtElement = showPointsAtElement;
window.AchievementSystem = AchievementSystem;
window.FocusMonitor = FocusMonitor;
window.LoadingManager = LoadingManager;
window.StreakSystem = StreakSystem;
window.enhancedTaskComplete = enhancedTaskComplete;
window.AIBubbleManager = AIBubbleManager;
window.showAIBubble = showAIBubble;
window.showAIBubbleV4 = showAIBubbleV4;
window.updateFocusDisplay = updateFocusDisplay;
window.getFocusHistory = getFocusHistory;

// ==========================================
// 任务记录页面功能
// ==========================================

// 加载任务历史记录
async function loadTaskHistory(filter = 'all') {
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  
  if (!db || !historyList) return;
  
  // 清空现有内容（保留empty提示）
  historyList.innerHTML = '';
  
  try {
    const transaction = db.transaction([STORE_TASK_HISTORY, STORE_DAILY_STATS], 'readonly');
    const taskStore = transaction.objectStore(STORE_TASK_HISTORY);
    const statsStore = transaction.objectStore(STORE_DAILY_STATS);
    
    const tasks = await new Promise((resolve, reject) => {
      const request = taskStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    // 获取统计数据
    const stats = await new Promise((resolve, reject) => {
      const request = statsStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    // 过滤任务
    let filteredTasks = tasks;
    const now = new Date();
    
    if (filter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredTasks = tasks.filter(t => new Date(t.date) >= weekAgo);
    } else if (filter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredTasks = tasks.filter(t => new Date(t.date) >= monthAgo);
    }
    
    // 更新统计摘要
    updateHistoryStats(filteredTasks, stats, filter);
    
    // 如果没有记录
    if (filteredTasks.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <div class="empty-icon">📋</div>
          <p>暂无任务记录</p>
          <span>完成任务后这里会显示你的学习记录</span>
        </div>
      `;
      return;
    }
    
    // 按日期分组
    const groupedTasks = {};
    filteredTasks.forEach(task => {
      const date = task.date || new Date().toISOString().split('T')[0];
      if (!groupedTasks[date]) {
        groupedTasks[date] = [];
      }
      groupedTasks[date].push(task);
    });
    
    // 按日期倒序排列
    const sortedDates = Object.keys(groupedTasks).sort((a, b) => b.localeCompare(a));
    
    // 渲染任务列表
    sortedDates.forEach(date => {
      const dateLabel = formatHistoryDate(date);
      historyList.innerHTML += `<div class="history-date-group">${dateLabel}</div>`;
      
      groupedTasks[date].forEach(task => {
        historyList.innerHTML += renderHistoryItem(task);
      });
    });
    
  } catch (error) {
    console.error('加载任务历史失败:', error);
    historyList.innerHTML = `
      <div class="history-empty">
        <div class="empty-icon">⚠️</div>
        <p>加载失败</p>
        <span>请稍后重试</span>
      </div>
    `;
  }
}

// 更新历史统计
function updateHistoryStats(tasks, stats, filter) {
  const totalStudyTime = document.getElementById('total-study-time');
  const totalTasksDone = document.getElementById('total-tasks-done');
  const avgFocusScore = document.getElementById('avg-focus-score');
  
  if (!totalStudyTime || !totalTasksDone || !avgFocusScore) return;
  
  // 过滤统计数据
  let filteredStats = stats;
  const now = new Date();
  
  if (filter === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredStats = stats.filter(s => new Date(s.date) >= weekAgo);
  } else if (filter === 'month') {
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredStats = stats.filter(s => new Date(s.date) >= monthAgo);
  }
  
  // 计算汇总数据
  const totalTime = Math.round(filteredStats.reduce((sum, s) => sum + (s.totalDuration || 0), 0) / 60);
  const totalTasks = filteredStats.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0);
  const avgFocus = filteredStats.length > 0 
    ? Math.round(filteredStats.reduce((sum, s) => sum + (s.focusScore || 0), 0) / filteredStats.length)
    : 0;
  
  totalStudyTime.textContent = totalTime;
  totalTasksDone.textContent = totalTasks;
  avgFocusScore.textContent = avgFocus + '%';
}

// 格式化历史日期
function formatHistoryDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (dateStr === today.toISOString().split('T')[0]) {
    return '今天';
  } else if (dateStr === yesterday.toISOString().split('T')[0]) {
    return '昨天';
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${month}月${day}日 ${weekDays[date.getDay()]}`;
  }
}

// 渲染单个历史项目
function renderHistoryItem(task) {
  const iconClass = getTaskIconClass(task.mode || task.type || 'focus');
  const iconEmoji = getTaskIconEmoji(task.mode || task.type || 'focus');
  const duration = task.actualDuration ? Math.round(task.actualDuration / 60) : (task.duration || 0);
  const reward = task.reward || Math.round(duration * 2);
  
  return `
    <div class="history-item">
      <div class="history-item-header">
        <span class="history-date">${task.completedAt ? new Date(task.completedAt).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'}) : ''}</span>
        <span class="history-status completed">已完成</span>
      </div>
      <div class="history-item-content">
        <div class="history-icon ${iconClass}">${iconEmoji}</div>
        <div class="history-info">
          <h4 class="history-title">${task.name || task.title || '学习任务'}</h4>
          <div class="history-meta">
            <span><i class="fa-regular fa-clock"></i> ${duration}分钟</span>
            <span><i class="fa-regular fa-star"></i> ${task.focusScore || 85}%专注</span>
          </div>
        </div>
        <div class="history-reward">
          <i class="fa-solid fa-coins"></i>
          +${reward}
        </div>
      </div>
    </div>
  `;
}

// 获取任务图标类名
function getTaskIconClass(mode) {
  switch(mode) {
    case 'homework': return 'homework';
    case 'recite': return 'recite';
    case 'dictation': return 'dictation';
    default: return 'focus';
  }
}

// 获取任务图标emoji
function getTaskIconEmoji(mode) {
  switch(mode) {
    case 'homework': return '📝';
    case 'recite': return '📖';
    case 'dictation': return '✍️';
    default: return '⏱️';
  }
}

// 初始化历史页面事件
function initHistoryPage() {
  // 返回按钮
  const btnBack = document.getElementById('btn-history-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      navigateTo('home', 'back');
    });
  }
  
  // 过滤按钮
  document.querySelectorAll('.history-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.history-filter .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadTaskHistory(e.target.dataset.filter);
    });
  });
  
  // 侧边栏菜单项
  const historyMenuItem = document.querySelector('.menu-item[data-page="history"]');
  if (historyMenuItem) {
    historyMenuItem.addEventListener('click', () => {
      closeSidebar();
      navigateTo('history');
      loadTaskHistory('all');
    });
  }
}

// 在DOMContentLoaded时初始化
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initHistoryPage, 100);
});

console.log('✅ 任务记录功能已加载');

// ==========================================
// 统一详情页初始化
// ==========================================

function initDetailPages() {
  // 成就页面返回按钮
  document.getElementById('btn-achievements-back')?.addEventListener('click', () => {
    navigateTo('home', 'back');
  });
  
  // 设置页面返回按钮
  document.getElementById('btn-settings-back')?.addEventListener('click', () => {
    navigateTo('home', 'back');
  });
  
  // 成就页面筛选
  document.querySelectorAll('#page-achievements .detail-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#page-achievements .detail-filter .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderAchievementsList(e.target.dataset.filter);
    });
  });
  
  // 历史页面返回按钮（如果还没有绑定）
  document.getElementById('btn-history-back')?.addEventListener('click', () => {
    navigateTo('home', 'back');
  });
  
  // 历史页面筛选
  document.querySelectorAll('#page-history .detail-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#page-history .detail-filter .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      if (typeof loadTaskHistory === 'function') {
        loadTaskHistory(e.target.dataset.filter);
      }
    });
  });
  
  // 家长中心返回按钮
  document.getElementById('btn-back-parent')?.addEventListener('click', () => {
    navigateTo('home', 'back');
  });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initDetailPages, 200);
});

console.log('✅ 统一详情页模块已加载');

// 测试导航 - 可以通过URL参数自动导航
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page');
  if (page) {
    setTimeout(() => {
      navigateTo(page);
    }, 500);
  }
})();

// ==========================================
// 设置页面交互
// ==========================================

// 打开设置弹窗
function openSettingsModal(type) {
  const modal = document.getElementById(`modal-${type}`);
  if (modal) {
    modal.classList.add('active');
  }
}

// 关闭设置弹窗
function closeSettingsModal(type) {
  const modal = document.getElementById(`modal-${type}`);
  if (modal) {
    modal.classList.remove('active');
  }
}

// 保存个人资料
function saveProfile() {
  const nickname = document.getElementById('input-nickname').value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  const grade = document.getElementById('select-grade').value;
  
  // 保存到本地存储
  localStorage.setItem('user_nickname', nickname);
  localStorage.setItem('user_gender', gender);
  localStorage.setItem('user_grade', grade);
  
  showToast('个人资料已保存', 'success');
  closeSettingsModal('profile');
}

// 保存每日目标
function saveDailyGoal() {
  const goal = document.querySelector('input[name="daily-goal"]:checked')?.value;
  localStorage.setItem('daily_goal', goal);
  
  // 更新显示
  const descEl = document.querySelector('.settings-item:has([onclick*="daily-goal"]) .settings-desc');
  if (descEl) {
    descEl.textContent = `当前：${goal}分钟/天`;
  }
  
  showToast('每日目标已更新', 'success');
  closeSettingsModal('daily-goal');
}

// 保存主题
function saveTheme() {
  const theme = document.querySelector('input[name="theme"]:checked')?.value;
  localStorage.setItem('theme', theme);
  
  // 应用主题
  document.body.dataset.theme = theme;
  
  // 更新显示
  const themeNames = { system: '跟随系统', light: '浅色模式', dark: '深色模式' };
  const descEl = document.querySelector('.settings-item:has([onclick*="theme"]) .settings-desc');
  if (descEl) {
    descEl.textContent = themeNames[theme];
  }
  
  showToast('主题已更新', 'success');
  closeSettingsModal('theme');
}

// 清除缓存
function clearCache() {
  if (confirm('确定要清除所有缓存数据吗？\n（不会影响学习记录）')) {
    // 清除图片缓存等
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    showToast('缓存已清除', 'success');
  }
}

// 退出登录
function logout() {
  if (confirm('确定要退出登录吗？')) {
    // 清除登录状态
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('onboardingComplete');
    showToast('已退出登录', 'info');
    
    // 返回首页或登录页
    setTimeout(() => {
      location.reload();
    }, 1000);
  }
}

// 初始化设置页面事件
function initSettingsEvents() {
  // 个人资料
  document.querySelectorAll('.settings-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // 如果点击的是toggle开关，不处理
      if (e.target.closest('.settings-toggle')) return;
      
      const title = item.querySelector('.settings-title')?.textContent;
      
      switch(title) {
        case '个人资料':
          openSettingsModal('profile');
          break;
        case '账号安全':
          showToast('账号安全功能开发中', 'info');
          break;
        case '每日目标':
          openSettingsModal('daily-goal');
          break;
        case '主题外观':
          openSettingsModal('theme');
          break;
        case '语言':
          showToast('当前仅支持简体中文', 'info');
          break;
        case '清除缓存':
          clearCache();
          break;
        case '版本信息':
          openSettingsModal('version');
          break;
        case '用户协议':
          showToast('用户协议页面开发中', 'info');
          break;
        case '隐私政策':
          showToast('隐私政策页面开发中', 'info');
          break;
      }
    });
  });
  
  // 退出登录按钮
  document.getElementById('btn-logout')?.addEventListener('click', logout);
  
  // 性别选项
  document.querySelectorAll('.gender-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.gender-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });
  
  // 目标选项
  document.querySelectorAll('.goal-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.goal-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });
  
  // 主题选项
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initSettingsEvents, 300);
});

console.log('✅ 设置页面交互模块已加载');

function getTaskIconEmoji(mode) {
  switch(mode) {
    case 'homework': return '📝';
    case 'recite': return '📖';
    case 'dictation': return '✍️';
    default: return '⏱️';
  }
}

// 初始化历史页面事件
function initHistoryPage() {
  // 返回按钮
  const btnBack = document.getElementById('btn-history-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      navigateTo('home', 'back');
    });
  }
  
  // 过滤按钮
  document.querySelectorAll('.history-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.history-filter .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadTaskHistory(e.target.dataset.filter);
    });
  });
  
  // 侧边栏菜单项
  const historyMenuItem = document.querySelector('.menu-item[data-page="history"]');
  if (historyMenuItem) {
    historyMenuItem.addEventListener('click', () => {
      closeSidebar();
      navigateTo('history');
      loadTaskHistory('all');
    });
  }
}

// 在DOMContentLoaded时初始化
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initHistoryPage, 100);
});

console.log('✅ 任务记录功能已加载');
