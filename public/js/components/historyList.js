/**
 * Módulo para gerenciar a lista de histórico de envios
 */
import { escapeHtml, formatStatus, getStatusBadgeClass, truncateText } from '../utils.js';
import { fetchBroadcastHistory } from '../services/messageService.js';

// Estado local
let historyListEl;
let refreshBtnEl;
let updateInterval;

// Inicializa o componente
export function init(options) {
  historyListEl = document.getElementById(options.historyListId);
  refreshBtnEl = document.getElementById(options.refreshBtnId);
  
  // Configurar event listeners
  refreshBtnEl.addEventListener('click', loadHistory);
  
  // Ouvir evento de novo broadcast
  document.addEventListener('broadcast:sent', loadHistory);
  
  // Carregar histórico inicial
  loadHistory();
  
  // Configurar atualizações periódicas
  if (options.autoRefresh !== false) {
    // Limpar intervalo anterior se existir
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    // Definir novo intervalo
    updateInterval = setInterval(loadHistory, options.refreshInterval || 10000);
  }
  
  // Retornar API pública
  return {
    refresh: loadHistory,
    stopAutoRefresh: () => {
      if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
      }
    }
  };
}

// Carrega o histórico de broadcasts
async function loadHistory() {
  try {
    // Mostrar indicador de carregamento
    historyListEl.innerHTML = '<div class="loading-indicator">Carregando histórico...</div>';
    
    const broadcasts = await fetchBroadcastHistory();
    renderHistory(broadcasts);
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    historyListEl.innerHTML = '<div class="error-message">Erro ao carregar histórico</div>';
  }
}

// Renderiza a lista de histórico
function renderHistory(broadcasts) {
  if (!broadcasts || broadcasts.length === 0) {
    historyListEl.innerHTML = '<div class="empty-message">Nenhum envio realizado</div>';
    return;
  }
  
  // Ordenar do mais recente para o mais antigo
  broadcasts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  historyListEl.innerHTML = broadcasts.map(broadcast => `
    <div class="list-group-item">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="d-flex align-items-center">
            <h6 class="mb-0">Envio #${broadcast.id.slice(-6)}</h6>
            <span class="badge ${getStatusBadgeClass(broadcast.status)} ms-2">${formatStatus(broadcast.status)}</span>
          </div>
          <small class="text-muted">${new Date(broadcast.timestamp).toLocaleString()}</small>
          <div class="mt-2">
            <div class="text-truncate" style="max-width: 300px;">
              ${escapeHtml(broadcast.message || broadcast.caption || 'Sem mensagem')}
            </div>
            <small class="text-muted">Enviado para ${broadcast.totalContacts} contatos</small>
          </div>
        </div>
        <div>
          <div class="progress progress-container">
            <div class="progress-bar ${broadcast.status === 'completed' ? 'bg-success' : 'bg-primary'}" 
                 role="progressbar" style="width: ${broadcast.progress}%"></div>
          </div>
          <div class="small text-center mt-1">
            ${broadcast.successCount || 0}/${broadcast.totalContacts}
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  // Adicionar tratamento para clique em cada item do histórico (opcional)
  document.querySelectorAll('#broadcastHistory .list-group-item').forEach(item => {
    item.addEventListener('click', () => {
      // Esta funcionalidade pode ser expandida para mostrar detalhes do broadcast
      // Por exemplo, abrir um modal com informações detalhadas
      console.log('Histórico selecionado:', item.querySelector('h6').textContent);
    });
  });
}

// Função auxiliar para formatar data (opcional)
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}