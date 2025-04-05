/**
 * Módulo para gerenciar o formulário de envio em massa
 */
import { escapeHtml } from '../utils.js';
import { sendBroadcast, sendMediaBroadcast } from '../services/messageService.js';
import { fetchBroadcastHistory } from '../services/messageService.js';
import { setupMediaHandlers } from './media-handlers.js';

// Estado local
let selectedContacts = [];
let formEl;
let messageInputEl;
let delayInputEl;
let selectedContactsEl;
let selectedCountEl;
let sendBtnEl;
let onAfterSend;
let mediaHandlers; // Nova variável para gerenciar mídia

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

  // Inicializar manipuladores de mídia
  mediaHandlers = setupMediaHandlers(
    'mediaInput',
    'clearMediaBtn',
    'mediaPreview',
    'mediaThumbnail',
    'mediaName',
    'mediaType'
  );

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

  console.log('BroadcastForm.updateSelectedUI: Atualizando UI com', selectedContacts.length, 'itens');

  // Agrupar por tipo para estatísticas
  const contacts = selectedContacts.filter(c => !c.type || c.type === 'contact');
  const groups = selectedContacts.filter(c => c.type === 'group');
  const labels = selectedContacts.filter(c => c.type === 'label');

  // Atualizar contador com estatísticas
  if (contacts.length > 0 || groups.length > 0 || labels.length > 0) {
    let countText = selectedContacts.length + ' ';
    const countDetails = [];

    if (contacts.length > 0) countDetails.push(`${contacts.length} contatos`);
    if (groups.length > 0) countDetails.push(`${groups.length} grupos`);
    if (labels.length > 0) countDetails.push(`${labels.length} etiquetas`);

    countText += countDetails.join(', ');
    selectedCountEl.textContent = countText;
  } else {
    selectedCountEl.textContent = "0";
  }

  if (selectedContacts.length === 0) {
    selectedContactsEl.innerHTML = '<div class="text-muted">Nenhum destinatário selecionado</div>';
    sendBtnEl.disabled = true;
  } else {
    const selectedHTML = selectedContacts.map(item => {
      let badgeClass = 'bg-secondary';
      let icon = '';

      // Personalizar aparência baseado no tipo
      if (item.type === 'group') {
        badgeClass = 'bg-success';
        icon = '<i class="bi bi-people-fill me-1"></i>';
      } else if (item.type === 'label') {
        badgeClass = 'bg-info';
        icon = '<i class="bi bi-tag-fill me-1"></i>';
      } else {
        icon = '<i class="bi bi-person-fill me-1"></i>';
      }

      return `
        <div class="badge rounded-pill ${badgeClass} contact-badge">
          ${icon}${escapeHtml(item.name)}
          <span class="ms-1" style="cursor: pointer;" data-id="${item.id}">&times;</span>
        </div>
      `;
    }).join('');

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
    alert('Selecione pelo menos um destinatário para enviar a mensagem.');
    return;
  }

  const message = messageInputEl.value.trim();
  const mediaFiles = mediaHandlers.getSelectedMedia();

  if (!message && (!mediaFiles || mediaFiles.length === 0)) {
    alert('Digite uma mensagem ou anexe uma mídia para enviar.');
    return;
  }

  const delay = parseInt(delayInputEl.value) || 3000;

  // Contar destinatários por tipo
  const contacts = selectedContacts.filter(c => !c.type || c.type === 'contact');
  const groups = selectedContacts.filter(c => c.type === 'group');
  const labels = selectedContacts.filter(c => c.type === 'label');

  const hasMultipleMedia = Array.isArray(mediaFiles) && mediaFiles.length > 1;

  // Mensagem de confirmação com detalhes
  let confirmMessage = `Você está prestes a enviar ${mediaFiles && mediaFiles.length ? (hasMultipleMedia ? mediaFiles.length + ' arquivos de mídia' : 'uma mídia') : 'uma mensagem'} para:\n`;

  if (contacts.length > 0) confirmMessage += `- ${contacts.length} contatos\n`;
  if (groups.length > 0) confirmMessage += `- ${groups.length} grupos\n`;
  if (labels.length > 0) confirmMessage += `- ${labels.length} etiquetas\n`;

  confirmMessage += "\nDeseja continuar?";

  // Confirmar antes de enviar
  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    sendBtnEl.disabled = true;
    sendBtnEl.textContent = 'Enviando...';

    let result;

    if (mediaFiles && mediaFiles.length > 0) {
      // Enviar com mídia
      result = await sendMediaBroadcast(selectedContacts, mediaFiles, message, delay);
    } else {
      // Enviar apenas texto
      result = await sendBroadcast(selectedContacts, message, delay);
    }

    let estimatedTimeText = "";
    if (result.estimatedTime) {
      const minutes = Math.ceil(result.estimatedTime / 60);
      estimatedTimeText = `\nTempo estimado: ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }

    let totalMediaText = result.totalMedias ? `\nTotal de arquivos por contato: ${result.totalMedias}` : '';

    alert(`Envio em massa iniciado com sucesso! 
ID: ${result.broadcastId}
Total de destinatários: ${result.totalContacts}${totalMediaText}${estimatedTimeText}`);

    // Limpar formulário
    messageInputEl.value = '';
    mediaHandlers.clearSelectedMedia();

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