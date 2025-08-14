class BrowserCloseHandler {
  constructor(brprojectInstance) {
    this.brproject = brprojectInstance;
    this.hasShownDialog = false;
    this.isTaskRunning = false;
    this.currentTask = null;
    this.callbacks = {
      onTaskRunning: null,
      onTaskStopped: null
    };
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startTaskMonitoring();
  }

  setupEventListeners() {
    window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
    
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    
    window.addEventListener('unload', () => this.handleUnload());
    
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  async checkRunningTask() {
    if (!this.brproject || !this.brproject.token) {
      return { isRunning: false, task: null };
    }

    return new Promise((resolve) => {
      this.brproject.getUltimaTarefa({
        success: (data) => {
          if (data.success && 
              data.data && 
              data.data.atividade &&
              data.data.atividade.finalizada != 1) {
            
            const task = {
              id: data.data.atividade.tarefa.idtarefa,
              name: data.data.atividade.tarefa.nome,
              description: data.data.atividade.tarefa.descricao,
              referenceId: data.data.atividade.tarefa.referencia_id,
              startTime: data.data.atividade.data_inicio,
              client: data.data.atividade.tarefa.cliente?.nome,
              project: data.data.atividade.tarefa.projeto?.nome
            };
            
            resolve({ isRunning: true, task });
          } else {
            resolve({ isRunning: false, task: null });
          }
        },
        error: () => {
          resolve({ isRunning: false, task: null });
        }
      });
    });
  }

  async handleBeforeUnload(e) {
    const taskStatus = await this.checkRunningTask();
    
    if (taskStatus.isRunning && !this.hasShownDialog) {
      this.isTaskRunning = true;
      this.currentTask = taskStatus.task;
      
      if (this.callbacks.onTaskRunning) {
        e.preventDefault();
        this.callbacks.onTaskRunning(this.currentTask);
        return;
      }
      
      const message = `Você tem uma tarefa em andamento: "${taskStatus.task.name}". Deseja realmente sair sem finalizá-la?`;
      e.preventDefault();
      e.returnValue = message;
      return message;
    }
  }

  async handleVisibilityChange() {
    if (document.hidden && !this.hasShownDialog) {
      const taskStatus = await this.checkRunningTask();
      
      if (taskStatus.isRunning) {
        this.showTaskDialog(taskStatus.task);
      }
    }
  }

  handleUnload() {
    if (this.isTaskRunning && navigator.sendBeacon && this.brproject) {
      try {
        const payload = JSON.stringify({ action: 'stop_task' });
        const blob = new Blob([payload], { type: 'application/json' });
        
        navigator.sendBeacon(
          `${this.brproject.url}/api/tarefa/parar`,
          blob
        );
      } catch (error) {
        console.error('Erro ao usar sendBeacon:', error);
      }
    }
  }

  handleKeyDown(e) {
    const isClosingKey = 
      (e.ctrlKey && e.key === 'w') || 
      (e.altKey && e.key === 'F4') || 
      (e.ctrlKey && e.shiftKey && e.key === 'W'); 
    
    if (isClosingKey) {
      this.handleBeforeUnload(e);
    }
  }

  async showTaskDialog(task) {
    this.hasShownDialog = true;
    
    const modal = this.createTaskModal(task);
    document.body.appendChild(modal);
    
    modal.focus();
  }

  createTaskModal(task) {
    const modal = document.createElement('div');
    modal.className = 'brproject-close-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const dialogBox = document.createElement('div');
    dialogBox.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      margin: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes modalSlideIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    dialogBox.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <div style="width: 48px; height: 48px; background: #ff9800; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        <div>
          <h2 style="margin: 0; color: #333; font-size: 20px; font-weight: 600;">Tarefa em Andamento</h2>
          <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">Detectamos que você está saindo</p>
        </div>
      </div>
      
      <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1976d2" style="margin-right: 8px;">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <strong style="color: #1976d2;">Tarefa Ativa:</strong>
        </div>
        <p style="margin: 0 0 8px 0; color: #1976d2; font-weight: 500;">${task.name}</p>
        <div style="font-size: 12px; color: #1565c0;">
          <div>Cliente: ${task.client || 'Não informado'}</div>
          <div>Projeto: ${task.project || 'Não informado'}</div>
          <div>Iniciado: ${new Date(task.startTime).toLocaleString()}</div>
        </div>
      </div>
      
      <p style="color: #555; margin-bottom: 24px; line-height: 1.5;">
        Você tem uma tarefa em andamento. Deseja finalizá-la agora ou continuar executando?
      </p>
      
      <div style="display: flex; gap: 12px;">
        <button id="stop-task-btn" style="
          flex: 1;
          background: #f44336;
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        ">Finalizar Tarefa</button>
        
        <button id="continue-task-btn" style="
          flex: 1;
          background: #e0e0e0;
          color: #333;
          border: none;
          padding: 12px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        ">Continuar</button>
      </div>
    `;

    modal.appendChild(dialogBox);

    const stopBtn = dialogBox.querySelector('#stop-task-btn');
    const continueBtn = dialogBox.querySelector('#continue-task-btn');

    stopBtn.addEventListener('click', async () => {
      stopBtn.disabled = true;
      stopBtn.textContent = 'Finalizando...';
      
      await this.stopCurrentTask();
      document.body.removeChild(modal);
      
      if (this.callbacks.onTaskStopped) {
        this.callbacks.onTaskStopped();
      }
    });

    continueBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      this.hasShownDialog = false;
    });

    return modal;
  }

  async stopCurrentTask() {
    if (!this.brproject) return false;

    return new Promise((resolve) => {
      this.brproject.pararTarefa({
        success: (data) => {
          this.isTaskRunning = false;
          this.currentTask = null;
          resolve(true);
        },
        error: (error) => {
          console.error('Erro ao parar tarefa:', error);
          resolve(false);
        }
      });
    });
  }

  startTaskMonitoring() {
    setInterval(async () => {
      const taskStatus = await this.checkRunningTask();
      this.isTaskRunning = taskStatus.isRunning;
      this.currentTask = taskStatus.task;
    }, 30000);
  }

  setCallback(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  destroy() {
    this.hasShownDialog = false;
    this.isTaskRunning = false;
    this.currentTask = null;
  }
}

window.BrowserCloseHandler = BrowserCloseHandler;