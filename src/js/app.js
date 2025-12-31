/**
 * AI督学 - 主应用程序 v3
 * 特工系统优化版
 */

// 特工等级配置
const AGENT_LEVELS = [
  { name: '见习特工', minPoints: 0, icon: '🎖️' },
  { name: '初级特工', minPoints: 100, icon: '🥉' },
  { name: '中级特工', minPoints: 300, icon: '🥈' },
  { name: '高级特工', minPoints: 600, icon: '🥇' },
  { name: '精英特工', minPoints: 1000, icon: '🏅' },
  { name: '王牌特工', minPoints: 2000, icon: '🎖️' },
  { name: '传奇特工', minPoints: 5000, icon: '👑' }
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
    streakDays: 0
  },
  tasks: [],
  currentTask: null,
  currentTaskIndex: 0,
  studyTimer: null,
  taskTimer: null,
  totalStudyTime: 0,
  taskElapsedTime: 0,
  selectedDuration: 30,
  selectedSubjects: ['语文'],
  selectedTaskType: 'homework'
};

// AI消息库
const AI_MESSAGES = {
  greetings: [
    '特工，准备好执行任务了吗？',
    '今天要完成什么特工任务呀？',
    '小影老师在等你呢！',
    '欢迎回来，特工！'
  ],
  noTask: [
    '先设置今日特工任务吧~',
    '点击上方设置你的任务~',
    '特工，该安排任务了！'
  ],
  hasTask: [
    '任务已就绪，随时可以开始！',
    '特工，任务等你来执行！',
    '准备好了吗？开始吧！'
  ],
  encouragements: [
    '加油！你正在认真学习呢~',
    '真棒！保持专注！',
    '小影老师看到你很努力哦~',
    '继续保持，你是最棒的特工！',
    '学习使你变得更强大~'
  ],
  completions: [
    '太棒了！任务完成！',
    '你真是个优秀的特工！',
    '完美！继续下一个任务吧！'
  ]
};

// DOM 元素缓存
const DOM = {};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  initDOM();
  initEventListeners();
  updateUI();
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
    } catch (e) {
      console.log('Failed to load tasks');
    }
  }
  
  // 计算等级
  updateAgentLevel();
}

// 保存用户数据
function saveUserData() {
  localStorage.setItem('ai_study_user', JSON.stringify(AppState.user));
  localStorage.setItem('ai_study_tasks', JSON.stringify(AppState.tasks));
}

// 更新特工等级
function updateAgentLevel() {
  const points = AppState.user.stars;
  let levelIndex = 0;
  
  for (let i = AGENT_LEVELS.length - 1; i >= 0; i--) {
    if (points >= AGENT_LEVELS[i].minPoints) {
      levelIndex = i;
      break;
    }
  }
  
  AppState.user.level = levelIndex;
  AppState.user.levelName = AGENT_LEVELS[levelIndex].name;
  
  return levelIndex;
}

