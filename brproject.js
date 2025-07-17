var Brproject = function() {
  this.url = "";
  this.token = "";
  
  this.md5 = function(string) {
    if (typeof CryptoJS !== 'undefined') {
      return CryptoJS.MD5(string).toString();
    } else if (typeof md5 !== 'undefined') {
      return md5(string);
    } else {
      console.warn('MD5 não disponível, usando fallback simples');
      return btoa(string).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    }
  };
  
  this.gerarToken = function(data, callback_return) {
    this.url = data.url;
    
    try {
      var emailHash = this.md5(data.email);
      var senhaHash = this.md5(data.senha);
      var chave = this.md5(emailHash + senhaHash);
      
      var data_req = {
        'chave': chave,
        'email': data.email 
      };
      
      this.req('token/gerar', 'POST', data_req, callback_return);
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      if (callback_return && callback_return.error) {
        callback_return.error(null, null, error.message);
      }
    }
	console.log('Token gerado com sucesso' + this.data_req + this.url);
  };
  
  this.ehTokenValido = function(callback) {
    var data = {
      'token': this.token,
    };
    return this.req('token/valido', 'GET', data, callback);
  };
  
  this.getUltimaTarefa = function(callback) {
    return this.req('tarefa/ultima', 'GET', null, callback);
  };
  
  this.test = function() {
    alert("teste");
  };
  
  this.req = function(url, type, data, callback) {
    var self = this;
    
    if (typeof callback === 'function') {
      callback = { success: callback };
    }
    callback = callback || {};
    
    var headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.token != null && this.token !== '') {
      headers['Authorization'] = 'Bearer ' + this.token;
    }
    
    var requestConfig = {
      url: this.url + '/api/' + url,
      type: type,
      headers: headers,
      dataType: 'json',
      crossDomain: true,
      beforeSend: function() {
        if (callback.beforeSend != null) {
          callback.beforeSend();
        }
      },
      success: function(data) {
        if (callback.success != null) {
          callback.success(data);
        }
      },
      error: function(xhr, ajaxOptions, thrownError) {
        console.error('Erro na requisição:', {
          url: self.url + '/api/' + url,
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          thrownError: thrownError
        });
        
        if (callback.error != null) {
          callback.error(xhr, ajaxOptions, thrownError);
        }
      },
      complete: function(data) {
        if (callback.complete != null) {
          callback.complete(data);
        }
      }
    };
    
    if (type === 'GET' && data) {
      requestConfig.data = data;
    } else if (type === 'POST' && data) {
      requestConfig.data = JSON.stringify(data);
    }
    
    if (typeof $ !== 'undefined') {
      $.ajax(requestConfig);
    } else {
      this.fetchRequest(requestConfig);
    }
  };
  
  this.fetchRequest = function(config) {
    var fetchOptions = {
      method: config.type,
      headers: config.headers,
      mode: 'cors'
    };
    
    if (config.data && config.type !== 'GET') {
      fetchOptions.body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
    }
    
    var url = config.url;
    if (config.data && config.type === 'GET') {
      var params = new URLSearchParams(config.data);
      url += '?' + params.toString();
    }
    
    if (config.beforeSend) config.beforeSend();
    
    fetch(url, fetchOptions)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        return response.json();
      })
      .then(function(data) {
        if (config.success) config.success(data);
      })
      .catch(function(error) {
        console.error('Fetch error:', error);
        if (config.error) config.error({ status: 0, statusText: error.message }, null, error.message);
      })
      .finally(function() {
        if (config.complete) config.complete();
      });
  };
  
  this.iniciarTarefa = function(tarefa, callback) {
    var data = {
      tarefa: tarefa
    };
    return this.req('tarefa/iniciar', 'POST', data, callback);
  };
  
  this.pararTarefa = function(callback) {
    return this.req('tarefa/parar', 'POST', null, callback);
  };
  
  this.isDev = function() {
    return this.url.includes('localhost') || this.url.includes('127.0.0.1');
  };
  
  this.setTimeout = function(timeout) {
    this.requestTimeout = timeout || 30000; 
  };
};