//var t = window.TrelloPowerUp.iframe();
window.BRPROJECT_BASE_URL = 'https://brproject.vercel.app';
console.log('client.js carregado') 

window.TrelloPowerUp.initialize({
  'card-buttons': function (t, options) {
    console.log('card-buttons carregado');
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
  }
});