window.BRPROJECT_BASE_URL = 'https://brproject.vercel.app';

window.BRPROJECT_CONFIG = {
  version: '2.0',
  apiTimeout: 30000,
  retryAttempts: 3,
  defaultUrl: 'https://www2.projetos.brsis.com.br/brproject',
  
  images: {
    play: window.BRPROJECT_BASE_URL + '/images/play.png',
    stop: window.BRPROJECT_BASE_URL + '/images/pause.png',
  }
};

window.checkBRProjectDependencies = function() {
  const dependencies = [
    'TrelloPowerUp',
    'jQuery',
    'Brproject'
  ];
  
  const missing = dependencies.filter(dep => 
    typeof window[dep] === 'undefined' && 
    typeof window[dep.toLowerCase()] === 'undefined'
  );
  
  if (missing.length > 0) {
    console.warn('BRProject: Dependências faltando:', missing);
    return false;
  }
  
  return true;
};

console.log('BRProject Config carregado - Base URL:', window.BRPROJECT_BASE_URL);