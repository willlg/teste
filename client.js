console.log('client.js carregado');

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
    
    'card-back-section': function(t, options) {
      console.log('card-back-section inicializado');
      return {
        title: 'BRProject - Controle de Tempo',
        icon: window.BRPROJECT_BASE_URL + '/images/project.png',
        content: {
          type: 'iframe',
          url: window.BRPROJECT_BASE_URL + '/card-control.html',
          height: 150 
        }
      };
    },
    
    'card-buttons': function(t, options) {
      return Promise.all([
        t.get('member', 'private', 'brproject-token'),
        t.get('member', 'private', 'brproject-url'),
        t.get('card', 'shared', 'brproject-status')
      ])
      .then(function([token, url, status]) {
        const buttons = [];
        
        if (!token || !url) {
          buttons.push({
            icon: window.BRPROJECT_BASE_URL + '/images/project.png',
            text: 'Configurar BRProject',
            callback: function(t) {
              return t.popup({
                title: 'Login BRProject',
                url: window.BRPROJECT_BASE_URL + '/settings.html',
                height: 350,
                width: 300
              });
            }
          });
        } else {
          if (status === 'running') {
            buttons.push({
              icon: window.BRPROJECT_BASE_URL + '/images/pause.png',
              text: 'Parar Tarefa',
              callback: function(t) {
                return window.BRProjectUtils.stopTask(t);
              }
            });
          } else {
            buttons.push({
              icon: window.BRPROJECT_BASE_URL + '/images/play.png',
              text: 'Iniciar Tarefa',
              callback: function(t) {
                return window.BRProjectUtils.startTask(t);
              }
            });
          }
        }
        
        return buttons;
      })
      .catch(function(error) {
        console.error('Erro ao obter botões do card:', error);
        return [];
      });
    },
    
    'board-badges': function(t, options) {
      return Promise.all([
        t.get('member', 'private', 'brproject-usuario'),
        t.get('member', 'private', 'brproject-token'),
        window.BRProjectUtils.getRunningTasks(t)
      ])
      .then(function([usuario, token, runningTasks]) {
        const badges = [];
        
        if (token && usuario) {
          badges.push({
            text: `👤 ${usuario.nome || usuario.email || 'Logado'}`,
            color: 'blue',
            icon: window.BRPROJECT_BASE_URL + '/images/project.png'
          });
          
          if (runningTasks && runningTasks.length > 0) {
            badges.push({
              text: `⏱️ ${runningTasks.length} tarefa(s) ativa(s)`,
              color: 'green',
              icon: window.BRPROJECT_BASE_URL + '/images/project.png'
            });
          }
        }
        
        return badges;
      })
      .catch(function(error) {
        console.error('Erro ao obter badges do board:', error);
        return [];
      });
    },
    
    'card-badges': function(t, options) {
      return t.get('card', 'shared', 'brproject-status')
      .then(function(status) {
        if (status === 'running') {
          return [{
            text: '⏱️ Em execução',
            color: 'green',
            icon: window.BRPROJECT_BASE_URL + '/images/play.png'
          }];
        }
        return [];
      })
      .catch(function(error) {
        console.error('Erro ao obter badge do card:', error);
        return [];
      });
    },
    
    'card-detail-badges': function(t, options) {
      return Promise.all([
        t.get('card', 'shared', 'brproject-time'),
        t.get('card', 'shared', 'brproject-client'),
        t.get('card', 'shared', 'brproject-project')
      ])
      .then(function([timeData, client, project]) {
        const badges = [];
        
        if (timeData && timeData.total) {
          badges.push({
            title: 'Tempo Total BRProject',
            text: timeData.total,
            color: 'blue',
            icon: window.BRPROJECT_BASE_URL + '/images/project.png'
          });
        }
        
        if (client && project) {
          badges.push({
            title: 'Cliente/Projeto',
            text: `${client} - ${project}`,
            color: 'purple',
            icon: window.BRPROJECT_BASE_URL + '/images/project.png'
          });
        }
        
        return badges;
      })
      .catch(function(error) {
        console.error('Erro ao obter detalhes do card:', error);
        return [];
      });
    },
    
    'show-settings': function (t, options) {
      console.log('show-settings inicializado');
      return t.popup({
        title: 'Configurações BRProject',
        url: window.BRPROJECT_BASE_URL + '/settings.html',
        height: 400,
        width: 350
      });
    },
    
    'board-buttons': function (t, options) {
      console.log('board-buttons inicializado');
      return [{
        icon: window.BRPROJECT_BASE_URL + '/images/project.png',
        text: 'BRProject Dashboard',
        callback: function (t) {
          console.log('Board button clicado');
          return t.popup({
            title: 'BRProject - Painel de Controle',
            url: window.BRPROJECT_BASE_URL + '/dashboard.html',
            height: 600,
            width: 500
          });
        }
      }];
    },
    
    'authorization-status': function(t, options) {
      return t.get('member', 'private', 'brproject-token')
        .then(function(token) {
          return { authorized: !!token };
        })
        .catch(function() {
          return { authorized: false };
        });
    }
    
  });
  
  console.log('TrelloPowerUp inicializado com sucesso');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePowerUp);
} else {
  initializePowerUp();
}

