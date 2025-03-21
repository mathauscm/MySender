// Adicione este código ao final do arquivo public/js/app.js
// ou crie um novo módulo em public/js/components/whatsappManager.js

/**
 * Configura o gerenciamento de conexão do WhatsApp
 */
function setupWhatsAppManager() {
    const disconnectBtn = document.getElementById('disconnectWhatsAppBtn');
    
    if (!disconnectBtn) {
      console.error('Botão de desconexão do WhatsApp não encontrado');
      return;
    }
    
    // Adicionar ouvinte para o botão de desconexão
    disconnectBtn.addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja desconectar o WhatsApp? Você precisará escanear o QR Code novamente.')) {
        disconnectBtn.disabled = true;
        disconnectBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Desconectando...';
        
        try {
          const response = await fetch('/api/whatsapp/disconnect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Mostrar mensagem de sucesso
            alert('WhatsApp desconectado com sucesso. Você precisará escanear o QR Code novamente para se conectar.');
            
            // Recarregar a página para reiniciar o processo de QR Code
            window.location.reload();
          } else {
            throw new Error(data.error || 'Erro ao desconectar WhatsApp');
          }
        } catch (error) {
          console.error('Erro ao desconectar WhatsApp:', error);
          alert('Erro ao desconectar WhatsApp: ' + error.message);
          
          // Restaurar botão
          disconnectBtn.disabled = false;
          disconnectBtn.innerHTML = '<i class="bi bi-phone-vibrate me-1"></i>Desconectar WhatsApp';
        }
      }
    });
    
    // Ouvir evento de desconexão via socket
    if (window.socket) {
      window.socket.on('whatsapp-disconnected', () => {
        console.log('WhatsApp desconectado pelo servidor');
        
        // Opcional: mostrar notificação
        // alert('WhatsApp foi desconectado');
      });
    }
  }
  
  // Adicione a chamada da função no DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    // Código existente...
    
    // Adicionar inicialização do gerenciador de WhatsApp
    setupWhatsAppManager();
  });