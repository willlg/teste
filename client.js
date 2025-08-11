console.log('client.js carregado');

var ICON_BR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8dGV4dCB4PSI4IiB5PSIxMS41IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEuMjUiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJibGFjayIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QlI8L3RleHQ+Cjwvc3ZnPgo=';
var ICON_PLAY = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNC41IDIuNXYxMWw5LTUuNXoiIGZpbGw9ImdyZWVuIi8+Cjwvc3ZnPgo=';
var ICON_PAUSE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cmVjdCB4PSIzLjUiIHk9IjIuNSIgd2lkdGg9IjMiIGhlaWdodD0iMTEiIGZpbGw9InJlZCIvPgogIDxyZWN0IHg9IjkuNSIgeT0iMi41IiB3aWR0aD0iMyIgaGVpZ2h0PSIxMSIgZmlsbD0icmVkIi8+Cjwvc3ZnPgo=';
var INVISIBLE_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9InRyYW5zcGFyZW50IiBvcGFjaXR5PSIwIi8+Cjwvc3ZnPg==';

var cachedTaskStatus = {
  hasRunningTask: false,
  lastCheck: 0,
  cacheValidFor: 30000 
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

async function checkRunningTask(t) {
  try {
    const now = Date.now();
    if (now - cachedTaskStatus.lastCheck < cachedTaskStatus.cacheValidFor) {
      console.log('Usando cache do status da tarefa:', cachedTaskStatus.hasRunningTask);
      return cachedTaskStatus.hasRunningTask;
    }

    const [token, url] = await Promise.all([
      t.get('member', 'private', 'brproject-token'),
      t.get('member', 'private', 'brproject-url')
    ]);

    if (!token || !url) {
      console.log('Token ou URL não encontrados');
      cachedTaskStatus.hasRunningTask = false;
      cachedTaskStatus.lastCheck = now;
      return false;
    }

    return new Promise((resolve) => {
      if (typeof Brproject === 'undefined') {
        console.log('Brproject não carregado ainda');
        cachedTaskStatus.hasRunningTask = false;
        cachedTaskStatus.lastCheck = now;
        resolve(false);
        return;
      }

      const brproject = new Brproject();
      brproject.token = token;
      brproject.url = url;

      brproject.getUltimaTarefa({
        success: function(data) {
          console.log('checkRunningTask - getUltimaTarefa sucesso:', data);
          let hasRunning = false;
          
          if (data.success && data.data && data.data.atividade && data.data.atividade.finalizada != 1) {
            hasRunning = true;
            console.log('Tarefa em execução encontrada:', data.data.atividade.tarefa.nome);
          }
          
          cachedTaskStatus.hasRunningTask = hasRunning;
          cachedTaskStatus.lastCheck = now;
          resolve(hasRunning);
        },
        error: function(error) {
          console.log('checkRunningTask - getUltimaTarefa erro:', error);
          cachedTaskStatus.hasRunningTask = false;
          cachedTaskStatus.lastCheck = now;
          resolve(false);
        }
      });
    });

  } catch (error) {
    console.error('Erro ao verificar tarefa em execução:', error);
    cachedTaskStatus.hasRunningTask = false;
    cachedTaskStatus.lastCheck = Date.now();
    return false;
  }
}

async function getBoardButtonIcon(t) {
  const hasRunningTask = await checkRunningTask(t);
  return hasRunningTask ? ICON_PLAY : ICON_PAUSE;
}

async function getBoardButtonText(t) {
  const hasRunningTask = await checkRunningTask(t);
  return hasRunningTask ? 'BRProject (Ativo)' : 'BRProject';
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
      
      return getBoardButtonIcon(t).then(function(icon) {
        return getBoardButtonText(t).then(function(text) {
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
        });
      }).catch(function(error) {
        console.error('Erro ao obter ícone/texto do board button:', error);
        return [{
          icon: ICON_BR,
          text: 'BRProject',
          callback: function (t) {
            console.log('Board button clicado (fallback)');
            return t.popup({
              title: 'BRProject - Controle de Tarefas',
              url: window.BRPROJECT_BASE_URL + '/board-popup.html',
              height: 500,
              width: 380
            });
          }
        }];
      });
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
      
      cachedTaskStatus.lastCheck = 0;
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
      
      cachedTaskStatus.hasRunningTask = false;
      cachedTaskStatus.lastCheck = 0;
    } catch (e) {
      console.error('Erro ao limpar dados do usuário:', e);
    }
  },
  
  refreshTaskStatus: function() {
    cachedTaskStatus.lastCheck = 0;
  },
  
  checkTaskStatus: function(t) {
    return checkRunningTask(t);
  }
};