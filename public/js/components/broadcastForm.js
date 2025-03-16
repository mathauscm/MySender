/**
 * Módulo para gerenciar o formulário de envio em massa
 */
import { escapeHtml } from '../utils.js';
import { sendBroadcast } from '../services/messageService.js';
import { fetchBroadcastHistory } from '../services/messageService.js';

// Estado local
let selectedContacts = [];
let formEl;
let messageInputEl;
let delayInputEl;
let selectedContactsEl;
let selectedCountEl;
let sendBtnEl;
let onAfterSend;

// Inicializa o componente
export function init(options) {
  if (options.formId) {
    formEl = document.getElementById(options.formId);
  }
  if (options.messageInputId) {
    messageInputEl = document.getElementById(options.messageInputId);
  }
  if (options.delayInputId) {
    delayInputEl = document.getElementById(options.delayInputId);
  }
  if (options.selectedContactsId) {
    selectedContactsEl = document.getElementById(options.selectedContactsId);
  }
  if (options.selectedCountId) {
    selectedCountEl = document.getElementById(options.selectedCountId);
  }
  if (options.sendBtnId) {
    sendBtnEl = document.getElementById(options.sendBtnId);
  }
  if (options.onAfterSend) {
    onAfterSend = options.onAfterSend;
  }
  
  // Verificar se todos os elementos necessários foram encontrados
  if (formEl && !formEl._hasEventListener) {
    formEl.addEventListener('submit', handleSubmit);
    formEl._hasEventListener = true;
    
    console.log('BroadcastForm: Event listener configurado para o formulário');
  }
  
  // Retornar API pública
  return {
    updateSelectedContacts: (contacts) => {
      console.log('BroadcastForm.updateSelectedContacts chamado com', contacts.length, 'contatos');
      selectedContacts = contacts;
      updateSelectedUI();
    }
  };
}

// Atualiza a UI para contatos selecionados
function updateSelectedUI() {
  if (!selectedCountEl || !selectedContactsEl || !sendBtnEl) {
    console.error('BroadcastForm: Elementos da UI não encontrados');
    return;
  }

  console.log('BroadcastForm.updateSelectedUI: Atualizando UI com', selectedContacts.length, 'contatos');
  
  // Atualizar contador de selecionados
  selectedCountEl.textContent = selectedContacts.length;
  
  if (selectedContacts.length === 0) {
    selectedContactsEl.innerHTML = '<div class="text-muted">Nenhum contato selecionado</div>';
    sendBtnEl.disabled = true;
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
    
    sendBtnEl.disabled = false;
  }
}

// Manipulador de envio do formulário
async function handleSubmit(e) {
  e.preventDefault();
  
  if (selectedContacts.length === 0) {
    alert('Selecione pelo menos um contato para enviar a mensagem.');
    return;
  }
  
  const message = messageInputEl.value.trim();
  
  if (!message) {
    alert('Digite uma mensagem para enviar.');
    return;
  }
  
  const delay = parseInt(delayInputEl.value) || 3000;
  
  // Confirmar antes de enviar
  if (!confirm(`Você está prestes a enviar uma mensagem para ${selectedContacts.length} contatos. Deseja continuar?`)) {
    return;
  }
  
  try {
    sendBtnEl.disabled = true;
    sendBtnEl.textContent = 'Enviando...';
    
    const result = await sendBroadcast(selectedContacts, message, delay);
    
    alert(`Envio em massa iniciado com sucesso! 
ID: ${result.broadcastId}
Total de contatos: ${result.totalContacts}
Tempo estimado: ${Math.ceil(result.estimatedTime / 60)} minutos`);
    
    // Limpar formulário
    messageInputEl.value = '';
    
    // Notificar conclusão
    onAfterSend();
    
    // Atualizar histórico (via evento)
    const event = new CustomEvent('broadcast:sent');
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Erro ao iniciar envio em massa:', error);
    alert('Erro ao iniciar envio em massa. Verifique o console para mais detalhes.');
  } finally {
    sendBtnEl.disabled = false;
    sendBtnEl.textContent = 'Enviar Mensagem';
  }
}