class BrowserCloseHandler {
  constructor(brprojectInstance) {
    console.log('[BrowserCloseHandler] Inicializando...');
    this.brproject = brprojectInstance;
    this.hasShownDialog = false;
    this.isTaskRunning = false;
    this.currentTask = null;
    this.isInitialized = false;
    this.isIframe = window.self !== window.top;
    this.dialogContainer = null;
    
    setTimeout(() => {
      this.init();
    }, 1500);
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
    console.log('[BrowserCloseHandler] É iframe:', this.isIframe);
  }

  setupEventListeners() {
    window.addEventListener('beforeunload', (e) => {
      console.log('[BrowserCloseHandler] beforeunload disparado');
      return this.handleBeforeUnload(e);
    });
    
    window.addEventListener('pagehide', (e) => {
      console.log('[BrowserCloseHandler] pagehide disparado');
      this.handlePageHide(e);
    });
    
    document.addEventListener('visibilitychange', () => {
      console.log('[BrowserCloseHandler] visibilitychange disparado, hidden:', document.hidden);
      this.handleVisibilityChange();
    });
    
    window.addEventListener('unload', () => {
      console.log('[BrowserCloseHandler] unload disparado');
      this.handleUnload();
    });
    
    document.addEventListener('keydown', (e) => {
      const isClosingKey = 
        (e.ctrlKey && e.key === 'w') || 
        (e.altKey && e.key === 'F4') || 
        (e.ctrlKey && e.shiftKey && e.key === 'W');
      
      if (isClosingKey) {
        console.log('[BrowserCloseHandler] Tecla de fechamento detectada:', e.key);
        this.handleBeforeUnload(e);
      }
    });

    if (this.isIframe) {
      this.setupIframeListeners();
    }

    console.log('[BrowserCloseHandler] Event listeners configurados');
  }

