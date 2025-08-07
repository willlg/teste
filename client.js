console.log('client.js carregado');
var INVISIBLE_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9InRyYW5zcGFyZW50IiBvcGFjaXR5PSIwIi8+Cjwvc3ZnPg==';

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

let taskStatusCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; 

async function hasRunningTasks(t) {
  try {
    const now = Date.now();
    if (taskStatusCache !== null && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Usando cache para status da tarefa:', taskStatusCache);
      return taskStatusCache;
    }

    console.log('Verificando tarefas em execução...');
    
    const userData = await window.BRProjectUtils.getUserData(t);
    
    if (!userData.token || !userData.url) {
      console.log('Usuário não logado');
      taskStatusCache = false;
      cacheTimestamp = now;
      return false;
    }
    
    if (!await waitForBrproject()) {
      console.log('Brproject não disponível após timeout');
      taskStatusCache = false;
      cacheTimestamp = now;
      return false;
    }
    
    var brproject = new Brproject();
    brproject.token = userData.token;
    brproject.url = userData.url;
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('Timeout na verificação de tarefas');
        taskStatusCache = false;
        cacheTimestamp = now;
        resolve(false);
      }, 8000); 
      
      brproject.getUltimaTarefa({
        success: function(data) {
          clearTimeout(timeout);
          console.log('Resposta getUltimaTarefa:', data);
          
          const hasRunning = data.success && 
                           data.data && 
                           data.data.atividade && 
                           data.data.atividade.finalizada != 1;
          
          console.log('Tarefa em execução:', hasRunning);
          taskStatusCache = hasRunning;
          cacheTimestamp = now;
          resolve(hasRunning);
        },
        error: function(error) {
          clearTimeout(timeout);
          console.error('Erro ao verificar tarefas:', error);
          taskStatusCache = false;
          cacheTimestamp = now;
          resolve(false);
        }
      });
    });
    
  } catch (error) {
    console.error('Erro geral ao verificar tarefas em execução:', error);
    taskStatusCache = false;
    cacheTimestamp = Date.now();
    return false;
  }
}

function waitForBrproject(timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    function checkBrproject() {
      if (typeof window.Brproject !== 'undefined') {
        console.log('Brproject disponível');
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        console.log('Timeout aguardando Brproject');
        resolve(false);
        return;
      }
      
      setTimeout(checkBrproject, 100);
    }
    
    checkBrproject();
  });
}

function clearTaskStatusCache() {
  taskStatusCache = null;
  cacheTimestamp = 0;
  console.log('Cache de status da tarefa limpo');
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
        const hasRunning = await hasRunningTasks(t);
        
        let iconName, buttonText, buttonColor;
        
        if (hasRunning) {
          iconName = 'icone_play.png';
          buttonText = 'BRProject (Em Execução)';
          buttonColor = '#4CAF50'; 
        } else {
          iconName = 'icone_pause.png';
          buttonText = 'BRProject';
          buttonColor = '#2196F3'; 
        }
        
        const iconUrl = window.BRPROJECT_BASE_URL + '/images/' + iconName;
        
        console.log(`Board button configurado: ${buttonText}, ícone: ${iconName}, hasRunning: ${hasRunning}`);
        
        return [{
          icon: iconUrl,
          text: buttonText,
          callback: function (t) {
            console.log('Board button clicado');
            clearTaskStatusCache();
            
            return t.popup({
              title: 'BRProject - Controle de Tarefas',
              url: window.BRPROJECT_BASE_URL + '/board-popup.html',
              height: 500,
              width: 380
            });
          }
        }];
        
      } catch (error) {
        console.error('Erro ao configurar board button:', error);
        
        return [{
          icon: window.BRPROJECT_BASE_URL + '/images/icone_pause.png',
          text: 'BRProject (Erro)',
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
    }
  });
  
  console.log('TrelloPowerUp inicializado com sucesso');
}

window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'brproject-task-status-changed') {
    console.log('Recebida mensagem de mudança de status da tarefa');
    clearTaskStatusCache();
    
    setTimeout(() => {
      if (window.location) {
        window.location.reload();
      }
    }, 1000);
  }
});

function waitForDependenciesAndInitialize() {
  const maxWaitTime = 10000; 
  const startTime = Date.now();
  
  function checkAndInitialize() {
    if (window.TrelloPowerUp && window.BRPROJECT_BASE_URL) {
      console.log('Dependências básicas carregadas, inicializando...');
      initializePowerUp();
      return;
    }
    
    if (Date.now() - startTime > maxWaitTime) {
      console.error('Timeout aguardando dependências');
      return;
    }
    
    setTimeout(checkAndInitialize, 200);
  }
  
  checkAndInitialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForDependenciesAndInitialize);
} else {
  waitForDependenciesAndInitialize();
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
      clearTaskStatusCache();
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
      clearTaskStatusCache();
    } catch (e) {
      console.error('Erro ao limpar dados do usuário:', e);
    }
  },
  
  refreshBoardButton: function(t) {
    clearTaskStatusCache();
    
    if (t && typeof t.closePopup === 'function') {
      t.closePopup();
    }
    
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'brproject-task-status-changed'
        }, '*');
      }
    } catch (e) {
      console.log('Erro ao enviar mensagem para parent:', e);
    }
  },
  
  clearCache: function() {
    clearTaskStatusCache();
  }
};