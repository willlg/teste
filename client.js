console.log('client.js carregado');

var ICON_BR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8dGV4dCB4PSI4IiB5PSIxMS41IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEuMjUiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJibGFjayIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QlI8L3RleHQ+Cjwvc3ZnPgo=';
var ICON_PLAY = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNC41IDIuNXYxMWw5LTUuNXoiIGZpbGw9ImJsYWNrIi8+Cjwvc3ZnPgo=';
var ICON_PAUSE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cmVjdCB4PSIzLjUiIHk9IjIuNSIgd2lkdGg9IjMiIGhlaWdodD0iMTEiIGZpbGw9ImJsYWNrIi8+CiAgPHJlY3QgeD0iOS41IiB5PSIyLjUiIHdpZHRoPSIzIiBoZWlnaHQ9IjExIiBmaWxsPSJibGFjayIvPgo8L3N2Zz4K';
var INVISIBLE_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9InRyYW5zcGFyZW50IiBvcGFjaXR5PSIwIi8+Cjwvc3ZnPg==';

let globalBrowserCloseHandler = null;

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
            initializeBrowserCloseHandlerIfNeeded(t);
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
  }
};