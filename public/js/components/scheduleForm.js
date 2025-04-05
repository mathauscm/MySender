/**
 * Módulo para gerenciar o formulário de agendamento
 */
import { escapeHtml } from '../utils.js';
import { scheduleBroadcast, scheduleMediaBroadcast } from '../services/scheduleService.js';
import { setupMediaHandlers } from './media-handlers.js';

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
let mediaHandlers; // Nova variável para gerenciar mídia

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
  onAfterSchedule = options.onAfterSchedule || (() => { });

  // Configurar event listeners
  formEl.addEventListener('submit', handleSubmit);

  // Definir a data mínima como hoje
  const today = new Date().toISOString().split('T')[0];
  dateInputEl.min = today;

  // Inicializar manipuladores de mídia
  mediaHandlers = setupMediaHandlers(
    'scheduleMediaInput',
    'scheduleClearMediaBtn',
    'scheduleMediaPreview',
    'scheduleMediaThumbnail',
    'scheduleMediaName',
    'scheduleMediaType'
  );

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
    alert('Selecione pelo menos um destinatário para agendar a mensagem.');
    return;
  }

  const message = messageInputEl.value.trim();
  const mediaFiles = mediaHandlers.getSelectedMedia();

  if (!message && (!mediaFiles || mediaFiles.length === 0)) {
    alert('Digite uma mensagem ou anexe uma mídia para agendar.');
    return;
  }

  // Obter data e hora do formulário
  const date = dateInputEl.value;
  const time = timeInputEl.value;

  if (!date || !time) {
    alert('Você precisa definir uma data e hora para o agendamento.');
    return;
  }

  // Combinando data e hora para formar timestamp ISO
  const scheduledTime = new Date(`${date}T${time}`);

  // Verificar se a data é válida e está no futuro
  if (isNaN(scheduledTime.getTime())) {
    alert('Data ou hora inválida.');
    return;
  }

  if (scheduledTime <= new Date()) {
    alert('A data de agendamento deve estar no futuro.');
    return;
  }

  const delay = parseInt(delayInputEl.value) || 3000;

  // Contar destinatários por tipo
  const contacts = selectedContacts.filter(c => !c.type || c.type === 'contact');
  const groups = selectedContacts.filter(c => c.type === 'group');
  const labels = selectedContacts.filter(c => c.type === 'label');

  let hasMultipleMedia = Array.isArray(mediaFiles) && mediaFiles.length > 1;

  // Mensagem de confirmação com detalhes
  let confirmMessage = `Você está prestes a agendar ${mediaFiles && mediaFiles.length ? (hasMultipleMedia ? mediaFiles.length + ' arquivos de mídia' : 'uma mídia') : 'uma mensagem'} para:\n`;

  confirmMessage += `Data: ${scheduledTime.toLocaleDateString()} às ${scheduledTime.toLocaleTimeString()}\n`;
  confirmMessage += `Destinatários:\n`;

  if (contacts.length > 0) confirmMessage += `- ${contacts.length} contatos\n`;
  if (groups.length > 0) confirmMessage += `- ${groups.length} grupos\n`;
  if (labels.length > 0) confirmMessage += `- ${labels.length} etiquetas\n`;

  confirmMessage += "\nDeseja continuar?";

  // Confirmar antes de agendar
  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    scheduleBtnEl.disabled = true;
    scheduleBtnEl.textContent = 'Agendando...';

    let result;

    if (mediaFiles && mediaFiles.length > 0) {
      // Agendar com mídia
      result = await scheduleMediaBroadcast(selectedContacts, mediaFiles, message, scheduledTime.toISOString(), delay);
    } else {
      // Agendar apenas texto
      result = await scheduleBroadcast(selectedContacts, message, scheduledTime.toISOString(), delay);
    }

    alert(`Mensagem agendada com sucesso! 
ID: ${result.scheduledId}
Data: ${new Date(result.scheduledTime).toLocaleString()}
Total de contatos: ${result.totalContacts}`);

    // Limpar formulário
    messageInputEl.value = '';
    dateInputEl.value = '';
    timeInputEl.value = '';
    mediaHandlers.clearSelectedMedia();

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