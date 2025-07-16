//var t = window.TrelloPowerUp.iframe();
console.log('client.js carregado') 

window.TrelloPowerUp.initialize({
  'card-buttons': function (t, options) {
    console.log('card-buttons carregadoo');
    return [{
      icon: window.BRPROJECT_BASE_URL + '/images/project.png',
      text: 'BRProject',
      callback: function (t) {
        return t.popup({
          title: 'BRProject',
          url: window.BRPROJECT_BASE_URL + '/popup.html',
          height: 400
        });
      }
    }];
  },
  'show-settings': function (t, options) {
    return t.popup({
      title: 'Configurações BRProject',
      url: window.BRPROJECT_BASE_URL + '/popup.html',
      height: 400
    });
  },
  'board-buttons': function (t, options) {
    return [{
      icon: window.BRPROJECT_BASE_URL + '/images/project.png',
      text: 'BRProject',
      callback: function (t) {
        return t.popup({
          title: 'BRProject',
          url: window.BRPROJECT_BASE_URL + '/popup.html',
          height: 400
        });
      }
    }];
  },
});