// 获取下一等级所需积分
function getNextLevelPoints() {
  const currentLevel = AppState.user.level;
  if (currentLevel >= AGENT_LEVELS.length - 1) {
    return 0;
  }
  return AGENT_LEVELS[currentLevel + 1].minPoints - AppState.user.stars;
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
    complete: document.getElementById('page-complete')
  };
  
  // 侧边栏
  DOM.sidebar = document.getElementById('sidebar');
  DOM.sidebarOverlay = document.getElementById('sidebar-overlay');
  
  // 弹窗
  DOM.modalAddTask = document.getElementById('modal-add-task');
  DOM.modalRecharge = document.getElementById('modal-recharge');
  
  // 首页元素
  DOM.avatarGreeting = document.getElementById('avatar-greeting');
  DOM.agentLevel = document.getElementById('agent-level');
  DOM.todayTasks = document.getElementById('today-tasks');
  DOM.totalStars = document.getElementById('total-stars');
  DOM.streakDays = document.getElementById('streak-days');
  DOM.levelProgress = document.getElementById('level-progress');
  DOM.nextLevelPoints = document.getElementById('next-level-points');
  
  // 任务相关
  DOM.pendingTasks = document.getElementById('pending-tasks');
  DOM.pendingList = document.getElementById('pending-list');
  DOM.noTaskHint = document.getElementById('no-task-hint');
  DOM.btnStartMission = document.getElementById('btn-start-mission');
  DOM.missionBtnText = document.getElementById('mission-btn-text');
  
  // 督学页面元素
  DOM.studyTimer = document.getElementById('study-time');
  DOM.aiMessage = document.getElementById('ai-message');
  DOM.currentTaskName = document.getElementById('current-task-name');
  DOM.taskProgress = document.getElementById('task-progress');
  DOM.taskTimeElapsed = document.getElementById('task-time-elapsed');
  DOM.taskTimeTotal = document.getElementById('task-time-total');
  DOM.queueItems = document.getElementById('queue-items');
  
  // 完成页面元素
  DOM.completeStats = {
    duration: document.getElementById('complete-duration'),
    tasks: document.getElementById('complete-tasks'),
    focus: document.getElementById('complete-focus'),
    stars: document.getElementById('reward-stars')
  };
  
  // 侧边栏元素
  DOM.sidebarTotalMissions = document.getElementById('sidebar-total-missions');
  DOM.sidebarTotalTime = document.getElementById('sidebar-total-time');
  DOM.sidebarStreak = document.getElementById('sidebar-streak');
  DOM.agentLevelBadge = document.getElementById('agent-level-badge');
}

// 初始化事件监听
function initEventListeners() {
  // 侧边栏
  document.getElementById('btn-open-sidebar')?.addEventListener('click', openSidebar);
  DOM.sidebarOverlay?.addEventListener('click', closeSidebar);
  
  // 导航按钮
  document.getElementById('btn-photo-task')?.addEventListener('click', () => navigateTo('photo'));
  document.getElementById('btn-quick-task')?.addEventListener('click', () => navigateTo('quick'));
  document.getElementById('btn-start-mission')?.addEventListener('click', startMission);
  document.getElementById('btn-edit-tasks')?.addEventListener('click', openEditTasks);
  
  // 返回按钮
  document.getElementById('btn-back-photo')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-quick')?.addEventListener('click', () => navigateTo('home'));
  
  // 拍照页面
  document.getElementById('btn-capture')?.addEventListener('click', capturePhoto);
  document.getElementById('btn-retake')?.addEventListener('click', retakePhoto);
  document.getElementById('btn-gallery')?.addEventListener('click', openGallery);
  document.getElementById('btn-add-more-task')?.addEventListener('click', openAddTaskModal);
  document.getElementById('btn-confirm-photo-tasks')?.addEventListener('click', confirmPhotoTasks);
  
  // 快速设置页面
  initDurationOptions();
  initSubjectOptions();
  initTaskTypeOptions();
  document.getElementById('btn-start-quick')?.addEventListener('click', confirmQuickTasks);
  
  // 督学页面
  document.getElementById('btn-pause')?.addEventListener('click', togglePause);
  document.getElementById('btn-complete-task')?.addEventListener('click', completeCurrentTask);
  document.getElementById('btn-end-study')?.addEventListener('click', endStudy);
  document.getElementById('btn-minimize')?.addEventListener('click', () => navigateTo('home'));
  
  // 完成页面
  document.getElementById('btn-complete-home')?.addEventListener('click', () => {
    navigateTo('home');
    updateUI();
  });
  document.getElementById('btn-share')?.addEventListener('click', shareResult);
  
  // 弹窗
  document.getElementById('modal-close')?.addEventListener('click', closeAddTaskModal);
  document.getElementById('btn-save-task')?.addEventListener('click', saveTask);
  initTimeBtns();
  initTypeBtns();
  
  // 充值
  document.getElementById('btn-recharge')?.addEventListener('click', openRechargeModal);
  document.getElementById('modal-recharge-close')?.addEventListener('click', closeRechargeModal);
  DOM.modalRecharge?.querySelector('.modal-overlay')?.addEventListener('click', closeRechargeModal);
  
  // 弹窗overlay
  DOM.modalAddTask?.querySelector('.modal-overlay')?.addEventListener('click', closeAddTaskModal);
}

// 更新所有UI
function updateUI() {
  updateAgentLevel();
  updateHomeUI();
  updateSidebarUI();
  updateTaskListUI();
  updateMissionButton();
}

