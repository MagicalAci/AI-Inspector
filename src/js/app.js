/**
 * AI督学 - 小影老师
 * 核心应用逻辑
 */

// ==========================================
// 应用状态
// ==========================================
const App = {
  // 当前页面
  currentPage: 'home',
  
  // 任务列表
  tasks: [],
  
  // 当前任务索引
  currentTaskIndex: 0,
  
  // 学习计时器
  studyTimer: null,
  studySeconds: 0,
  
  // 统计数据
  stats: {
    todayTasks: 0,
    totalStars: 0,
    streakDays: 0,
    completedTasks: 0
  },
  
  // 任务类型图标
  typeIcons: {
    '语文': '📖',
    '数学': '🔢',
    '英语': '🔤',
    '阅读': '📚',
    '其他': '✏️'
  },
  
  // AI鼓励语
  encouragements: [
    '加油！你正在认真学习呢~',
    '很棒！保持专注哦！',
    '小影老师看着你呢，继续努力！',
    '你真是太棒了！',
    '坚持就是胜利！',
    '专心完成任务，星星在等你！',
    '你的进步小影老师都看在眼里~',
    '再坚持一下，马上就完成了！'
  ]
};

// ==========================================
// 页面导航
// ==========================================
function navigateTo(pageName) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // 显示目标页面
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) {
    targetPage.classList.add('active');
    App.currentPage = pageName;
    
    // 页面进入回调
    onPageEnter(pageName);
  }
}

function onPageEnter(pageName) {
  switch (pageName) {
    case 'home':
      updateHomeStats();
      break;
    case 'tasks':
      renderTaskList();
      break;
    case 'study':
      startStudySession();
      break;
    case 'celebrate':
      showCelebration();
      break;
  }
}

// ==========================================
// 首页逻辑
// ==========================================
function updateHomeStats() {
  document.getElementById('today-tasks').textContent = App.tasks.length;
  document.getElementById('total-stars').textContent = App.stats.totalStars;
  document.getElementById('streak-days').textContent = App.stats.streakDays;
}

