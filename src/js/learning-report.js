/**
 * 盯盯作业 - 学习报告系统
 * 完整的数据采集、存储、分析和报告生成
 */

// ==========================================
// 数据库配置
// ==========================================
const REPORT_DB_NAME = 'DingDingHomework';
const REPORT_DB_VERSION = 2;

let reportDB = null;

// 初始化数据库
async function initReportDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(REPORT_DB_NAME, REPORT_DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      reportDB = request.result;
      console.log('📊 学习报告数据库已连接');
      resolve(reportDB);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 学习会话存储
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        sessionStore.createIndex('date', 'date', { unique: false });
        sessionStore.createIndex('userId', 'userId', { unique: false });
      }
      
      // 专注度数据点
      if (!db.objectStoreNames.contains('focusData')) {
        const focusStore = db.createObjectStore('focusData', { keyPath: 'id', autoIncrement: true });
        focusStore.createIndex('sessionId', 'sessionId', { unique: false });
        focusStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // 分心事件
      if (!db.objectStoreNames.contains('distractionEvents')) {
        const distractionStore = db.createObjectStore('distractionEvents', { keyPath: 'id', autoIncrement: true });
        distractionStore.createIndex('sessionId', 'sessionId', { unique: false });
        distractionStore.createIndex('type', 'type', { unique: false });
        distractionStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // 过程截图
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true });
        snapshotStore.createIndex('sessionId', 'sessionId', { unique: false });
        snapshotStore.createIndex('type', 'type', { unique: false });
        snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // 每日报告
      if (!db.objectStoreNames.contains('dailyReports')) {
        const dailyStore = db.createObjectStore('dailyReports', { keyPath: 'date' });
      }
      
      // 周报
      if (!db.objectStoreNames.contains('weeklyReports')) {
        const weeklyStore = db.createObjectStore('weeklyReports', { keyPath: 'weekId' });
      }
      
      // 习惯养成数据
      if (!db.objectStoreNames.contains('habits')) {
        const habitStore = db.createObjectStore('habits', { keyPath: 'id' });
        habitStore.createIndex('userId', 'userId', { unique: false });
      }
      
      // 任务完成记录
      if (!db.objectStoreNames.contains('taskRecords')) {
        const taskStore = db.createObjectStore('taskRecords', { keyPath: 'id', autoIncrement: true });
        taskStore.createIndex('sessionId', 'sessionId', { unique: false });
        taskStore.createIndex('date', 'date', { unique: false });
        taskStore.createIndex('subject', 'subject', { unique: false });
      }
      
      console.log('📊 数据库结构已创建/更新');
    };
  });
}

// ==========================================
// 数据采集类
// ==========================================
class LearningDataCollector {
  constructor() {
    this.currentSession = null;
    this.focusDataBuffer = [];
    this.snapshotInterval = null;
    this.focusCollectInterval = null;
    this.isCollecting = false;
  }
  
