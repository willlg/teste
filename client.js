console.log('client.js carregado');

var ICON_BR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8dGV4dCB4PSI4IiB5PSIxMS41IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEuMjUiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJibGFjayIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QlI8L3RleHQ+Cjwvc3ZnPgo=';
var ICON_PLAY = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNC41IDIuNXYxMWw5LTUuNXoiIGZpbGw9IiM0Y2FmNTAiLz4KPC9zdmc+Cg==';
var ICON_PAUSE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cmVjdCB4PSIzLjUiIHk9IjIuNSIgd2lkdGg9IjMiIGhlaWdodD0iMTEiIGZpbGw9IiNmNDQzMzYiLz4KICA8cmVjdCB4PSI5LjUiIHk9IjIuNSIgd2lkdGg9IjMiIGhlaWdodD0iMTEiIGZpbGw9IiNmNDQzMzYiLz4KPC9zdmc+Cg==';
var INVISIBLE_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9InRyYW5zcGFyZW50IiBvcGFjaXR5PSIwIi8+Cjwvc3ZnPg==';

var globalTaskState = {
  isRunning: false,
  lastCheck: 0,
  checkInterval: 30000, 
  checking: false
};

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

async function checkRunningTaskFromAPI(t) {
  if (globalTaskState.checking) {
    console.log('Checagem já em andamento, usando cache');
    return globalTaskState.isRunning;
  }

  const now = Date.now();
  if (now - globalTaskState.lastCheck < globalTaskState.checkInterval) {
    console.log('Usando cache da última checagem');
    return globalTaskState.isRunning;
  }

  globalTaskState.checking = true;
  
  try {
    const userData = await window.BRProjectUtils.getUserData(t);
    if (!userData.token || !userData.url) {
      console.log('Usuário não autenticado');
      globalTaskState.isRunning = false;
      globalTaskState.lastCheck = now;
      globalTaskState.checking = false;
      return false;
    }

    return new Promise((resolve) => {
      const tempBrproject = new Brproject();
      tempBrproject.token = userData.token;
      tempBrproject.url = userData.url;

      tempBrproject.getUltimaTarefa({
        success: function(data) {
          const isRunning = data.success && 
                           data.data && 
                           data.data.atividade && 
                           data.data.atividade.finalizada != 1;
          
          globalTaskState.isRunning = isRunning;
          globalTaskState.lastCheck = now;
          globalTaskState.checking = false;
          
          if (isRunning && data.data.atividade.tarefa) {
            const taskData = {
              idtarefa: data.data.atividade.tarefa.idtarefa,
              nome: data.data.atividade.tarefa.nome,
              referencia_id: data.data.atividade.tarefa.referencia_id,
              data_inicio: data.data.atividade.data_inicio
            };
            window.BRProjectUtils.updateBoardTaskStatus(t, true, data.data.atividade.tarefa.referencia_id, taskData);
          } else {
            window.BRProjectUtils.updateBoardTaskStatus(t, false, null, null);
          }
          
          console.log('Status da tarefa atualizado via API:', isRunning);
          resolve(isRunning);
        },
        error: function(error) {
          console.error('Erro ao verificar tarefa via API:', error);
          globalTaskState.isRunning = false;
          globalTaskState.lastCheck = now;
          globalTaskState.checking = false;
          resolve(false);
        }
      });
    });

  } catch (error) {
    console.error('Erro na checagem da tarefa:', error);
    globalTaskState.isRunning = false;
    globalTaskState.lastCheck = now;
    globalTaskState.checking = false;
    return false;
  }
}

async function checkRunningTaskFromCache(t) {
  try {
    const boardTaskStatus = await t.get('board', 'shared', 'brproject-running-task');
    if (boardTaskStatus && boardTaskStatus.isRunning === true) {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      if (boardTaskStatus.timestamp > fiveMinutesAgo) {
        console.log('Tarefa em andamento encontrada no cache do board');
        globalTaskState.isRunning = true;
        return true;
      }
    }

    const cards = await t.cards('id');
    for (const card of cards) {
      const cardStatus = await t.get(card.id, 'shared', 'brproject-status');
      if (cardStatus === 'running') {
        console.log('Tarefa em andamento encontrada no card:', card.id);
        globalTaskState.isRunning = true;
        return true;
      }
    }

    globalTaskState.isRunning = false;
    return false;
  } catch (error) {
    console.error('Erro ao verificar cache:', error);
    return false;
  }
}