  setupIframeListeners() {
    let lastFocusTime = Date.now();
    
    window.addEventListener('focus', () => {
      lastFocusTime = Date.now();
    });
    
    window.addEventListener('blur', () => {
      console.log('[BrowserCloseHandler] Window perdeu foco');
      setTimeout(() => {
        if (Date.now() - lastFocusTime > 2000) {
          console.log('[BrowserCloseHandler] Possível fechamento da janela pai detectado');
          this.handlePossibleClose();
        }
      }, 1000);
    });

    setInterval(() => {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage('ping', '*');
        }
      } catch (e) {
        console.log('[BrowserCloseHandler] Comunicação com parent perdida');
      }
    }, 5000);
  }

  async handlePossibleClose() {
    if (this.hasShownDialog) return;
    
    const taskStatus = await this.checkRunningTask();
    if (taskStatus.isRunning) {
      console.log('[BrowserCloseHandler] Tarefa em andamento detectada durante possível fechamento');
      this.showTaskDialog(taskStatus.task);
    }
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

  handleBeforeUnload(e) {
    console.log('[BrowserCloseHandler] handleBeforeUnload executado');
    
    if (this.hasShownDialog) {
      return; 
    }
    
    this.checkAndShowDialog();
    
    const message = 'Você tem alterações não salvas. Deseja realmente sair?';
    
    if (e) {
      e.preventDefault();
      e.returnValue = message;
    }
    
    return message;
  }

  async checkAndShowDialog() {
    try {
      const taskStatus = await this.checkRunningTask();
      
      if (taskStatus.isRunning && !this.hasShownDialog) {
        console.log('[BrowserCloseHandler] Tarefa em andamento detectada, mostrando aviso');
        this.isTaskRunning = true;
        this.currentTask = taskStatus.task;
        this.showTaskDialog(taskStatus.task);
      }
    } catch (error) {
      console.error('[BrowserCloseHandler] Erro em checkAndShowDialog:', error);
    }
  }

  handlePageHide(e) {
    console.log('[BrowserCloseHandler] handlePageHide executado');
    this.handleBeforeUnload(e);
  }

  async handleVisibilityChange() {
    if (document.hidden && !this.hasShownDialog) {
      console.log('[BrowserCloseHandler] Aba ficou oculta, verificando tarefas...');
      
      setTimeout(async () => {
        if (document.hidden) {
          const taskStatus = await this.checkRunningTask();
          
          if (taskStatus.isRunning) {
            console.log('[BrowserCloseHandler] Mostrando diálogo por visibilitychange');
            this.showTaskDialog(taskStatus.task);
          }
        }
      }, 1000);
    }
  }

  handleUnload() {
    console.log('[BrowserCloseHandler] handleUnload executado');
    
    if (this.isTaskRunning && navigator.sendBeacon && this.brproject) {
      try {
        const url = `${this.brproject.url}/api/tarefa/parar`;
        const data = new FormData();
        data.append('action', 'stop_task');
        data.append('token', this.brproject.token);
        
        console.log('[BrowserCloseHandler] Tentando sendBeacon para:', url);
        const success = navigator.sendBeacon(url, data);
        console.log('[BrowserCloseHandler] sendBeacon resultado:', success);
      } catch (error) {
        console.error('[BrowserCloseHandler] Erro ao usar sendBeacon:', error);
      }
    }
  }

  showTaskDialog(task) {
    console.log('[BrowserCloseHandler] Criando diálogo personalizado para tarefa:', task);
    
    if (this.hasShownDialog) {
      console.log('[BrowserCloseHandler] Diálogo já foi mostrado');
      return;
    }
    
    this.hasShownDialog = true;
    
    this.removeExistingModal();
    
    const modal = this.createTaskModal(task);
    
    const targetContainer = document.body;
    targetContainer.appendChild(modal);
    
    setTimeout(() => {
      modal.focus();
    }, 100);
    
    console.log('[BrowserCloseHandler] Diálogo criado e adicionado ao DOM');
  }

  removeExistingModal() {
    const existingModal = document.querySelector('.brproject-close-modal');
    if (existingModal) {
      existingModal.remove();
    }
  }

  createTaskModal(task) {
    if (!document.querySelector('#brproject-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'brproject-modal-styles';
      style.textContent = `
        .brproject-close-modal {
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
        }
        
        .brproject-modal-dialog {
          background: white !important;
          border-radius: 12px !important;
          padding: 24px !important;
          max-width: 500px !important;
          margin: 20px !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
          animation: modalSlideIn 0.3s ease-out !important;
          position: relative !important;
        }
        
        @keyframes modalSlideIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .brproject-modal button:hover {
          opacity: 0.9;
        }
      `;
      document.head.appendChild(style);
    }

    const modal = document.createElement('div');
    modal.className = 'brproject-close-modal';
    modal.setAttribute('tabindex', '-1');

    const dialogBox = document.createElement('div');
    dialogBox.className = 'brproject-modal-dialog';

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
          background: #4caf50;
          color: white;
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
      
      try {
        const success = await this.stopCurrentTask();
        this.removeModal(modal);
        
        if (success) {
          console.log('[BrowserCloseHandler] Tarefa finalizada com sucesso');
          window.close();
        } else {
          console.log('[BrowserCloseHandler] Erro ao finalizar tarefa');
          this.hasShownDialog = false; 
        }
      } catch (error) {
        console.error('[BrowserCloseHandler] Erro ao finalizar tarefa:', error);
        this.removeModal(modal);
        this.hasShownDialog = false;
      }
    });

    continueBtn.addEventListener('click', () => {
      console.log('[BrowserCloseHandler] Usuário escolheu continuar tarefa');
      this.removeModal(modal);
      this.hasShownDialog = false;
    });

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.removeModal(modal);
        this.hasShownDialog = false;
      }
    });

    return modal;
  }

  removeModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
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
      
      try {
        const taskStatus = await this.checkRunningTask();
        this.isTaskRunning = taskStatus.isRunning;
        this.currentTask = taskStatus.task;
        
        if (taskStatus.isRunning) {
          console.log('[BrowserCloseHandler] Monitoramento: Tarefa em andamento -', taskStatus.task.name);
        }
      } catch (error) {
        console.error('[BrowserCloseHandler] Erro no monitoramento:', error);
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
    this.hasShownDialog = false;
    this.showTaskDialog(mockTask);
  }
  
  forceCheck() {
    console.log('[BrowserCloseHandler] Verificação forçada');
    this.hasShownDialog = false; 
    this.checkAndShowDialog();
  }

  destroy() {
    console.log('[BrowserCloseHandler] Destruindo handler...');
    this.hasShownDialog = false;
    this.isTaskRunning = false;
    this.currentTask = null;
    this.isInitialized = false;
    this.removeExistingModal();
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