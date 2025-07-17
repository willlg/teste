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
    'card-buttons': function (t, options) {
      console.log('card-buttons inicializado');
      return [{
        icon: window.BRPROJECT_BASE_URL + '/images/project.png',
        text: 'BRProject',
        callback: function (t) {
          console.log('Card button clicado');
          return t.popup({
            title: 'BRProject - Controle de Tarefas',
            url: window.BRPROJECT_BASE_URL + '/popup.html',
            height: 500,
            width: 380
          });
        }
      }];
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
    
    'card-badges': function(t, options) {
      return Promise.all([
        t.get('card', 'shared', 'brproject-status'),
        t.get('card', 'shared', 'brproject-task-name')
      ])
      .then(function([status, taskName]) {
        const badges = [];
        
        if (status === 'running') {
          badges.push({
            text: '⏱️ Em execução',
            color: 'green',
            icon: window.BRPROJECT_BASE_URL + '/images/play.png'
          });
        } else if (status === 'paused') {
          badges.push({
            text: '⏸️ Pausado',
            color: 'yellow',
            icon: window.BRPROJECT_BASE_URL + '/images/pause.png'
          });
        }
        
        return badges;
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
            icon: window.BRPROJECT_BASE_URL + '/images/timer.png'
          });
        }
        
        if (client && project) {
          badges.push({
            title: 'Cliente/Projeto',
            text: `${client} - ${project}`,
            color: 'purple',
            icon: window.BRPROJECT_BASE_URL + '/images/client.png'
          });
        }
        
        return badges;
      })
      .catch(function(error) {
        console.error('Erro ao obter detalhes do card:', error);
        return [];
      });
    },
    
    'card-back-section': function(t, options) {
      return t.get('card', 'shared', 'brproject-status')
        .then(function(status) {
          if (status === 'running') {
            return {
              title: 'BRProject - Tarefa em Execução',
              icon: window.BRPROJECT_BASE_URL + '/images/timer.png',
              content: {
                type: 'iframe',
                url: window.BRPROJECT_BASE_URL + '/card-status.html',
                height: 120
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
    
    'list-actions': function(t, options) {
      return [{
        text: 'Relatório BRProject',
        callback: function(t) {
          return t.popup({
            title: 'Relatório da Lista',
            url: window.BRPROJECT_BASE_URL + '/list-report.html',
            height: 400,
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
    },
    
    'capabilities': [
      'card-buttons',
      'card-badges',
      'card-detail-badges',
      'card-back-section',
      'board-buttons',
      'list-actions',
      'show-settings',
      'authorization-status'
    ]
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