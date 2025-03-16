/**
 * Módulo para gerenciar a lista de agendamentos
 */
import { escapeHtml, truncateText } from '../utils.js';
import { fetchScheduledList } from '../services/scheduleService.js';

// Estado local
let scheduledListEl;
let refreshBtnEl;

// Inicializa o componente
export function init(options) {
  scheduledListEl = document.getElementById(options.scheduledListId);
  refreshBtnEl = document.getElementById(options.refreshBtnId);
  
  // Configurar event listeners
  refreshBtnEl.addEventListener('click', loadScheduled);
  
  // Ouvir evento de novo agendamento
  document.addEventListener('schedule:created', loadScheduled);
  
  // Carregar agendamentos iniciais
  loadScheduled();
  
  // Configurar atualizações periódicas
  if (options.autoRefresh !== false) {
    setInterval(loadScheduled, options.refreshInterval || 30000);
  }
  
  return {
    refresh: loadScheduled
  };
}

// Carrega a lista de agendamentos
async function loadScheduled() {
  try {
    const schedules = await fetchScheduledList();
    renderScheduledList(schedules);
  } catch (error) {
    scheduledListEl.innerHTML = '<div class="error-message">Erro ao carregar agendamentos</div>';
  }
}

// Renderiza a lista de agendamentos
function renderScheduledList(schedules) {
  if (!schedules || schedules.length === 0) {
    scheduledListEl.innerHTML = '<div class="empty-message">Nenhum agendamento encontrado</div>';
    return;
  }
  
  // Ordenar do mais recente para o mais antigo
  schedules.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  scheduledListEl.innerHTML = schedules.map(schedule => `
    <div class="list-group-item">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="d-flex align-items-center">
            <h6 class="mb-0">Agendamento #${schedule.id.slice(-6)}</h6>
            <span class="badge ${schedule.executed ? 'bg-success' : 'bg-warning'} ms-2">
              ${schedule.executed ? 'Executado' : 'Pendente'}
            </span>
          </div>
          <small class="text-muted">Criado em: ${new Date(schedule.createdAt).toLocaleString()}</small>
          <div class="mt-1">
            <strong>Agendado para:</strong> ${new Date(schedule.scheduledTime).toLocaleString()}
          </div>
          <div class="mt-2">
            <div class="text-truncate" style="max-width: 300px;">
              ${escapeHtml(schedule.message || schedule.caption || 'Sem mensagem')}
            </div>
            <small class="text-muted">
              ${schedule.isMedia ? 'Mídia com ' : ''}
              ${schedule.totalContacts} contatos
            </small>
          </div>
          ${schedule.executed ? `
          <div class="mt-1">
            <small class="text-success">
              Executado em: ${new Date(schedule.executedAt).toLocaleString()}
            </small>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}