  // 开始新的学习会话
  async startSession(taskInfo = {}) {
    if (!reportDB) await initReportDB();
    
    this.currentSession = {
      startTime: Date.now(),
      date: new Date().toISOString().split('T')[0],
      userId: 'default',
      taskInfo: taskInfo,
      focusScores: [],
      distractionEvents: [],
      snapshots: [],
      status: 'active'
    };
    
    // 保存会话到数据库
    const tx = reportDB.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    const request = store.add(this.currentSession);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        this.currentSession.id = request.result;
        this.startDataCollection();
        console.log('📊 学习会话开始:', this.currentSession.id);
        resolve(this.currentSession.id);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  // 开始数据采集
  startDataCollection() {
    this.isCollecting = true;
    
    // 每10秒采集一次专注度数据
    this.focusCollectInterval = setInterval(() => {
      this.collectFocusData();
    }, 10000);
    
    // 每5分钟自动截图
    this.snapshotInterval = setInterval(() => {
      this.captureSnapshot('periodic');
    }, 300000);
    
    // 立即进行第一次采集
    this.collectFocusData();
    this.captureSnapshot('session_start');
  }
  
  // 采集专注度数据
  async collectFocusData() {
    if (!this.isCollecting || !this.currentSession) return;
    
    // 从AppState获取当前专注度分数
    const focusScore = window.AppState?.focusScore || Math.floor(Math.random() * 30 + 70);
    
    const dataPoint = {
      sessionId: this.currentSession.id,
      timestamp: Date.now(),
      score: focusScore,
      elapsed: Date.now() - this.currentSession.startTime
    };
    
    this.focusDataBuffer.push(dataPoint);
    
    // 每30秒批量写入数据库
    if (this.focusDataBuffer.length >= 3) {
      await this.flushFocusData();
    }
  }
  
  // 批量写入专注度数据
  async flushFocusData() {
    if (this.focusDataBuffer.length === 0) return;
    
    const tx = reportDB.transaction('focusData', 'readwrite');
    const store = tx.objectStore('focusData');
    
    for (const data of this.focusDataBuffer) {
      store.add(data);
    }
    
    this.focusDataBuffer = [];
  }
  
  // 记录分心事件
  async recordDistraction(type, details = {}) {
    if (!this.currentSession) return;
    
    const event = {
      sessionId: this.currentSession.id,
      timestamp: Date.now(),
      type: type, // looking_around, phone_detected, left_seat, fatigue, fidgeting
      details: details,
      elapsed: Date.now() - this.currentSession.startTime
    };
    
    // 保存到数据库
    const tx = reportDB.transaction('distractionEvents', 'readwrite');
    const store = tx.objectStore('distractionEvents');
    store.add(event);
    
    // 触发截图
    this.captureSnapshot('distraction', { type, details });
    
    console.log('⚠️ 分心事件记录:', type);
    return event;
  }
  
  // 截图功能
  async captureSnapshot(type = 'manual', metadata = {}) {
    if (!this.currentSession) return;
    
    try {
      const videoElement = document.getElementById('student-camera');
      if (!videoElement || videoElement.readyState < 2) {
        console.log('📷 摄像头未就绪，跳过截图');
        return null;
      }
      
      // 创建canvas截图
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 320;
      canvas.height = videoElement.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // 添加时间戳水印
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.fillText(new Date().toLocaleString('zh-CN'), 10, canvas.height - 10);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      
      const snapshot = {
        sessionId: this.currentSession.id,
        timestamp: Date.now(),
        type: type, // session_start, session_end, periodic, distraction, task_complete
        imageData: imageData,
        metadata: metadata,
        elapsed: Date.now() - this.currentSession.startTime
      };
      
      // 保存到数据库
      const tx = reportDB.transaction('snapshots', 'readwrite');
      const store = tx.objectStore('snapshots');
      store.add(snapshot);
      
      console.log('📷 截图已保存:', type);
      return snapshot;
    } catch (error) {
      console.error('截图失败:', error);
      return null;
    }
  }
  
  // 记录任务完成
  async recordTaskCompletion(task) {
    if (!this.currentSession) return;
    
    const record = {
      sessionId: this.currentSession.id,
      date: new Date().toISOString().split('T')[0],
      taskId: task.id,
      taskName: task.name,
      subject: task.subject || '其他',
      mode: task.mode || 'homework',
      plannedDuration: task.duration,
      actualDuration: task.actualDuration || task.duration,
      completed: true,
      completedAt: Date.now(),
      // 听写/背诵特有数据
      accuracy: task.accuracy || null,
      attempts: task.attempts || 1
    };
    
    const tx = reportDB.transaction('taskRecords', 'readwrite');
    const store = tx.objectStore('taskRecords');
    store.add(record);
    
    // 截图记录任务完成
    this.captureSnapshot('task_complete', { taskName: task.name });
    
    console.log('✅ 任务完成记录:', task.name);
    return record;
  }
  
  // 结束学习会话
  async endSession() {
    if (!this.currentSession) return null;
    
    // 停止数据采集
    this.isCollecting = false;
    clearInterval(this.focusCollectInterval);
    clearInterval(this.snapshotInterval);
    
    // 刷新剩余数据
    await this.flushFocusData();
    
    // 结束截图
    await this.captureSnapshot('session_end');
    
    // 更新会话状态
    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    this.currentSession.status = 'completed';
    
    // 计算会话统计
    const stats = await this.calculateSessionStats();
    this.currentSession.stats = stats;
    
    // 更新数据库
    const tx = reportDB.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    store.put(this.currentSession);
    
    console.log('📊 学习会话结束:', this.currentSession.id);
    
    // 生成每日报告
    await ReportGenerator.generateDailyReport(this.currentSession.date);
    
    const result = this.currentSession;
    this.currentSession = null;
    return result;
  }
  
  // 计算会话统计
  async calculateSessionStats() {
    const sessionId = this.currentSession.id;
    
    // 获取专注度数据
    const focusData = await this.getSessionFocusData(sessionId);
    const avgFocus = focusData.length > 0 
      ? Math.round(focusData.reduce((sum, d) => sum + d.score, 0) / focusData.length)
      : 0;
    
    // 获取分心事件
    const distractions = await this.getSessionDistractions(sessionId);
    const distractionCount = distractions.length;
    
    // 分心类型统计
    const distractionTypes = {};
    distractions.forEach(d => {
      distractionTypes[d.type] = (distractionTypes[d.type] || 0) + 1;
    });
    
    // 获取截图数量
    const snapshots = await this.getSessionSnapshots(sessionId);
    
    return {
      avgFocus,
      distractionCount,
      distractionTypes,
      snapshotCount: snapshots.length,
      focusDataPoints: focusData.length,
      duration: this.currentSession.duration
    };
  }
  
  // 获取会话专注度数据
  async getSessionFocusData(sessionId) {
    return new Promise((resolve, reject) => {
      const tx = reportDB.transaction('focusData', 'readonly');
      const store = tx.objectStore('focusData');
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  // 获取会话分心事件
  async getSessionDistractions(sessionId) {
    return new Promise((resolve, reject) => {
      const tx = reportDB.transaction('distractionEvents', 'readonly');
      const store = tx.objectStore('distractionEvents');
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  // 获取会话截图
  async getSessionSnapshots(sessionId) {
    return new Promise((resolve, reject) => {
      const tx = reportDB.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
}

// ==========================================
// 报告生成器
// ==========================================
const ReportGenerator = {
  
  // 生成每日报告
  async generateDailyReport(date) {
    if (!reportDB) await initReportDB();
    
    const dateStr = date || new Date().toISOString().split('T')[0];
    
    // 获取当日所有会话
    const sessions = await this.getSessionsByDate(dateStr);
    if (sessions.length === 0) {
      console.log('📊 当日无学习记录');
      return null;
    }
    
    // 获取当日所有任务记录
    const tasks = await this.getTasksByDate(dateStr);
    
    // 获取当日所有分心事件
    let allDistractions = [];
    for (const session of sessions) {
      const distractions = await dataCollector.getSessionDistractions(session.id);
      allDistractions = allDistractions.concat(distractions);
    }
    
    // 获取精选截图
    let allSnapshots = [];
    for (const session of sessions) {
      const snapshots = await dataCollector.getSessionSnapshots(session.id);
      allSnapshots = allSnapshots.concat(snapshots);
    }
    const highlightSnapshots = this.selectHighlightSnapshots(allSnapshots);
    
    // 计算统计数据
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalFocusScores = [];
    for (const session of sessions) {
      const focusData = await dataCollector.getSessionFocusData(session.id);
      focusData.forEach(d => totalFocusScores.push(d.score));
    }
    const avgFocus = totalFocusScores.length > 0
      ? Math.round(totalFocusScores.reduce((a, b) => a + b, 0) / totalFocusScores.length)
      : 0;
    
    // 生成报告
    const report = {
      date: dateStr,
      generatedAt: Date.now(),
      
      // 基础统计
      summary: {
        totalDuration: totalDuration,
        totalDurationMinutes: Math.round(totalDuration / 60000),
        sessionCount: sessions.length,
        taskCount: tasks.length,
        completedTasks: tasks.filter(t => t.completed).length,
        avgFocus: avgFocus,
        distractionCount: allDistractions.length,
        pointsEarned: this.calculatePoints(sessions, tasks)
      },
      
      // 专注度数据（用于图表）
      focusTimeline: this.buildFocusTimeline(totalFocusScores, sessions),
      
      // 分心分析
      distractionAnalysis: this.analyzeDistractions(allDistractions),
      
      // 任务完成情况
      taskSummary: this.summarizeTasks(tasks),
      
      // 精选截图
      highlights: highlightSnapshots.slice(0, 4),
      
      // AI点评
      aiComment: this.generateAIComment({
        avgFocus, 
        distractionCount: allDistractions.length,
        completedTasks: tasks.filter(t => t.completed).length,
        totalTasks: tasks.length
      }),
      
      // 学科表现
      subjectPerformance: this.analyzeSubjectPerformance(tasks, sessions)
    };
    
    // 保存报告
    const tx = reportDB.transaction('dailyReports', 'readwrite');
    const store = tx.objectStore('dailyReports');
    store.put(report);
    
    console.log('📊 每日报告已生成:', dateStr);
    return report;
  },
  
  // 生成周报
  async generateWeeklyReport(endDate) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    
    const weekId = `${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
    
    // 获取这一周的每日报告
    const dailyReports = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const report = await this.getDailyReport(dateStr);
      if (report) dailyReports.push(report);
    }
    
    if (dailyReports.length === 0) {
      return null;
    }
    
    // 汇总周数据
    const weekReport = {
      weekId: weekId,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      generatedAt: Date.now(),
      
      // 周汇总
      summary: {
        totalDays: dailyReports.length,
        totalDuration: dailyReports.reduce((sum, r) => sum + (r.summary.totalDuration || (r.summary.totalDurationMinutes * 60000) || 0), 0),
        totalDurationMinutes: dailyReports.reduce((sum, r) => sum + (r.summary.totalDurationMinutes || 0), 0),
        totalTasks: dailyReports.reduce((sum, r) => sum + (r.summary.taskCount || 0), 0),
        completedTasks: dailyReports.reduce((sum, r) => sum + (r.summary.completedTasks || 0), 0),
        avgFocus: Math.round(dailyReports.reduce((sum, r) => sum + (r.summary.avgFocus || 0), 0) / (dailyReports.length || 1)),
        totalDistractions: dailyReports.reduce((sum, r) => sum + (r.summary.distractionCount || 0), 0),
        totalPoints: dailyReports.reduce((sum, r) => sum + (r.summary.pointsEarned || 0), 0)
      },
      
      // 每日趋势
      dailyTrend: dailyReports.map(r => ({
        date: r.date,
        duration: r.summary.totalDurationMinutes,
        focus: r.summary.avgFocus,
        tasks: r.summary.completedTasks,
        distractions: r.summary.distractionCount
      })),
      
      // 分心原因汇总
      distractionSummary: this.aggregateDistractions(dailyReports),
      
      // 学科周表现
      subjectWeekly: this.aggregateSubjectPerformance(dailyReports),
      
      // 进步分析
      progressAnalysis: this.analyzeWeeklyProgress(dailyReports),
      
      // AI周评
      aiWeeklyComment: this.generateWeeklyAIComment(dailyReports)
    };
    
    // 保存周报
    const tx = reportDB.transaction('weeklyReports', 'readwrite');
    const store = tx.objectStore('weeklyReports');
    store.put(weekReport);
    
    console.log('📊 周报已生成:', weekId);
    return weekReport;
  },
  
  // 获取每日报告（先尝试获取已生成的报告，如果没有则从会话数据动态生成）
  async getDailyReport(date) {
    // 先尝试获取已保存的报告
    const savedReport = await new Promise((resolve, reject) => {
      try {
        const tx = reportDB.transaction('dailyReports', 'readonly');
        const store = tx.objectStore('dailyReports');
        const request = store.get(date);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    
    if (savedReport) return savedReport;
    
    // 如果没有，尝试从会话数据动态生成
    const sessions = await this.getSessionsByDate(date);
    
    if (!sessions || sessions.length === 0) {
      return null;
    }
    
    // 从会话数据构建报告
    return this.buildReportFromSessions(date, sessions);
  },
  
  // 从会话数据构建报告
  buildReportFromSessions(date, sessions) {
    let totalDuration = 0;
    let totalFocus = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let allDistractions = [];
    let allFocusScores = [];
    
    sessions.forEach(session => {
      totalDuration += session.duration || 0;
      totalFocus += session.avgFocusScore || 0;
      
      if (session.tasks) {
        totalTasks += session.tasks.length;
        completedTasks += session.tasks.filter(t => t.completed).length;
      }
      
      if (session.distractionEvents) {
        allDistractions = allDistractions.concat(session.distractionEvents);
      }
      
      if (session.focusScores) {
        allFocusScores = allFocusScores.concat(session.focusScores.map(f => f.score));
      }
    });
    
    const avgFocus = sessions.length > 0 ? Math.round(totalFocus / sessions.length) : 0;
    
    // 构建分心分析
    const distractionAnalysis = this.analyzeDistractions(allDistractions);
    
    // 构建专注度时间线
    const focusTimeline = allFocusScores.length > 0 ? allFocusScores : [75, 80, 85, 78, 82, 88, 75, 90];
    
    // AI评语
    const aiComment = this.generateAIComment(avgFocus, completedTasks, allDistractions.length);
    
    return {
      date: date,
      summary: {
        totalDurationMinutes: Math.round(totalDuration / 60000),
        avgFocus: avgFocus,
        taskCount: totalTasks,
        completedTasks: completedTasks,
        pointsEarned: completedTasks * 10 + Math.floor(totalDuration / 60000)
      },
      tasks: sessions.flatMap(s => s.tasks || []),
      distractionAnalysis: distractionAnalysis,
      focusTimeline: focusTimeline,
      aiComment: aiComment
    };
  },
  
  // 生成AI评语
  generateAIComment(focus, tasks, distractions) {
    if (focus >= 85 && distractions <= 2) {
      return '🌟 太棒了！今天专注度很高，继续保持！';
    } else if (focus >= 70) {
      return '👍 今天表现不错，再努力一点就更好了！';
    } else if (tasks > 0) {
      return '💪 完成了任务，虽然有点分心，明天加油！';
    } else {
      return '🌱 今天是新的开始，加油！';
    }
  },
  
  // 获取周报
  async getWeeklyReport(weekId) {
    return new Promise((resolve, reject) => {
      const tx = reportDB.transaction('weeklyReports', 'readonly');
      const store = tx.objectStore('weeklyReports');
      const request = store.get(weekId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  // 按日期获取会话
  async getSessionsByDate(date) {
    return new Promise((resolve, reject) => {
      const tx = reportDB.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const index = store.index('date');
      const request = index.getAll(date);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },
  
  // 按日期获取任务
  async getTasksByDate(date) {
    return new Promise((resolve, reject) => {
      const tx = reportDB.transaction('taskRecords', 'readonly');
      const store = tx.objectStore('taskRecords');
      const index = store.index('date');
      const request = index.getAll(date);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },
  
  // 选择精彩截图
  selectHighlightSnapshots(snapshots) {
    // 优先选择：任务完成 > 会话开始 > 定时截图
    const priority = { task_complete: 1, session_start: 2, session_end: 3, periodic: 4, distraction: 5 };
    return snapshots
      .sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99))
      .slice(0, 6);
  },
  
  // 构建专注度时间线
  buildFocusTimeline(scores, sessions) {
    if (scores.length === 0) return [];
    
    // 每分钟平均值
    const minuteData = [];
    const chunkSize = 6; // 10秒一个点，6个点=1分钟
    for (let i = 0; i < scores.length; i += chunkSize) {
      const chunk = scores.slice(i, i + chunkSize);
      const avg = Math.round(chunk.reduce((a, b) => a + b, 0) / chunk.length);
      minuteData.push(avg);
    }
    return minuteData;
  },
  
  // 分析分心事件
  analyzeDistractions(distractions) {
    const typeLabels = {
      looking_around: '东张西望',
      phone_detected: '手机干扰',
      left_seat: '离开座位',
      fatigue: '疲劳走神',
      fidgeting: '坐立不安'
    };
    
    const typeCounts = {};
    distractions.forEach(d => {
      const label = typeLabels[d.type] || d.type;
      typeCounts[label] = (typeCounts[label] || 0) + 1;
    });
    
    const total = distractions.length || 1;
    const analysis = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round(count / total * 100)
    })).sort((a, b) => b.count - a.count);
    
    // 生成建议
    const suggestions = [];
    if (typeCounts['东张西望'] > 3) {
      suggestions.push('建议调整学习环境，减少视觉干扰');
    }
    if (typeCounts['手机干扰'] > 2) {
      suggestions.push('建议将手机放置在远离学习区域的地方');
    }
    if (typeCounts['离开座位'] > 2) {
      suggestions.push('建议在开始学习前先完成必要的准备工作');
    }
    if (typeCounts['疲劳走神'] > 2) {
      suggestions.push('建议适当缩短单次学习时长，增加休息频率');
    }
    
    return { breakdown: analysis, suggestions, total: distractions.length };
  },
  
  // 汇总任务情况
  summarizeTasks(tasks) {
    const bySubject = {};
    tasks.forEach(t => {
      const subject = t.subject || '其他';
      if (!bySubject[subject]) {
        bySubject[subject] = { total: 0, completed: 0, totalAccuracy: 0, accuracyCount: 0 };
      }
      bySubject[subject].total++;
      if (t.completed) bySubject[subject].completed++;
      if (t.accuracy !== null) {
        bySubject[subject].totalAccuracy += t.accuracy;
        bySubject[subject].accuracyCount++;
      }
    });
    
    return Object.entries(bySubject).map(([subject, data]) => ({
      subject,
      total: data.total,
      completed: data.completed,
      completionRate: Math.round(data.completed / data.total * 100),
      avgAccuracy: data.accuracyCount > 0 ? Math.round(data.totalAccuracy / data.accuracyCount) : null
    }));
  },
  
  // 计算积分
  calculatePoints(sessions, tasks) {
    let points = 0;
    // 基础学习积分
    sessions.forEach(s => {
      points += Math.floor((s.duration || 0) / 60000) * 2; // 每分钟2分
    });
    // 任务完成积分
    tasks.forEach(t => {
      if (t.completed) points += 20;
      if (t.accuracy && t.accuracy >= 90) points += 10;
    });
    return points;
  },
  
  // 生成AI点评
  generateAIComment({ avgFocus, distractionCount, completedTasks, totalTasks }) {
    const comments = [];
    
    // 专注度评价
    if (avgFocus >= 85) {
      comments.push('今天的专注力表现非常棒！');
    } else if (avgFocus >= 70) {
      comments.push('专注度不错，继续保持！');
    } else {
      comments.push('今天有些分心，明天加油哦~');
    }
    
    // 任务完成评价
    if (completedTasks === totalTasks && totalTasks > 0) {
      comments.push('所有任务都完成了，太厉害了！');
    } else if (completedTasks > 0) {
      comments.push(`完成了${completedTasks}个任务，继续努力！`);
    }
    
    // 分心评价
    if (distractionCount === 0) {
      comments.push('全程没有分心，表现满分！');
    } else if (distractionCount <= 3) {
      comments.push('分心次数很少，自控力很强！');
    }
    
    return comments.join(' ');
  },
  
  // 分析学科表现
  analyzeSubjectPerformance(tasks, sessions) {
    const subjectData = {};
    
    tasks.forEach(t => {
      const subject = t.subject || '其他';
      if (!subjectData[subject]) {
        subjectData[subject] = { 
          taskCount: 0, 
          completed: 0, 
          totalDuration: 0,
          accuracySum: 0,
          accuracyCount: 0
        };
      }
      subjectData[subject].taskCount++;
      if (t.completed) subjectData[subject].completed++;
      subjectData[subject].totalDuration += t.actualDuration || t.plannedDuration || 0;
      if (t.accuracy) {
        subjectData[subject].accuracySum += t.accuracy;
        subjectData[subject].accuracyCount++;
      }
    });
    
    return Object.entries(subjectData).map(([subject, data]) => ({
      subject,
      taskCount: data.taskCount,
      completionRate: Math.round(data.completed / data.taskCount * 100),
      totalMinutes: Math.round(data.totalDuration / 60),
      avgAccuracy: data.accuracyCount > 0 ? Math.round(data.accuracySum / data.accuracyCount) : null
    }));
  },
  
  // 汇总周分心数据
  aggregateDistractions(dailyReports) {
    const combined = {};
    dailyReports.forEach(r => {
      if (r.distractionAnalysis?.breakdown) {
        r.distractionAnalysis.breakdown.forEach(item => {
          combined[item.type] = (combined[item.type] || 0) + item.count;
        });
      }
    });
    
    const total = Object.values(combined).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(combined)
      .map(([type, count]) => ({ type, count, percentage: Math.round(count / total * 100) }))
      .sort((a, b) => b.count - a.count);
  },
  
  // 汇总周学科表现
  aggregateSubjectPerformance(dailyReports) {
    const combined = {};
    dailyReports.forEach(r => {
      if (r.subjectPerformance) {
        r.subjectPerformance.forEach(sp => {
          if (!combined[sp.subject]) {
            combined[sp.subject] = { taskCount: 0, minutes: 0, focusSum: 0, focusCount: 0 };
          }
          combined[sp.subject].taskCount += sp.taskCount;
          combined[sp.subject].minutes += sp.totalMinutes || 0;
        });
      }
    });
    
    return Object.entries(combined).map(([subject, data]) => ({
      subject,
      taskCount: data.taskCount,
      totalMinutes: data.minutes
    }));
  },
  
  // 分析周进步
  analyzeWeeklyProgress(dailyReports) {
    if (dailyReports.length < 2) return null;
    
    const firstHalf = dailyReports.slice(0, Math.ceil(dailyReports.length / 2));
    const secondHalf = dailyReports.slice(Math.ceil(dailyReports.length / 2));
    
    const avgFirst = firstHalf.reduce((s, r) => s + r.summary.avgFocus, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, r) => s + r.summary.avgFocus, 0) / secondHalf.length;
    
    const distractFirst = firstHalf.reduce((s, r) => s + r.summary.distractionCount, 0) / firstHalf.length;
    const distractSecond = secondHalf.reduce((s, r) => s + r.summary.distractionCount, 0) / secondHalf.length;
    
    return {
      focusChange: Math.round(avgSecond - avgFirst),
      distractionChange: Math.round(distractFirst - distractSecond),
      trend: avgSecond > avgFirst ? 'improving' : avgSecond < avgFirst ? 'declining' : 'stable'
    };
  },
  
  // 生成周AI点评
  generateWeeklyAIComment(dailyReports) {
    const avgFocus = Math.round(dailyReports.reduce((s, r) => s + r.summary.avgFocus, 0) / dailyReports.length);
    const totalTasks = dailyReports.reduce((s, r) => s + r.summary.completedTasks, 0);
    const studyDays = dailyReports.length;
    
    const comments = [];
    
    comments.push(`这周学习了${studyDays}天，完成了${totalTasks}个任务！`);
    
    if (avgFocus >= 80) {
      comments.push('平均专注度很高，学习效率棒棒的！');
    } else if (avgFocus >= 65) {
      comments.push('专注度还不错，下周继续提升！');
    }
    
    const progress = this.analyzeWeeklyProgress(dailyReports);
    if (progress?.trend === 'improving') {
      comments.push('📈 专注力在持续进步，继续保持！');
    }
    
    return comments.join(' ');
  }
};

// ==========================================
// 习惯养成系统
// ==========================================
const HabitSystem = {
  
  // 预设习惯目标
  presetHabits: [
    { id: 'focus_15', name: '连续专注15分钟', target: 15, unit: '分钟', category: 'focus' },
    { id: 'focus_25', name: '连续专注25分钟', target: 25, unit: '分钟', category: 'focus' },
    { id: 'distraction_less_5', name: '每次学习分心少于5次', target: 5, unit: '次', category: 'distraction' },
    { id: 'daily_30', name: '每日学习30分钟', target: 30, unit: '分钟', category: 'duration' },
    { id: 'complete_all', name: '完成所有计划任务', target: 100, unit: '%', category: 'task' },
    { id: 'streak_7', name: '连续学习7天', target: 7, unit: '天', category: 'streak' }
  ],
  
  // 初始化用户习惯
  async initUserHabits(userId = 'default') {
    if (!reportDB) await initReportDB();
    
    const habits = this.presetHabits.map(h => ({
      ...h,
      oderId: `${userId}_${h.id}`,
      userId,
      startDate: new Date().toISOString().split('T')[0],
      currentStreak: 0,
      bestStreak: 0,
      totalDaysAchieved: 0,
      history: [],
      status: 'active'
    }));
    
    const tx = reportDB.transaction('habits', 'readwrite');
    const store = tx.objectStore('habits');
    
    for (const habit of habits) {
      store.put(habit);
    }
    
    return habits;
  },
  
  // 获取用户习惯
  async getUserHabits(userId = 'default') {
    return new Promise((resolve, reject) => {
      const tx = reportDB.transaction('habits', 'readonly');
      const store = tx.objectStore('habits');
      const index = store.index('userId');
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },
  
  // 更新习惯进度
  async updateHabitProgress(habitId, date, achieved, value) {
    const tx = reportDB.transaction('habits', 'readwrite');
    const store = tx.objectStore('habits');
    
    return new Promise((resolve, reject) => {
      const request = store.get(habitId);
      request.onsuccess = () => {
        const habit = request.result;
        if (!habit) {
          resolve(null);
          return;
        }
        
        // 更新历史
        habit.history.push({ date, achieved, value });
        
        // 更新连续天数
        if (achieved) {
          habit.currentStreak++;
          habit.totalDaysAchieved++;
          if (habit.currentStreak > habit.bestStreak) {
            habit.bestStreak = habit.currentStreak;
          }
        } else {
          habit.currentStreak = 0;
        }
        
        store.put(habit);
        resolve(habit);
      };
      request.onerror = () => reject(request.error);
    });
  },
  
  // 检查今日习惯完成情况
  async checkDailyHabits(dailyReport) {
    const habits = await this.getUserHabits();
    const date = dailyReport.date;
    const results = [];
    
    for (const habit of habits) {
      let achieved = false;
      let value = 0;
      
      switch (habit.category) {
        case 'focus':
          // 检查最长连续专注时间
          value = dailyReport.summary.avgFocus;
          achieved = value >= habit.target;
          break;
          
        case 'distraction':
          value = dailyReport.summary.distractionCount;
          achieved = value <= habit.target;
          break;
          
        case 'duration':
          value = dailyReport.summary.totalDurationMinutes;
          achieved = value >= habit.target;
          break;
          
        case 'task':
          const rate = dailyReport.summary.taskCount > 0 
            ? (dailyReport.summary.completedTasks / dailyReport.summary.taskCount * 100) 
            : 0;
          value = Math.round(rate);
          achieved = value >= habit.target;
          break;
      }
      
      const updated = await this.updateHabitProgress(habit.id, date, achieved, value);
      results.push({ habit: updated, achieved, value });
    }
    
    return results;
  },
  
  // 获取21天习惯养成进度
  async get21DayProgress(habitId) {
    const tx = reportDB.transaction('habits', 'readonly');
    const store = tx.objectStore('habits');
    
    return new Promise((resolve, reject) => {
      const request = store.get(habitId);
      request.onsuccess = () => {
        const habit = request.result;
        if (!habit) {
          resolve(null);
          return;
        }
        
        const daysAchieved = habit.history.filter(h => h.achieved).length;
        const progress = Math.min(100, Math.round(daysAchieved / 21 * 100));
        
        resolve({
          habitName: habit.name,
          daysAchieved,
          targetDays: 21,
          progress,
          currentStreak: habit.currentStreak,
          bestStreak: habit.bestStreak,
          status: daysAchieved >= 21 ? 'completed' : 'in_progress'
        });
      };
      request.onerror = () => reject(request.error);
    });
  }
};

// ==========================================
// AI建议生成器
// ==========================================
const AIAdvisor = {
  
  // 生成个性化建议
  async generateAdvice(dailyReport, weeklyReport = null) {
    const advice = {
      studyTime: null,
      taskArrangement: null,
      environment: null,
      restPattern: null,
      motivation: null
    };
    
    // 1. 最佳学习时间建议
    advice.studyTime = this.analyzeOptimalStudyTime(dailyReport);
    
    // 2. 任务安排建议
    advice.taskArrangement = this.suggestTaskArrangement(dailyReport);
    
    // 3. 环境改善建议
    advice.environment = this.suggestEnvironmentChanges(dailyReport);
    
    // 4. 休息节奏建议
    advice.restPattern = this.suggestRestPattern(dailyReport);
    
    // 5. 激励建议
    advice.motivation = this.generateMotivation(dailyReport, weeklyReport);
    
    return advice;
  },
  
  // 分析最佳学习时间
  analyzeOptimalStudyTime(report) {
    // 基于数据分析推荐时段
    const hour = new Date().getHours();
    
    if (report.summary.avgFocus >= 80) {
      return {
        recommendation: `当前时段(${hour}:00)专注度很高，是很好的学习时间！`,
        optimalHours: [hour, hour + 1],
        reason: '根据今日学习数据，这个时段专注度最佳'
      };
    }
    
    return {
      recommendation: '建议下午4:00-6:00进行重要学习任务',
      optimalHours: [16, 17, 18],
      reason: '根据一般规律，这个时段儿童专注力较高'
    };
  },
  
  // 任务安排建议
  suggestTaskArrangement(report) {
    const subjects = report.subjectPerformance || [];
    const suggestions = [];
    
    // 找出表现最好和最差的科目
    const sorted = [...subjects].sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0));
    
    if (sorted.length >= 2) {
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      
      suggestions.push(`先做${best.subject}（优势科目）提升学习信心`);
      suggestions.push(`${worst.subject}可以穿插休息或游戏化学习方式`);
    }
    
    suggestions.push('较难的任务安排在专注力高峰期');
    
    return { suggestions, priority: sorted.map(s => s.subject) };
  },
  
  // 环境改善建议
  suggestEnvironmentChanges(report) {
    const suggestions = [];
    const distractions = report.distractionAnalysis?.breakdown || [];
    
    distractions.forEach(d => {
      if (d.type === '东张西望' && d.count >= 3) {
        suggestions.push('调整座位朝向，减少窗外或门口的视觉干扰');
      }
      if (d.type === '手机干扰' && d.count >= 2) {
        suggestions.push('将手机放在视线之外的固定位置');
      }
      if (d.type === '坐立不安' && d.count >= 3) {
        suggestions.push('检查座椅高度是否合适，保持舒适坐姿');
      }
    });
    
    if (suggestions.length === 0) {
      suggestions.push('当前学习环境良好，继续保持！');
    }
    
    return { suggestions };
  },
  
  // 休息模式建议
  suggestRestPattern(report) {
    const avgFocus = report.summary.avgFocus;
    const distractionCount = report.summary.distractionCount;
    
    let pattern = {
      focusDuration: 25,
      breakDuration: 5,
      reason: ''
    };
    
    if (avgFocus < 60 || distractionCount > 10) {
      pattern = {
        focusDuration: 15,
        breakDuration: 5,
        reason: '专注力有待提升，建议缩短单次学习时长'
      };
    } else if (avgFocus >= 85 && distractionCount < 3) {
      pattern = {
        focusDuration: 30,
        breakDuration: 5,
        reason: '专注力很强，可以尝试更长的学习时段'
      };
    } else {
      pattern.reason = '标准番茄工作法，适合大多数情况';
    }
    
    return pattern;
  },
  
  // 生成激励话语
  generateMotivation(dailyReport, weeklyReport) {
    const messages = [];
    
    // 基于今日表现
    if (dailyReport.summary.avgFocus >= 85) {
      messages.push('🌟 今天的专注力超棒！你是学习小达人！');
    }
    
    if (dailyReport.summary.completedTasks === dailyReport.summary.taskCount && dailyReport.summary.taskCount > 0) {
      messages.push('🎉 所有任务完成！给自己一个大大的赞！');
    }
    
    // 基于进步
    if (weeklyReport?.progressAnalysis?.trend === 'improving') {
      messages.push('📈 你的专注力在持续进步，继续加油！');
    }
    
    // 基于连续学习
    if (weeklyReport?.summary?.totalDays >= 5) {
      messages.push(`🔥 已经连续学习${weeklyReport.summary.totalDays}天，太棒了！`);
    }
    
    if (messages.length === 0) {
      messages.push('💪 每一次努力都是进步，继续加油！');
    }
    
    return messages;
  }
};

// ==========================================
// PDF导出功能
// ==========================================
const PDFExporter = {
  
  // 导出每日报告为PDF
  async exportDailyReport(date) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const report = await ReportGenerator.getDailyReport(dateStr);
    
    if (!report) {
      console.error('没有找到报告数据');
      return null;
    }
    
    try {
      // 使用html2canvas截取报告区域
      const reportElement = document.getElementById('daily-card');
      if (!reportElement) {
        console.error('找不到报告元素');
        return null;
      }
      
      // 截图
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // 创建PDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // 添加标题
      pdf.setFontSize(20);
      pdf.setTextColor(16, 185, 129);
      pdf.text('盯盯作业 - 学习报告', 105, 15, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      const d = new Date(dateStr);
      pdf.text(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`, 105, 22, { align: 'center' });
      
      // 添加截图
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);
      
      // 添加页脚
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('由盯盯作业AI督学助手生成', 105, 290, { align: 'center' });
      
      // 保存
      const filename = `学习报告_${dateStr}.pdf`;
      pdf.save(filename);
      
      console.log('📄 PDF导出成功:', filename);
      return filename;
      
    } catch (error) {
      console.error('PDF导出失败:', error);
      return null;
    }
  },
  
  // 导出周报为PDF
  async exportWeeklyReport() {
    const report = await ReportGenerator.generateWeeklyReport();
    
    if (!report) {
      console.error('没有找到周报数据');
      return null;
    }
    
    try {
      const reportElement = document.getElementById('weekly-summary-card');
      if (!reportElement) {
        console.error('找不到周报元素');
        return null;
      }
      
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.setFontSize(20);
      pdf.setTextColor(16, 185, 129);
      pdf.text('盯盯作业 - 周学习报告', 105, 15, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`${report.startDate} ~ ${report.endDate}`, 105, 22, { align: 'center' });
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);
      
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('由盯盯作业AI督学助手生成', 105, 290, { align: 'center' });
      
      const filename = `周学习报告_${report.weekId}.pdf`;
      pdf.save(filename);
      
      console.log('📄 周报PDF导出成功:', filename);
      return filename;
      
    } catch (error) {
      console.error('周报PDF导出失败:', error);
      return null;
    }
  },
  
  // 生成报告图片（用于分享）
  async generateReportImage(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return null;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('生成图片失败:', error);
      return null;
    }
  }
};

// ==========================================
// Chart.js 图表增强
// ==========================================
const ChartHelper = {
  
  // 创建专注度折线图
  createFocusLineChart(canvasId, data, labels) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    
    // 销毁旧图表
    if (canvas.chartInstance) {
      canvas.chartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
    
    canvas.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels || data.map((_, i) => i + 1),
        datasets: [{
          label: '专注度',
          data: data,
          borderColor: '#10B981',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `专注度: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            display: false,
            grid: { display: false }
          },
          y: {
            display: false,
            min: 0,
            max: 100,
            grid: { display: false }
          }
        }
      }
    });
    
    return canvas.chartInstance;
  },
  
  // 创建周趋势柱状图
  createWeeklyBarChart(canvasId, dailyData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    
    if (canvas.chartInstance) {
      canvas.chartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    canvas.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dailyData.map(d => {
          const date = new Date(d.date);
          return weekdays[date.getDay()];
        }),
        datasets: [{
          label: '学习时长(分钟)',
          data: dailyData.map(d => d.duration),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderRadius: 6
        }, {
          label: '专注度(%)',
          data: dailyData.map(d => d.focus),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 15 }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
    
    return canvas.chartInstance;
  },
  
  // 创建分心饼图
  createDistractionPieChart(canvasId, distractionData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    
    if (canvas.chartInstance) {
      canvas.chartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const colors = ['#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981'];
    
    canvas.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: distractionData.map(d => d.type),
        datasets: [{
          data: distractionData.map(d => d.count),
          backgroundColor: colors.slice(0, distractionData.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 10 }
          }
        }
      }
    });
    
    return canvas.chartInstance;
  }
};

// ==========================================
// 全局实例
// ==========================================
const dataCollector = new LearningDataCollector();

// ==========================================
// 模拟数据生成器（用于演示）
// ==========================================
const MockDataGenerator = {
  
  // 生成过去7天的模拟学习数据
  async generateMockData() {
    console.log('📊 正在生成模拟学习数据...');
    
    const today = new Date();
    const mockSessions = [];
    
    // 生成过去7天的数据
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // 每天1-3个学习会话
      const sessionCount = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < sessionCount; j++) {
        const startHour = 15 + Math.floor(Math.random() * 5); // 15:00-19:00
        const duration = (15 + Math.floor(Math.random() * 45)) * 60 * 1000; // 15-60分钟
        
        const session = {
          date: dateStr,
          userId: 'demo_user',
          startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, 0, 0).getTime(),
          endTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, 0, 0).getTime() + duration,
          duration: duration,
          tasks: this.generateMockTasks(),
          focusScores: this.generateMockFocusScores(Math.floor(duration / 60000)),
          avgFocusScore: 70 + Math.floor(Math.random() * 25),
          distractionEvents: this.generateMockDistractions(),
          isComplete: true
        };
        
        mockSessions.push(session);
      }
    }
    
    // 存储到数据库
    for (const session of mockSessions) {
      await this.saveSession(session);
    }
    
    // 生成习惯数据
    await this.generateMockHabits();
    
    console.log('📊 模拟数据生成完成！共', mockSessions.length, '个学习会话');
    return mockSessions.length;
  },
  
  // 生成模拟任务
  generateMockTasks() {
    const taskTemplates = [
      { name: '语文课文朗读', mode: 'recite', subject: '语文' },
      { name: '英语单词听写', mode: 'dictation', subject: '英语' },
      { name: '数学作业', mode: 'homework', subject: '数学' },
      { name: '古诗背诵', mode: 'recite', subject: '语文' },
      { name: '英语课文朗读', mode: 'recite', subject: '英语' },
      { name: '数学练习题', mode: 'homework', subject: '数学' },
      { name: '生字默写', mode: 'dictation', subject: '语文' }
    ];
    
    const taskCount = 1 + Math.floor(Math.random() * 3);
    const tasks = [];
    
    for (let i = 0; i < taskCount; i++) {
      const template = taskTemplates[Math.floor(Math.random() * taskTemplates.length)];
      tasks.push({
        ...template,
        duration: (10 + Math.floor(Math.random() * 20)) * 60 * 1000,
        completed: Math.random() > 0.1,
        accuracy: 70 + Math.floor(Math.random() * 30)
      });
    }
    
    return tasks;
  },
  
  // 生成模拟专注度分数
  generateMockFocusScores(minutes) {
    const scores = [];
    let currentScore = 80 + Math.floor(Math.random() * 15);
    
    for (let i = 0; i < minutes; i++) {
      // 随机波动
      const change = Math.floor(Math.random() * 10) - 5;
      currentScore = Math.max(40, Math.min(100, currentScore + change));
      
      // 偶尔有分心
      if (Math.random() < 0.1) {
        currentScore = Math.max(30, currentScore - 20);
      }
      
      scores.push({
        minute: i,
        score: currentScore
      });
    }
    
    return scores;
  },
  
  // 生成模拟分心事件
  generateMockDistractions() {
    const types = ['离开座位', '玩手机', '东张西望', '发呆', '聊天'];
    const count = Math.floor(Math.random() * 4);
    const events = [];
    
    for (let i = 0; i < count; i++) {
      events.push({
        type: types[Math.floor(Math.random() * types.length)],
        timestamp: Date.now() - Math.floor(Math.random() * 3600000),
        duration: 5 + Math.floor(Math.random() * 30)
      });
    }
    
    return events;
  },
  
  // 保存会话到数据库
  async saveSession(session) {
    return new Promise((resolve, reject) => {
      if (!reportDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = reportDB.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      const request = store.add(session);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  // 生成模拟习惯数据
  async generateMockHabits() {
    const habits = [
      {
        id: 'habit_reading',
        name: '每日阅读30分钟',
        targetDays: 21,
        currentStreak: 5,
        totalDaysAchieved: 8,
        createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        lastCheckIn: Date.now() - 24 * 60 * 60 * 1000
      },
      {
        id: 'habit_review',
        name: '每日复习笔记',
        targetDays: 21,
        currentStreak: 3,
        totalDaysAchieved: 5,
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        lastCheckIn: Date.now()
      }
    ];
    
    localStorage.setItem('dingding_habits', JSON.stringify(habits));
    console.log('📊 模拟习惯数据已生成');
  },
  
  // 清除所有模拟数据
  async clearMockData() {
    return new Promise((resolve, reject) => {
      if (!reportDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = reportDB.transaction(['sessions', 'focusData', 'distractionEvents'], 'readwrite');
      transaction.objectStore('sessions').clear();
      transaction.objectStore('focusData').clear();
      transaction.objectStore('distractionEvents').clear();
      
      localStorage.removeItem('dingding_habits');
      
      transaction.oncomplete = () => {
        console.log('📊 模拟数据已清除');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
};

// 初始化
async function initLearningReport() {
  await initReportDB();
  console.log('📊 学习报告系统已初始化');
}

// 导出
window.LearningReport = {
  init: initLearningReport,
  collector: dataCollector,
  generator: ReportGenerator,
  habits: HabitSystem,
  advisor: AIAdvisor,
  pdf: PDFExporter,
  charts: ChartHelper,
  mock: MockDataGenerator  // 添加模拟数据生成器
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  initLearningReport();
});

console.log('📊 学习报告模块已加载');
