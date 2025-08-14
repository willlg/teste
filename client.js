console.log('client.js carregado');

var ICON_BR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8dGV4dCB4PSI4IiB5PSIxMS41IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEuMjUiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJibGFjayIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QlI8L3RleHQ+Cjwvc3ZnPgo=';
var ICON_PLAY = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNC41IDIuNXYxMWw5LTUuNXoiIGZpbGw9ImJsYWNrIi8+Cjwvc3ZnPgo=';
var ICON_PAUSE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cmVjdCB4PSIzLjUiIHk9IjIuNSIgd2lkdGg9IjMiIGhlaWdodD0iMTEiIGZpbGw9ImJsYWNrIi8+CiAgPHJlY3QgeD0iOS41IiB5PSIyLjUiIHdpZHRoPSIzIiBoZWlnaHQ9IjExIiBmaWxsPSJibGFjayIvPgo8L3N2Zz4K';
var INVISIBLE_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9InRyYW5zcGFyZW50IiBvcGFjaXR5PSIwIi8+Cjwvc3ZnPg==';

let globalBrowserCloseHandler = null;
let globalTaskMonitor = null;

class GlobalTaskMonitor {
  constructor() {
    this.isActive = false;
    this.checkInterval = null;
    this.brproject = null;
    this.hasShownDialog = false;
    this.lastTaskCheck = null;
  }

  async initialize(t) {
    console.log('[GlobalTaskMonitor] Inicializando...');
    
    try {
      const userData = await BRProjectUtils.getUserData(t);
      
      if (!userData.token || !userData.url) {
        console.log('[GlobalTaskMonitor] Usuário não logado, não iniciando monitoramento');
        return false;
      }

      if (typeof Brproject === 'undefined') {
        console.log('[GlobalTaskMonitor] Brproject não disponível');
        return false;
      }

      this.brproject = new Brproject();
      this.brproject.token = userData.token;
      this.brproject.url = userData.url;

      this.setupGlobalListeners();
      this.startMonitoring();
      this.isActive = true;

      console.log('[GlobalTaskMonitor] Inicializado com sucesso');
      return true;
      
    } catch (error) {
      console.error('[GlobalTaskMonitor] Erro ao inicializar:', error);
      return false;
    }
  }

  setupGlobalListeners() {
    console.log('[GlobalTaskMonitor] Configurando listeners globais...');

    window.addEventListener('beforeunload', (e) => {
      console.log('[GlobalTaskMonitor] beforeunload detectado');
      return this.handleBeforeUnload(e);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('[GlobalTaskMonitor] Aba ficou oculta');
        setTimeout(() => {
          if (document.hidden) {
            this.handleTabHidden();
          }
        }, 1000);
      }
    });

    document.addEventListener('keydown', (e) => {
      const isClosingKey = 
        (e.ctrlKey && e.key === 'w') || 
        (e.altKey && e.key === 'F4') || 
        (e.ctrlKey && e.shiftKey && e.key === 'W');
      
      if (isClosingKey) {
        console.log('[GlobalTaskMonitor] Tecla de fechamento detectada:', e.key);
        setTimeout(() => this.handleBeforeUnload(e), 0);
      }
    });