// 更新首页UI
function updateHomeUI() {
  // 特工等级
  if (DOM.agentLevel) {
    DOM.agentLevel.textContent = AppState.user.levelName;
  }
  
  // 统计数据
  if (DOM.todayTasks) {
    DOM.todayTasks.textContent = AppState.tasks.length;
  }
  if (DOM.totalStars) {
    DOM.totalStars.textContent = AppState.user.stars;
  }
  if (DOM.streakDays) {
    DOM.streakDays.textContent = AppState.user.streakDays;
  }
  
  // 等级进度
  if (DOM.levelProgress) {
    DOM.levelProgress.style.width = `${getLevelProgress()}%`;
  }
  if (DOM.nextLevelPoints) {
    const nextPoints = getNextLevelPoints();
    DOM.nextLevelPoints.textContent = nextPoints > 0 ? nextPoints : '已满级';
  }
  
  // 问候语
  updateGreeting();
}

// 更新问候语
function updateGreeting() {
  if (!DOM.avatarGreeting) return;
  
  let messages;
  if (AppState.tasks.length === 0) {
    messages = AI_MESSAGES.noTask;
  } else {
    messages = AI_MESSAGES.hasTask;
  }
  
  const randomIndex = Math.floor(Math.random() * messages.length);
  DOM.avatarGreeting.textContent = messages[randomIndex];
}

// 更新侧边栏UI
function updateSidebarUI() {
  if (DOM.sidebarTotalMissions) {
    DOM.sidebarTotalMissions.textContent = AppState.user.totalMissions;
  }
  if (DOM.sidebarTotalTime) {
    DOM.sidebarTotalTime.textContent = `${Math.floor(AppState.user.totalStudyTime / 60)}h`;
  }
  if (DOM.sidebarStreak) {
    DOM.sidebarStreak.textContent = AppState.user.streakDays;
  }
  if (DOM.agentLevelBadge) {
    const level = AGENT_LEVELS[AppState.user.level];
    DOM.agentLevelBadge.textContent = `${level.icon} ${level.name}`;
  }
}

// 更新任务列表UI
function updateTaskListUI() {
  if (AppState.tasks.length === 0) {
    if (DOM.pendingTasks) DOM.pendingTasks.style.display = 'none';
    if (DOM.noTaskHint) DOM.noTaskHint.style.display = 'block';
  } else {
    if (DOM.pendingTasks) DOM.pendingTasks.style.display = 'block';
    if (DOM.noTaskHint) DOM.noTaskHint.style.display = 'none';
    
    if (DOM.pendingList) {
      const subjectIcons = {
        '语文': '📖',
        '数学': '🔢',
        '英语': '🔤',
        '科学': '🔬',
        '阅读': '📚',
        '其他': '✏️'
      };
      
      DOM.pendingList.innerHTML = AppState.tasks.slice(0, 3).map((task, index) => `
        <div class="pending-item">
          <span class="pending-item-icon">${subjectIcons[task.subject] || '📝'}</span>
          <div class="pending-item-info">
            <div class="pending-item-name">${task.name}</div>
            <div class="pending-item-meta">${task.duration}分钟</div>
          </div>
          <button class="pending-item-remove" onclick="removeTask(${index})">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `).join('');
      
      if (AppState.tasks.length > 3) {
        DOM.pendingList.innerHTML += `
          <div class="pending-item-more">
            还有 ${AppState.tasks.length - 3} 个任务...
          </div>
        `;
      }
    }
  }
}

// 更新开始任务按钮
function updateMissionButton() {
  if (!DOM.btnStartMission) return;
  
  if (AppState.tasks.length === 0) {
    DOM.btnStartMission.disabled = true;
    DOM.btnStartMission.classList.remove('ready');
    if (DOM.missionBtnText) {
      DOM.missionBtnText.textContent = '设置任务后开始';
    }
  } else {
    DOM.btnStartMission.disabled = false;
    DOM.btnStartMission.classList.add('ready');
    if (DOM.missionBtnText) {
      DOM.missionBtnText.textContent = `开始特工任务 (${AppState.tasks.length})`;
    }
  }
}

