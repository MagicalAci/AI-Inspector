/**
 * AI督学 - 主应用程序 v2
 * 深度优化版
 */

// 应用状态
const AppState = {
  currentPage: 'home',
  user: {
    name: '小明同学',
    level: 5,
    balance: 0,
    stars: 0,
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
    '今天也要加油学习哦~',
    '小影老师在等你呢！',
    '准备好开始特工任务了吗？',
    '今天要完成什么学习任务呀？'
  ],
  encouragements: [
    '加油！你正在认真学习呢~',
    '真棒！保持专注！',
    '小影老师看到你很努力哦~',
    '继续保持，你是最棒的！',
    '学习使你变得更强大~'
  ],
  breaks: [
    '眼睛累了吗？看看远处吧~',
    '休息一下，喝口水~',
    '活动活动手指吧~'
  ],
  completions: [
    '太棒了！任务完成！',
    '你真是个小学霸！',
    '完美！继续下一个任务吧！'
  ]
};

// DOM 元素缓存
const DOM = {};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  initEventListeners();
  updateHomeStats();
  setRandomGreeting();
});

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
  DOM.homeStats = {
    tasks: document.getElementById('today-tasks'),
    stars: document.getElementById('total-stars'),
    streak: document.getElementById('streak-days')
  };
  
  DOM.avatarGreeting = document.getElementById('avatar-greeting');
  DOM.taskCountBadge = document.getElementById('task-count-badge');
  
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
  document.getElementById('btn-start-quick')?.addEventListener('click', startQuickStudy);
  
  // 督学页面
  document.getElementById('btn-pause')?.addEventListener('click', togglePause);
  document.getElementById('btn-complete-task')?.addEventListener('click', completeCurrentTask);
  document.getElementById('btn-end-study')?.addEventListener('click', endStudy);
  document.getElementById('btn-minimize')?.addEventListener('click', () => navigateTo('home'));
  
  // 完成页面
  document.getElementById('btn-complete-home')?.addEventListener('click', () => {
    navigateTo('home');
    updateHomeStats();
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

// 更新首页统计
function updateHomeStats() {
  if (DOM.homeStats.tasks) DOM.homeStats.tasks.textContent = AppState.tasks.length;
  if (DOM.homeStats.stars) DOM.homeStats.stars.textContent = AppState.user.stars;
  if (DOM.homeStats.streak) DOM.homeStats.streak.textContent = AppState.user.streakDays;
  if (DOM.taskCountBadge) DOM.taskCountBadge.textContent = AppState.tasks.length;
}

// 随机问候语
function setRandomGreeting() {
  const greetings = AI_MESSAGES.greetings;
  const randomIndex = Math.floor(Math.random() * greetings.length);
  if (DOM.avatarGreeting) {
    DOM.avatarGreeting.textContent = greetings[randomIndex];
  }
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
      // 在没有摄像头的情况下显示占位
    });
  }
}

function capturePhoto() {
  // 模拟拍照和识别
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
      '其他': '✏️'
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
    
    // 存储到临时任务列表
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
  // 创建文件输入
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 模拟处理图片
      capturePhoto();
    }
  };
  input.click();
}

function removeResultItem(index) {
  if (AppState.tempTasks) {
    AppState.tempTasks.splice(index, 1);
    capturePhoto(); // 重新渲染列表
  }
}

function confirmPhotoTasks() {
  if (AppState.tempTasks && AppState.tempTasks.length > 0) {
    AppState.tasks = AppState.tempTasks.map(task => ({
      ...task,
      completed: false,
      id: Date.now() + Math.random()
    }));
    updateHomeStats();
    navigateTo('study');
    startStudySession();
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
      
      // 显示/隐藏背诵上传
      if (reciteUpload) {
        reciteUpload.style.display = input.value === 'recite' ? 'block' : 'none';
      }
    });
  });
}

function startQuickStudy() {
  // 根据选择创建任务
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
  
  updateHomeStats();
  navigateTo('study');
  startStudySession();
}

// ==========================================
// 开始任务
// ==========================================
function startMission() {
  if (AppState.tasks.length === 0) {
    // 没有任务，引导设置
    alert('请先设置今日任务~');
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
  // 停止已有计时器
  if (AppState.studyTimer) clearInterval(AppState.studyTimer);
  if (AppState.taskTimer) clearInterval(AppState.taskTimer);
  
  // 总时间计时器
  AppState.studyTimer = setInterval(() => {
    AppState.totalStudyTime++;
    if (DOM.studyTimer) {
      DOM.studyTimer.textContent = formatTime(AppState.totalStudyTime);
    }
  }, 1000);
  
  // 任务计时器
  AppState.taskTimer = setInterval(() => {
    AppState.taskElapsedTime++;
    
    if (DOM.taskTimeElapsed) {
      DOM.taskTimeElapsed.textContent = formatTime(AppState.taskElapsedTime);
    }
    
    // 更新进度条
    const task = AppState.currentTask;
    if (task && DOM.taskProgress) {
      const progress = Math.min((AppState.taskElapsedTime / (task.duration * 60)) * 100, 100);
      DOM.taskProgress.style.width = `${progress}%`;
    }
    
    // 定时鼓励
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
    // 暂停
    stopTimers();
    if (icon) icon.className = 'fa-solid fa-play';
    if (text) text.textContent = '继续';
    showAIMessage('休息一下吧~');
  } else {
    // 继续
    startTimers();
    if (icon) icon.className = 'fa-solid fa-pause';
    if (text) text.textContent = '暂停';
    showRandomEncouragement();
  }
}

function completeCurrentTask() {
  if (!AppState.currentTask) return;
  
  // 标记完成
  AppState.currentTask.completed = true;
  
  // 下一个任务
  AppState.currentTaskIndex++;
  AppState.taskElapsedTime = 0;
  
  if (AppState.currentTaskIndex < AppState.tasks.length) {
    // 还有任务
    AppState.currentTask = AppState.tasks[AppState.currentTaskIndex];
    updateCurrentTaskUI();
    updateQueueUI();
    showAIMessage(AI_MESSAGES.completions[Math.floor(Math.random() * AI_MESSAGES.completions.length)]);
  } else {
    // 全部完成
    endStudy();
  }
}

function endStudy() {
  stopTimers();
  
  // 计算奖励
  const completedTasks = AppState.tasks.filter(t => t.completed).length;
  const earnedStars = completedTasks * 10 + Math.floor(AppState.totalStudyTime / 60) * 2;
  
  AppState.user.stars += earnedStars;
  if (completedTasks === AppState.tasks.length && AppState.tasks.length > 0) {
    AppState.user.streakDays++;
  }
  
  // 更新完成页面
  if (DOM.completeStats.duration) {
    DOM.completeStats.duration.textContent = Math.floor(AppState.totalStudyTime / 60);
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
  
  // 重置任务
  AppState.tasks = [];
  AppState.currentTask = null;
  
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
  updateHomeStats();
  
  // 清空并关闭
  if (nameInput) nameInput.value = '';
  closeAddTaskModal();
  
  // 如果是在拍照页面添加的，刷新列表
  if (AppState.currentPage === 'photo') {
    if (AppState.tempTasks) {
      AppState.tempTasks.push(newTask);
    }
    capturePhoto();
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
  // 分享功能占位
  if (navigator.share) {
    navigator.share({
      title: 'AI督学',
      text: `我在AI督学完成了今日学习任务，获得了星星奖励！`,
      url: window.location.href
    });
  } else {
    alert('分享功能开发中~');
  }
}