async function checkRunningTask(t) {
  try {
    const cacheResult = await checkRunningTaskFromCache(t);
    if (cacheResult) {
      return true;
    }

    const apiResult = await checkRunningTaskFromAPI(t);
    return apiResult;

  } catch (error) {
    console.error('Erro geral ao verificar tarefa em andamento:', error);
    return false;
  }
}

function initializePowerUp() {
  if (!checkDependencies()) {
    console.error('Não foi possível inicializar o power-up devido a dependências faltando');
    return;
  }
  
  console.log('Inicializando TrelloPowerUp...');
  console.log('Base URL:', window.BRPROJECT_BASE_URL);
  
  window.TrelloPowerUp.initialize({
    'board-buttons': async function (t, options) {
      console.log('board-buttons inicializado');
      
      try {
        const hasRunningTask = await checkRunningTask(t);
        const icon = hasRunningTask ? ICON_PAUSE : ICON_PLAY;
        const text = hasRunningTask ? 'BRProject (Em Execução)' : 'BRProject';
        
        console.log('Status da tarefa para board button:', hasRunningTask);
        
        return [{
          icon: icon,
          text: text,
          callback: function (t) {
            console.log('Board button clicado');
            return t.popup({
              title: 'BRProject - Controle de Tarefas',
              url: window.BRPROJECT_BASE_URL + '/board-popup.html',
              height: 500,
              width: 380
            });
          }
        }];
      } catch (error) {
        console.error('Erro no board-buttons:', error);
        return [{
          icon: ICON_PLAY,
          text: 'BRProject',
          callback: function (t) {
            return t.popup({
              title: 'BRProject - Controle de Tarefas',
              url: window.BRPROJECT_BASE_URL + '/board-popup.html',
              height: 500,
              width: 380
            });
          }
        }];
      }
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
    
  });
  
  console.log('TrelloPowerUp inicializado com sucesso');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePowerUp);
} else {
  initializePowerUp();
}

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
    
    if (status === 'running') {
      promises.push(
        t.set('board', 'shared', 'brproject-running-task', {
          isRunning: true,
          cardId: cardId,
          timestamp: Date.now(),
          taskData: taskData
        })
      );
      globalTaskState.isRunning = true;
      globalTaskState.lastCheck = Date.now();
    } else if (status === 'stopped' || status === null) {
      promises.push(
        t.remove('board', 'shared', 'brproject-running-task')
      );
      globalTaskState.isRunning = false;
      globalTaskState.lastCheck = Date.now();
    }
    
    return Promise.all(promises).then(() => {
      if (window.TrelloPowerUp && window.TrelloPowerUp.util) {
        window.TrelloPowerUp.util.relativeUrl('./client.js');
      }
    });
  },
  
  updateCardTime: function(t, timeData) {
    return t.set('card', 'shared', 'brproject-time', timeData);
  },
  
  clearCardData: function(t) {
    const promises = [
      t.remove('card', 'shared', 'brproject-status'),
      t.remove('card', 'shared', 'brproject-task-name'),
      t.remove('card', 'shared', 'brproject-task-id'),
      t.remove('card', 'shared', 'brproject-start-time'),
      t.remove('card', 'shared', 'brproject-client'),
      t.remove('card', 'shared', 'brproject-project'),
      t.remove('card', 'shared', 'brproject-time'),
      t.remove('board', 'shared', 'brproject-running-task')
    ];
    
    globalTaskState.isRunning = false;
    globalTaskState.lastCheck = Date.now();
    
    return Promise.all(promises);
  },
  
  updateBoardTaskStatus: function(t, isRunning, cardId, taskData) {
    if (isRunning) {
      globalTaskState.isRunning = true;
      globalTaskState.lastCheck = Date.now();
      return t.set('board', 'shared', 'brproject-running-task', {
        isRunning: true,
        cardId: cardId,
        timestamp: Date.now(),
        taskData: taskData
      });
    } else {
      globalTaskState.isRunning = false;
      globalTaskState.lastCheck = Date.now();
      return t.remove('board', 'shared', 'brproject-running-task');
    }
  },
  
  checkRunningTask: checkRunningTask,
  
  forceCheckRunningTask: function(t) {
    globalTaskState.lastCheck = 0; 
    return checkRunningTask(t);
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
        t.remove('member', 'private', 'brproject-usuario'),
        t.remove('board', 'shared', 'brproject-running-task')
      ]);
      globalTaskState.isRunning = false;
      globalTaskState.lastCheck = 0;
    } catch (e) {
      console.error('Erro ao limpar dados do usuário:', e);
    }
  }
};