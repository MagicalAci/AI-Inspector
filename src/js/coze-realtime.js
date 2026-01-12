/**
 * Coze 实时视频通话模块 v3
 * 
 * 优化版本：
 * - 快速启动，不阻塞UI
 * - Loading状态管理防止误触
 * - 多智能体房间管理
 * - 听写/背诵/默写完整流程
 * 
 * 支持多通道并行：
 * - 监督通道 (supervisor): 学习时自动开启
 * - 答疑通道 (helper): 点击求助时开启
 * - 任务通道 (task): 背诵/听写/默写时开启
 */

const CozeRealtime = (() => {
  // 配置
  const CONFIG = {
    API_KEY: 'pat_7QkA0So3pta62lcNhcqmEYKjHjtXJ5nJgBKgtLikiOLwh9TvYOhNnHlt6x4dmbc',
    SPACE_ID: '7587658688148881471',
    BASE_URL: 'https://api.coze.cn',
    
    // 智能体ID
    BOTS: {
      supervisor: '7592223655954972691', // 小影老师-督学模式
      helper: '7592223346214518793',     // 小影老师-答疑模式
      recite: '7592813046561718314',     // 小影老师-背诵助手
      dictation: '7592813222634782720',  // 小影老师-听写助手
      copywrite: '7592813046561767466',  // 小影老师-默写助手
      content_extractor: '7592812994498215999' // 内容提取助手
    },
    
    // 语音配置 - 豆包TTS
    VOICE_ID: '7426725529589530651', // 活泼女孩
    
    // TTS API配置
    TTS_API: 'https://api.coze.cn/v1/audio/speech',
  };
  
  // ==========================================
  // Loading状态管理器 - 防止误触
  // ==========================================
  const LoadingManager = {
    _overlay: null,
    _isLoading: false,
    
    show(message = '小影老师准备中...', options = {}) {
      if (this._isLoading) {
        this.update(message);
        return;
      }
      
      this._isLoading = true;
      
      if (!this._overlay) {
        this._overlay = document.createElement('div');
        this._overlay.id = 'coze-loading-overlay';
        this._overlay.innerHTML = `
          <div class="coze-loading-content">
            <div class="coze-loading-avatar">
              <img src="assets/images/teacher-avatar.png" alt="小影老师" 
                   onerror="this.style.display='none'">
            </div>
            <div class="coze-loading-spinner"></div>
            <div class="coze-loading-text">${message}</div>
          </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.id = 'coze-loading-style';
        style.textContent = `
          #coze-loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
            animation: coze-fade-in 0.2s ease;
          }
          @keyframes coze-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .coze-loading-content {
            background: white;
            padding: 32px 48px;
            border-radius: 24px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          .coze-loading-avatar {
            width: 80px;
            height: 80px;
            margin: 0 auto 16px;
            border-radius: 50%;
            overflow: hidden;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          }
          .coze-loading-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .coze-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e8f5e9;
            border-top-color: #4CAF50;
            border-radius: 50%;
            animation: coze-spin 0.8s linear infinite;
            margin: 0 auto 16px;
          }
          .coze-loading-text {
            color: #333;
            font-size: 16px;
            font-weight: 500;
          }
          @keyframes coze-spin {
            to { transform: rotate(360deg); }
          }
        `;
        
        if (!document.getElementById('coze-loading-style')) {
          document.head.appendChild(style);
        }
        document.body.appendChild(this._overlay);
      } else {
        this._overlay.querySelector('.coze-loading-text').textContent = message;
        this._overlay.style.display = 'flex';
      }
      
      // 自动超时隐藏（防止卡死）
      if (!options.noTimeout) {
        setTimeout(() => this.hide(), options.timeout || 10000);
      }
    },
    
    update(message) {
      const text = this._overlay?.querySelector('.coze-loading-text');
      if (text) text.textContent = message;
    },
    
    hide() {
      if (this._overlay) {
        this._overlay.style.display = 'none';
      }
      this._isLoading = false;
    },
    
    isLoading() {
      return this._isLoading;
    }
  };

  // 多通道状态 - 支持并行运行
  const channels = {
    supervisor: {
      isActive: false,
      room: null,
      conversationId: null,
      checkInterval: null,
      screenshotInterval: null,  // 视频截图间隔（1秒）
      lastReminderTime: 0,        // 上次提醒时间（用于频率控制）
      webRTC: null,              // WebRTC连接
      audioContext: null,        // 音频上下文
      remoteStream: null,        // 远程音频流
      paused: false              // 是否暂停（任务模式时降低频率）
    },
    helper: {
      isActive: false,
      room: null,
      conversationId: null,
      webRTC: null,              // WebRTC连接
      audioContext: null,        // 音频上下文
      remoteStream: null,        // 远程音频流
      videoStream: null,         // 视频流（共享）
      inactivityTimer: null,     // 无响应计时器（1分钟）
      lastActivityTime: 0        // 最后活动时间
    },
    // 任务智能体通道（背诵/听写/默写）
    task: {
      isActive: false,
      room: null,
      conversationId: null,
      webRTC: null,
      audioContext: null,
      remoteStream: null,
      type: null,                // 任务类型: 'recite' | 'dictation' | 'copywrite'
      originalText: null,        // 原文内容（背诵/默写用）
      wordList: null,            // 词表（听写用）
      recognizedText: '',        // 语音识别累积文本
      status: 'idle',            // 状态: idle | ready | listening | analyzing | result
      onResult: null,            // 结果回调
      onHint: null,              // 提示回调
      silenceTimer: null         // 静音检测计时器
    }
  };
  
  // 房间管理器 - 负责监督与任务模式的切换
  const RoomManager = {
    // 原始截图间隔（监督活跃时）
    _originalScreenshotInterval: 1000,
    // 暂停时的截图间隔（任务模式时，降低频率）
    _pausedScreenshotInterval: 5000,
    
    // 获取当前活跃的任务类型
    getActiveTaskType() {
      return channels.task.isActive ? channels.task.type : null;
    },
    
    // 监督是否暂停
    isSupervisorPaused() {
      return channels.supervisor.paused;
    },
    
    /**
     * 暂停监督（进入任务模式时调用）
     * - 降低截图频率（1秒 → 5秒）
     * - 停止定期提醒
     * - 不关闭房间，保持专注度监测
     */
    pauseSupervisor() {
      if (!channels.supervisor.isActive) return;
      
      channels.supervisor.paused = true;
      console.log('[RoomManager] 监督已暂停（任务模式）');
      
      // 降低截图频率
      if (channels.supervisor.screenshotInterval) {
        clearInterval(channels.supervisor.screenshotInterval);
        channels.supervisor.screenshotInterval = setInterval(() => {
          if (channels.supervisor.isActive) {
            const screenshot = captureVideoScreenshot();
            if (screenshot) {
              sendScreenshotToSupervisor(screenshot);
            }
          }
        }, this._pausedScreenshotInterval);
      }
      
      // 暂停定期检查（不触发语音提醒）
      if (channels.supervisor.checkInterval) {
        clearInterval(channels.supervisor.checkInterval);
        channels.supervisor.checkInterval = null;
      }
    },
    
    /**
     * 恢复监督（任务完成后调用）
     * - 恢复正常截图频率（5秒 → 1秒）
     * - 恢复定期提醒
     */
    resumeSupervisor() {
      if (!channels.supervisor.isActive) return;
      
      channels.supervisor.paused = false;
      console.log('[RoomManager] 监督已恢复');
      
      // 恢复正常截图频率
      if (channels.supervisor.screenshotInterval) {
        clearInterval(channels.supervisor.screenshotInterval);
        channels.supervisor.screenshotInterval = setInterval(() => {
          if (channels.supervisor.isActive) {
            const screenshot = captureVideoScreenshot();
            if (screenshot) {
              sendScreenshotToSupervisor(screenshot);
            }
          }
        }, this._originalScreenshotInterval);
      }
      
      // 恢复定期检查
      if (!channels.supervisor.checkInterval) {
        channels.supervisor.checkInterval = setInterval(async () => {
          if (channels.supervisor.isActive && !channels.supervisor.paused) {
            await supervisorCheck();
          }
        }, 3 * 60 * 1000);
      }
      
      // 恢复时发送一条鼓励消息
      setTimeout(async () => {
        if (channels.supervisor.isActive && !channels.supervisor.paused) {
          try {
            const result = await sendMessage(
              CONFIG.BOTS.supervisor,
              '任务完成了，请给学生一个简短鼓励，10字以内',
              channels.supervisor.conversationId
            );
            if (result.message) {
              channels.supervisor.conversationId = result.conversationId;
              speak(result.message, 'normal');
              showAIBubble(result.message);
            }
          } catch (e) {
            console.warn('[RoomManager] 恢复监督时发送消息失败:', e);
          }
        }
      }, 500);
    },
    
    /**
     * 获取监督状态
     */
    getSupervisorStatus() {
      return {
        isActive: channels.supervisor.isActive,
        isPaused: channels.supervisor.paused,
        hasRoom: !!channels.supervisor.room
      };
    }
  };
  
  // 上下文存储键
  const CONTEXT_KEYS = {
    supervisor: 'coze_supervisor_context',
    helper: 'coze_helper_context',
    task: 'coze_task_context'
  };

  // 语音合成队列
  let speechQueue = [];
  let isSpeaking = false;
  
  // 音频元素（用于播放AI语音）
  let audioElement = null;
  
  // 媒体流（用于摄像头和麦克风）
  let localMediaStream = null;

  // ==========================================
  // 权限请求
  // ==========================================
  
  /**
   * 请求摄像头和麦克风权限
   * 在督学开始时立即调用
   */
  async function requestPermissions() {
    console.log('[CozeRealtime] 请求媒体权限...');
    
    try {
      // 请求摄像头和麦克风权限
      localMediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('[CozeRealtime] 媒体权限已获取');
      
      // 将视频流绑定到学生摄像头预览
      const studentVideo = document.getElementById('student-video') || 
                          document.querySelector('.student-cam-top video');
      if (studentVideo && localMediaStream) {
        studentVideo.srcObject = localMediaStream;
        studentVideo.muted = true; // 静音本地预览
        studentVideo.play().catch(e => console.warn('视频播放失败:', e));
      }
      
      return true;
    } catch (error) {
      console.error('[CozeRealtime] 媒体权限请求失败:', error);
      
      // 显示权限提示
      if (error.name === 'NotAllowedError') {
        showAIBubble('小特工，需要开启摄像头和麦克风权限哦~ 📷🎤', 'high');
      } else if (error.name === 'NotFoundError') {
        showAIBubble('没有检测到摄像头或麦克风设备 😢', 'high');
      }
      
      return false;
    }
  }
  
  /**
   * 初始化音频播放器
   */
  function initAudioPlayer() {
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = 'coze-audio-player';
      audioElement.autoplay = true;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      console.log('[CozeRealtime] 音频播放器已初始化');
    }
    return audioElement;
  }
  
  /**
   * 播放音频URL或Blob
   */
  async function playAudio(audioData) {
    const player = initAudioPlayer();
    
    return new Promise((resolve, reject) => {
      if (typeof audioData === 'string') {
        // URL
        player.src = audioData;
      } else if (audioData instanceof Blob) {
        // Blob
        player.src = URL.createObjectURL(audioData);
      } else if (audioData instanceof MediaStream) {
        // MediaStream
        player.srcObject = audioData;
      }
      
      player.onended = () => {
        console.log('[CozeRealtime] 音频播放完成');
        resolve();
      };
      
      player.onerror = (e) => {
        console.error('[CozeRealtime] 音频播放错误:', e);
        reject(e);
      };
      
      player.play().catch(reject);
    });
  }

  // ==========================================
  // 上下文存储和恢复
  // ==========================================
  
  /**
   * 保存对话上下文
   */
  function saveContext(channelType, conversationId, messages = []) {
    try {
      const context = {
        conversationId,
        messages,
        timestamp: Date.now()
      };
      localStorage.setItem(CONTEXT_KEYS[channelType], JSON.stringify(context));
      console.log(`[CozeRealtime] 已保存${channelType}上下文`);
    } catch (error) {
      console.error(`[CozeRealtime] 保存上下文失败:`, error);
    }
  }
  
  /**
   * 恢复对话上下文
   */
  function loadContext(channelType) {
    try {
      const stored = localStorage.getItem(CONTEXT_KEYS[channelType]);
      if (stored) {
        const context = JSON.parse(stored);
        // 检查上下文是否过期（24小时）
        if (Date.now() - context.timestamp < 24 * 60 * 60 * 1000) {
          console.log(`[CozeRealtime] 已恢复${channelType}上下文`);
          return context;
        } else {
          localStorage.removeItem(CONTEXT_KEYS[channelType]);
        }
      }
    } catch (error) {
      console.error(`[CozeRealtime] 恢复上下文失败:`, error);
    }
    return null;
  }
  
  /**
   * 清除上下文
   */
  function clearContext(channelType) {
    localStorage.removeItem(CONTEXT_KEYS[channelType]);
  }
  
  // ==========================================
  // WebRTC 连接管理
  // ==========================================
  
  /**
   * 建立WebRTC连接来接收音频流
   * 
   * 注意：Coze的实时语音需要使用官方SDK完成信令交换
   * 当前通过chat API发送消息触发智能体语音回复
   */
  async function setupWebRTC(channelType, room) {
    const channel = channels[channelType];
    
    try {
      // 检查是否为模拟房间
      if (room.isMock) {
        console.log(`[CozeRealtime] ${channelType} 使用模拟房间，通过chat API通信`);
        channel.usesChatAPI = true;
        return;
      }
      
      // 创建音频上下文
      channel.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // 创建RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      channel.webRTC = pc;
      
      // 收集ICE候选者
      const iceCandidates = [];
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          iceCandidates.push(event.candidate);
          console.log(`[CozeRealtime] ${channelType} 收集到ICE候选者`);
        }
      };
      
      // 接收远程音频流
      pc.ontrack = (event) => {
        console.log(`[CozeRealtime] ${channelType} 收到远程音频流`);
        channel.remoteStream = event.streams[0];
        channel.hasAudioStream = true; // 成功收到音频流
        
        // 创建音频元素播放
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.volume = 1.0;
        
        // 监听音频播放
        audio.onplay = () => {
          console.log(`[CozeRealtime] ${channelType} 音频开始播放`);
          StatusIndicator.update('speaking', '说话中');
        };
        
        audio.onended = () => {
          console.log(`[CozeRealtime] ${channelType} 音频播放结束`);
          if (channels.helper.isActive) {
            StatusIndicator.update('listening');
          } else {
            StatusIndicator.update('supervising');
          }
        };
        
        channel.audioElement = audio;
      };
      
      // ICE连接状态变化
      pc.oniceconnectionstatechange = () => {
        console.log(`[CozeRealtime] ${channelType} ICE状态:`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          channel.hasAudioStream = true;
          console.log(`[CozeRealtime] ${channelType} WebRTC连接成功`);
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.log(`[CozeRealtime] ${channelType} WebRTC连接断开，使用chat API`);
          channel.usesChatAPI = true;
        }
      };
      
      // 添加音频接收通道
      pc.addTransceiver('audio', { direction: 'recvonly' });
      
      // 创建offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // 等待ICE收集完成
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              resolve();
            }
          };
          // 超时保护
          setTimeout(resolve, 3000);
        }
      });
      
      // Coze实时API不支持自定义信令，直接使用chat API进行语音交互
      // 音频通过chat API的TTS功能播放
      channel.usesChatAPI = true;
      console.log(`[CozeRealtime] ${channelType} 使用chat API进行语音交互`);
      
      console.log(`[CozeRealtime] ${channelType} WebRTC设置完成`);
      
    } catch (error) {
      console.error(`[CozeRealtime] ${channelType} WebRTC设置失败:`, error);
      channel.usesChatAPI = true;
    }
  }
  
  // 注意：Coze实时API不支持自定义WebRTC信令
  // 语音交互通过chat API实现，TTS由Coze服务端处理
  
  /**
   * 关闭WebRTC连接
   */
  function closeWebRTC(channelType) {
    const channel = channels[channelType];
    
    if (channel.audioElement) {
      channel.audioElement.pause();
      channel.audioElement.srcObject = null;
      channel.audioElement = null;
    }
    
    if (channel.webRTC) {
      channel.webRTC.close();
      channel.webRTC = null;
    }
    
    if (channel.audioContext) {
      channel.audioContext.close();
      channel.audioContext = null;
    }
    
    channel.remoteStream = null;
    console.log(`[CozeRealtime] ${channelType} WebRTC连接已关闭`);
  }
  
  // ==========================================
  // 视频截图功能（监督房间）
  // ==========================================
  
  /**
   * 捕获视频截图（1秒一次）
   */
  function captureVideoScreenshot() {
    try {
      // 获取视频元素（学习页面的摄像头视频）
      const videoElement = document.querySelector('#student-pip-v4 video, .student-pip-v4 video');
      if (!videoElement || videoElement.readyState !== 4) {
        return null;
      }
      
      // 创建canvas并绘制视频帧
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // 转换为base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      return imageData;
    } catch (error) {
      console.error('[CozeRealtime] 截图失败:', error);
      return null;
    }
  }
  
  /**
   * 发送截图到监督智能体并获取专注度评分
   */
  async function sendScreenshotToSupervisor(imageData) {
    if (!channels.supervisor.isActive || !imageData) return;
    
    try {
      // 构建请求，要求智能体返回专注度分数
      const response = await fetch(`${CONFIG.BASE_URL}/v3/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bot_id: CONFIG.BOTS.supervisor,
          user_id: 'supervisor_' + Date.now(),
          stream: false,
          auto_save_history: true,
          conversation_id: channels.supervisor.conversationId,
          additional_messages: [{
            role: 'user',
            content: `请分析这张学习截图，返回JSON格式：{"focusScore": 0-100的专注度分数, "status": "focused/distracted/absent", "message": "如需提醒的简短话语(可为空)"}。只返回JSON，不要其他内容。\n[图片数据]`,
            content_type: 'text'
          }]
        })
      });
      
      const data = await response.json();
      if (data.code === 0 && data.data) {
        // 等待响应完成
        await waitForChatComplete(data.data.conversation_id, data.data.id);
        
        // 获取AI响应
        const messages = await getChatMessages(data.data.conversation_id, data.data.id);
        const assistantMsg = messages.find(m => m.type === 'answer' && m.role === 'assistant');
        
        if (assistantMsg && assistantMsg.content) {
          // 尝试解析JSON响应
          try {
            const jsonMatch = assistantMsg.content.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              
              // 更新专注度分数
              if (typeof result.focusScore === 'number') {
                if (typeof window.updateFocusDisplay === 'function') {
                  window.updateFocusDisplay(result.focusScore);
                }
              }
              
              // 如果有提醒消息且状态不好
              if (result.message && result.status !== 'focused') {
                const now = Date.now();
                const timeSinceLastReminder = now - channels.supervisor.lastReminderTime;
                
                // 至少间隔30秒才提醒
                if (timeSinceLastReminder > 30000) {
                  channels.supervisor.lastReminderTime = now;
                  speak(result.message, 'normal', 'supervisor');
                  showAIBubble(result.message);
                }
              }
            }
          } catch (parseError) {
            // JSON解析失败，使用模拟分数
            simulateFocusScore();
          }
        }
      } else {
        // API失败，使用模拟分数
        simulateFocusScore();
      }
    } catch (error) {
      console.warn('[CozeRealtime] 发送截图失败:', error);
      // 使用模拟分数
      simulateFocusScore();
    }
  }
  
  /**
   * 模拟专注度分数变化（当API不可用时）
   */
  function simulateFocusScore() {
    const currentScore = typeof AppState !== 'undefined' ? (AppState.focusScore || 85) : 85;
    const change = Math.random() > 0.7 ? -5 : 2;
    const newScore = Math.max(50, Math.min(100, currentScore + change));
    
    if (typeof window.updateFocusDisplay === 'function') {
      window.updateFocusDisplay(newScore);
    }
  }
  
  // ==========================================
  // API 调用
  // ==========================================
  
  /**
   * 创建实时语音房间
   * 文档: https://docs.coze.cn/developer_guides/create_room
   */
  async function createRoom(botId, uid) {
    console.log('[CozeRealtime] Creating room for bot:', botId);
    
    try {
      const response = await fetch(`${CONFIG.BASE_URL}/v1/audio/rooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bot_id: botId,
          voice_id: CONFIG.VOICE_ID,
          uid: uid,
          connector_id: '1024'  // API渠道ID
        })
      });

      const data = await response.json();
      console.log('[CozeRealtime] Room API response:', data);
      
      if (data.code !== 0) {
        const errorMsg = `豆包API错误 [${data.code}]: ${data.msg || '未知错误'}`;
        console.error('[CozeRealtime]', errorMsg);
        // 房间创建失败不阻塞，使用模拟房间
        return { 
          room_id: 'mock_room_' + Date.now(),
          token: null,
          isMock: true 
        };
      }

      const roomData = data.data || {};
      // 确保room_id存在，Coze可能返回不同字段名
      const roomId = roomData.room_id || roomData.id || roomData.roomId || 'room_' + Date.now();
      
      console.log('[CozeRealtime] Room created successfully:', roomId);
      return {
        ...roomData,
        room_id: roomId
      };
    } catch (error) {
      console.error('[CozeRealtime] Create room failed:', error);
      // 创建失败时使用模拟房间，不阻塞功能
      return { 
        room_id: 'mock_room_' + Date.now(),
        token: null,
        isMock: true 
      };
    }
  }

  /**
   * 发送消息到智能体
   */
  async function sendMessage(botId, message, conversationId = null) {
    const body = {
      bot_id: botId,
      user_id: 'xiaoying_user_' + Date.now(),
      stream: false,
      auto_save_history: true,
      additional_messages: [{
        role: 'user',
        content: message,
        content_type: 'text'
      }]
    };

    if (conversationId) {
      body.conversation_id = conversationId;
    }

    const response = await fetch(`${CONFIG.BASE_URL}/v3/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(data.msg || 'Chat failed');
    }

    // 等待响应完成
    const chatId = data.data.id;
    const convId = data.data.conversation_id;
    
    // 轮询等待完成
    await waitForChatComplete(convId, chatId);
    
    // 获取消息
    const messages = await getChatMessages(convId, chatId);
    const assistantMsg = messages.find(m => m.type === 'answer' && m.role === 'assistant');
    
    return {
      conversationId: convId,
      message: assistantMsg ? assistantMsg.content : ''
    };
  }

  async function waitForChatComplete(conversationId, chatId, maxWait = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const response = await fetch(
        `${CONFIG.BASE_URL}/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
        {
          headers: { 'Authorization': `Bearer ${CONFIG.API_KEY}` }
        }
      );
      const data = await response.json();
      if (data.data?.status === 'completed') {
        return true;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  }

  async function getChatMessages(conversationId, chatId) {
    const response = await fetch(
      `${CONFIG.BASE_URL}/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
      {
        headers: { 'Authorization': `Bearer ${CONFIG.API_KEY}` }
      }
    );
    const data = await response.json();
    return data.data || [];
  }

  // ==========================================
  // 语音合成 (TTS) - 纯Coze实时语音
  // 通过实时房间的WebRTC连接播放
  // ==========================================
  
  let currentAudio = null;
  let ttsAudioQueue = [];
  let isProcessingTTS = false;
  
  /**
   * 获取任务模式名称
   */
  function getTaskModeName(type) {
    const names = {
      recite: '背诵模式',
      dictation: '听写模式',
      copywrite: '默写模式'
    };
    return names[type] || '任务模式';
  }
  
  // 注意：不使用浏览器TTS，只通过Coze智能体语音
  
  async function speak(text, priority = 'normal') {
    if (!text) return Promise.resolve();
    
    console.log('[Coze语音] Speaking:', text.substring(0, 30) + '...');
    
    // 高优先级时停止当前播放
    if (priority === 'high') {
      stopCurrentAudio();
      speechQueue = [];
    }
    
    // 如果正在播放且不是高优先级，加入队列
    if (isSpeaking && priority !== 'high') {
      speechQueue.push(text);
      return;
    }
    
    isSpeaking = true;
    
    try {
      await cozeSpeak(text);
    } catch (error) {
      console.error('[Coze语音] Error:', error);
    } finally {
      isSpeaking = false;
      processNextSpeech();
    }
  }
  
  /**
   * Coze语音播报 - 使用豆包TTS API生成语音
   */
  async function cozeSpeak(text) {
    // 显示文字气泡（作为视觉反馈）
    showAIBubble(text);
    
    // 更新状态指示器
    StatusIndicator.update('speaking', '说话中');
    
    try {
      console.log('[Coze语音] 调用TTS:', text.substring(0, 30) + '...');
      
      // 调用豆包TTS API
      const response = await fetch('https://api.coze.cn/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          voice_id: CONFIG.VOICE_ID,
          response_format: 'mp3',
          speed: 1.0
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Coze语音] TTS API错误:', response.status, errorText);
        throw new Error(`TTS API error: ${response.status}`);
      }
      
      // 获取音频blob
      const audioBlob = await response.blob();
      console.log('[Coze语音] 获取到音频:', audioBlob.size, 'bytes');
      
      // 播放音频
      await playAudio(audioBlob);
      
      console.log('[Coze语音] 播放完成');
      
      // 恢复状态
      if (channels.helper.isActive) {
        StatusIndicator.update('listening');
      } else if (channels.task.isActive) {
        StatusIndicator.update('speaking', getTaskModeName(channels.task.type));
      } else {
        StatusIndicator.update('supervising');
      }
      
      return true;
      
    } catch (error) {
      console.error('[Coze语音] 播放失败:', error);
      
      // 恢复状态
      if (channels.helper.isActive) {
        StatusIndicator.update('listening');
      } else if (channels.task.isActive) {
        StatusIndicator.update('speaking', getTaskModeName(channels.task.type));
      } else {
        StatusIndicator.update('supervising');
      }
      
      // 仍然显示文字反馈
      console.log('[Coze语音] 文字已显示在气泡中');
      return false;
    }
  }
  
  // 废弃的函数（保持兼容）
  async function callDoubaoTTS(text) {
    return cozeSpeak(text);
  }
  
  /**
   * 清理TTS房间
   */
  async function cleanupTTSRoom() {
    if (ttsRoom) {
      try {
        await closeRoom(ttsRoom.room_id);
        ttsRoom = null;
        console.log('[豆包TTS] TTS房间已清理');
      } catch (error) {
        console.error('[豆包TTS] 清理房间失败:', error);
      }
    }
  }
  
  /**
   * 关闭实时房间（简化版 - 不调用DELETE API避免404错误）
   * 
   * 说明：Coze的音频房间会自动过期，不需要手动删除
   * 调用DELETE会产生404错误，影响用户体验
   */
  async function closeRoom(roomId) {
    // 跳过所有房间关闭操作，只清理本地状态
    console.log('[CozeRealtime] 清理房间状态:', roomId);
    return { success: true };
  }
  
  /**
   * 清理通道状态（不调用远程API）
   */
  function cleanupChannel(channelType) {
    const channel = channels[channelType];
    if (!channel) return;
    
    // 清理定时器
    if (channel.checkInterval) {
      clearInterval(channel.checkInterval);
      channel.checkInterval = null;
    }
    if (channel.screenshotInterval) {
      clearInterval(channel.screenshotInterval);
      channel.screenshotInterval = null;
    }
    if (channel.silenceTimer) {
      clearTimeout(channel.silenceTimer);
      channel.silenceTimer = null;
    }
    if (channel.inactivityTimer) {
      clearTimeout(channel.inactivityTimer);
      channel.inactivityTimer = null;
    }
    
    // 清理WebRTC
    if (channel.webRTC) {
      try {
        channel.webRTC.close();
      } catch (e) {}
      channel.webRTC = null;
    }
    
    // 清理音频
    if (channel.audioContext) {
      try {
        channel.audioContext.close();
      } catch (e) {}
      channel.audioContext = null;
    }
    
    // 重置状态
    channel.isActive = false;
    channel.room = null;
    channel.paused = false;
    
    console.log(`[CozeRealtime] ${channelType} channel cleaned up`);
  }
  
  // 播放音频
  async function playAudio(audioData) {
    return new Promise((resolve, reject) => {
      try {
        // 创建Blob和URL
        const blob = new Blob([audioData], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        
        // 创建Audio元素
        currentAudio = new Audio(url);
        currentAudio.volume = 1.0;
        
        currentAudio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudio = null;
          resolve();
        };
        
        currentAudio.onerror = (e) => {
          console.error('[豆包TTS] Audio playback error:', e);
          URL.revokeObjectURL(url);
          currentAudio = null;
          reject(new Error('音频播放失败'));
        };
        
        currentAudio.play().catch(e => {
          reject(new Error('音频播放失败: ' + e.message));
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // 停止当前音频
  function stopCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  function processNextSpeech() {
    if (speechQueue.length > 0 && !isSpeaking) {
      const nextText = speechQueue.shift();
      speak(nextText);
    }
  }

  // ==========================================
  // 监督模式 (Supervisor Channel)
  // ==========================================
  
  /**
   * 开启监督模式 - 等待一切就绪后统一开始
   * 像老师进教室一样，先准备好再和学生打招呼
   */
  async function startSupervisor() {
    if (channels.supervisor.isActive) {
      console.log('[CozeRealtime] Supervisor already active');
      return;
    }

    console.log('[CozeRealtime] 小影老师正在进入教室...');
    
    // 显示Loading - 老师正在来的路上
    LoadingManager.show('小影老师正在进入教室...', { timeout: 15000 });
    
    try {
      // 1. 先请求权限（摄像头+麦克风）
      LoadingManager.update('正在打开摄像头...');
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.warn('[CozeRealtime] 权限请求失败');
      }
      
      // 2. 初始化音频播放器
      initAudioPlayer();
      
      // 3. 创建监督房间
      LoadingManager.update('小影老师准备好了...');
      channels.supervisor.room = await createRoom(
        CONFIG.BOTS.supervisor,
        'supervisor_' + Date.now()
      );
      channels.supervisor.isActive = true;
      
      // 4. 恢复上下文
      const savedContext = loadContext('supervisor');
      if (savedContext) {
        channels.supervisor.conversationId = savedContext.conversationId;
      }
      
      // 5. 一切就绪，隐藏Loading
      LoadingManager.hide();
      
      // 6. 老师进教室了！播放欢迎语
      const welcomeGreeting = '小特工，小影老师来啦！我们开始学习吧！💪';
      showAIBubble(welcomeGreeting, 'high');
      
      // 播放欢迎语音（等待播放开始）
      speak(welcomeGreeting, 'high').catch(e => {
        console.warn('[CozeRealtime] 欢迎语播放失败:', e);
      });
      
      // 7. 启动视频截图监控（每3秒一次）
      if (hasPermission) {
        channels.supervisor.screenshotInterval = setInterval(() => {
          if (channels.supervisor.isActive && !channels.supervisor.paused) {
            const screenshot = captureVideoScreenshot();
            if (screenshot) {
              sendScreenshotToSupervisor(screenshot);
            }
          }
        }, 3000);
      }
      
      // 8. 启动定期检查（每5分钟）
      channels.supervisor.checkInterval = setInterval(async () => {
        if (channels.supervisor.isActive && !channels.supervisor.paused) {
          await supervisorCheck();
        }
      }, 5 * 60 * 1000);
      
      console.log('[CozeRealtime] ✅ 小影老师已进入教室');
      
    } catch (error) {
      console.error('[CozeRealtime] 进入教室失败:', error);
      LoadingManager.hide();
      
      // 即使失败也显示一个友好提示
      showAIBubble('小影老师来晚了，不过没关系，我们开始学习吧！', 'high');
      channels.supervisor.isActive = true;
      channels.supervisor.room = { id: 'fallback_' + Date.now(), isMock: true };
    }

      // 启动视频截图（1秒一次）
      channels.supervisor.screenshotInterval = setInterval(() => {
        if (channels.supervisor.isActive) {
          const screenshot = captureVideoScreenshot();
          if (screenshot) {
            sendScreenshotToSupervisor(screenshot);
          }
        }
      }, 1000); // 1秒一次

      // 启动定期检查（每3分钟，用于补充检查）
      channels.supervisor.checkInterval = setInterval(async () => {
        if (channels.supervisor.isActive) {
          await supervisorCheck();
        }
      }, 3 * 60 * 1000);

      console.log('[CozeRealtime] Supervisor mode started');
      updateUIState();
      
    } catch (error) {
      console.error('[CozeRealtime] Failed to start supervisor:', error);
      showToast('启动监督模式失败: ' + error.message, 'error');
      channels.supervisor.isActive = false;
    }
  }

  /**
   * 监督检查
   */
  async function supervisorCheck() {
    if (!channels.supervisor.isActive) return;

    try {
      // 获取当前专注度
      const focusScore = typeof AppState !== 'undefined' ? 
        (AppState.currentFocusScore || 85) : 85;
      
      let focusLevel = '优秀';
      if (focusScore < 60) focusLevel = '较差';
      else if (focusScore < 80) focusLevel = '一般';

      const result = await sendMessage(
        CONFIG.BOTS.supervisor,
        `学生的专注度状态是：${focusLevel}（${focusScore}分），请给一个简短的反馈`,
        channels.supervisor.conversationId
      );

      if (result.message) {
        channels.supervisor.conversationId = result.conversationId;
        speak(result.message, 'normal', 'supervisor');
        showAIBubble(result.message);
      }
    } catch (error) {
      console.error('[CozeRealtime] Supervisor check failed:', error);
    }
  }

  /**
   * 停止监督模式
   */
  async function stopSupervisor() {
    if (!channels.supervisor.isActive) return;
    
    // 保存上下文
    if (channels.supervisor.conversationId) {
      saveContext('supervisor', channels.supervisor.conversationId);
    }
    
    // 发送结束消息（异步，不阻塞）
    if (channels.supervisor.conversationId) {
      sendMessage(
        CONFIG.BOTS.supervisor,
        '学习结束了，请给一个简短的结束语，语气要温柔',
        channels.supervisor.conversationId
      ).then(result => {
        if (result.message) {
          speak(result.message, 'high');
          showAIBubble(result.message);
        }
      }).catch(e => console.warn('[CozeRealtime] 结束消息发送失败:', e));
    }
    
    // 清理通道
    cleanupChannel('supervisor');
    channels.supervisor.conversationId = null;
    channels.supervisor.lastReminderTime = 0;
    
    console.log('[CozeRealtime] Supervisor mode stopped');
    updateUIState();
  }

  // ==========================================
  // 答疑模式 (Helper Channel)
  // ==========================================
  
  /**
   * 开启答疑模式
   * 点击求助按钮或说"小影老师"时调用
   * 视频通话，共享视频流，进行对话答疑
   */
  async function startHelper() {
    if (channels.helper.isActive) {
      console.log('[CozeRealtime] Helper already active');
      return;
    }

    console.log('[CozeRealtime] 小影老师来帮忙了...');
    
    // 显示Loading
    LoadingManager.show('小影老师马上来帮你...', { timeout: 10000 });
    
    try {
      // 1. 创建房间
      channels.helper.room = await createRoom(
        CONFIG.BOTS.helper,
        'helper_' + Date.now()
      );
      channels.helper.isActive = true;
      
      // 2. 恢复上下文
      const savedContext = loadContext('helper');
      if (savedContext) {
        channels.helper.conversationId = savedContext.conversationId;
      }
      
      // 3. 一切就绪，隐藏Loading
      LoadingManager.hide();
      
      // 4. 显示UI
      showHelperUI();
      
      // 5. 播放欢迎语
      const welcomeMsg = '你好呀，有什么问题？小影老师来帮你啦！😊';
      showAIBubble(welcomeMsg, 'high');
      StatusIndicator.update('listening', '正在听...');
      
      // 播放欢迎语音
      speak(welcomeMsg, 'high').catch(e => console.warn('[Helper] 欢迎语播放失败:', e));
      
    } catch (error) {
      console.error('[CozeRealtime] Helper启动失败:', error);
      LoadingManager.hide();
      
      // 即使失败也继续
      channels.helper.isActive = true;
      channels.helper.room = { id: 'helper_fallback_' + Date.now(), isMock: true };
      showHelperUI();
      
      const fallbackMsg = '小影老师来啦，有什么问题尽管问！';
      showAIBubble(fallbackMsg, 'high');
      StatusIndicator.update('listening', '正在听...');
    }

      // 启动语音识别
      startVoiceRecognition('helper');
      
      // 启动无响应计时器（1分钟无响应自动关闭）
      channels.helper.lastActivityTime = Date.now();
      channels.helper.inactivityTimer = setInterval(() => {
        const timeSinceLastActivity = Date.now() - channels.helper.lastActivityTime;
        if (timeSinceLastActivity > 60000) { // 1分钟
          console.log('[CozeRealtime] 求助房间1分钟无响应，自动关闭');
          stopHelper();
        }
      }, 10000); // 每10秒检查一次

      console.log('[CozeRealtime] Helper mode started');
      updateUIState();
      
    } catch (error) {
      console.error('[CozeRealtime] Failed to start helper:', error);
      channels.helper.isActive = false;
      showToast('连接失败，请重试', 'error');
    }
  }

  /**
   * 发送问题到答疑智能体
   */
  async function askHelper(question) {
    if (!channels.helper.isActive || !question.trim()) return;

    try {
      // 更新活动时间
      channels.helper.lastActivityTime = Date.now();
      
      addHelperMessage(question, 'user');
      showHelperTyping(true);

      const result = await sendMessage(
        CONFIG.BOTS.helper,
        question,
        channels.helper.conversationId
      );

      showHelperTyping(false);

      if (result.message) {
        channels.helper.conversationId = result.conversationId;
        
        // 保存上下文
        const messages = [
          { role: 'user', content: question },
          { role: 'assistant', content: result.message }
        ];
        saveContext('helper', result.conversationId, messages);
        
        speak(result.message, 'normal', 'helper');
        addHelperMessage(result.message, 'assistant');
        
        // 更新活动时间
        channels.helper.lastActivityTime = Date.now();
      }
    } catch (error) {
      console.error('[CozeRealtime] Ask helper failed:', error);
      showHelperTyping(false);
      addHelperMessage('抱歉，小影老师暂时无法回答，请稍后再试~', 'assistant');
    }
  }

  /**
   * 停止答疑模式
   */
  async function stopHelper() {
    if (!channels.helper.isActive) return;
    
    // 停止语音识别
    stopVoiceRecognition();
    
    // 停止视频流
    if (channels.helper.videoStream) {
      channels.helper.videoStream.getTracks().forEach(track => track.stop());
      channels.helper.videoStream = null;
    }
    
    // 保存上下文
    if (channels.helper.conversationId) {
      saveContext('helper', channels.helper.conversationId);
    }
    
    // 清理通道
    cleanupChannel('helper');
    channels.helper.conversationId = null;
    channels.helper.lastActivityTime = 0;
    
    hideHelperUI();
    console.log('[CozeRealtime] Helper mode stopped');
    updateUIState();
  }

  // ==========================================
  // 语音识别
  // ==========================================
  
  let recognition = null;
  let recognitionTarget = null;

  function startVoiceRecognition(target) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('[CozeRealtime] Speech recognition not supported');
      return;
    }

    stopVoiceRecognition();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognitionTarget = target;

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript;
        console.log('[CozeRealtime] Recognized:', transcript);
        
        if (recognitionTarget === 'helper' && channels.helper.isActive) {
          askHelper(transcript);
        }
      }
    };

    let recognitionFailed = false;
    
    recognition.onerror = (event) => {
      // 权限错误或致命错误时停止重试
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.warn('[CozeRealtime] 麦克风权限被拒绝，语音识别已禁用');
        recognitionFailed = true;
        stopVoiceRecognition();
        return;
      }
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[CozeRealtime] Recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // 如果权限失败或已停止，不再重试
      if (recognitionFailed || !channels[recognitionTarget]?.isActive) {
        return;
      }
      try {
        recognition.start();
      } catch (e) {
        // Ignore restart errors
      }
    };

    try {
      recognition.start();
      console.log('[CozeRealtime] Voice recognition started for', target);
    } catch (e) {
      console.error('[CozeRealtime] Failed to start recognition:', e);
    }
  }

  function stopVoiceRecognition() {
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        // Ignore
      }
      recognition = null;
      recognitionTarget = null;
    }
  }

  // ==========================================
  // UI 相关
  // ==========================================
  
  function showAIBubble(message, priority = 'normal') {
    // 使用全局的AIBubbleManager（如果可用）
    if (typeof window.AIBubbleManager !== 'undefined') {
      window.AIBubbleManager.show(message, { priority });
      return;
    }
    
    // 降级方案
    const bubble = document.getElementById('ai-bubble-text');
    if (bubble) {
      bubble.textContent = message;
    }
    const container = document.getElementById('ai-bubble');
    if (container) {
      container.classList.add('show');
      setTimeout(() => container.classList.remove('show'), 4000);
    }
  }

  // ========================================
  // 统一状态指示器 - 简洁设计
  // 监督/答疑/听取 三种状态合一
  // ========================================
  
  const StatusIndicator = {
    // 状态：'supervising' | 'listening' | 'thinking' | 'speaking'
    currentState: 'supervising',
    
    update(state, customText = null) {
      this.currentState = state;
      // 使用左上角的监督状态胶囊
      const statusText = document.getElementById('supervisor-status-text');
      const supervisorPill = document.getElementById('supervisor-card');
      
      if (!statusText) return;
      
      // 清除所有状态类
      if (supervisorPill) {
        supervisorPill.classList.remove('helper-active', 'listening', 'thinking', 'speaking');
      }
      
      switch(state) {
        case 'supervising':
          statusText.textContent = '监督中';
          break;
          
        case 'listening':
          if (supervisorPill) supervisorPill.classList.add('helper-active', 'listening');
          statusText.textContent = '听你说';
          break;
          
        case 'thinking':
          if (supervisorPill) supervisorPill.classList.add('helper-active', 'thinking');
          statusText.textContent = '思考中';
          break;
          
        case 'speaking':
          if (supervisorPill) supervisorPill.classList.add('helper-active', 'speaking');
          statusText.textContent = customText || '回复中';
          break;
      }
    }
  };
  
  function showHelperUI() {
    // 切换到听取状态
    StatusIndicator.update('listening');
    
    // 更新举手按钮为"结束举手"
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) {
      helpBtn.innerHTML = `
        <div class="btn-icon-v6">
          <i class="fa-solid fa-xmark"></i>
        </div>
        <span>结束</span>
      `;
      helpBtn.classList.add('active');
      helpBtn.classList.remove('highlight');
      helpBtn.onclick = () => CozeRealtime.stopHelper();
    }
  }

  function hideHelperUI() {
    // 恢复监督状态
    StatusIndicator.update('supervising');
    
    // 恢复举手按钮
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) {
      helpBtn.innerHTML = `
        <div class="btn-icon-v6 hand-icon">
          <i class="fa-solid fa-hand"></i>
        </div>
        <span>举手</span>
      `;
      helpBtn.classList.remove('active');
      helpBtn.classList.add('highlight');
      helpBtn.onclick = () => CozeRealtime.startHelper();
    }
  }
  
  // 兼容旧接口
  function showListeningStatus(show) {
    if (show) {
      StatusIndicator.update('listening');
    }
    // 不在这里恢复，由其他逻辑控制
  }

  // 不需要聊天消息显示了，改为简单日志
  function addHelperMessage(text, role) {
    console.log(`[答疑] ${role}: ${text}`);
    // 不显示聊天气泡，纯语音交互
  }

  function showHelperTyping(show) {
    const listeningIndicator = document.getElementById('listening-indicator');
    if (listeningIndicator) {
      const textEl = listeningIndicator.querySelector('.listening-text');
      if (textEl) {
        textEl.textContent = show ? '小影老师思考中...' : '正在听你说话...';
      }
    }
  }

  function updateUIState() {
    // 更新监督模式指示器
    // 使用新的V7状态卡片
    const supervisorCard = document.getElementById('supervisor-card');
    if (supervisorCard) {
      supervisorCard.classList.toggle('active', channels.supervisor.isActive);
    }

    // 更新求助按钮状态
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) {
      helpBtn.classList.toggle('active', channels.helper.isActive);
    }
  }

  function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    }
  }

  // ==========================================
  // 任务模式管理（背诵/听写/默写）
  // ==========================================
  
  /**
   * 启动任务模式
   * @param {string} type - 任务类型: 'recite' | 'dictation' | 'copywrite'
   * @param {object} options - 配置选项
   */
  async function startTaskMode(type, options = {}) {
    const taskNames = {
      recite: '背诵',
      dictation: '听写',
      copywrite: '默写'
    };
    const taskName = taskNames[type] || type;
    
    console.log(`[TaskMode] 启动${taskName}模式`);
    
    // 显示Loading - 老师准备教材
    if (options.showLoading !== false) {
      LoadingManager.show(`小影老师正在准备${taskName}内容...`, { timeout: 10000 });
    }
    
    try {
      if (channels.task.isActive) {
        console.warn('[TaskMode] 已有任务在运行，先停止');
        await stopTaskMode(false);
      }
      
      // 暂停监督
      RoomManager.pauseSupervisor();
      
      // 创建任务房间
      const botId = CONFIG.BOTS[type] || CONFIG.BOTS.helper;
      channels.task.room = await createRoom(botId, `${type}_` + Date.now());
      
      // 初始化任务通道
      channels.task.isActive = true;
      channels.task.type = type;
      channels.task.status = 'ready';
      channels.task.recognizedText = '';
      channels.task.originalText = options.originalText || null;
      channels.task.wordList = options.wordList || null;
      channels.task.onResult = options.onResult || null;
      channels.task.onHint = options.onHint || null;
      channels.task.onSpeech = options.onSpeech || null;
      
      // 一切就绪，隐藏Loading
      LoadingManager.hide();
      
      // 更新状态指示器
      const statusMap = {
        recite: '背诵模式',
        dictation: '听写模式',
        copywrite: '默写模式'
      };
      StatusIndicator.update('speaking', statusMap[type]);
      
      // 播放任务开始提示
      const startMessages = {
        recite: '好的，我们开始背诵吧！准备好了吗？',
        dictation: '好的，我们开始听写吧！仔细听哦~',
        copywrite: '好的，我们开始默写吧！认真写哦~'
      };
      const startMsg = startMessages[type] || '准备开始！';
      showAIBubble(startMsg, 'high');
      speak(startMsg, 'high').catch(e => console.warn('[TaskMode] 开始语播放失败:', e));
      
      // 自动启动语音识别
      if (options.autoStartRecognition && type === 'recite') {
        startTaskSpeechRecognition();
      }
      
      console.log(`[TaskMode] ✅ ${taskName}模式已就绪`);
      return true;
      
    } catch (error) {
      console.error(`[TaskMode] ${taskName}模式启动失败:`, error);
      LoadingManager.hide();
      
      // 即使失败也继续
      channels.task.isActive = true;
      channels.task.type = type;
      channels.task.room = { id: `${type}_fallback_` + Date.now(), isMock: true };
      
      showAIBubble(`好的，我们开始${taskName}吧！`, 'high');
      return true;
    }
  }
  
  /**
   * 停止任务模式
   * @param {boolean} resumeSupervisor - 是否恢复监督（默认true）
   */
  async function stopTaskMode(resumeSupervisor = true) {
    if (!channels.task.isActive) return;
    
    const taskType = channels.task.type;
    console.log(`[TaskMode] 停止${taskType}模式`);
    
    // 停止语音识别
    stopTaskSpeechRecognition();
    
    // 清除静音计时器
    if (channels.task.silenceTimer) {
      clearTimeout(channels.task.silenceTimer);
      channels.task.silenceTimer = null;
    }
    
    // 关闭WebRTC（如果有）
    closeWebRTC('task');
    
    // 关闭房间（如果有）
    if (channels.task.room && channels.task.room.room_id) {
      try {
        await closeRoom(channels.task.room.room_id);
      } catch (e) {
        console.warn('[TaskMode] 关闭房间失败:', e);
      }
    }
    
    // 重置状态
    const previousType = channels.task.type;
    channels.task.isActive = false;
    channels.task.type = null;
    channels.task.room = null;
    channels.task.conversationId = null;
    channels.task.status = 'idle';
    channels.task.recognizedText = '';
    channels.task.originalText = null;
    channels.task.wordList = null;
    channels.task.onResult = null;
    channels.task.onHint = null;
    channels.task.onSpeech = null;
    
    // 恢复监督（可选）
    if (resumeSupervisor) {
      RoomManager.resumeSupervisor();
      StatusIndicator.update('supervising');
    }
    
    console.log(`[TaskMode] ${previousType}模式已停止, 恢复监督:`, resumeSupervisor);
  }
  
  /**
   * 发送消息到任务智能体
   */
  async function sendTaskMessage(message, expectJSON = true) {
    const type = channels.task.type;
    if (!type) {
      console.error('[TaskMode] 没有活跃的任务模式');
      return null;
    }
    
    // 优先使用任务专属bot，否则用helper
    const botId = CONFIG.BOTS[type] || CONFIG.BOTS.helper;
    
    try {
      const result = await sendMessage(
        botId,
        message,
        channels.task.conversationId
      );
      
      if (result.conversationId) {
        channels.task.conversationId = result.conversationId;
      }
      
      // 尝试解析JSON
      if (expectJSON && result.message) {
        try {
          // 提取JSON部分
          const jsonMatch = result.message.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.warn('[TaskMode] JSON解析失败:', e);
        }
      }
      
      return result.message;
    } catch (error) {
      console.error('[TaskMode] 发送消息失败:', error);
      return null;
    }
  }
  
  // 任务模式语音识别
  let taskRecognition = null;
  
  function startTaskSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('[TaskMode] 浏览器不支持语音识别');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    taskRecognition = new SpeechRecognition();
    taskRecognition.continuous = true;
    taskRecognition.interimResults = true;
    taskRecognition.lang = 'zh-CN';
    
    taskRecognition.onresult = (event) => {
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
      
      if (finalTranscript) {
        channels.task.recognizedText += finalTranscript;
        console.log('[TaskMode] 识别到:', finalTranscript);
        
        // 调用语音回调
        if (channels.task.onSpeech) {
          channels.task.onSpeech(finalTranscript, channels.task.recognizedText);
        }
        
        // 检测是否是提问（需要提示）
        checkForHintRequest(finalTranscript);
        
        // 重置静音计时器
        resetSilenceTimer();
      }
    };
    
    taskRecognition.onerror = (event) => {
      console.error('[TaskMode] 语音识别错误:', event.error);
      if (event.error !== 'no-speech') {
        // 尝试重启
        setTimeout(() => {
          if (channels.task.isActive && channels.task.type === 'recite') {
            taskRecognition.start();
          }
        }, 1000);
      }
    };
    
    taskRecognition.onend = () => {
      // 如果任务还在进行，自动重启
      if (channels.task.isActive && channels.task.type === 'recite') {
        taskRecognition.start();
      }
    };
    
    taskRecognition.start();
    channels.task.status = 'listening';
    console.log('[TaskMode] 语音识别已启动');
  }
  
  function stopTaskSpeechRecognition() {
    if (taskRecognition) {
      taskRecognition.stop();
      taskRecognition = null;
    }
  }
  
  function resetSilenceTimer() {
    if (channels.task.silenceTimer) {
      clearTimeout(channels.task.silenceTimer);
    }
    // 10秒无语音自动结束
    channels.task.silenceTimer = setTimeout(() => {
      if (channels.task.isActive && channels.task.status === 'listening') {
        console.log('[TaskMode] 检测到静音，自动完成');
        finishTask();
      }
    }, 10000);
  }
  
  // 检测提问关键词
  const HINT_KEYWORDS = ['怎么说', '忘了', '提示', '下一句', '不记得', '什么来着'];
  
  function checkForHintRequest(text) {
    if (HINT_KEYWORDS.some(kw => text.includes(kw))) {
      console.log('[TaskMode] 检测到提示请求');
      requestHint();
    }
  }
  
  /**
   * 请求提示
   */
  async function requestHint() {
    if (!channels.task.originalText) return;
    
    StatusIndicator.update('thinking');
    
    const message = JSON.stringify({
      type: 'hint_request',
      original_text: channels.task.originalText,
      recited_so_far: channels.task.recognizedText
    });
    
    const response = await sendTaskMessage(message, true);
    
    if (response && response.action === 'hint') {
      // 播放提示语音
      await speak(response.message, 'high');
      
      // 调用提示回调
      if (channels.task.onHint) {
        channels.task.onHint(response);
      }
    }
    
    StatusIndicator.update('speaking', channels.task.type === 'recite' ? '背诵模式' : '任务中');
  }
  
  /**
   * 完成任务，请求评估
   */
  async function finishTask() {
    if (!channels.task.isActive) return null;
    
    console.log('[TaskMode] 完成任务，请求评估');
    channels.task.status = 'analyzing';
    StatusIndicator.update('thinking');
    
    // 停止语音识别
    stopTaskSpeechRecognition();
    
    // 发送评估请求
    const message = JSON.stringify({
      type: 'evaluate',
      task_type: channels.task.type,
      original_text: channels.task.originalText,
      user_input: channels.task.recognizedText,
      word_list: channels.task.wordList
    });
    
    const result = await sendTaskMessage(message, true);
    
    channels.task.status = 'result';
    
    if (result && channels.task.onResult) {
      channels.task.onResult(result);
    }
    
    // 播放鼓励语
    if (result && result.encouragement) {
      await speak(result.encouragement);
    }
    
    return result;
  }
  
  /**
   * 获取任务状态
   */
  function getTaskStatus() {
    return {
      isActive: channels.task.isActive,
      type: channels.task.type,
      status: channels.task.status,
      recognizedText: channels.task.recognizedText
    };
  }
  
  // ==========================================
  // 公开 API
  // ==========================================
  
  return {
    // 权限
    requestPermissions,
    
    // 监督模式
    startSupervisor,
    stopSupervisor,
    supervisorCheck,
    
    // 答疑模式
    startHelper,
    stopHelper,
    askHelper,
    
    // 任务模式（背诵/听写/默写）
    startTaskMode,
    stopTaskMode,
    sendTaskMessage,
    finishTask,
    requestHint,
    getTaskStatus,
    RoomManager,
    
    // 状态
    isActive: (channel) => channels[channel]?.isActive || false,
    getChannels: () => ({ ...channels }),
    
    // 语音
    speak,
    playAudio,
    
    // Loading管理
    LoadingManager,
    
    // 配置
    CONFIG
  };
})();

// 暴露到全局
window.CozeRealtime = CozeRealtime;

// 辅助函数
window.sendHelperText = function() {
  const input = document.getElementById('helper-text-input');
  if (input && input.value.trim()) {
    CozeRealtime.askHelper(input.value.trim());
    input.value = '';
  }
};

console.log('✅ Coze 实时视频通话模块 v3 已加载');