// 删除任务
function removeTask(index) {
  AppState.tasks.splice(index, 1);
  saveUserData();
  updateUI();
}

// 打开编辑任务
function openEditTasks() {
  // 可以扩展为完整的编辑页面
  navigateTo('quick');
}

// 页面导航
function navigateTo(pageId) {
  Object.values(DOM.pages).forEach(page => {
    page?.classList.remove('active');
  });
  
  DOM.pages[pageId]?.classList.add('active');
  AppState.currentPage = pageId;
  
  // 页面特殊处理
  if (pageId === 'photo') {
    initCamera();
  }
}

// 侧边栏
function openSidebar() {
  DOM.sidebar?.classList.add('active');
}

function closeSidebar() {
  DOM.sidebar?.classList.remove('active');
}

// ==========================================
// 拍照识别
// ==========================================
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

function capturePhoto() {
  const result = document.getElementById('recognize-result');
  const resultList = document.getElementById('result-list');
  
  if (resultList) {
    // 模拟识别到的任务
    const mockTasks = [
      { name: '语文生字抄写', subject: '语文', duration: 15 },
      { name: '数学计算题', subject: '数学', duration: 20 },
      { name: '英语单词背诵', subject: '英语', duration: 10 }
    ];
    
    const subjectIcons = {
      '语文': '📖',
      '数学': '🔢',
      '英语': '🔤',
      '其他': '📝'
    };
    
    resultList.innerHTML = mockTasks.map((task, index) => `
      <div class="result-item" data-index="${index}">
        <span class="result-item-icon">${subjectIcons[task.subject] || '📝'}</span>
        <div class="result-item-info">
          <div class="result-item-name">${task.name}</div>
          <div class="result-item-meta">${task.subject} · ${task.duration}分钟</div>
        </div>
        <button class="result-item-delete" onclick="removeResultItem(${index})">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `).join('');
    
    AppState.tempTasks = [...mockTasks];
  }
  
  if (result) {
    result.style.display = 'block';
  }
}

function retakePhoto() {
  const result = document.getElementById('recognize-result');
  if (result) result.style.display = 'none';
  initCamera();
}

function openGallery() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      capturePhoto();
    }
  };
  input.click();
}

