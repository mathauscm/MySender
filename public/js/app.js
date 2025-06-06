
import * as ContactList from './components/contactList.js';
import * as BroadcastForm from './components/broadcastForm.js';
import * as ScheduleForm from './components/scheduleForm.js';
import * as HistoryList from './components/historyList.js';
import * as ScheduledList from './components/scheduledList.js';
import { setupLicenseValidation } from './components/licenseHandler.js';

import * as QRCode from './components/qrCode.js';

// Estado compartilhado
let contactListAPI;
let broadcastFormAPI;
let scheduleFormAPI;

// Função de inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Primeiro verificar a licença
  const licenseValidation = setupLicenseValidation();
  
  // Apenas inicialize os componentes se tivermos uma licença
  if (licenseValidation.hasValidLicense()) {
    initializeComponents();
    console.log('DOM carregado, componentes inicializados');
  } else {
    console.log('Aguardando validação de licença...');
    // Redirecionar para a página de licença se necessário
    if (window.location.pathname !== '/' && window.location.pathname !== '/license.html') {
      window.location.href = '/';
    }
  }
});

// Inicializa todos os componentes
function initializeComponents() {
  // Inicializar componente QR Code
  QRCode.init({
    qrContainerId: 'qrCodeContainer',
    qrImageId: 'qrImage',
    qrStatusId: 'qrStatus'
  });
  // Inicializar lista de contatos
  contactListAPI = ContactList.init({
    contactListId: 'contactList',
    searchInputId: 'searchInput',
    refreshBtnId: 'refreshContactsBtn',
    selectAllBtnId: 'selectAllBtn',
    clearSelectionBtnId: 'clearSelectionBtn',
    onSelectionChange: handleContactSelectionChange
  });
  
  // Inicializar formulário de envio
  broadcastFormAPI = BroadcastForm.init({
    formId: 'broadcastForm',
    messageInputId: 'messageInput',
    delayInputId: 'delayInput',
    selectedContactsId: 'selectedContacts',
    selectedCountId: 'selectedCount',
    sendBtnId: 'sendBtn',
    onAfterSend: handleAfterBroadcastSent
  });
  
  // Inicializar formulário de agendamento
  scheduleFormAPI = ScheduleForm.init({
    formId: 'scheduleForm',
    messageInputId: 'scheduleMessageInput',
    dateInputId: 'scheduleDateInput',
    timeInputId: 'scheduleTimeInput',
    delayInputId: 'scheduleDelayInput',
    selectedContactsId: 'scheduleSelectedContacts',
    selectedCountId: 'scheduleSelectedCount',
    scheduleBtnId: 'scheduleBtn',
    onAfterSchedule: handleAfterScheduled
  });
  
  // Inicializar histórico
  HistoryList.init({
    historyListId: 'broadcastHistory',
    refreshBtnId: 'refreshHistoryBtn',
    autoRefresh: true,
    refreshInterval: 10000
  });
  
  // Inicializar lista de agendamentos
  ScheduledList.init({
    scheduledListId: 'scheduledList',
    refreshBtnId: 'refreshScheduledBtn',
    autoRefresh: true,
    refreshInterval: 30000
  });
  
  // Adicionar ouvinte para remoção de contatos
  document.addEventListener('contact:remove', handleContactRemove);
}

// Manipulador para alteração de seleção de contatos
function handleContactSelectionChange(selectedContacts) {
  console.log('handleContactSelectionChange chamado com', selectedContacts.length, 'contatos');
  
  // Atualizar formulários com os contatos selecionados
  if (broadcastFormAPI && broadcastFormAPI.updateSelectedContacts) {
    broadcastFormAPI.updateSelectedContacts(selectedContacts);
  } else {
    console.error('broadcastFormAPI não está inicializado corretamente');
    // Tentar recriar a API
    broadcastFormAPI = BroadcastForm.init({
      formId: 'broadcastForm',
      messageInputId: 'messageInput',
      delayInputId: 'delayInput',
      selectedContactsId: 'selectedContacts',
      selectedCountId: 'selectedCount',
      sendBtnId: 'sendBtn',
      onAfterSend: handleAfterBroadcastSent
    });
    broadcastFormAPI.updateSelectedContacts(selectedContacts);
  }
  
  if (scheduleFormAPI && scheduleFormAPI.updateSelectedContacts) {
    scheduleFormAPI.updateSelectedContacts(selectedContacts);
  } else {
    console.error('scheduleFormAPI não está inicializado corretamente');
    // Tentar recriar a API
    scheduleFormAPI = ScheduleForm.init({
      formId: 'scheduleForm',
      messageInputId: 'scheduleMessageInput',
      dateInputId: 'scheduleDateInput',
      timeInputId: 'scheduleTimeInput',
      delayInputId: 'scheduleDelayInput',
      selectedContactsId: 'scheduleSelectedContacts',
      selectedCountId: 'scheduleSelectedCount',
      scheduleBtnId: 'scheduleBtn',
      onAfterSchedule: handleAfterScheduled
    });
    scheduleFormAPI.updateSelectedContacts(selectedContacts);
  }
}

// Manipulador para após envio de broadcast
function handleAfterBroadcastSent() {
  // Limpar seleção após envio bem-sucedido
  contactListAPI.clearSelection();
}

// Manipulador para após agendamento
function handleAfterScheduled() {
  // Limpar seleção após agendamento bem-sucedido
  contactListAPI.clearSelection();
}

// Manipulador para remoção de contato
function handleContactRemove(event) {
  const { contactId } = event.detail;
  
  // Atualizar seleção na lista de contatos
  const selectedContacts = contactListAPI.getSelectedContacts()
    .filter(contact => contact.id !== contactId);
  
  contactListAPI.setSelectedContacts(selectedContacts);
}