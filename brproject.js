var Brproject = function() {
	
	this.url = "";
	this.token = "";	
	
	this.gerarToken = function(data,callback_return) {
		this.url = data.url;
		
		var chave = CryptoJS.MD5((CryptoJS.MD5(data.email).toString()+CryptoJS.MD5(data.senha).toString())).toString();
		
		var data_req = {
			'chave' : chave,
		};
	
		this.req('token/gerar','GET',data_req,callback_return);
    };
	
	this.ehTokenValido = function(callback) {
		var data = {
			'token' : this.token,
		};
		return this.req('token/valido','GET',data,callback);
	};
	
	this.getUltimaTarefa = function(callback) {
		return this.req('tarefa/ultima','GET',null,callback);
	};
	this.test = function(){
		alert("teste");
	};
	this.req = function(url,type,data,callback){
		var headers
		
		if(this.token != null){
			headers = {
				'Authorization':this.token,
			};
		}
		else{
			headers = null;
		}
		
		$.ajax({
			url: this.url+'/api/'+url,
			type:type,
			headers: headers,
			dataType: 'json',
			crossDomain:true,
			data: data,
			beforeSend:function() {
				if(callback.beforeSend != null)
					callback.beforeSend();
			},
			success:function(data) {
				if(callback.success != null)
					callback.success(data);
			},			
			error:function (xhr, ajaxOptions, thrownError){
				if(callback.error != null)
					callback.error(xhr, ajaxOptions, thrownError);
			},
			complete: function(data){
				if(callback.complete != null)
					callback.complete(data);
			}
		});
	};
	
	this.iniciarTarefa = function(tarefa,callback) {
		var data = {
			tarefa: tarefa
		};
		return this.req('tarefa/iniciar','POST',data,callback);
	};
	
	this.pararTarefa = function(callback) {
		return this.req('tarefa/parar','POST',null,callback);
	};
	
	
};