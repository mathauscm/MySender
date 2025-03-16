/**
 * Módulo para gerenciar o formulário de agendamento
 */
import { escapeHtml } from '../utils.js';
import { scheduleBroadcast } from '../services/scheduleService.js';

// Estado local
let selectedContacts = [];
let formEl;
let messageInputEl;
let dateInputEl;
let timeInputEl;
let delayInputEl;
let selectedContactsEl;
let selectedCountEl;
let scheduleBtnEl;
let onAfterSchedule;

// Inicializa o componente
export function init(options) {
  formEl = document.getElementById(options.formId);
  messageInputEl = document.getElementById(options.messageInputId);
  dateInputEl = document.getElementById(options.dateInputId);
  timeInputEl = document.getElementById(options.timeInputId);
  delayInputEl = document.getElementById(options.delayInputId);
  selectedContactsEl = document.getElementById(options.selectedContactsId);
  selectedCountEl = document.getElementById(options.selectedCountId);
  scheduleBtnEl = document.getElementById(options.scheduleBtnId);
  onAfterSchedule = options.onAfterSchedule || (() => {});
  
  // Configurar event listeners
  formEl.addEventListener('submit', handleSubmit);
  
  // Definir a data mínima como hoje
  const today = new Date().toISOString().split('T')[0];
  dateInputEl.min = today;
  
  return {
    updateSelectedContacts: (contacts) => {
      selectedContacts = contacts;
      updateSelectedUI();
    }
  };
}

// Atualiza a UI para contatos selecionados
function updateSelectedUI() {
  selectedCountEl.textContent = selectedContacts.length;
  
  if (selectedContacts.length === 0) {
    selectedContactsEl.innerHTML = '<div class="text-muted">Nenhum contato selecionado</div>';
    scheduleBtnEl.disabled = true;
  } else {
    const selectedHTML = selectedContacts.map(contact => `
      <div class="badge rounded-pill bg-secondary contact-badge">
        ${escapeHtml(contact.name)}
        <span class="ms-1" style="cursor: pointer;" data-id="${contact.id}">&times;</span>
      </div>
    `).join('');
    
    selectedContactsEl.innerHTML = selectedHTML;
    
    // Adicionar event listeners para remover contatos
    document.querySelectorAll('.contact-badge span').forEach(span => {
      span.addEventListener('click', () => {
        const contactId = span.dataset.id;
        // Criar um evento personalizado para remoção de contato
        const event = new CustomEvent('contact:remove', {
          detail: { contactId }
        });
        document.dispatchEvent(event);
      });
    });
    
    scheduleBtnEl.disabled = false;
  }
}

// Manipulador de envio do formulário
async function handleSubmit(e) {
  e.preventDefault();
  
  if (selectedContacts.length === 0) {
    alert('Selecione pelo menos um contato para agendar a mensagem.');
    return;
  }
  
  const message = messageInputEl.value.trim();
  
  if (!message) {
    alert('Digite uma mensagem para agendar.');
    return;
  }
  
  const scheduleDate = dateInputEl.value;
  const scheduleTime = timeInputEl.value;
  
  if (!scheduleDate || !scheduleTime) {
    alert('Selecione a data e hora para agendamento.');
    return;
  }
  
  const scheduledTime = new Date(`${scheduleDate}T${scheduleTime}`);
  
  if (scheduledTime <= new Date()) {
    alert('A data de agendamento deve ser no futuro.');
    return;
  }
  
  const delay = parseInt(delayInputEl.value) || 3000;
  
  // Confirmar antes de agendar
  if (!confirm(`Você está prestes a agendar uma mensagem para ${selectedContacts.length} contatos em ${scheduledTime.toLocaleString()}. Deseja continuar?`)) {
    return;
  }
  
  try {
    scheduleBtnEl.disabled = true;
    scheduleBtnEl.textContent = 'Agendando...';
    
    const result = await scheduleBroadcast(selectedContacts, message, scheduledTime, delay);
    
    alert(`Envio agendado com sucesso! 
ID: ${result.scheduledId}
Data: ${new Date(result.scheduledTime).toLocaleString()}
Total de contatos: ${result.totalContacts}`);
    
    // Limpar formulário
    messageInputEl.value = '';
    dateInputEl.value = '';
    timeInputEl.value = '';
    
    // Notificar conclusão
    onAfterSchedule();
    
    // Atualizar lista de agendamentos (via evento)
    const event = new CustomEvent('schedule:created');
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Erro ao agendar envio em massa:', error);
    alert('Erro ao agendar envio: ' + (error.message || 'Verifique o console para mais detalhes.'));
  } finally {
    scheduleBtnEl.disabled = false;
    scheduleBtnEl.textContent = 'Agendar Envio';
  }
}