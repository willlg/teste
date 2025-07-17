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
            title: 'BRProject',
            url: window.BRPROJECT_BASE_URL + '/popup.html',
            height: 400,
            width: 350
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
    
    'board-buttons': function(t, options) {
      return [{
        icon: window.BRPROJECT_BASE_URL + '/images/project.png',
        text: 'BRProject Dashboard',
        callback: function(t) {
          return t.popup({
            title: 'BRProject - Painel de Controle',
            url: window.BRPROJECT_BASE_URL + '/dashboard.html',
            height: 600,
            width: 800
          });
        }
      }];
    },
    
    'card-badges': function(t, options) {
      return t.get('card', 'shared', 'brproject-status')
        .then(function(status) {
          if (status === 'running') {
            return [{
              text: '⏱️ BRProject',
              color: 'green',
              icon: window.BRPROJECT_BASE_URL + '/images/play.png'
            }];
          }
          return [];
        });
    },
    
    'card-detail-badges': function(t, options) {
      return t.get('card', 'shared', 'brproject-time')
        .then(function(timeData) {
          if (timeData) {
            return [{
              title: 'Tempo Total',
              text: timeData.total || '0h 0m',
              color: 'blue'
            }];
          }
          return [];
        })
        .catch(function(error) {
          console.error('Erro ao obter detalhes do card:', error);
          return [];
        });
    },

    'card-back-section': function(t, options) {
      return t.get('card', 'shared', 'brproject-running')
        .then(function(running) {
          if (running) {
            return {
              title: 'BRProject',
              icon: window.BRPROJECT_BASE_URL + '/images/timer.png',
              content: {
                type: 'iframe',
                url: window.BRPROJECT_BASE_URL + '/card-status.html',
                height: 100
              }
            };
          }
          return null;
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
  updateCardStatus: function(t, status) {
    return t.set('card', 'shared', 'brproject-status', status);
  },
  
  updateCardTime: function(t, timeData) {
    return t.set('card', 'shared', 'brproject-time', timeData);
  },
  
  clearCardData: function(t) {
    return Promise.all([
      t.remove('card', 'shared', 'brproject-status'),
      t.remove('card', 'shared', 'brproject-time')
    ]);
  },
  
  formatTime: function(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
};