function removeResultItem(index) {
  if (AppState.tempTasks) {
    AppState.tempTasks.splice(index, 1);
    capturePhoto();
  }
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
// 开始任务
// ==========================================
function startMission() {
  if (AppState.tasks.length === 0) {
    return;
  }
  
  navigateTo('study');
  startStudySession();
}

// ==========================================
// 督学会话
// ==========================================
function startStudySession() {
  AppState.currentTaskIndex = 0;
  AppState.totalStudyTime = 0;
  AppState.taskElapsedTime = 0;
  
  if (AppState.tasks.length > 0) {
    AppState.currentTask = AppState.tasks[0];
    updateCurrentTaskUI();
    updateQueueUI();
    startTimers();
    showRandomEncouragement();
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
  
  AppState.studyTimer = setInterval(() => {
    AppState.totalStudyTime++;
    if (DOM.studyTimer) {
      DOM.studyTimer.textContent = formatTime(AppState.totalStudyTime);
    }
  }, 1000);
  
  AppState.taskTimer = setInterval(() => {
    AppState.taskElapsedTime++;
    
    if (DOM.taskTimeElapsed) {
      DOM.taskTimeElapsed.textContent = formatTime(AppState.taskElapsedTime);
    }
    
    const task = AppState.currentTask;
    if (task && DOM.taskProgress) {
      const progress = Math.min((AppState.taskElapsedTime / (task.duration * 60)) * 100, 100);
      DOM.taskProgress.style.width = `${progress}%`;
    }
    
    if (AppState.taskElapsedTime % 120 === 0) {
      showRandomEncouragement();
    }
  }, 1000);
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
}

function togglePause() {
  const btn = document.getElementById('btn-pause');
  const icon = btn?.querySelector('i');
  const text = btn?.querySelector('span');
  
  if (AppState.studyTimer) {
    stopTimers();
    if (icon) icon.className = 'fa-solid fa-play';
    if (text) text.textContent = '继续';
    showAIMessage('休息一下吧~');
  } else {
    startTimers();
    if (icon) icon.className = 'fa-solid fa-pause';
    if (text) text.textContent = '暂停';
    showRandomEncouragement();
  }
}

function completeCurrentTask() {
  if (!AppState.currentTask) return;
  
  AppState.currentTask.completed = true;
  AppState.currentTaskIndex++;
  AppState.taskElapsedTime = 0;
  
  if (AppState.currentTaskIndex < AppState.tasks.length) {
    AppState.currentTask = AppState.tasks[AppState.currentTaskIndex];
    updateCurrentTaskUI();
    updateQueueUI();
    showAIMessage(AI_MESSAGES.completions[Math.floor(Math.random() * AI_MESSAGES.completions.length)]);
  } else {
    endStudy();
  }
}

function endStudy() {
  stopTimers();
  
  const completedTasks = AppState.tasks.filter(t => t.completed).length;
  const studyMinutes = Math.floor(AppState.totalStudyTime / 60);
  const earnedStars = completedTasks * 10 + studyMinutes * 2;
  
  // 更新用户数据
  const oldLevel = AppState.user.level;
  AppState.user.stars += earnedStars;
  AppState.user.totalMissions += completedTasks;
  AppState.user.totalStudyTime += AppState.totalStudyTime;
  
  if (completedTasks === AppState.tasks.length && AppState.tasks.length > 0) {
    AppState.user.streakDays++;
  }
  
  // 检查是否升级
  const newLevel = updateAgentLevel();
  const leveledUp = newLevel > oldLevel;
  
  // 更新完成页面
  if (DOM.completeStats.duration) {
    DOM.completeStats.duration.textContent = studyMinutes;
  }
  if (DOM.completeStats.tasks) {
    DOM.completeStats.tasks.textContent = completedTasks;
  }
  if (DOM.completeStats.focus) {
    DOM.completeStats.focus.textContent = `${Math.floor(80 + Math.random() * 18)}%`;
  }
  if (DOM.completeStats.stars) {
    DOM.completeStats.stars.textContent = `+${earnedStars}`;
  }
  
  // 显示升级提示
  const levelUpNotice = document.getElementById('level-up-notice');
  const newLevelName = document.getElementById('new-level');
  if (levelUpNotice && newLevelName && leveledUp) {
    newLevelName.textContent = AppState.user.levelName;
    levelUpNotice.style.display = 'flex';
  } else if (levelUpNotice) {
    levelUpNotice.style.display = 'none';
  }
  
  // 清空任务
  AppState.tasks = [];
  AppState.currentTask = null;
  
  saveUserData();
  navigateTo('complete');
}

// ==========================================
// 添加任务弹窗
// ==========================================
function openAddTaskModal() {
  DOM.modalAddTask?.classList.add('active');
}

function closeAddTaskModal() {
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

function saveTask() {
  const nameInput = document.getElementById('input-task-name');
  const name = nameInput?.value?.trim();
  
  if (!name) {
    alert('请输入任务名称');
    return;
  }
  
  const activeTimeBtn = document.querySelector('.time-btn.active');
  const activeTypeBtn = document.querySelector('.type-btn.active');
  
  const duration = parseInt(activeTimeBtn?.dataset.time || '20');
  const subject = activeTypeBtn?.dataset.type || '其他';
  
  const newTask = {
    id: Date.now(),
    name: name,
    subject: subject,
    duration: duration,
    completed: false
  };
  
  AppState.tasks.push(newTask);
  saveUserData();
  
  if (nameInput) nameInput.value = '';
  closeAddTaskModal();
  
  if (AppState.currentPage === 'photo') {
    if (AppState.tempTasks) {
      AppState.tempTasks.push(newTask);
    }
    capturePhoto();
  } else {
    updateUI();
  }
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

function showAIMessage(message) {
  if (DOM.aiMessage) {
    DOM.aiMessage.textContent = message;
  }
}

function showRandomEncouragement() {
  const messages = AI_MESSAGES.encouragements;
  const randomIndex = Math.floor(Math.random() * messages.length);
  showAIMessage(messages[randomIndex]);
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

// 暴露全局函数
window.removeTask = removeTask;
window.removeResultItem = removeResultItem;
