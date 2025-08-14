class BrowserCloseHandler {
  constructor(brprojectInstance) {
    console.log('[BrowserCloseHandler] Inicializando...');
    this.brproject = brprojectInstance;
    this.hasShownDialog = false;
    this.isTaskRunning = false;
    this.currentTask = null;
    this.isInitialized = false;
    
    setTimeout(() => {
      this.init();
    }, 1000);
  }

  init() {
    console.log('[BrowserCloseHandler] Configurando event listeners...');
    this.setupEventListeners();
    this.startTaskMonitoring();
    this.isInitialized = true;
    console.log('[BrowserCloseHandler] Inicializado com sucesso!');
    
    this.testHandler();
  }

  testHandler() {
    console.log('[BrowserCloseHandler] Executando teste inicial...');
    console.log('[BrowserCloseHandler] BRProject instance:', this.brproject);
    console.log('[BrowserCloseHandler] Token:', this.brproject?.token ? 'Presente' : 'Ausente');
    console.log('[BrowserCloseHandler] URL:', this.brproject?.url);
  }

  setupEventListeners() {
    window.addEventListener('beforeunload', (e) => {
      console.log('[BrowserCloseHandler] beforeunload disparado');
      this.handleBeforeUnload(e);
    });
    
    try {
      if (window.parent && window.parent !== window) {
        window.parent.addEventListener('beforeunload', (e) => {
          console.log('[BrowserCloseHandler] beforeunload do parent disparado');
          this.handleBeforeUnload(e);
        });
      }
    } catch (e) {
      console.log('[BrowserCloseHandler] Não foi possível adicionar listener no parent:', e);
    }
    
    document.addEventListener('visibilitychange', () => {
      console.log('[BrowserCloseHandler] visibilitychange disparado, hidden:', document.hidden);
      this.handleVisibilityChange();
    });
    
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        window.parent.document.addEventListener('visibilitychange', () => {
          console.log('[BrowserCloseHandler] visibilitychange do parent disparado');
          this.handleVisibilityChange();
        });
      }
    } catch (e) {
      console.log('[BrowserCloseHandler] Não foi possível adicionar visibilitychange no parent:', e);
    }
    
    window.addEventListener('unload', () => {
      console.log('[BrowserCloseHandler] unload disparado');
      this.handleUnload();
    });
    
    try {
      if (window.parent && window.parent !== window) {
        window.parent.addEventListener('unload', () => {
          console.log('[BrowserCloseHandler] unload do parent disparado');
          this.handleUnload();
        });
      }
    } catch (e) {
      console.log('[BrowserCloseHandler] Não foi possível adicionar unload no parent:', e);
    }
    
    document.addEventListener('keydown', (e) => {
      const isClosingKey = 
        (e.ctrlKey && e.key === 'w') || 
        (e.altKey && e.key === 'F4') || 
        (e.ctrlKey && e.shiftKey && e.key === 'W');
      
      if (isClosingKey) {
        console.log('[BrowserCloseHandler] Tecla de fechamento detectada:', e.key);
        e.preventDefault();
        this.handleBeforeUnload(e);
      }
    });
    
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        window.parent.document.addEventListener('keydown', (e) => {
          const isClosingKey = 
            (e.ctrlKey && e.key === 'w') || 
            (e.altKey && e.key === 'F4') || 
            (e.ctrlKey && e.shiftKey && e.key === 'W');
          
          if (isClosingKey) {
            console.log('[BrowserCloseHandler] Tecla de fechamento detectada no parent:', e.key);
            e.preventDefault();
            this.handleBeforeUnload(e);
          }
        });
      }
    } catch (e) {
      console.log('[BrowserCloseHandler] Não foi possível adicionar keydown no parent:', e);
    }
    
    window.addEventListener('pagehide', (e) => {
      console.log('[BrowserCloseHandler] pagehide disparado');
      this.handleBeforeUnload(e);
    });

    console.log('[BrowserCloseHandler] Event listeners configurados');
  }

  async checkRunningTask() {
    console.log('[BrowserCloseHandler] Verificando tarefa em andamento...');
    
    if (!this.brproject || !this.brproject.token) {
      console.log('[BrowserCloseHandler] BRProject ou token não disponível');
      return { isRunning: false, task: null };
    }

    return new Promise((resolve) => {
      this.brproject.getUltimaTarefa({
        success: (data) => {
          console.log('[BrowserCloseHandler] Resposta getUltimaTarefa:', data);
          
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
            
            console.log('[BrowserCloseHandler] Tarefa em andamento encontrada:', task);
            resolve({ isRunning: true, task });
          } else {
            console.log('[BrowserCloseHandler] Nenhuma tarefa em andamento');
            resolve({ isRunning: false, task: null });
          }
        },
        error: (error) => {
          console.log('[BrowserCloseHandler] Erro ao verificar tarefa:', error);
          resolve({ isRunning: false, task: null });
        }
      });
    });
  }

  async handleBeforeUnload(e) {
    console.log('[BrowserCloseHandler] handleBeforeUnload executado');
    
    try {
      const taskStatus = await this.checkRunningTask();
      
      if (taskStatus.isRunning && !this.hasShownDialog) {
        console.log('[BrowserCloseHandler] Tarefa em andamento detectada, mostrando aviso');
        this.isTaskRunning = true;
        this.currentTask = taskStatus.task;
        this.hasShownDialog = true;
        
        this.showTaskDialog(taskStatus.task);
        
        const message = `Você tem uma tarefa em andamento: "${taskStatus.task.name}". Deseja realmente sair sem finalizá-la?`;
        console.log('[BrowserCloseHandler] Mostrando diálogo padrão do navegador');
        
        if (e && e.preventDefault) {
          e.preventDefault();
          e.returnValue = message;
        }
        return message;
      }
    } catch (error) {
      console.error('[BrowserCloseHandler] Erro em handleBeforeUnload:', error);
    }
  }

  async handleVisibilityChange() {
    if (document.hidden && !this.hasShownDialog) {
      console.log('[BrowserCloseHandler] Aba ficou oculta, verificando tarefas...');
      
      const taskStatus = await this.checkRunningTask();
      
      if (taskStatus.isRunning) {
        console.log('[BrowserCloseHandler] Mostrando diálogo por visibilitychange');
        this.showTaskDialog(taskStatus.task);
      }
    }
  }

  handleUnload() {
    console.log('[BrowserCloseHandler] handleUnload executado');
    
    if (this.isTaskRunning && navigator.sendBeacon && this.brproject) {
      try {
        const url = `${this.brproject.url}/api/tarefa/parar`;
        const data = new FormData();
        data.append('action', 'stop_task');
        
        console.log('[BrowserCloseHandler] Tentando sendBeacon para:', url);
        const success = navigator.sendBeacon(url, data);
        console.log('[BrowserCloseHandler] sendBeacon resultado:', success);
      } catch (error) {
        console.error('[BrowserCloseHandler] Erro ao usar sendBeacon:', error);
      }
    }
  }

  showCustomDialog(task) {
    try {
      if (window.parent !== window) {
        console.log('[BrowserCloseHandler] Executando em iframe, usando diálogo padrão');
        return false;
      }
      
      this.showTaskDialog(task);
      return true;
    } catch (error) {
      console.error('[BrowserCloseHandler] Erro ao mostrar diálogo personalizado:', error);
      return false;
    }
  }

  showTaskDialog(task) {
    console.log('[BrowserCloseHandler] Criando diálogo personalizado para tarefa:', task);
    this.hasShownDialog = true;
    
    const existingModal = document.querySelector('.brproject-close-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = this.createTaskModal(task);
    document.body.appendChild(modal);
    
    modal.focus();
    
    console.log('[BrowserCloseHandler] Diálogo criado e adicionado ao DOM');
  }

  createTaskModal(task) {
    const modal = document.createElement('div');
    modal.className = 'brproject-close-modal';
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.8) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    const dialogBox = document.createElement('div');
    dialogBox.style.cssText = `
      background: white !important;
      border-radius: 12px !important;
      padding: 24px !important;
      max-width: 500px !important;
      margin: 20px !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
      animation: modalSlideIn 0.3s ease-out !important;
      position: relative !important;
    `;

    if (!document.querySelector('#brproject-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'brproject-modal-styles';
      style.textContent = `
        @keyframes modalSlideIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

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
        <p style="margin: 0 0 8px 0; color: #1976d2; font-weight: 500;">${task.name || 'Tarefa sem nome'}</p>
        <div style="font-size: 12px; color: #1565c0;">
          <div>Cliente: ${task.client || 'Não informado'}</div>
          <div>Projeto: ${task.project || 'Não informado'}</div>
          <div>Iniciado: ${task.startTime ? new Date(task.startTime).toLocaleString() : 'N/A'}</div>
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
      console.log('[BrowserCloseHandler] Usuário escolheu finalizar tarefa');
      stopBtn.disabled = true;
      stopBtn.textContent = 'Finalizando...';
      
      const success = await this.stopCurrentTask();
      document.body.removeChild(modal);
      
      if (success) {
        console.log('[BrowserCloseHandler] Tarefa finalizada com sucesso');
      } else {
        console.log('[BrowserCloseHandler] Erro ao finalizar tarefa');
      }
    });

    continueBtn.addEventListener('click', () => {
      console.log('[BrowserCloseHandler] Usuário escolheu continuar tarefa');
      document.body.removeChild(modal);
      this.hasShownDialog = false;
    });

    return modal;
  }

  async stopCurrentTask() {
    console.log('[BrowserCloseHandler] Tentando parar tarefa atual...');
    
    if (!this.brproject) {
      console.log('[BrowserCloseHandler] BRProject não disponível');
      return false;
    }

    return new Promise((resolve) => {
      this.brproject.pararTarefa({
        success: (data) => {
          console.log('[BrowserCloseHandler] Tarefa parada com sucesso:', data);
          this.isTaskRunning = false;
          this.currentTask = null;
          resolve(true);
        },
        error: (error) => {
          console.error('[BrowserCloseHandler] Erro ao parar tarefa:', error);
          resolve(false);
        }
      });
    });
  }

  startTaskMonitoring() {
    console.log('[BrowserCloseHandler] Iniciando monitoramento de tarefas...');
    
    setInterval(async () => {
      if (!this.isInitialized) return;
      
      const taskStatus = await this.checkRunningTask();
      this.isTaskRunning = taskStatus.isRunning;
      this.currentTask = taskStatus.task;
      
      if (taskStatus.isRunning) {
        console.log('[BrowserCloseHandler] Monitoramento: Tarefa em andamento -', taskStatus.task.name);
      }
    }, 30000);
  }

  testDialog() {
    console.log('[BrowserCloseHandler] Teste manual do diálogo');
    const mockTask = {
      name: 'Teste - Tarefa de Exemplo',
      client: 'Cliente Teste',
      project: 'Projeto Teste',
      startTime: new Date().toISOString()
    };
    this.showTaskDialog(mockTask);
  }
  
  forceCheck() {
    console.log('[BrowserCloseHandler] Verificação forçada');
    this.handleBeforeUnload(new Event('beforeunload'));
  }

  destroy() {
    console.log('[BrowserCloseHandler] Destruindo handler...');
    this.hasShownDialog = false;
    this.isTaskRunning = false;
    this.currentTask = null;
    this.isInitialized = false;
  }
}

window.BrowserCloseHandler = BrowserCloseHandler;

window.testBrowserCloseHandler = function() {
  if (window.browserCloseHandlerInstance) {
    window.browserCloseHandlerInstance.testDialog();
  } else {
    console.log('Handler não inicializado ainda');
  }
};

window.forceCheckBrowserCloseHandler = function() {
  if (window.browserCloseHandlerInstance) {
    window.browserCloseHandlerInstance.forceCheck();
  } else {
    console.log('Handler não inicializado ainda');
  }
};

console.log('[BrowserCloseHandler] Script carregado com sucesso');