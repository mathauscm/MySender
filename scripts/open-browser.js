const { exec } = require('child_process');
const os = require('os');

// Determinar o comando para abrir o navegador com base no sistema operacional
let command;
const platform = os.platform();

if (platform === 'darwin') {  // macOS
  command = 'open';
} else if (platform === 'win32') {  // Windows
  command = 'start';
} else {  // Linux e outros
  command = 'xdg-open';
}

// Aguardar 2 segundos para o servidor iniciar e então abrir o navegador
setTimeout(() => {
  exec(`${command} http://localhost:3030`, (error) => {
    if (error) {
      console.error(`Erro ao abrir o navegador: ${error}`);
      console.log('Por favor, acesse manualmente: http://localhost:3030');
    } else {
      console.log('Navegador aberto com sucesso!');
    }
  });
}, 2000);