window.BRProjectUtils = {
  
  startTask: async function(t) {
    try {
      const [userData, cardData] = await Promise.all([
        this.getUserData(t),
        t.card('id', 'name', 'desc')
      ]);
      
      if (!userData.token || !userData.url) {
        return t.popup({
          title: 'Login necessário',
          url: window.BRPROJECT_BASE_URL + '/settings.html',
          height: 350,
          width: 300
        });
      }
      
      const runningTask = await this.checkRunningTask(t, userData);
      if (runningTask) {
        return this.showNotification(t, 'error', 'Você já possui uma tarefa em execução');
      }
      
      const taskData = {
        nome: cardData.name || 'Tarefa sem nome',
        descricao: cardData.desc || '',
        referencia_id: cardData.id
      };
      
      return this.callBRProjectAPI(userData, 'iniciarTarefa', taskData)
        .then(response => {
          if (response.success) {
            t.set('card', 'shared', 'brproject-status', 'running');
            this.showNotification(t, 'success', 'Tarefa iniciada com sucesso!');
            return t.closePopup();
          } else {
            this.showNotification(t, 'error', response.message || 'Erro ao iniciar tarefa');
          }
        });
        
    } catch (error) {
      console.error('Erro ao iniciar tarefa:', error);
      this.showNotification(t, 'error', 'Erro interno ao iniciar tarefa');
    }
  },
  
  stopTask: async function(t) {
    try {
      const userData = await this.getUserData(t);
      
      if (!userData.token || !userData.url) {
        return this.showNotification(t, 'error', 'Usuário não autenticado');
      }
      
      return this.callBRProjectAPI(userData, 'pararTarefa', {})
        .then(response => {
          if (response.success) {
            t.set('card', 'shared', 'brproject-status', 'stopped');
            this.showNotification(t, 'success', 'Tarefa parada com sucesso!');
            return t.closePopup();
          } else {
            this.showNotification(t, 'error', response.message || 'Erro ao parar tarefa');
          }
        });
        
    } catch (error) {
      console.error('Erro ao parar tarefa:', error);
      this.showNotification(t, 'error', 'Erro interno ao parar tarefa');
    }
  },
  
  checkRunningTask: async function(t, userData) {
    try {
      const response = await this.callBRProjectAPI(userData, 'getUltimaTarefa', {});
      if (response.success && response.data.atividade.finalizada != 1) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao verificar tarefa em execução:', error);
      return null;
    }
  },
  
  getRunningTasks: async function(t) {
    try {
      const userData = await this.getUserData(t);
      if (!userData.token) return [];
      
      const runningTask = await this.checkRunningTask(t, userData);
      return runningTask ? [runningTask] : [];
    } catch (error) {
      console.error('Erro ao obter tarefas em execução:', error);
      return [];
    }
  },
  
  callBRProjectAPI: function(userData, method, data) {
    return new Promise((resolve, reject) => {
      if (typeof Brproject === 'undefined') {
        reject(new Error('Brproject não carregado'));
        return;
      }
      
      const brproject = new Brproject();
      brproject.token = userData.token;
      brproject.url = userData.url;
      
      const callbacks = {
        success: resolve,
        error: reject
      };
      
      if (method === 'iniciarTarefa') {
        brproject.iniciarTarefa(data, callbacks);
      } else if (method === 'pararTarefa') {
        brproject.pararTarefa(callbacks);
      } else if (method === 'getUltimaTarefa') {
        brproject.getUltimaTarefa(callbacks);
      }
    });
  },
  
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
  }
};