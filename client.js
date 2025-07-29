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
      
      return Promise.all([
        t.get('member', 'private', 'brproject-token'),
        t.get('card', 'shared', 'brproject-status')
      ])
      .then(function([token, status]) {
        const buttons = [];
        
        if (token) {
          if (status === 'running') {
            buttons.push({
              icon: window.BRPROJECT_BASE_URL + '/images/pause.png',
              text: 'Parar',
              color: 'red',
              callback: function (t) {
                return window.BRProjectUtils.stopTask(t);
              }
            });
          } else {
            buttons.push({
              icon: window.BRPROJECT_BASE_URL + '/images/play.png',
              text: 'Iniciar',
              color: 'green',
              callback: function (t) {
                return window.BRProjectUtils.startTask(t);
              }
            });
          }
        }
        
        buttons.push({
          icon: window.BRPROJECT_BASE_URL + '/images/project.png',
          text: 'BRProject',
          callback: function (t) {
            return t.popup({
              title: 'BRProject - Controle de Tarefas',
              url: window.BRPROJECT_BASE_URL + '/popup.html',
              height: 500,
              width: 380
            });
          }
        });
        
        return buttons;
      });
    },
    
    'card-badges': function(t, options) {
      return Promise.all([
        t.get('card', 'shared', 'brproject-status'),
        t.get('card', 'shared', 'brproject-task-name'),
        t.get('member', 'private', 'brproject-usuario')
      ])
      .then(function([status, taskName, usuario]) {
        const badges = [];
        
        if (status === 'running' && usuario) {
          badges.push({
            text: `⏱️ ${usuario.nome || usuario.email || 'Em execução'}`,
            color: 'green',
            icon: window.BRPROJECT_BASE_URL + '/images/play.png'
          });
        }
        
        return badges;
      })
      .catch(function(error) {
        console.error('Erro ao obter badge do card:', error);
        return [];
      });
    },
    
    // Seção personalizada acima dos comentários
    'card-back-section': function(t, options) {
      return Promise.all([
        t.get('card', 'shared', 'brproject-status'),
        t.get('card', 'shared', 'brproject-task-name'),
        t.get('card', 'shared', 'brproject-start-time'),
        t.get('member', 'private', 'brproject-usuario')
      ])
      .then(function([status, taskName, startTime, usuario]) {
        if (status === 'running') {
          return {
            title: 'BRProject - Tarefa em Execução',
            icon: window.BRPROJECT_BASE_URL + '/images/timer.png',
            content: {
              type: 'iframe',
              url: window.BRPROJECT_BASE_URL + '/task-status.html',
              height: 150
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
    
  });
  
  console.log('TrelloPowerUp inicializado com sucesso');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePowerUp);
} else {
  initializePowerUp();
}

window.BRProjectUtils = {
startTask: function(t) {
  return new Promise((resolve, reject) => {
    Promise.all([
      t.get('member', 'private', 'brproject-token'),
      t.get('member', 'private', 'brproject-url'),
      t.get('member', 'private', 'brproject-usuario'),
      t.card('id', 'name', 'desc')
    ])
    .then(function([token, url, usuario, card]) {
      if (!token || !url) {
        return t.popup({
          title: 'BRProject - Login Necessário',
          url: window.BRPROJECT_BASE_URL + '/popup.html',
          height: 500,
          width: 380
        });
      }
      
      if (typeof Brproject !== 'undefined') {
        const brproject = new Brproject();
        brproject.token = token;
        brproject.url = url;
        
        brproject.getUltimaTarefa({
          success: function(data) {
            if (data.success && data.data.atividade.finalizada != 1) {
              return t.alert({
                message: 'Você já possui uma tarefa em andamento. Pare-a primeiro.',
                duration: 4000,
                display: 'warning'
              });
            }
            
            const tarefa = { 
              nome: card.name,
              descricao: card.desc || '',
              referencia_id: card.id 
            };
            
            brproject.iniciarTarefa(tarefa, {
              success: function(result) {
                if (result.success) {
                  const taskData = {
                    nome: result.data.atividade.tarefa.nome,
                    descricao: result.data.atividade.tarefa.descricao,
                    idtarefa: result.data.atividade.tarefa.idtarefa,
                    data_inicio: result.data.atividade.data_inicio,
                    cliente: result.data.atividade.tarefa.cliente,
                    projeto: result.data.atividade.tarefa.projeto
                  };
                  
                  const promises = [
                    t.set('card', 'shared', 'brproject-status', 'running'),
                    t.set('card', 'shared', 'brproject-task-name', taskData.nome),
                    t.set('card', 'shared', 'brproject-task-id', taskData.idtarefa),
                    t.set('card', 'shared', 'brproject-start-time', taskData.data_inicio)
                  ];
                  
                  if (taskData.cliente) {
                    promises.push(t.set('card', 'shared', 'brproject-client', taskData.cliente.nome));
                  }
                  
                  if (taskData.projeto) {
                    promises.push(t.set('card', 'shared', 'brproject-project', taskData.projeto.nome));
                  }
                  
                  Promise.all(promises)
                    .then(function() {
                      return t.alert({
                        message: 'Tarefa iniciada com sucesso!',
                        duration: 3000,
                        display: 'success'
                      });
                    })
                    .then(resolve);
                } else {
                  t.alert({
                    message: result.message || 'Erro ao iniciar tarefa',
                    duration: 4000,
                    display: 'error'
                  });
                  reject(new Error(result.message));
                }
              },
              error: function(error) {
                console.error('Erro ao iniciar tarefa:', error);
                t.alert({
                  message: 'Erro ao iniciar tarefa',
                  duration: 4000,
                  display: 'error'
                });
                reject(error);
              }
            });
          },
          error: function(error) {
            console.error('Erro ao verificar última tarefa:', error);
            t.alert({
              message: 'Erro ao verificar status da tarefa',
              duration: 4000,
              display: 'error'
            });
            reject(error);
          }
        });
      } else {
        console.error('Brproject não disponível');
        t.alert({
          message: 'Erro: API BRProject não carregada',
          duration: 4000,
          display: 'error'
        });
        reject(new Error('Brproject API não disponível'));
      }
    })
    .catch(reject);
  });
},

stopTask: function(t) {
  return new Promise((resolve, reject) => {
    Promise.all([
      t.get('member', 'private', 'brproject-token'),
      t.get('member', 'private', 'brproject-url'),
      t.get('card', 'shared', 'brproject-status')
    ])
    .then(function([token, url, status]) {
      if (!token || !url) {
        return t.alert({
          message: 'Usuário não autenticado',
          duration: 4000,
          display: 'error'
        });
      }
      
      if (status !== 'running') {
        return t.alert({
          message: 'Nenhuma tarefa em execução neste card',
          duration: 4000,
          display: 'warning'
        });
      }
      
      if (typeof Brproject !== 'undefined') {
        const brproject = new Brproject();
        brproject.token = token;
        brproject.url = url;
        
        brproject.pararTarefa({
          success: function(result) {
            if (result.success) {
              Promise.all([
                t.set('card', 'shared', 'brproject-status', 'stopped'),
                t.remove('card', 'shared', 'brproject-start-time'),
                t.remove('card', 'shared', 'brproject-task-id')
              ])
              .then(function() {
                return t.alert({
                  message: 'Tarefa parada com sucesso!',
                  duration: 3000,
                  display: 'success'
                });
              })
              .then(resolve);
            } else {
              t.alert({
                message: result.message || 'Erro ao parar tarefa',
                duration: 4000,
                display: 'error'
              });
              reject(new Error(result.message));
            }
          },
          error: function(error) {
            console.error('Erro ao parar tarefa:', error);
            t.alert({
              message: 'Erro ao parar tarefa',
              duration: 4000,
              display: 'error'
            });
            reject(error);
          }
        });
      } else {
        console.error('Brproject não disponível');
        t.alert({
          message: 'Erro: API BRProject não carregada',
          duration: 4000,
          display: 'error'
        });
        reject(new Error('Brproject API não disponível'));
      }
    })
    .catch(reject);
  });
},
};