// ==========================================
// 任务管理
// ==========================================
function renderTaskList() {
  const listContainer = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-tasks');
  const confirmBtn = document.getElementById('btn-confirm-tasks');
  
  if (App.tasks.length === 0) {
    listContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    confirmBtn.disabled = true;
    return;
  }
  
  emptyState.classList.add('hidden');
  confirmBtn.disabled = false;
  
  listContainer.innerHTML = App.tasks.map((task, index) => `
    <div class="task-item" data-index="${index}">
      <span class="task-item-icon">${App.typeIcons[task.type] || '✏️'}</span>
      <div class="task-item-info">
        <div class="task-item-name">${task.name}</div>
        <div class="task-item-meta">
          <span>${task.duration}分钟</span>
          <span class="task-item-reward">⭐ +${task.reward}</span>
        </div>
      </div>
      <button class="task-item-delete" onclick="deleteTask(${index})">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function addTask(name, duration, type) {
  const reward = Math.floor(duration * 2); // 每分钟2星星
  
  App.tasks.push({
    id: Date.now(),
    name: name,
    duration: duration,
    type: type,
    reward: reward,
    completed: false
  });
  
  renderTaskList();
  updateHomeStats();
}

function deleteTask(index) {
  App.tasks.splice(index, 1);
  renderTaskList();
  updateHomeStats();
}

// ==========================================
// 添加任务弹窗
// ==========================================
let selectedTime = 10;
let selectedType = '语文';

function showAddTaskModal() {
  document.getElementById('modal-add-task').classList.add('active');
  document.getElementById('input-task-name').value = '';
  document.getElementById('input-task-name').focus();
}

function hideAddTaskModal() {
  document.getElementById('modal-add-task').classList.remove('active');
}

function saveTask() {
  const name = document.getElementById('input-task-name').value.trim();
  
  if (!name) {
    alert('请输入任务名称');
    return;
  }
  
  addTask(name, selectedTime, selectedType);
  hideAddTaskModal();
}

// ==========================================
// 视频督学逻辑
// ==========================================
function startStudySession() {
  if (App.tasks.length === 0) {
    alert('请先添加任务');
    navigateTo('tasks');
    return;
  }
  
  App.currentTaskIndex = 0;
  App.studySeconds = 0;
  App.stats.completedTasks = 0;
  
  updateCurrentTask();
  updateTaskQueue();
  startTimer();
  showRandomEncouragement();
}

function updateCurrentTask() {
  if (App.currentTaskIndex >= App.tasks.length) {
    // 所有任务完成
    endStudySession(true);
    return;
  }
  
  const task = App.tasks[App.currentTaskIndex];
  document.getElementById('current-task-name').textContent = `${task.type} - ${task.name}`;
  document.getElementById('task-progress').style.width = '0%';
  
  // 更新任务信息
  const taskInfo = document.querySelector('.current-task-card .task-info');
  taskInfo.innerHTML = `
    <span class="task-reward"><i class="fa-solid fa-star"></i> +${task.reward}</span>
    <span class="task-duration">预计 ${task.duration} 分钟</span>
  `;
}

function updateTaskQueue() {
  const queueContainer = document.getElementById('queue-items');
  const remainingTasks = App.tasks.slice(App.currentTaskIndex + 1);
  
  if (remainingTasks.length === 0) {
    queueContainer.innerHTML = '<span class="queue-item">这是最后一个任务啦！</span>';
    return;
  }
  
  queueContainer.innerHTML = remainingTasks.map(task => `
    <span class="queue-item">${App.typeIcons[task.type]} ${task.name}</span>
  `).join('');
}

function startTimer() {
  App.studyTimer = setInterval(() => {
    App.studySeconds++;
    updateTimerDisplay();
    updateTaskProgress();
    
    // 每30秒显示一条鼓励语
    if (App.studySeconds % 30 === 0) {
      showRandomEncouragement();
    }
  }, 1000);
}

function stopTimer() {
  if (App.studyTimer) {
    clearInterval(App.studyTimer);
    App.studyTimer = null;
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(App.studySeconds / 60);
  const seconds = App.studySeconds % 60;
  document.getElementById('study-time').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateTaskProgress() {
  const task = App.tasks[App.currentTaskIndex];
  if (!task) return;
  
  const taskSeconds = task.duration * 60;
  const progress = Math.min((App.studySeconds / taskSeconds) * 100, 100);
  document.getElementById('task-progress').style.width = `${progress}%`;
}

function completeCurrentTask() {
  const task = App.tasks[App.currentTaskIndex];
  if (!task) return;
  
  task.completed = true;
  App.stats.totalStars += task.reward;
  App.stats.completedTasks++;
  
  App.currentTaskIndex++;
  App.studySeconds = 0;
  
  if (App.currentTaskIndex >= App.tasks.length) {
    endStudySession(true);
  } else {
    updateCurrentTask();
    updateTaskQueue();
    showRandomEncouragement();
  }
}

function endStudySession(completed = false) {
  stopTimer();
  
  if (completed) {
    navigateTo('celebrate');
  } else {
    navigateTo('home');
  }
}

function togglePause() {
  const pauseBtn = document.getElementById('btn-pause');
  
  if (App.studyTimer) {
    stopTimer();
    pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i><span>继续</span>';
    document.getElementById('focus-status').textContent = '已暂停';
    document.querySelector('.study-status .status-dot').classList.remove('active');
  } else {
    startTimer();
    pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i><span>暂停</span>';
    document.getElementById('focus-status').textContent = '专注中';
    document.querySelector('.study-status .status-dot').classList.add('active');
  }
}

function showRandomEncouragement() {
  const message = App.encouragements[Math.floor(Math.random() * App.encouragements.length)];
  document.getElementById('ai-message').textContent = message;
}

// ==========================================
// 庆祝页面
// ==========================================
function showCelebration() {
  const totalMinutes = Math.floor(App.studySeconds / 60) || 
    App.tasks.reduce((sum, t) => sum + (t.completed ? t.duration : 0), 0);
  
  document.getElementById('celebrate-time').textContent = totalMinutes;
  document.getElementById('celebrate-tasks').textContent = App.stats.completedTasks;
  document.getElementById('celebrate-stars').textContent = 
    App.tasks.filter(t => t.completed).reduce((sum, t) => sum + t.reward, 0);
  
  // 更新连续天数
  App.stats.streakDays++;
}

// ==========================================
// 事件绑定
// ==========================================
function bindEvents() {
  // 首页按钮
  document.getElementById('btn-start-mission').addEventListener('click', () => {
    if (App.tasks.length === 0) {
      navigateTo('tasks');
    } else {
      navigateTo('study');
    }
  });
  
  document.getElementById('btn-set-tasks').addEventListener('click', () => {
    navigateTo('tasks');
  });
  
  // 任务页面
  document.getElementById('btn-back-tasks').addEventListener('click', () => {
    navigateTo('home');
  });
  
  document.getElementById('btn-add-task').addEventListener('click', () => {
    showAddTaskModal();
  });
  
  document.getElementById('btn-confirm-tasks').addEventListener('click', () => {
    navigateTo('study');
  });
  
  // 弹窗
  document.getElementById('modal-close').addEventListener('click', hideAddTaskModal);
  document.querySelector('.modal-overlay').addEventListener('click', hideAddTaskModal);
  document.getElementById('btn-save-task').addEventListener('click', saveTask);
  
  // 时间选项
  document.querySelectorAll('.time-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTime = parseInt(btn.dataset.time);
    });
  });
  
  // 类型选项
  document.querySelectorAll('.type-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });
  
  // 督学页面
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-complete-task').addEventListener('click', completeCurrentTask);
  document.getElementById('btn-end-study').addEventListener('click', () => {
    if (confirm('确定要结束学习吗？')) {
      endStudySession(false);
    }
  });
  
  // 庆祝页面
  document.getElementById('btn-celebrate-home').addEventListener('click', () => {
    // 清空已完成的任务
    App.tasks = App.tasks.filter(t => !t.completed);
    navigateTo('home');
  });
}

// ==========================================
// 初始化
// ==========================================
function init() {
  bindEvents();
  updateHomeStats();
  
  // 加载本地存储的数据
  loadData();
  
  console.log('🎓 AI督学 - 小影老师 已启动！');
}

// 本地存储
function saveData() {
  localStorage.setItem('ai-study-tasks', JSON.stringify(App.tasks));
  localStorage.setItem('ai-study-stats', JSON.stringify(App.stats));
}

function loadData() {
  try {
    const tasks = localStorage.getItem('ai-study-tasks');
    const stats = localStorage.getItem('ai-study-stats');
    
    if (tasks) App.tasks = JSON.parse(tasks);
    if (stats) App.stats = { ...App.stats, ...JSON.parse(stats) };
    
    updateHomeStats();
  } catch (e) {
    console.log('加载数据失败', e);
  }
}

// 页面离开时保存数据
window.addEventListener('beforeunload', saveData);

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 导出给调试
window.App = App;
window.navigateTo = navigateTo;
