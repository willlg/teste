(function() {
  'use strict';

  console.log('[TrelloBackgroundMonitor] Iniciando...');

  function waitForTrello() {
    return new Promise((resolve) => {
      function check() {
        if (window.TrelloPowerUp && document.querySelector('.board-wrapper, [data-testid="board"]')) {
          resolve();
        } else {
          setTimeout(check, 1000);
        }
      }
      check();
    });
  }

  function injectDependencies() {
    return new Promise((resolve) => {
      const dependencies = [
        'https://brproject.vercel.app/config.js',
        'https://brproject.vercel.app/vendor/jquery.min.js',
        'https://brproject.vercel.app/brproject.js'
      ];

      let loadedCount = 0;
      const totalDeps = dependencies.length;

      dependencies.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
          loadedCount++;
          console.log(`[TrelloBackgroundMonitor] Dependência carregada: ${src}`);
          if (loadedCount === totalDeps) {
            console.log('[TrelloBackgroundMonitor] Todas as dependências carregadas');
            setTimeout(resolve, 500); 
          }
        };
        script.onerror = () => {
          console.error(`[TrelloBackgroundMonitor] Erro ao carregar: ${src}`);
          loadedCount++;
          if (loadedCount === totalDeps) {
            resolve();
          }
        };
        document.head.appendChild(script);
      });
    });
  }

  class TrelloBackgroundMonitor {
    constructor() {
      this.isActive = false;
      this.brproject = null;
      this.hasShownDialog = false;
      this.lastCheck = null;
      this.checkInterval = null;
      this.userData = null;
    }

    async initialize() {
      try {
        console.log('[TrelloBackgroundMonitor] Inicializando sistema...');

        await this.waitForDependencies();

        await this.loadUserData();

        if (!this.userData || !this.userData.token) {
          console.log('[TrelloBackgroundMonitor] Usuário não logado');
          setTimeout(() => this.initialize(), 30000);
          return;
        }

        this.brproject = new window.Brproject();
        this.brproject.token = this.userData.token;
        this.brproject.url = this.userData.url;

        this.setupGlobalListeners();

        this.startTaskMonitoring();

        this.isActive = true;
        console.log('[TrelloBackgroundMonitor] Sistema ativo!');

      } catch (error) {
        console.error('[TrelloBackgroundMonitor] Erro na inicialização:', error);
        setTimeout(() => this.initialize(), 60000);
      }
    }

    async waitForDependencies() {
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        if (window.Brproject && window.jQuery) {
          console.log('[TrelloBackgroundMonitor] Dependências disponíveis');
          return;
        }
        
        console.log(`[TrelloBackgroundMonitor] Aguardando dependências... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      throw new Error('Dependências não carregaram no tempo esperado');
    }

    async loadUserData() {
      try {
        const localData = this.loadFromLocalStorage();
        if (localData.token) {
          this.userData = localData;
          console.log('[TrelloBackgroundMonitor] Dados carregados do localStorage');
          return;
        }

        if (window.TrelloPowerUp) {
          const t = window.TrelloPowerUp.iframe ? window.TrelloPowerUp.iframe() : null;
          if (t) {
            const [token, url, usuario] = await Promise.all([
              t.get('member', 'private', 'brproject-token').catch(() => null),
              t.get('member', 'private', 'brproject-url').catch(() => null),
              t.get('member', 'private', 'brproject-usuario').catch(() => null)
            ]);

            if (token && url) {
              this.userData = { token, url, usuario };
              this.saveToLocalStorage(this.userData);
              console.log('[TrelloBackgroundMonitor] Dados carregados da API do Trello');
              return;
            }
          }
        }

        console.log('[TrelloBackgroundMonitor] Nenhum dado de usuário encontrado');
        this.userData = null;

      } catch (error) {
        console.error('[TrelloBackgroundMonitor] Erro ao carregar dados do usuário:', error);
        this.userData = null;
      }
    }

    loadFromLocalStorage() {
      try {
        return {
          token: localStorage.getItem('brproject-token'),
          url: localStorage.getItem('brproject-url'),
          usuario: JSON.parse(localStorage.getItem('brproject-usuario') || 'null')
        };
      } catch (e) {
        return { token: null, url: null, usuario: null };
      }
    }

    saveToLocalStorage(userData) {
      try {
        if (userData.token) localStorage.setItem('brproject-token', userData.token);
        if (userData.url) localStorage.setItem('brproject-url', userData.url);
        if (userData.usuario) localStorage.setItem('brproject-usuario', JSON.stringify(userData.usuario));
      } catch (e) {
        console.error('[TrelloBackgroundMonitor] Erro ao salvar no localStorage:', e);
      }
    }

    setupGlobalListeners() {
      console.log('[TrelloBackgroundMonitor] Configurando listeners globais...');

      window.addEventListener('beforeunload', (e) => {
        return this.handleBeforeUnload(e);
      });

      document.addEventListener('keydown', (e) => {
        const isClosingKey = 
          (e.ctrlKey && e.key === 'w') || 
          (e.altKey && e.key === 'F4') || 
          (e.ctrlKey && e.shiftKey && e.key === 'W') ||
          (e.ctrlKey && e.key === 'F4');
        
        if (isClosingKey) {
          console.log('[TrelloBackgroundMonitor] Tecla de fechamento detectada');
          setTimeout(() => this.checkAndShowDialog(), 0);
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          setTimeout(() => {
            if (document.hidden && this.lastCheck && this.lastCheck.isRunning) {
              this.showTaskDialog(this.lastCheck.task);
            }
          }, 1500);
        }
      });

      window.addEventListener('unload', () => {
        this.handleUnload();
      });
    }

    startTaskMonitoring() {
      this.checkRunningTasks();

      this.checkInterval = setInterval(() => {
        this.checkRunningTasks();
      }, 20000);

      console.log('[TrelloBackgroundMonitor] Monitoramento de tarefas iniciado');
    }

    async checkRunningTasks() {
      if (!this.brproject || !this.brproject.token) {
        return;
      }

      try {
        const result = await new Promise((resolve) => {
          this.brproject.getUltimaTarefa({
            success: (data) => {
              resolve(this.processTaskData(data));
            },
            error: (error) => {
              console.log('[TrelloBackgroundMonitor] Erro ao verificar tarefa:', error);
              resolve({ isRunning: false, task: null });
            }
          });
        });

        this.lastCheck = result;

        if (result.isRunning) {
          console.log('[TrelloBackgroundMonitor] Tarefa em andamento:', result.task.name);
        }

      } catch (error) {
        console.error('[TrelloBackgroundMonitor] Erro no monitoramento:', error);
      }
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
      console.log('[TrelloBackgroundMonitor] beforeunload detectado');

      if (this.hasShownDialog) {
        return;
      }

      if (this.lastCheck && this.lastCheck.isRunning) {
        console.log('[TrelloBackgroundMonitor] Tarefa em andamento detectada no beforeunload');
        
        this.showTaskDialog(this.lastCheck.task);
        
        const message = `BRProject: Você tem uma tarefa em andamento "${this.lastCheck.task.name}". Deseja realmente sair?`;
        
        if (e) {
          e.preventDefault();
          e.returnValue = message;
        }
        
        return message;
      }
    }

    async checkAndShowDialog() {
      if (this.hasShownDialog) return;

      try {
        await this.checkRunningTasks();
        
        if (this.lastCheck && this.lastCheck.isRunning) {
          this.showTaskDialog(this.lastCheck.task);
        }
      } catch (error) {
        console.error('[TrelloBackgroundMonitor] Erro em checkAndShowDialog:', error);
      }
    }

    handleUnload() {
      console.log('[TrelloBackgroundMonitor] unload detectado');
      
      if (this.lastCheck && this.lastCheck.isRunning && navigator.sendBeacon && this.brproject) {
        try {
          const url = `${this.brproject.url}/api/tarefa/parar`;
          const data = new FormData();
          data.append('action', 'stop_task');
          data.append('token', this.brproject.token);
          
          console.log('[TrelloBackgroundMonitor] Enviando sendBeacon para parar tarefa');
          navigator.sendBeacon(url, data);
        } catch (error) {
          console.error('[TrelloBackgroundMonitor] Erro no sendBeacon:', error);
        }
      }
    }

    showTaskDialog(task) {
      if (this.hasShownDialog || !task) return;
      
      console.log('[TrelloBackgroundMonitor] Mostrando diálogo para:', task.name);
      this.hasShownDialog = true;

      const existingModal = document.querySelector('.trello-bg-modal');
      if (existingModal) {
        existingModal.remove();
      }

      const modal = this.createTaskModal(task);
      document.body.appendChild(modal);
      
      setTimeout(() => modal.focus(), 100);
    }

    createTaskModal(task) {
      if (!document.querySelector('#trello-bg-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'trello-bg-modal-styles';
        style.textContent = `
          .trello-bg-modal {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.9) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
          
          .trello-bg-dialog {
            background: white !important;
            border-radius: 16px !important;
            padding: 32px !important;
            max-width: 520px !important;
            margin: 20px !important;
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4) !important;
            animation: trelloBgSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
          }
          
          @keyframes trelloBgSlideIn {
            from { transform: scale(0.8) translateY(40px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
          
          .trello-bg-modal button {
            transition: all 0.3s ease !important;
          }
          
          .trello-bg-modal button:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2) !important;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }

      const modal = document.createElement('div');
      modal.className = 'trello-bg-modal';
      modal.setAttribute('tabindex', '-1');

      const dialog = document.createElement('div');
      dialog.className = 'trello-bg-dialog';

      dialog.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 24px;">
          <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #0079bf 0%, #005a8b 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 20px; box-shadow: 0 6px 12px rgba(0, 121, 191, 0.3);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </div>
          <div>
            <h2 style="margin: 0; color: #172b4d; font-size: 24px; font-weight: 700;">BRProject</h2>
            <p style="margin: 6px 0 0 0; color: #5e6c84; font-size: 16px;">Controle de Tempo para Trello</p>
          </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #f39c12; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
          <div style="display: flex; align-items: center; margin-bottom: 14px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#e67e22" style="margin-right: 12px;">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <strong style="color: #d68910; font-size: 18px;">⚠️ Tarefa em Andamento</strong>
          </div>
          <div style="color: #d68910; font-weight: 600; font-size: 16px; margin-bottom: 12px;">
            ${task.name || 'Tarefa sem nome'}
          </div>
          <div style="font-size: 14px; color: #b7950b; line-height: 1.5;">
            <div style="margin-bottom: 6px;"><strong>Cliente:</strong> ${task.client || 'Não informado'}</div>
            <div style="margin-bottom: 6px;"><strong>Projeto:</strong> ${task.project || 'Não informado'}</div>
            <div><strong>Iniciado em:</strong> ${task.startTime ? new Date(task.startTime).toLocaleString('pt-BR') : 'N/A'}</div>
          </div>
        </div>
        
        <p style="color: #42526e; margin-bottom: 32px; line-height: 1.6; font-size: 16px; text-align: center;">
          Você está prestes a sair do Trello.<br>
          <strong>O que deseja fazer com sua tarefa em andamento?</strong>
        </p>
        
        <div style="display: flex; gap: 16px;">
          <button id="trello-bg-stop-btn" style="
            flex: 1;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            border: none;
            padding: 16px 20px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
          ">🛑 Finalizar Tarefa</button>
          
          <button id="trello-bg-continue-btn" style="
            flex: 1;
            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
            color: white;
            border: none;
            padding: 16px 20px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3);
          ">✅ Continuar Depois</button>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #95a5a6; padding-top: 16px; border-top: 1px solid #ecf0f1;">
          Pressione <kbd style="background: #ecf0f1; padding: 2px 6px; border-radius: 4px;">ESC</kbd> para cancelar
        </div>
      `;

      modal.appendChild(dialog);

      const stopBtn = dialog.querySelector('#trello-bg-stop-btn');
      const continueBtn = dialog.querySelector('#trello-bg-continue-btn');

      stopBtn.addEventListener('click', async () => {
        console.log('[TrelloBackgroundMonitor] Finalizando tarefa...');
        stopBtn.disabled = true;
        stopBtn.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center;">
            <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;"></div>
            Finalizando...
          </div>
        `;
        
        try {
          const success = await this.stopCurrentTask();
          this.removeModal(modal);
          
          if (success) {
            console.log('[TrelloBackgroundMonitor] Tarefa finalizada');
            this.lastCheck = { isRunning: false, task: null };
          } else {
            alert('Erro ao finalizar tarefa. Tente novamente.');
          }
        } catch (error) {
          console.error('[TrelloBackgroundMonitor] Erro:', error);
          alert('Erro ao finalizar tarefa.');
          this.removeModal(modal);
        } finally {
          this.hasShownDialog = false;
        }
      });

      continueBtn.addEventListener('click', () => {
        console.log('[TrelloBackgroundMonitor] Usuário continuará depois');
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
      if (!this.brproject) return false;

      return new Promise((resolve) => {
        this.brproject.pararTarefa({
          success: (data) => {
            console.log('[TrelloBackgroundMonitor] Tarefa parada:', data);
            resolve(true);
          },
          error: (error) => {
            console.error('[TrelloBackgroundMonitor] Erro ao parar:', error);
            resolve(false);
          }
        });
      });
    }

    destroy() {
      console.log('[TrelloBackgroundMonitor] Destruindo...');
      
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
      
      this.isActive = false;
      this.hasShownDialog = false;
      
      const modal = document.querySelector('.trello-bg-modal');
      if (modal) {
        modal.remove();
      }
    }
  }

  let monitor = null;

  async function start() {
    try {
      console.log('[TrelloBackgroundMonitor] Aguardando Trello...');
      await waitForTrello();
      
      console.log('[TrelloBackgroundMonitor] Injetando dependências...');
      await injectDependencies();
      
      console.log('[TrelloBackgroundMonitor] Criando monitor...');
      monitor = new TrelloBackgroundMonitor();
      await monitor.initialize();
      
      window.trelloBackgroundMonitor = monitor;
      
    } catch (error) {
      console.error('[TrelloBackgroundMonitor] Erro na inicialização:', error);
      setTimeout(start, 120000);
    }
  }

  window.addEventListener('beforeunload', () => {
    if (monitor && !monitor.hasShownDialog) {
    }
  });

  start();

  console.log('[TrelloBackgroundMonitor] Script carregado');

})();