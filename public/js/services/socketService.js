/**
 * Serviço para gerenciar conexão via Socket.IO
 */

let socket = null;

export function setupSocketConnection() {
  if (!socket) {
    // Certifique-se de que o Socket.IO esteja disponível
    if (typeof io === 'undefined') {
      console.error('Socket.IO não está disponível');
      return null;
    }
    
    // Criar conexão
    socket = io();
    
    // Configurar handlers de conexão
    socket.on('connect', () => {
      console.log('Conectado ao servidor via Socket.IO');
    });
    
    socket.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.IO');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Erro de conexão Socket.IO:', error);
    });
  }
  
  return socket;
}

export function getSocketInstance() {
  return socket;
}