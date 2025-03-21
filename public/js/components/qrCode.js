/**
 * Módulo para gerenciar o código QR do WhatsApp
 */
import { setupSocketConnection } from '../services/socketService.js';

let qrCodeContainerEl;
let qrImageEl;
let qrStatusEl;
let socketInstance;
let statusCheckInterval;
let loadingStartTime;

// Inicializa o componente
export function init(options) {
  qrCodeContainerEl = document.getElementById(options.qrContainerId);
  qrImageEl = document.getElementById(options.qrImageId);
  qrStatusEl = document.getElementById(options.qrStatusId);
  
  console.log('QR Code component initialized with elements:', {
    container: qrCodeContainerEl,
    image: qrImageEl,
    status: qrStatusEl
  });
  
  // Registrar o tempo de início do carregamento
  loadingStartTime = Date.now();
  
  // Inicializar conexão com socket
  socketInstance = setupSocketConnection();
  
  if (socketInstance) {
    // Configurar listeners para eventos do socket
    socketInstance.on('whatsapp-qr', (data) => {
      console.log('QR code received from server, time elapsed:', (Date.now() - loadingStartTime) / 1000, 'seconds');
      showQRCode(data.qrDataURL);
      
      // Cancelar verificações periódicas após receber o QR
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
      }
    });
    
    socketInstance.on('whatsapp-authenticated', () => {
      console.log('WhatsApp authenticated event received');
      hideQRCode('Conectado com sucesso!');
      
      // Cancelar verificações periódicas após autenticação
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
      }
    });
    
    socketInstance.on('whatsapp-loading', (data) => {
      updateLoadingStatus(data.percent, data.message);
    });
  } else {
    console.error('Socket instance not available');
  }
  
  // Verificar status inicial
  checkInitialStatus();
  
  // Configurar verificação periódica do status
  statusCheckInterval = setInterval(() => {
    const elapsedTime = (Date.now() - loadingStartTime) / 1000;
    console.log(`Checking WhatsApp status (${elapsedTime.toFixed(1)} seconds elapsed)`);
    checkInitialStatus();
  }, 3000); // Verificar a cada 3 segundos
  
  // Limpar intervalos se a página for fechada
  window.addEventListener('beforeunload', () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
  });
  
  return {
    showQRCode,
    hideQRCode,
    updateLoadingStatus
  };
}

// Atualiza o status de carregamento com porcentagem
function updateLoadingStatus(percent, message) {
  if (qrStatusEl) {
    qrStatusEl.innerHTML = `
      <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
      Inicializando WhatsApp: ${percent}% - ${message}
      <div class="progress mt-2" style="height: 6px;">
        <div class="progress-bar progress-bar-striped progress-bar-animated" 
             role="progressbar" 
             style="width: ${percent}%" 
             aria-valuenow="${percent}" 
             aria-valuemin="0" 
             aria-valuemax="100"></div>
      </div>
    `;
  }
}

// Mostra o código QR
function showQRCode(qrDataURL) {
  if (qrImageEl) {
    qrImageEl.src = qrDataURL;
    qrImageEl.classList.remove('d-none');
  }
  
  if (qrStatusEl) {
    qrStatusEl.innerHTML = 'Escaneie o código QR com o WhatsApp do seu celular';
    qrStatusEl.classList.remove('text-success');
    qrStatusEl.classList.add('text-primary');
  }
  
  if (qrCodeContainerEl) {
    qrCodeContainerEl.classList.remove('d-none');
  }
}

// Esconde o código QR
function hideQRCode(message = 'WhatsApp conectado') {
  if (qrImageEl) {
    qrImageEl.classList.add('d-none');
  }
  
  if (qrStatusEl) {
    qrStatusEl.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>${message}`;
    qrStatusEl.classList.remove('text-primary');
    qrStatusEl.classList.add('text-success');
  }
  
  // Aguardar um pouco antes de ocultar completamente
  setTimeout(() => {
    if (qrCodeContainerEl) {
      qrCodeContainerEl.classList.add('d-none');
    }
  }, 5000);
}

// Verifica o status inicial da conexão
function checkInitialStatus() {
  const elapsedSeconds = Math.floor((Date.now() - loadingStartTime) / 1000);
  
  if (qrStatusEl && !qrImageEl.src) {
    qrStatusEl.innerHTML = `
      <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div> 
      Inicializando WhatsApp e gerando QR Code... (${elapsedSeconds}s)
      <div class="progress mt-2" style="height: 6px;">
        <div class="progress-bar progress-bar-striped progress-bar-animated" 
             role="progressbar" 
             style="width: ${Math.min(elapsedSeconds * 2, 95)}%" 
             aria-valuenow="${Math.min(elapsedSeconds * 2, 95)}" 
             aria-valuemin="0" 
             aria-valuemax="100"></div>
      </div>
      <small class="text-muted mt-1 d-block">
        Este processo pode levar até 30 segundos na primeira inicialização.
      </small>
    `;
  }
  
  if (qrCodeContainerEl) {
    qrCodeContainerEl.classList.remove('d-none');
  }
  
  fetch('/api/status')
    .then(response => response.json())
    .then(data => {
      console.log('WhatsApp status check:', data);
      if (data.whatsapp === 'ready') {
        console.log('WhatsApp already connected!');
        hideQRCode('WhatsApp já está conectado');
        
        // Cancelar verificações periódicas se estiver conectado
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          statusCheckInterval = null;
        }
      } else if (!qrImageEl.src) {
        console.log('Still waiting for QR code...');
        if (qrStatusEl && elapsedSeconds > 15) {
          qrStatusEl.innerHTML = `
            <div class="spinner-border spinner-border-sm text-warning me-2" role="status"></div> 
            Ainda inicializando WhatsApp... (${elapsedSeconds}s)
            <div class="progress mt-2" style="height: 6px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated bg-warning" 
                   role="progressbar" 
                   style="width: ${Math.min(elapsedSeconds * 2, 95)}%" 
                   aria-valuenow="${Math.min(elapsedSeconds * 2, 95)}" 
                   aria-valuemin="0" 
                   aria-valuemax="100"></div>
            </div>
            <small class="text-muted mt-1 d-block">
              A primeira inicialização pode demorar até 45 segundos.
            </small>
          `;
        }
      }
    })
    .catch(error => {
      console.error('Erro ao verificar status do WhatsApp:', error);
    });
}