    window.addEventListener('unload', () => {
      console.log('[GlobalTaskMonitor] unload detectado');
      this.handleUnload();
    });
  }

  startMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkRunningTasks();
    }, 30000);

    this.checkRunningTasks();
  }

  async checkRunningTasks() {
    if (!this.brproject || !this.brproject.token) {
      return { isRunning: false, task: null };
    }

    return new Promise((resolve) => {
      this.brproject.getUltimaTarefa({
        success: (data) => {
          const result = this.processTaskData(data);
          this.lastTaskCheck = result;
          resolve(result);
        },
        error: (error) => {
          console.log('[GlobalTaskMonitor] Erro ao verificar tarefa:', error);
          resolve({ isRunning: false, task: null });
        }
      });
    });
  }

  processTaskData(data) {
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
      
      return { isRunning: true, task };
    }
    
    return { isRunning: false, task: null };
  }

  handleBeforeUnload(e) {
    console.log('[GlobalTaskMonitor] handleBeforeUnload executado');
    
    if (this.hasShownDialog) {
      return;
    }

    const taskStatus = this.lastTaskCheck;
    
    if (taskStatus && taskStatus.isRunning) {
      console.log('[GlobalTaskMonitor] Tarefa em andamento detectada');
      
      this.showTaskDialog(taskStatus.task);
      
      const message = `Você tem uma tarefa em andamento: "${taskStatus.task.name}". Deseja realmente sair?`;
      
      if (e) {
        e.preventDefault();
        e.returnValue = message;
      }
      
      return message;
    }
  }

  handleTabHidden() {
    if (this.hasShownDialog) return;

    if (this.lastTaskCheck && this.lastTaskCheck.isRunning) {
      console.log('[GlobalTaskMonitor] Aba oculta com tarefa em andamento');
      this.showTaskDialog(this.lastTaskCheck.task);
    }
  }

  handleUnload() {
    console.log('[GlobalTaskMonitor] handleUnload executado');
    
    if (this.lastTaskCheck && this.lastTaskCheck.isRunning && navigator.sendBeacon && this.brproject) {
      try {
        const url = `${this.brproject.url}/api/tarefa/parar`;
        const data = new FormData();
        data.append('action', 'stop_task');
        data.append('token', this.brproject.token);
        
        console.log('[GlobalTaskMonitor] Tentando sendBeacon para parar tarefa');
        navigator.sendBeacon(url, data);
      } catch (error) {
        console.error('[GlobalTaskMonitor] Erro ao usar sendBeacon:', error);
      }
    }
  }

  showTaskDialog(task) {
    if (this.hasShownDialog || !task) return;
    
    console.log('[GlobalTaskMonitor] Mostrando diálogo para tarefa:', task.name);
    this.hasShownDialog = true;

    const existingModal = document.querySelector('.brproject-global-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = this.createTaskModal(task);
    document.body.appendChild(modal);
    
    setTimeout(() => modal.focus(), 100);
  }

  createTaskModal(task) {
    if (!document.querySelector('#brproject-global-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'brproject-global-modal-styles';
      style.textContent = `
        .brproject-global-modal {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(0, 0, 0, 0.85) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 999999 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        
        .brproject-global-dialog {
          background: white !important;
          border-radius: 12px !important;
          padding: 24px !important;
          max-width: 500px !important;
          margin: 20px !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
          animation: globalModalSlideIn 0.3s ease-out !important;
          position: relative !important;
        }
        
        @keyframes globalModalSlideIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .brproject-global-modal button:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
        }
        
        .brproject-global-modal button {
          transition: all 0.2s ease !important;
        }
      `;
      document.head.appendChild(style);
    }

    const modal = document.createElement('div');
    modal.className = 'brproject-global-modal';
    modal.setAttribute('tabindex', '-1');

    const dialogBox = document.createElement('div');
    dialogBox.className = 'brproject-global-dialog';

    dialogBox.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #ff5722 0%, #ff9800 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; box-shadow: 0 4px 8px rgba(255, 87, 34, 0.3);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div>
          <h2 style="margin: 0; color: #333; font-size: 22px; font-weight: 700;">BRProject</h2>
          <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">Tarefa em andamento detectada</p>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); border: 1px solid #4caf50; border-radius: 10px; padding: 18px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#2e7d32" style="margin-right: 10px;">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <strong style="color: #2e7d32; font-size: 16px;">Tarefa Ativa</strong>
        </div>
        <p style="margin: 0 0 12px 0; color: #2e7d32; font-weight: 600; font-size: 15px;">${task.name || 'Tarefa sem nome'}</p>
        <div style="font-size: 13px; color: #388e3c; line-height: 1.4;">
          <div style="margin-bottom: 4px;"><strong>Cliente:</strong> ${task.client || 'Não informado'}</div>
          <div style="margin-bottom: 4px;"><strong>Projeto:</strong> ${task.project || 'Não informado'}</div>
          <div><strong>Iniciado:</strong> ${task.startTime ? new Date(task.startTime).toLocaleString('pt-BR') : 'N/A'}</div>
        </div>
      </div>
      
      <p style="color: #555; margin-bottom: 28px; line-height: 1.6; font-size: 15px;">
        Você tem uma tarefa em andamento. O que deseja fazer?
      </p>
      
      <div style="display: flex; gap: 14px;">
        <button id="global-stop-task-btn" style="
          flex: 1;
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          color: white;
          border: none;
          padding: 14px 18px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 3px 6px rgba(244, 67, 54, 0.3);
        ">Finalizar Tarefa</button>
        
        <button id="global-continue-task-btn" style="
          flex: 1;
          background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
          color: white;
          border: none;
          padding: 14px 18px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 3px 6px rgba(76, 175, 80, 0.3);
        ">Continuar Trabalhando</button>
      </div>
      
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #888;">
        BRProject - Controle de Tempo para Trello
      </div>
    `;

    modal.appendChild(dialogBox);

    const stopBtn = dialogBox.querySelector('#global-stop-task-btn');
    const continueBtn = dialogBox.querySelector('#global-continue-task-btn');

    stopBtn.addEventListener('click', async () => {
      console.log('[GlobalTaskMonitor] Usuário escolheu finalizar tarefa');
      stopBtn.disabled = true;
      stopBtn.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center;">
          <div style="width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></div>
          Finalizando...
        </div>
      `;
      
      try {
        const success = await this.stopCurrentTask();
        this.removeModal(modal);
        
        if (success) {
          console.log('[GlobalTaskMonitor] Tarefa finalizada com sucesso');
          this.hasShownDialog = false;
          this.lastTaskCheck = { isRunning: false, task: null };
        } else {
          console.log('[GlobalTaskMonitor] Erro ao finalizar tarefa');
          this.hasShownDialog = false;
        }
      } catch (error) {
        console.error('[GlobalTaskMonitor] Erro ao finalizar tarefa:', error);
        this.removeModal(modal);
        this.hasShownDialog = false;
      }
    });

    continueBtn.addEventListener('click', () => {
      console.log('[GlobalTaskMonitor] Usuário escolheu continuar tarefa');
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
    console.log('[GlobalTaskMonitor] Tentando parar tarefa atual...');
    
    if (!this.brproject) {
      console.log('[GlobalTaskMonitor] BRProject não disponível');
      return false;
    }

    return new Promise((resolve) => {
      this.brproject.pararTarefa({
        success: (data) => {
          console.log('[GlobalTaskMonitor] Tarefa parada com sucesso:', data);
          this.lastTaskCheck = { isRunning: false, task: null };
          resolve(true);
        },
        error: (error) => {
          console.error('[GlobalTaskMonitor] Erro ao parar tarefa:', error);
          resolve(false);
        }
      });
    });
  }

  destroy() {
    console.log('[GlobalTaskMonitor] Destruindo monitor...');
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.isActive = false;
    this.hasShownDialog = false;
    this.lastTaskCheck = null;
    
    const existingModal = document.querySelector('.brproject-global-modal');
    if (existingModal) {
      existingModal.remove();
    }
  }
}

function checkDependencies() {
  const dependencies = [
    { name: 'TrelloPowerUp', obj: window.TrelloPowerUp },
    { name: 'BRPROJECT_BASE_URL', obj: window.BRPROJECT_BASE_URL }
  ];
  
  const missing = dependencies.filter(dep => !dep.obj);
  
  if (missing.length > 0) {
    console.error('Dependências faltando:', missing.map(d => d.name));
    return false;
  }
  
  return true;
}

function initializePowerUp() {
  if (!checkDependencies()) {
    console.error('Não foi possível inicializar o power-up devido a dependências faltando');
    return;
  }
  
  console.log('Inicializando TrelloPowerUp...');
  console.log('Base URL:', window.BRPROJECT_BASE_URL);
  
  window.TrelloPowerUp.initialize({
    'board-buttons': function (t, options) {
      console.log('board-buttons inicializado');
      return [{
        icon: ICON_BR,
        text: 'BRProject',
        callback: function (t) {
          console.log('Board button clicado');
          return t.popup({
            title: 'BRProject - Controle de Tarefas',
            url: window.BRPROJECT_BASE_URL + '/board-popup.html',
            height: 520,
            width: 400
          });
        }
      }];
    },
        
    'card-back-section': function(t, options) {
      console.log('[DEBUG] card-back-section chamado');
      
      return t.get('member', 'private', 'brproject-token')
        .then(function(token) {
          if (token) {
            return {
              title: ' ',
              icon: INVISIBLE_ICON,
              content: {
                type: 'iframe',
                url: t.signUrl(window.BRPROJECT_BASE_URL + '/card-status.html'),
                height: 68
              }
            };
          }
          return null;
        })
        .catch(function(error) {
          console.error('Erro ao obter seção do card:', error);
          return null;
        });
    },
    
    'authorization-status': function(t, options) {
      return t.get('member', 'private', 'brproject-token')
        .then(function(token) {
          return { authorized: !!token };
        })
        .catch(function() {
          return { authorized: false };
        });
    },

    'card-buttons': function(t, options) {
      return t.get('member', 'private', 'brproject-token')
        .then(function(token) {
          if (token) {
            initializeGlobalTaskMonitor(t);
            return [];
          }
          return [];
        })
        .catch(function(error) {
          console.error('Erro em card-buttons:', error);
          return [];
        });
    },
    
  });
  
  console.log('TrelloPowerUp inicializado com sucesso');
  
  setTimeout(() => {
    initializeGlobalTaskMonitorWithDelay();
  }, 2000);
}

async function initializeGlobalTaskMonitor(t) {
  try {
    if (globalTaskMonitor && globalTaskMonitor.isActive) {
      console.log('[GlobalTaskMonitor] Monitor já está ativo');
      return globalTaskMonitor;
    }

    if (!globalTaskMonitor) {
      globalTaskMonitor = new GlobalTaskMonitor();
    }

    const success = await globalTaskMonitor.initialize(t);
    
    if (success) {
      console.log('[GlobalTaskMonitor] Monitor global inicializado com sucesso');
      window.globalTaskMonitorInstance = globalTaskMonitor;
    } else {
      console.log('[GlobalTaskMonitor] Falha ao inicializar monitor global');
    }
    
    return globalTaskMonitor;
    
  } catch (error) {
    console.error('[GlobalTaskMonitor] Erro ao inicializar monitor global:', error);
    return null;
  }
}

async function initializeGlobalTaskMonitorWithDelay() {
  console.log('[GlobalTaskMonitor] Tentando inicialização com delay...');
  
  try {
    if (window.TrelloPowerUp) {
      const t = window.TrelloPowerUp.iframe ? window.TrelloPowerUp.iframe() : null;
      
      if (t) {
        await initializeGlobalTaskMonitor(t);
      } else {
        console.log('[GlobalTaskMonitor] Contexto do Trello não disponível');
      }
    }
  } catch (error) {
    console.error('[GlobalTaskMonitor] Erro na inicialização com delay:', error);
  }
}

async function initializeBrowserCloseHandlerIfNeeded(t) {
  try {
    if (globalBrowserCloseHandler) {
      console.log('[BrowserCloseHandler] Instância já existe');
      return globalBrowserCloseHandler;
    }

    if (typeof Brproject === 'undefined') {
      console.log('[BrowserCloseHandler] Brproject não disponível ainda');
      return null;
    }

    if (typeof BrowserCloseHandler === 'undefined') {
      console.log('[BrowserCloseHandler] BrowserCloseHandler não disponível ainda');
      return null;
    }

    const userData = await BRProjectUtils.getUserData(t);
    
    if (!userData.token || !userData.url) {
      console.log('[BrowserCloseHandler] Usuário não está logado');
      return null;
    }

    const brproject = new Brproject();
    brproject.token = userData.token;
    brproject.url = userData.url;

    console.log('[BrowserCloseHandler] Criando nova instância...');
    globalBrowserCloseHandler = new BrowserCloseHandler(brproject);
    
    window.browserCloseHandlerInstance = globalBrowserCloseHandler;
    
    console.log('[BrowserCloseHandler] Instância criada com sucesso');
    return globalBrowserCloseHandler;
    
  } catch (error) {
    console.error('[BrowserCloseHandler] Erro ao inicializar:', error);
    return null;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePowerUp);
} else {
  initializePowerUp();
}

window.addEventListener('beforeunload', function() {
  if (globalTaskMonitor) {
  }
});

window.BRProjectUtils = {
  updateCardStatus: function(t, cardId, status, taskData) {
    const promises = [
      t.set('card', 'shared', 'brproject-status', status)
    ];
    
    if (taskData) {
      promises.push(
        t.set('card', 'shared', 'brproject-task-name', taskData.nome || ''),
        t.set('card', 'shared', 'brproject-task-id', taskData.idtarefa || ''),
        t.set('card', 'shared', 'brproject-start-time', taskData.data_inicio || '')
      );
      
      if (taskData.cliente) {
        promises.push(t.set('card', 'shared', 'brproject-client', taskData.cliente.nome));
      }
      
      if (taskData.projeto) {
        promises.push(t.set('card', 'shared', 'brproject-project', taskData.projeto.nome));
      }
    }
    
    return Promise.all(promises);
  },
  
  updateCardTime: function(t, timeData) {
    return t.set('card', 'shared', 'brproject-time', timeData);
  },
  
  clearCardData: function(t) {
    return Promise.all([
      t.remove('card', 'shared', 'brproject-status'),
      t.remove('card', 'shared', 'brproject-task-name'),
      t.remove('card', 'shared', 'brproject-task-id'),
      t.remove('card', 'shared', 'brproject-start-time'),
      t.remove('card', 'shared', 'brproject-client'),
      t.remove('card', 'shared', 'brproject-project'),
      t.remove('card', 'shared', 'brproject-time')
    ]);
  },
  
  formatTime: function(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  },
  
  showNotification: function(t, type, message) {
    return t.alert({
      message: message,
      duration: 4000,
      display: type === 'error' ? 'error' : 'info'
    });
  },
  
  getUserData: async function(t) {
    try {
      const [token, url, usuario] = await Promise.all([
        t.get('member', 'private', 'brproject-token'),
        t.get('member', 'private', 'brproject-url'),
        t.get('member', 'private', 'brproject-usuario')
      ]);
      
      return { token, url, usuario };
    } catch (e) {
      console.error('Erro ao obter dados do usuário:', e);
      return { token: null, url: null, usuario: null };
    }
  },
  
  setUserData: async function(t, token, url, usuario) {
    try {
      await Promise.all([
        t.set('member', 'private', 'brproject-token', token),
        t.set('member', 'private', 'brproject-url', url),
        t.set('member', 'private', 'brproject-usuario', usuario)
      ]);
    } catch (e) {
      console.error('Erro ao salvar dados do usuário:', e);
    }
  },
  
  clearUserData: async function(t) {
    try {
      await Promise.all([
        t.remove('member', 'private', 'brproject-token'),
        t.remove('member', 'private', 'brproject-url'),
        t.remove('member', 'private', 'brproject-usuario')
      ]);
    } catch (e) {
      console.error('Erro ao limpar dados do usuário:', e);
    }
  },

  initializeBrowserCloseHandler: async function(t) {
    return await initializeBrowserCloseHandlerIfNeeded(t);
  },

  initializeGlobalTaskMonitor: async function(t) {
    return await initializeGlobalTaskMonitor(t);
  }
};